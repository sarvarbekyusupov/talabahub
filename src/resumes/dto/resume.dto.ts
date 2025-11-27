import { IsString, IsOptional, IsArray, IsBoolean, IsUUID, IsNotEmpty, IsEmail, IsDateString, IsNumber, ValidateNested, IsEnum, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Experience interfaces
export class ExperienceDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({ description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (null for current position)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Company location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Achievements' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

// Education interfaces
export class EducationDto {
  @ApiProperty({ description: 'Institution name' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ description: 'Degree title' })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiProperty({ description: 'Field of study' })
  @IsString()
  @IsNotEmpty()
  fieldOfStudy: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (null for current studies)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'GPA' })
  @IsOptional()
  @IsNumber()
  gpa?: number;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;
}

// Skills interfaces
export class SkillDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Skill level (1-5)' })
  @IsNumber()
  level: number;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;
}

// Language interfaces
export class LanguageDto {
  @ApiProperty({ description: 'Language name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Proficiency level' })
  @IsEnum(['Basic', 'Intermediate', 'Advanced', 'Native'])
  proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Native';
}

// Certification interfaces
export class CertificationDto {
  @ApiProperty({ description: 'Certification name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Issuing organization' })
  @IsString()
  @IsNotEmpty()
  issuer: string;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ description: 'Expiration date (null for no expiration)' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Credential ID' })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({ description: 'Certificate URL' })
  @IsOptional()
  @IsUrl()
  certificateUrl?: string;
}

// Project interfaces
export class ProjectDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Project description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (null for ongoing project)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Technologies used' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({ description: 'Project URL' })
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub URL' })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;
}

// Main DTOs
export class CreateResumeDto {
  @ApiProperty({ description: 'Resume title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Professional summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Work experience', type: [ExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiPropertyOptional({ description: 'Education', type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ description: 'Skills', type: [SkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({ description: 'Languages', type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({ description: 'Certifications', type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ description: 'Projects', type: [ProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @ApiPropertyOptional({ description: 'Resume template' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Make resume public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateResumeDto {
  @ApiPropertyOptional({ description: 'Resume title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Professional summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Work experience', type: [ExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiPropertyOptional({ description: 'Education', type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ description: 'Skills', type: [SkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({ description: 'Languages', type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({ description: 'Certifications', type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ description: 'Projects', type: [ProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @ApiPropertyOptional({ description: 'Resume file URL' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Resume template' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Make resume public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class QueryResumeDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Search in title and summary' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ResumeTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Template preview image URL' })
  @IsString()
  @IsUrl()
  previewUrl: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Is premium template' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

export class ResumeAnalyticsDto {
  @ApiProperty({ description: 'Resume ID' })
  @IsUUID()
  resumeId: string;

  @ApiProperty({ description: 'Date range start' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date range end' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Analytics type' })
  @IsOptional()
  @IsEnum(['views', 'downloads', 'shares'])
  type?: 'views' | 'downloads' | 'shares';
}