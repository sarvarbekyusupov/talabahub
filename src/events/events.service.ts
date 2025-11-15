import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserRole } from '@prisma/client';

interface FindAllQuery {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  isOnline?: boolean;
  organizerId?: string;
  search?: string;
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, organizerId: string) {
    const { title, slug, startDate, endDate, registrationDeadline, ...rest } = createEventDto;

    // Check if slug is unique
    const existingEvent = await this.prisma.event.findUnique({
      where: { slug },
    });

    if (existingEvent) {
      throw new BadRequestException('Event slug must be unique');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (registrationDeadline) {
      const regDeadline = new Date(registrationDeadline);
      if (regDeadline >= start) {
        throw new BadRequestException('Registration deadline must be before event start date');
      }
    }

    return this.prisma.event.create({
      data: {
        title,
        slug,
        organizerId,
        startDate: start,
        endDate: end,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        ...rest,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  async findAll(query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      isActive: true,
    };

    if (query.type) {
      where.eventType = query.type;
    }

    if (query.isOnline !== undefined) {
      where.isOnline = query.isOnline;
    }

    if (query.organizerId) {
      where.organizerId = query.organizerId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Handle date range filtering
    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) {
        where.startDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startDate.lte = new Date(query.endDate);
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const event = await this.findOne(id);

    // Check authorization (only organizer or admin can update)
    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const { slug, startDate, endDate, ...rest } = updateEventDto;

    // If slug is being updated, check uniqueness
    if (slug && slug !== event.slug) {
      const existingEvent = await this.prisma.event.findUnique({
        where: { slug },
      });
      if (existingEvent) {
        throw new BadRequestException('Event slug must be unique');
      }
    }

    // Validate dates if provided
    const start = startDate ? new Date(startDate) : new Date(event.startDate);
    const end = endDate ? new Date(endDate) : new Date(event.endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(slug && { slug }),
        ...(startDate && { startDate: start }),
        ...(endDate && { endDate: end }),
        ...rest,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const event = await this.findOne(id);

    // Check authorization
    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    return this.prisma.event.delete({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async registerUser(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    // Check if user is already registered
    const existingRegistration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existingRegistration) {
      throw new BadRequestException('User is already registered for this event');
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Check max participants
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      throw new BadRequestException('Event is at full capacity');
    }

    // Create registration and update participant count
    const [registration] = await Promise.all([
      this.prisma.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: 'registered',
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.event.update({
        where: { id: eventId },
        data: {
          currentParticipants: {
            increment: 1,
          },
        },
      }),
    ]);

    return registration;
  }

  async unregisterUser(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    // Find and delete the registration
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    // Delete registration and decrement participant count
    await Promise.all([
      this.prisma.eventRegistration.delete({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      }),
      this.prisma.event.update({
        where: { id: eventId },
        data: {
          currentParticipants: {
            decrement: 1,
          },
        },
      }),
    ]);

    return { message: 'Successfully unregistered from event' };
  }

  async markAttendance(eventId: string, userId: string, organizerId: string) {
    const event = await this.findOne(eventId);

    // Check authorization (only organizer or admin can mark attendance)
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only manage attendance for your own events');
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    return this.prisma.eventRegistration.update({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      data: {
        status: 'attended',
        attendedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getUserRegistrations(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              startDate: true,
              endDate: true,
              location: true,
              isOnline: true,
              meetingLink: true,
              organizer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              _count: {
                select: { registrations: true },
              },
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.eventRegistration.count({ where: { userId } }),
    ]);

    return {
      data: registrations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getEventAttendees(eventId: string, organizerId: string, page = 1, limit = 10) {
    const event = await this.findOne(eventId);

    // Check authorization
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view attendees for your own events');
    }

    const skip = (page - 1) * limit;

    const [attendees, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              university: {
                select: {
                  nameUz: true,
                },
              },
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.eventRegistration.count({ where: { eventId } }),
    ]);

    return {
      data: attendees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
