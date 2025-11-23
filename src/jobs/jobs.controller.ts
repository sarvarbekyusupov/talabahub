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
  ApiParam,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VerifiedUserGuard } from '../verification/guards/verified-user.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

// Temporary type until Prisma migration
type JobApplicationStatusEnum = 'applied' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'hired' | 'rejected' | 'withdrawn';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ==========================================
  // Job CRUD Operations
  // ==========================================

  @Post()
  @AuditLog(AuditAction.CREATE, 'Job')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Create a new job posting (Admin/Partner only)' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or company not found' })
  create(@Body() createJobDto: CreateJobDto, @CurrentUser() user: any) {
    return this.jobsService.create(createJobDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active job postings with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'jobType', required: false, enum: ['internship', 'part_time', 'full_time', 'freelance'] })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'isRemote', required: false, type: Boolean })
  @ApiQuery({ name: 'minCourseYear', required: false, type: Number })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'minSalary', required: false, type: Number })
  @ApiQuery({ name: 'maxSalary', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'experienceLevel', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of jobs with pagination' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: number,
    @Query('categoryId') categoryId?: number,
    @Query('jobType') jobType?: string,
    @Query('location') location?: string,
    @Query('isRemote') isRemote?: boolean,
    @Query('minCourseYear') minCourseYear?: number,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('minSalary') minSalary?: number,
    @Query('maxSalary') maxSalary?: number,
    @Query('search') search?: string,
    @Query('experienceLevel') experienceLevel?: string,
  ) {
    return this.jobsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      {
        companyId: companyId ? Number(companyId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        jobType,
        location,
        isRemote,
        minCourseYear: minCourseYear ? Number(minCourseYear) : undefined,
        isFeatured,
        minSalary: minSalary ? Number(minSalary) : undefined,
        maxSalary: maxSalary ? Number(maxSalary) : undefined,
        search,
        experienceLevel,
      },
    );
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all job categories' })
  @ApiResponse({ status: 200, description: 'List of job categories' })
  getCategories() {
    return this.jobsService.getJobCategories();
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get recommended jobs for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recommended jobs' })
  getRecommendations(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getRecommendedJobs(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('me/applications')
  @ApiOperation({ summary: 'Get current user job applications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['applied', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'hired', 'rejected', 'withdrawn'] })
  @ApiResponse({ status: 200, description: 'User applications' })
  getUserApplications(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: JobApplicationStatusEnum,
  ) {
    return this.jobsService.getUserApplications(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Get('pending-approvals')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get jobs pending approval (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Jobs pending approval' })
  getPendingApprovals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getPendingApprovals(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('company/:companyId/analytics')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get analytics for all jobs of a company' })
  @ApiParam({ name: 'companyId', type: Number })
  @ApiResponse({ status: 200, description: 'Company jobs analytics' })
  getCompanyAnalytics(@Param('companyId') companyId: string) {
    return this.jobsService.getPartnerJobsAnalytics(Number(companyId));
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job details by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Record a view for a job posting' })
  @ApiResponse({ status: 201, description: 'View recorded' })
  recordView(@Param('id') id: string) {
    return this.jobsService.incrementViewCount(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get job statistics (Admin/Partner only)' })
  @ApiResponse({ status: 200, description: 'Job statistics' })
  getJobStatistics(@Param('id') id: string) {
    return this.jobsService.getJobStatistics(id);
  }

  @Post(':id/apply')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Apply for a job posting (Verified students only)' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 400, description: 'Job not active or deadline passed' })
  @ApiResponse({ status: 403, description: 'Student verification required' })
  @ApiResponse({ status: 409, description: 'Already applied' })
  createApplication(
    @Param('id') jobId: string,
    @CurrentUser() user: any,
    @Body() createJobApplicationDto: CreateJobApplicationDto,
  ) {
    return this.jobsService.createApplication(jobId, user.id, createJobApplicationDto);
  }

  @Get(':id/applications')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get applications for a job (Admin/Partner only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'universityId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Job applications' })
  getJobApplications(
    @Param('id') jobId: string,
    @Query('status') status?: JobApplicationStatusEnum,
    @Query('universityId') universityId?: number,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getJobApplications(
      jobId,
      {
        status,
        universityId: universityId ? Number(universityId) : undefined,
        search,
      },
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Job')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Update a job posting (Admin/Partner only)' })
  @ApiResponse({ status: 200, description: 'Job updated' })
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.update(id, updateJobDto, user.id);
  }

  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Job')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Delete a job posting (Admin/Partner only)' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  // ==========================================
  // Job Approval Workflow
  // ==========================================

  @Post(':id/approve')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Approve a job posting (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job approved' })
  approveJob(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
  ) {
    return this.jobsService.approveJob(id, user.id, notes);
  }

  @Post(':id/reject')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Reject a job posting (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job rejected' })
  rejectJob(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.jobsService.rejectJob(id, user.id, reason);
  }

  // ==========================================
  // Application Management
  // ==========================================

  @Patch('applications/:applicationId/status')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Update job application status (Admin/Partner only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: any,
    @Body() updateStatusDto: UpdateJobApplicationStatusDto,
  ) {
    return this.jobsService.updateApplicationStatus(
      applicationId,
      updateStatusDto.status as JobApplicationStatusEnum,
      user.id,
      {
        statusNotes: updateStatusDto.statusNotes,
        interviewDate: updateStatusDto.interviewDate ? new Date(updateStatusDto.interviewDate) : undefined,
        interviewLocation: updateStatusDto.interviewLocation,
        interviewNotes: updateStatusDto.interviewNotes,
      },
    );
  }

  @Post('applications/:applicationId/withdraw')
  @ApiOperation({ summary: 'Withdraw job application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn' })
  withdrawApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.jobsService.withdrawApplication(applicationId, user.id, reason);
  }

  @Get('applications/:applicationId/history')
  @ApiOperation({ summary: 'Get application status history' })
  @ApiResponse({ status: 200, description: 'Status history' })
  getApplicationHistory(@Param('applicationId') applicationId: string) {
    return this.jobsService.getApplicationStatusHistory(applicationId);
  }
}
