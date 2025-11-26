import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserRole, EventStatus, EventCategory, EventOrganizerType, EventAccessType, RegistrationStatus } from '@prisma/client';
import * as crypto from 'crypto';

interface FindAllQuery {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  isOnline?: boolean;
  organizerId?: string;
  search?: string;
  isFree?: boolean;
  isFeatured?: boolean;
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
        eventStatus: 'draft',
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

    // Only include eventStatus filter if the field exists
    try {
      where.eventStatus = { in: ['published', 'registration_closed', 'ongoing'] };
    } catch (e) {
      // Fallback to basic status field if eventStatus doesn't exist
      try {
        where.status = { in: ['upcoming', 'ongoing'] };
      } catch (statusError) {
        // Remove status filtering if neither field exists
        console.warn('Neither eventStatus nor status field available, skipping status filter');
      }
    }

    if (query.type) where.eventType = query.type;
    if (query.category) where.category = query.category;
    if (query.isOnline !== undefined) where.isOnline = query.isOnline;
    if (query.organizerId) where.organizerId = query.organizerId;
    if (query.isFree !== undefined) where.isFree = query.isFree;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;

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
          { isFeatured: 'desc' },
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
  // Event Status Workflow
  // ==========================================

  async publishEvent(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only publish your own events');
    }

