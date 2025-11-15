import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Create a new event (Organizer/Admin only)
   */
  @Post()
  @AuditLog(AuditAction.CREATE, 'Event')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    schema: {
      example: {
        id: 'uuid',
        title: 'Tech Conference 2024',
        slug: 'tech-conference-2024',
        description: 'Annual tech conference',
        startDate: '2024-12-01T09:00:00Z',
        endDate: '2024-12-02T17:00:00Z',
        isOnline: false,
        location: 'Tashkent Convention Center',
        maxParticipants: 500,
        currentParticipants: 0,
        isFree: false,
        ticketPrice: '50000.00',
        organizer: {
          id: 'organizer-uuid',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        _count: { registrations: 0 },
      },
    },
  })
  async create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: any) {
    return this.eventsService.create(createEventDto, user.id);
  }

  /**
   * Get all events with optional filters (Public endpoint)
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Event type (e.g., workshop, conference, seminar)' })
  @ApiQuery({ name: 'isOnline', required: false, type: Boolean, description: 'Filter by online/offline' })
  @ApiQuery({ name: 'organizerId', required: false, type: String, description: 'Filter by organizer ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or description' })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    schema: {
      example: {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('isOnline') isOnline?: boolean,
    @Query('organizerId') organizerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.eventsService.findAll({
      page,
      limit,
      type,
      isOnline,
      organizerId,
      startDate,
      endDate,
      search,
    });
  }

  /**
   * Get user's event registrations (must be before :id route)
   */
  @Get('me/registrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user event registrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'User registrations retrieved successfully',
  })
  async getUserRegistrations(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getUserRegistrations(user.id, page, limit);
  }

  /**
   * Get event by ID (Public endpoint)
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  /**
   * Update event (Organizer only)
   */
  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Event')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only organizer can update' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  /**
   * Delete event (Organizer only)
   */
  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Event')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only organizer can delete' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.eventsService.remove(id, user.id);
  }

  /**
   * Register user for event
   */
  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Successfully registered for event' })
  @ApiResponse({ status: 400, description: 'Already registered or capacity full' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async registerForEvent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.registerUser(id, user.id);
  }

  /**
   * Unregister user from event
   */
  @Delete(':id/unregister')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister from an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Successfully unregistered from event' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async unregisterFromEvent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.unregisterUser(id, user.id);
  }

  /**
   * Get event attendees (Organizer only)
   */
  @Get(':id/attendees')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event attendees list' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Attendees retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - only organizer can view attendees' })
  async getEventAttendees(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getEventAttendees(id, user.id, page, limit);
  }

  /**
   * Mark user attendance (Organizer only)
   */
  @Post(':id/attendees/:userId/mark-attendance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark user attendance for event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Attendance marked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - only organizer can mark attendance' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async markAttendance(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.markAttendance(id, userId, user.id);
  }
}
