import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Create a new job posting
   * Only accessible by admin and partner roles
   */
  @Post()
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Create a new job posting (Admin/Partner only)' })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or company not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  /**
   * List all active jobs with filtering and pagination
   * Public endpoint - no authentication required
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active job postings with filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: Number,
    description: 'Filter by company ID',
  })
  @ApiQuery({
    name: 'jobType',
    required: false,
    type: String,
    enum: ['internship', 'part_time', 'full_time', 'freelance'],
    description: 'Filter by job type',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Filter by location (partial match)',
  })
  @ApiQuery({
    name: 'isRemote',
    required: false,
    type: Boolean,
    description: 'Filter by remote availability',
  })
  @ApiQuery({
    name: 'minCourseYear',
    required: false,
    type: Number,
    description: 'Filter by minimum course year',
  })
  @ApiQuery({
    name: 'isFeatured',
    required: false,
    type: Boolean,
    description: 'Filter by featured status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of jobs with pagination metadata',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: number,
    @Query('jobType') jobType?: string,
    @Query('location') location?: string,
    @Query('isRemote') isRemote?: boolean,
    @Query('minCourseYear') minCourseYear?: number,
    @Query('isFeatured') isFeatured?: boolean,
  ) {
    return this.jobsService.findAll(
      page,
      limit,
      companyId,
      jobType,
      location,
      isRemote,
      minCourseYear,
      undefined, // isActive is not exposed as query param
      isFeatured,
    );
  }

  /**
   * Get current user's job applications
   * Authenticated users only
   */
  @Get('me/applications')
  @ApiOperation({ summary: 'Get current user job applications' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'User applications with pagination metadata',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getUserApplications(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getUserApplications(user.id, page, limit);
  }

  /**
   * Get job details by ID
   * Public endpoint - no authentication required
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Job details with company information and application count',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  /**
   * Record a job view
   * Public endpoint - no authentication required
   */
  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Record a view for a job posting' })
  @ApiResponse({
    status: 201,
    description: 'View recorded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  recordView(@Param('id') id: string) {
    return this.jobsService.incrementViewCount(id);
  }

  /**
   * Get job statistics
   * Only accessible by admin and partner roles
   */
  @Get(':id/stats')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get job statistics (Admin/Partner only)' })
  @ApiResponse({
    status: 200,
    description: 'Job statistics including views, applications, and application status breakdown',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  getJobStatistics(@Param('id') id: string) {
    return this.jobsService.getJobStatistics(id);
  }

  /**
   * Apply for a job
   * Authenticated users only
   */
  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply for a job posting' })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Job is not active or application deadline has passed',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User has already applied for this job',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  createApplication(
    @Param('id') jobId: string,
    @CurrentUser() user: any,
    @Body() createJobApplicationDto: CreateJobApplicationDto,
  ) {
    return this.jobsService.createApplication(
      jobId,
      user.id,
      createJobApplicationDto,
    );
  }

  /**
   * Get applications for a specific job
   * Only accessible by admin and partner roles
   */
  @Get(':id/applications')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get applications for a job (Admin/Partner only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['pending', 'reviewed', 'interview', 'accepted', 'rejected'],
    description: 'Filter by application status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Job applications with pagination metadata',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  getJobApplications(
    @Param('id') jobId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getJobApplications(jobId, status, page, limit);
  }

  /**
   * Update job posting
   * Only accessible by admin and partner roles
   */
  @Patch(':id')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Update a job posting (Admin/Partner only)' })
  @ApiResponse({
    status: 200,
    description: 'Job updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or company not found',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, updateJobDto);
  }

  /**
   * Delete (soft delete) a job posting
   * Only accessible by admin and partner roles
   */
  @Delete(':id')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Delete a job posting (Admin/Partner only)' })
  @ApiResponse({
    status: 200,
    description: 'Job deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  /**
   * Update job application status
   * Only accessible by admin and partner roles
   */
  @Patch('applications/:applicationId/status')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({
    summary: 'Update job application status (Admin/Partner only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body() updateStatusDto: UpdateJobApplicationStatusDto,
  ) {
    return this.jobsService.updateApplicationStatus(
      applicationId,
      updateStatusDto.status,
      updateStatusDto.statusNotes,
      updateStatusDto.interviewDate ? new Date(updateStatusDto.interviewDate) : undefined,
      updateStatusDto.interviewLocation,
      updateStatusDto.interviewNotes,
    );
  }
}