    if (!['draft', 'pending_review'].includes(event.eventStatus)) {
      throw new BadRequestException('Event cannot be published from current status');
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { eventStatus: 'published' },
      include: this._getEventInclude(),
    });

    return this._formatEventResponse(updated);
  }

  async cancelEvent(eventId: string, userId: string, reason: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only cancel your own events');
    }

    // Update event status
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        eventStatus: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Notify all registered users
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId, registrationStatus: { in: ['registered', 'confirmed'] } },
      include: { user: { select: { email: true, firstName: true } } },
    });

    // TODO: Send cancellation notifications to all registrants

    return { message: 'Event cancelled successfully', affectedRegistrations: registrations.length };
  }

  // ==========================================
  // Registration Management
  // ==========================================

  async registerUser(eventId: string, userId: string, ticketTypeId?: string, answers?: any) {
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
    const isAtCapacity = event.maxParticipants && event.currentParticipants >= event.maxParticipants;

    if (isAtCapacity && !event.waitlistEnabled) {
      throw new BadRequestException('Event is at full capacity');
    }

    // Generate confirmation code
    const confirmationCode = this._generateConfirmationCode();
    const qrCode = this._generateQRCode(confirmationCode);

    // Determine status
    const registrationStatus: RegistrationStatus = isAtCapacity ? 'waitlisted' : 'registered';

    // Create registration
    const registration = await this.prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        registrationStatus,
        confirmationCode,
        qrCode,
        answers,
        status: registrationStatus,
      },
      include: {
        event: { select: { id: true, title: true, startDate: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Update counts
    if (registrationStatus === 'registered') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { currentParticipants: { increment: 1 } },
      });
    } else {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { waitlistCount: { increment: 1 } },
      });

      // Add to waitlist
      const position = await this.prisma.eventWaitlist.count({ where: { eventId } }) + 1;
      await this.prisma.eventWaitlist.create({
        data: { eventId, userId, position },
      });
    }

    // TODO: Send confirmation email

    return registration;
  }

  async unregisterUser(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    const wasRegistered = registration.registrationStatus === 'registered';

    // Update registration status
    await this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        registrationStatus: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Update event counts
    if (wasRegistered) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { currentParticipants: { decrement: 1 } },
      });

      // Promote from waitlist
      await this._promoteFromWaitlist(eventId);
    } else {
      // Remove from waitlist
      await this.prisma.eventWaitlist.delete({
        where: { eventId_userId: { eventId, userId } },
      });
      await this.prisma.event.update({
        where: { id: eventId },
        data: { waitlistCount: { decrement: 1 } },
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
              _count: { select: { registrations: true } },
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
    if (status) where.registrationStatus = status;

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

  async checkInByQR(qrCode: string, organizerId: string) {
    // Find registration by confirmation code (encoded in QR)
    const confirmationCode = this._decodeQRCode(qrCode);

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { confirmationCode },
      include: {
        event: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Invalid QR code');
    }

    if (registration.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only check in attendees for your own events');
    }

    return this._performCheckIn(registration.id, organizerId, 'qr_scan');
  }

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

    return this._performCheckIn(registration.id, organizerId, 'manual');
  }

  async selfCheckIn(eventId: string, userId: string, lat?: number, lng?: number) {
    const event = await this.findOne(eventId);

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) {
      throw new NotFoundException('User is not registered for this event');
    }

    // Geo-location validation is optional - only validate if coordinates are provided
    // Note: Event model should have venueLat, venueLng, checkInRadius for full geo-fencing support
    // For now, we allow self-check-in without geo-validation

    return this._performCheckIn(registration.id, undefined, 'self_check_in', lat, lng);
  }

  private async _performCheckIn(
    registrationId: string,
    checkedInBy?: string,
    method: string = 'manual',
    lat?: number,
    lng?: number
  ) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.registrationStatus === 'attended') {
      throw new BadRequestException('User has already checked in');
    }

    // Update registration
    await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        registrationStatus: 'attended',
        checkedInAt: new Date(),
        checkedInBy,
      },
    });

    // Create check-in record
    await this.prisma.eventCheckIn.create({
      data: {
        registrationId,
        method,
        checkedInBy,
        locationLat: lat,
        locationLng: lng,
      },
    });

    return { message: 'Check-in successful', registrationId };
  }

  // ==========================================
  // Waitlist Management
  // ==========================================

  async getWaitlist(eventId: string, organizerId: string, page: number = 1, limit: number = 20) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view waitlist for your own events');
    }

    const skip = (page - 1) * limit;

    const [waitlist, total] = await Promise.all([
      this.prisma.eventWaitlist.findMany({
        where: { eventId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { position: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.eventWaitlist.count({ where: { eventId } }),
    ]);

    return {
      data: waitlist,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketTypes(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const ticketTypes = await this.prisma.eventTicketType.findMany({
      where: { eventId, isActive: true },
      orderBy: { price: 'asc' },
    });

    return ticketTypes;
  }

  async markAttendance(eventId: string, userId: string, organizerId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Only the organizer can mark attendance');
    }

    return this.checkInManual(eventId, userId, organizerId);
  }

  private async _promoteFromWaitlist(eventId: string) {
    const nextInLine = await this.prisma.eventWaitlist.findFirst({
      where: { eventId },
      orderBy: { position: 'asc' },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!nextInLine) return;

    // Update registration status
    await this.prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId: nextInLine.userId } },
      data: {
        registrationStatus: 'registered',
      },
    });

    // Remove from waitlist
    await this.prisma.eventWaitlist.delete({
      where: { eventId_userId: { eventId, userId: nextInLine.userId } },
    });

    // Update counts
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        currentParticipants: { increment: 1 },
        waitlistCount: { decrement: 1 },
      },
    });

    // TODO: Send notification to user about promotion

    // Reorder remaining waitlist
    await this.prisma.$executeRaw`
      UPDATE event_waitlist
      SET position = position - 1
      WHERE event_id = ${eventId} AND position > ${nextInLine.position}
    `;
  }

  // ==========================================
  // Feedback & Certificates
  // ==========================================

  async submitFeedback(eventId: string, userId: string, rating: number, comment?: string, wouldRecommend?: boolean) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration || registration.registrationStatus !== 'attended') {
      throw new BadRequestException('Only attended users can submit feedback');
    }

    const feedback = await this.prisma.eventFeedback.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, rating, comment, wouldRecommend: wouldRecommend ?? true },
      update: { rating, comment, wouldRecommend: wouldRecommend ?? true },
    });

    return feedback;
  }

  async generateCertificate(eventId: string, userId: string) {
    const event = await this.findOne(eventId);

    if (!event.certificateEnabled) {
      throw new BadRequestException('Certificates are not enabled for this event');
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration || registration.registrationStatus !== 'attended') {
      throw new BadRequestException('Only attended users can receive certificates');
    }

    // Check if certificate already exists
    const existing = await this.prisma.eventCertificate.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      return existing;
    }

    const certificateCode = `CERT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const certificate = await this.prisma.eventCertificate.create({
      data: { eventId, userId, certificateCode },
    });

    return certificate;
  }

  // ==========================================
  // Analytics
  // ==========================================

  async getEventAnalytics(eventId: string, organizerId: string) {
    const event = await this.findOne(eventId);

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view analytics for your own events');
    }

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      select: { registrationStatus: true },
    });

    const feedback = await this.prisma.eventFeedback.aggregate({
      where: { eventId },
      _avg: { rating: true },
      _count: true,
    });

    const statusCounts = registrations.reduce((acc, r) => {
      acc[r.registrationStatus] = (acc[r.registrationStatus] || 0) + 1;
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
      viewCount: event.viewCount,
      shareCount: event.shareCount,
      waitlistCount: event.waitlistCount,
      averageRating: feedback._avg.rating?.toFixed(2) || 'N/A',
      totalFeedback: feedback._count,
      capacityUsage: event.maxParticipants
        ? `${((event.currentParticipants / event.maxParticipants) * 100).toFixed(2)}%`
        : 'Unlimited',
    };
  }

  async incrementViewCount(eventId: string) {
    await this.prisma.event.update({
      where: { id: eventId },
      data: { viewCount: { increment: 1 } },
    });
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
      _count: { select: { registrations: true } },
    };
  }

  private _formatEventResponse(event: any) {
    return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      slug: event.slug,
      description: event.description,
      shortDescription: event.shortDescription,
      coverImage: event.coverImage,
      eventType: event.eventType,
      category: event.category,
      location: event.location,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      isOnline: event.isOnline,
      meetingLink: event.isOnline ? event.meetingLink : undefined,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      waitlistEnabled: event.waitlistEnabled,
      waitlistCount: event.waitlistCount,
      isFree: event.isFree,
      ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
      isActive: event.isActive,
      eventStatus: event.eventStatus,
      isFeatured: event.isFeatured,
      viewCount: event.viewCount,
      shareCount: event.shareCount,
      certificateEnabled: event.certificateEnabled,
      organizer: event.organizer,
      registrationsCount: event._count?.registrations || 0,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private _generateConfirmationCode(): string {
    return `EVT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private _generateQRCode(confirmationCode: string): string {
    // In production, use a QR code library to generate actual QR image
    return Buffer.from(confirmationCode).toString('base64');
  }

  private _decodeQRCode(qrCode: string): string {
    return Buffer.from(qrCode, 'base64').toString('utf-8');
  }

  private _calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
