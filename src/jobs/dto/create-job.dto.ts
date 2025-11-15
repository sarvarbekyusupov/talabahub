import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDecimal,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @ApiProperty({ example: 1, description: 'Company ID' })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: 'Senior Developer', description: 'Job title' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'We are looking for a senior developer...',
    description: 'Job description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: '5+ years of experience in TypeScript...',
    required: false,
    description: 'Job requirements',
  })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiProperty({
    example: 'Build and maintain our platform...',
    required: false,
    description: 'Job responsibilities',
  })
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiProperty({
    example: 'Health insurance, 401k...',
    required: false,
    description: 'Job benefits',
  })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiProperty({
    enum: ['internship', 'part_time', 'full_time', 'freelance'],
    example: 'full_time',
    description: 'Type of job',
  })
  @IsEnum(['internship', 'part_time', 'full_time', 'freelance'])
  jobType: string;

  @ApiProperty({
    example: 'San Francisco, CA',
    required: false,
    description: 'Job location',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is job remote',
  })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({
    example: 100000,
    required: false,
    description: 'Minimum salary',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMin?: number;

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Maximum salary',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMax?: number;

  @ApiProperty({
    example: 'USD',
    default: 'UZS',
    description: 'Salary currency',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  salaryCurrency?: string;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Is job paid',
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Minimum course year required',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minCourseYear?: number;

  @ApiProperty({
    example: ['TypeScript', 'NestJS', 'PostgreSQL'],
    required: false,
    description: 'Required skills',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiProperty({
    example: ['GraphQL', 'Kubernetes'],
    required: false,
    description: 'Preferred skills',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @ApiProperty({
    example: ['English', 'Russian'],
    required: false,
    description: 'Languages required',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    required: false,
    description: 'Application deadline',
  })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiProperty({
    example: 3,
    default: 1,
    description: 'Total number of positions',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPositions?: number;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Is job active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is job featured',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
