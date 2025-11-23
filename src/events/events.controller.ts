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
import {
  RegisterEventDto,
  SubmitFeedbackDto,
  SelfCheckInDto,
  CheckInByQRDto,
  CancelEventDto,
} from './dto/register-event.dto';
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
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==========================================
  // Event CRUD Operations
  // ==========================================

  @Post()
  @AuditLog(AuditAction.CREATE, 'Event')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Create a new event (Organizer/Admin only)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: any) {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isOnline', required: false, type: Boolean })
  @ApiQuery({ name: 'organizerId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
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

  @Get('me/registrations')
  @ApiOperation({ summary: 'Get current user event registrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User registrations retrieved' })
  async getUserRegistrations(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getUserRegistrations(user.id, page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/ticket-types')
  @Public()
  @ApiOperation({ summary: 'Get ticket types for an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Ticket types retrieved' })
  async getTicketTypes(@Param('id') id: string) {
    return this.eventsService.getTicketTypes(id);
  }

  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Event')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Update an event (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Event')
  @HttpCode(204)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Delete an event (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.eventsService.remove(id, user.id);
  }

  // ==========================================
  // Event Status Workflow
  // ==========================================

  @Post(':id/publish')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Publish an event (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event published' })
  async publishEvent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.publishEvent(id, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Cancel an event (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event cancelled' })
  async cancelEvent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() cancelDto: CancelEventDto,
  ) {
    return this.eventsService.cancelEvent(id, user.id, cancelDto.reason ?? '');
  }

  // ==========================================
  // Registration Management
  // ==========================================

  @Post(':id/register')
  @ApiOperation({ summary: 'Register for an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Successfully registered' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  @ApiResponse({ status: 409, description: 'Already registered' })
  async registerForEvent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() registerDto: RegisterEventDto,
  ) {
    return this.eventsService.registerUser(
      id,
      user.id,
      registerDto.ticketTypeId,
      registerDto.answers,
    );
  }

  @Delete(':id/unregister')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unregister from an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Successfully unregistered' })
  async unregisterFromEvent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.unregisterUser(id, user.id);
  }

  @Get(':id/waitlist')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get event waitlist (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Waitlist retrieved' })
  async getWaitlist(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getWaitlist(
      id,
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ==========================================
  // Attendee Management
  // ==========================================

  @Get(':id/attendees')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get event attendees list (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Attendees retrieved' })
  async getEventAttendees(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getEventAttendees(id, user.id, page, limit);
  }

  // ==========================================
  // Check-in System
  // ==========================================

  @Post(':id/check-in/qr')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Check in attendee by QR code (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Check-in successful' })
  @ApiResponse({ status: 400, description: 'Invalid QR code or already checked in' })
  async checkInByQR(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() checkInDto: CheckInByQRDto,
  ) {
    return this.eventsService.checkInByQR(checkInDto.qrCode, user.id);
  }

  @Post(':id/attendees/:userId/check-in')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Manually check in attendee (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Check-in successful' })
  async manualCheckIn(
    @Param('id') eventId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.checkInManual(eventId, userId, user.id);
  }

  @Post(':id/self-check-in')
  @ApiOperation({ summary: 'Self check-in for event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Self check-in successful' })
  @ApiResponse({ status: 400, description: 'Not within geo-fence or event not active' })
  async selfCheckIn(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() selfCheckInDto: SelfCheckInDto,
  ) {
    return this.eventsService.selfCheckIn(
      id,
      user.id,
      selfCheckInDto.latitude,
      selfCheckInDto.longitude,
    );
  }

  @Post(':id/attendees/:userId/mark-attendance')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Mark user attendance for event (legacy)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Attendance marked' })
  async markAttendance(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.markAttendance(id, userId, user.id);
  }

  // ==========================================
  // Feedback & Certificates
  // ==========================================

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback for an event' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Feedback submitted' })
  @ApiResponse({ status: 400, description: 'Must attend event to provide feedback' })
  async submitFeedback(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() feedbackDto: SubmitFeedbackDto,
  ) {
    return this.eventsService.submitFeedback(
      id,
      user.id,
      feedbackDto.rating,
      feedbackDto.comment,
    );
  }

  @Get(':id/certificate')
  @ApiOperation({ summary: 'Get attendance certificate' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Certificate generated' })
  @ApiResponse({ status: 400, description: 'Must attend event to get certificate' })
  async getCertificate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.generateCertificate(id, user.id);
  }

  // ==========================================
  // Analytics
  // ==========================================

  @Get(':id/analytics')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get event analytics (Organizer only)' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getEventAnalytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.getEventAnalytics(id, user.id);
  }
}
