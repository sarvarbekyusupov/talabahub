import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResumesService } from '../services/resumes.service';
import {
  CreateResumeDto,
  UpdateResumeDto,
  QueryResumeDto,
  ExperienceDto,
  ResumeAnalyticsDto,
} from '../dto/resume.dto';

@ApiTags('Resumes')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  // ==========================================
  // RESUME CRUD ENDPOINTS
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Duplicate title' })
  async create(@Body() createResumeDto: CreateResumeDto, @Request() req) {
    return this.resumesService.create(createResumeDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean, description: 'Filter by public status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and summary' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  async findAll(@Query() query: QueryResumeDto, @Request() req) {
    return this.resumesService.findAll(query, req.user.id);
  }

  @Get('my-resumes')
  @ApiOperation({ summary: 'Get current user\'s resumes' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean, description: 'Filter by public status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and summary' })
  @ApiResponse({ status: 200, description: 'User resumes retrieved successfully' })
  async getUserResumes(@Query() query: QueryResumeDto, @Request() req) {
    return this.resumesService.getUserResumes(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.resumesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  async update(@Param('id') id: string, @Body() updateResumeDto: UpdateResumeDto, @Request() req) {
    return this.resumesService.update(id, updateResumeDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.resumesService.remove(id, req.user.id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID to duplicate' })
  @ApiQuery({ name: 'title', required: false, description: 'New title for duplicated resume' })
  @ApiResponse({ status: 201, description: 'Resume duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  async duplicate(@Param('id') id: string, @Query('title') title: string, @Request() req) {
    return this.resumesService.duplicateResume(id, req.user.id, title);
  }

  // ==========================================
  // EXPERIENCE MANAGEMENT ENDPOINTS
  // ==========================================

  @Post(':id/experience')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add experience to resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'Experience added successfully' })
  async addExperience(@Param('id') id: string, @Body() experience: ExperienceDto, @Request() req) {
    return this.resumesService.addExperience(id, experience, req.user.id);
  }

  @Patch(':id/experience/:index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update experience in resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiParam({ name: 'index', description: 'Experience index' })
  @ApiResponse({ status: 200, description: 'Experience updated successfully' })
  async updateExperience(
    @Param('id') id: string,
    @Param('index') index: number,
    @Body() experience: ExperienceDto,
    @Request() req,
  ) {
    return this.resumesService.updateExperience(id, index, experience, req.user.id);
  }

  @Delete(':id/experience/:index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove experience from resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiParam({ name: 'index', description: 'Experience index' })
  @ApiResponse({ status: 200, description: 'Experience removed successfully' })
  async removeExperience(@Param('id') id: string, @Param('index') index: number, @Request() req) {
    return this.resumesService.removeExperience(id, index, req.user.id);
  }

  // ==========================================
  // TEMPLATES ENDPOINTS
  // ==========================================

  @Get('templates/available')
  @ApiOperation({ summary: 'Get available resume templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getAvailableTemplates() {
    return this.resumesService.getAvailableTemplates();
  }

  // ==========================================
  // ANALYTICS ENDPOINTS
  // ==========================================

  @Get('analytics/my-stats')
  @ApiOperation({ summary: 'Get current user\'s resume analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getUserAnalytics(@Request() req) {
    return this.resumesService.getResumeAnalytics(req.user.id);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular public resumes' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of resumes to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Popular resumes retrieved successfully' })
  async getPopularResumes(@Query('limit') limit?: number) {
    return this.resumesService.getPopularResumes(limit);
  }
}