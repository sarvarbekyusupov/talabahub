import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
// Temporary types until Prisma migration
type ResumePrivacy = 'public' | 'private' | 'employers_only';
type LanguageProficiency = 'native' | 'fluent' | 'intermediate' | 'basic';

export class CreateResumeEducationDto {
  @ApiProperty({ example: 'Harvard University' })
  @IsString()
  @MaxLength(255)
  institution: string;

  @ApiProperty({ example: 'Bachelor of Science' })
  @IsString()
  @MaxLength(100)
  degree: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @MaxLength(255)
  fieldOfStudy: string;

  @ApiProperty({ example: '2020-09-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 3.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  @ApiPropertyOptional({ example: 'Dean\'s List, Research Assistant' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateResumeExperienceDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @MaxLength(255)
  company: string;

  @ApiProperty({ example: 'Software Engineer Intern' })
  @IsString()
  @MaxLength(255)
  position: string;

  @ApiPropertyOptional({ example: 'Mountain View, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiProperty({ example: '2023-06-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2023-09-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 'Developed backend services using Node.js' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['Improved API response time by 40%', 'Led team of 3 developers'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

export class CreateResumeSkillDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Technical', enum: ['Technical', 'Soft Skills', 'Tools', 'Languages'] })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 4, description: 'Skill level from 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  level?: number;
}

export class CreateResumeLanguageDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  @MaxLength(50)
  language: string;

  @ApiProperty({ enum: ['native', 'fluent', 'intermediate', 'basic'] })
  @IsString()
  proficiency: LanguageProficiency;
}

export class CreateResumeCertificationDto {
  @ApiProperty({ example: 'AWS Solutions Architect' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  @IsString()
  @MaxLength(255)
  organization: string;

  @ApiProperty({ example: '2023-01-15' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'ABC123XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  credentialId?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/ABC123' })
  @IsOptional()
  @IsUrl()
  credentialUrl?: string;
}

export class CreateResumeProjectDto {
  @ApiProperty({ example: 'E-commerce Platform' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Built a full-stack e-commerce platform using React and Node.js' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: ['React', 'Node.js', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({ example: '2023-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2023-06-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateResumeDto {
  @ApiProperty({ example: 'Software Engineer Resume' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'Experienced software engineer with focus on backend development' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Tashkent, Uzbekistan' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/resume.pdf' })
  @IsOptional()
  @IsUrl()
  pdfUrl?: string;

  @ApiPropertyOptional({ enum: ['public', 'private', 'employers_only'], default: 'private' })
  @IsOptional()
  @IsString()
  privacy?: ResumePrivacy;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: [CreateResumeEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeEducationDto)
  educations?: CreateResumeEducationDto[];

  @ApiPropertyOptional({ type: [CreateResumeExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeExperienceDto)
  experiences?: CreateResumeExperienceDto[];

  @ApiPropertyOptional({ type: [CreateResumeSkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeSkillDto)
  skills?: CreateResumeSkillDto[];

  @ApiPropertyOptional({ type: [CreateResumeLanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeLanguageDto)
  languages?: CreateResumeLanguageDto[];

  @ApiPropertyOptional({ type: [CreateResumeCertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeCertificationDto)
  certifications?: CreateResumeCertificationDto[];

  @ApiPropertyOptional({ type: [CreateResumeProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResumeProjectDto)
  projects?: CreateResumeProjectDto[];
}
