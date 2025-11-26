import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserRole } from '@prisma/client';

// Define simple status types since enums don't exist in database
type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type RegistrationStatus = 'registered' | 'attended' | 'cancelled';

interface FindAllQuery {
  page?: number;
  limit?: number;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  isOnline?: boolean;
  organizerId?: string;
  search?: string;
  isFree?: boolean;
  status?: string;
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Event CRUD Operations
  // ==========================================

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

    const event = await this.prisma.event.create({
      data: {
        title,
        slug,
        organizerId,
        startDate: start,
        endDate: end,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        status: 'upcoming',
        ...rest,
      },
      include: this._getEventInclude(),
    });

    return this._formatEventResponse(event);
  }

  async findAll(query: FindAllQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // Use the actual status field from database
    if (query.status) {
      where.status = query.status;
    } else {
      // Default filter for upcoming and ongoing events
      where.status = { in: ['upcoming', 'ongoing'] };
    }

    if (query.eventType) where.eventType = query.eventType;
    if (query.isOnline !== undefined) where.isOnline = query.isOnline;
    if (query.organizerId) where.organizerId = query.organizerId;
    if (query.isFree !== undefined) where.isFree = query.isFree;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) where.startDate.gte = new Date(query.startDate);
      if (query.endDate) where.startDate.lte = new Date(query.endDate);
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: this._getEventInclude(),
        orderBy: [
          { startDate: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map(e => this._formatEventResponse(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this._getEventInclude(),
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this._formatEventResponse(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const event = await this.findOne(id);

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const { slug, startDate, endDate, ...rest } = updateEventDto;

    if (slug && slug !== event.slug) {
      const existingEvent = await this.prisma.event.findUnique({ where: { slug } });
      if (existingEvent) {
        throw new BadRequestException('Event slug must be unique');
      }
    }

    const start = startDate ? new Date(startDate) : new Date(event.startDate);
    const end = endDate ? new Date(endDate) : new Date(event.endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(slug && { slug }),
        ...(startDate && { startDate: start }),
        ...(endDate && { endDate: end }),
        ...rest,
      },
      include: this._getEventInclude(),
    });

    return this._formatEventResponse(updated);
  }

  async remove(id: string, userId: string) {
    const event = await this.findOne(id);

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted successfully' };
  }

  // ==========================================
  // Event Status Management
  // ==========================================

  async cancelEvent(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only cancel your own events');
    }

    // Update event status
    await this.prisma.event.update({
      where: { id: eventId },
      data: { status: 'cancelled' },
    });

    // Mark all registrations as cancelled
    await this.prisma.eventRegistration.updateMany({
      where: { eventId },
      data: { status: 'cancelled' },
    });

    return { message: 'Event cancelled successfully' };
  }

  // ==========================================
  // Registration Management
  // ==========================================

  async registerUser(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    // Check if already registered
    const existingRegistration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existingRegistration) {
      throw new BadRequestException('User is already registered for this event');
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Check capacity
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      throw new BadRequestException('Event is at full capacity');
    }

    // Create registration
    const registration = await this.prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        status: 'registered',
      },
      include: {
        event: { select: { id: true, title: true, startDate: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Update participant count
    await this.prisma.event.update({
      where: { id: eventId },
      data: { currentParticipants: { increment: 1 } },
    });

    return registration;
  }

  async unregisterUser(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    // Update registration status
    await this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: 'cancelled' },
    });

    // Update event count if they were registered
    if (registration.status === 'registered') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { currentParticipants: { decrement: 1 } },
      });
    }

    return { message: 'Successfully unregistered from event' };
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
              organizer: { select: { id: true, firstName: true, lastName: true } },
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getEventAttendees(eventId: string, organizerId: string, page = 1, limit = 10, status?: RegistrationStatus) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view attendees for your own events');
    }

    const skip = (page - 1) * limit;
    const where: any = { eventId };
    if (status) where.status = status;

    const [attendees, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              university: { select: { nameUz: true } },
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.eventRegistration.count({ where }),
    ]);

    return {
      data: attendees,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==========================================
  // Check-In System
  // ==========================================

  async checkInManual(eventId: string, userId: string, organizerId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only check in attendees for your own events');
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    if (registration.status === 'attended') {
      throw new BadRequestException('User has already checked in');
    }

    // Update registration
    await this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        status: 'attended',
        attendedAt: new Date(),
      },
    });

    return { message: 'Check-in successful', registrationId: registration.id };
  }

  async selfCheckIn(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    if (registration.status === 'attended') {
      throw new BadRequestException('User has already checked in');
    }

    // Update registration
    await this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        status: 'attended',
        attendedAt: new Date(),
      },
    });

    return { message: 'Self check-in successful', registrationId: registration.id };
  }

  // ==========================================
  // Simple Analytics
  // ==========================================

  async getEventAnalytics(eventId: string, organizerId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view analytics for your own events');
    }

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      select: { status: true },
    });

    const statusCounts = registrations.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const attendanceRate = statusCounts['attended']
      ? ((statusCounts['attended'] / (statusCounts['registered'] || 1)) * 100).toFixed(2)
      : '0';

    return {
      eventId,
      totalRegistrations: registrations.length,
      statusCounts,
      attendanceRate: `${attendanceRate}%`,
      capacityUsage: event.maxParticipants
        ? `${((event.currentParticipants / event.maxParticipants) * 100).toFixed(2)}%`
        : 'Unlimited',
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private _getEventInclude() {
    return {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    };
  }

  private _formatEventResponse(event: any) {
    return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      slug: event.slug,
      description: event.description,
      coverImage: event.coverImage,
      eventType: event.eventType,
      location: event.location,
      isOnline: event.isOnline,
      meetingLink: event.isOnline ? event.meetingLink : undefined,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      isFree: event.isFree,
      ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
      isActive: event.isActive,
      status: event.status,
      organizer: event.organizer,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
