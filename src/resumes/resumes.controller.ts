import {
  Controller,
  Get,
  Post,
  Put,
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
import { ResumesService } from './resumes.service';
import {
  CreateResumeDto,
  CreateResumeEducationDto,
  CreateResumeExperienceDto,
  CreateResumeSkillDto,
  CreateResumeLanguageDto,
  CreateResumeCertificationDto,
  CreateResumeProjectDto,
} from './dto/create-resume.dto';
import {
  UpdateResumeDto,
  UpdateResumeEducationDto,
  UpdateResumeExperienceDto,
} from './dto/update-resume.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Resumes')
@Controller('resumes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  // ==========================================
  // Resume CRUD
  // ==========================================

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  create(@CurrentUser() user: any, @Body() createResumeDto: CreateResumeDto) {
    return this.resumesService.create(user.id, createResumeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resumesService.findAll(user.id, page, limit);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get resume analytics for current user' })
  @ApiResponse({ status: 200, description: 'Resume analytics' })
  getAnalytics(@CurrentUser() user: any) {
    return this.resumesService.getResumeAnalytics(user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume details' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resumesService.findOne(id, user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateResumeDto: UpdateResumeDto,
  ) {
    return this.resumesService.update(id, user.id, updateResumeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resumesService.remove(id, user.id);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set resume as default' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume set as default' })
  setDefault(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resumesService.setDefault(id, user.id);
  }

  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Record resume view' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  recordView(@Param('id') id: string) {
    return this.resumesService.incrementViewCount(id);
  }

  @Post(':id/download')
  @Public()
  @ApiOperation({ summary: 'Record resume download' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  recordDownload(@Param('id') id: string) {
    return this.resumesService.incrementDownloadCount(id);
  }

  // ==========================================
  // Education Management
  // ==========================================

  @Post(':resumeId/educations')
  @ApiOperation({ summary: 'Add education to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'Education added successfully' })
  addEducation(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeEducationDto,
  ) {
    return this.resumesService.addEducation(resumeId, user.id, dto);
  }

  @Patch('educations/:educationId')
  @ApiOperation({ summary: 'Update education' })
  @ApiParam({ name: 'educationId', description: 'Education ID' })
  updateEducation(
    @Param('educationId') educationId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateResumeEducationDto,
  ) {
    return this.resumesService.updateEducation(educationId, user.id, dto);
  }

  @Delete('educations/:educationId')
  @ApiOperation({ summary: 'Remove education' })
  @ApiParam({ name: 'educationId', description: 'Education ID' })
  removeEducation(
    @Param('educationId') educationId: string,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.removeEducation(educationId, user.id);
  }

  // ==========================================
  // Experience Management
  // ==========================================

  @Post(':resumeId/experiences')
  @ApiOperation({ summary: 'Add experience to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  addExperience(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeExperienceDto,
  ) {
    return this.resumesService.addExperience(resumeId, user.id, dto);
  }

  @Patch('experiences/:experienceId')
  @ApiOperation({ summary: 'Update experience' })
  @ApiParam({ name: 'experienceId', description: 'Experience ID' })
  updateExperience(
    @Param('experienceId') experienceId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateResumeExperienceDto,
  ) {
    return this.resumesService.updateExperience(experienceId, user.id, dto);
  }

  @Delete('experiences/:experienceId')
  @ApiOperation({ summary: 'Remove experience' })
  @ApiParam({ name: 'experienceId', description: 'Experience ID' })
  removeExperience(
    @Param('experienceId') experienceId: string,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.removeExperience(experienceId, user.id);
  }

  // ==========================================
  // Skills Management
  // ==========================================

  @Post(':resumeId/skills')
  @ApiOperation({ summary: 'Add skill to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  addSkill(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeSkillDto,
  ) {
    return this.resumesService.addSkill(resumeId, user.id, dto);
  }

  @Delete('skills/:skillId')
  @ApiOperation({ summary: 'Remove skill' })
  @ApiParam({ name: 'skillId', description: 'Skill ID' })
  removeSkill(@Param('skillId') skillId: string, @CurrentUser() user: any) {
    return this.resumesService.removeSkill(skillId, user.id);
  }

  @Put(':resumeId/skills')
  @ApiOperation({ summary: 'Bulk update skills' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  bulkUpdateSkills(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() skills: CreateResumeSkillDto[],
  ) {
    return this.resumesService.bulkUpdateSkills(resumeId, user.id, skills);
  }

  // ==========================================
  // Languages Management
  // ==========================================

  @Post(':resumeId/languages')
  @ApiOperation({ summary: 'Add language to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  addLanguage(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeLanguageDto,
  ) {
    return this.resumesService.addLanguage(resumeId, user.id, dto);
  }

  @Delete('languages/:languageId')
  @ApiOperation({ summary: 'Remove language' })
  @ApiParam({ name: 'languageId', description: 'Language ID' })
  removeLanguage(
    @Param('languageId') languageId: string,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.removeLanguage(languageId, user.id);
  }

  // ==========================================
  // Certifications Management
  // ==========================================

  @Post(':resumeId/certifications')
  @ApiOperation({ summary: 'Add certification to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  addCertification(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeCertificationDto,
  ) {
    return this.resumesService.addCertification(resumeId, user.id, dto);
  }

  @Delete('certifications/:certificationId')
  @ApiOperation({ summary: 'Remove certification' })
  @ApiParam({ name: 'certificationId', description: 'Certification ID' })
  removeCertification(
    @Param('certificationId') certificationId: string,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.removeCertification(certificationId, user.id);
  }

  // ==========================================
  // Projects Management
  // ==========================================

  @Post(':resumeId/projects')
  @ApiOperation({ summary: 'Add project to resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  addProject(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResumeProjectDto,
  ) {
    return this.resumesService.addProject(resumeId, user.id, dto);
  }

  @Delete('projects/:projectId')
  @ApiOperation({ summary: 'Remove project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  removeProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.resumesService.removeProject(projectId, user.id);
  }
}
