import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  IsDate,
  IsDecimal,
} from 'class-validator';
import { CourseLevel } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({
    example: 1,
    description: 'Education partner ID',
  })
  @IsInt()
  partnerId: number;

  @ApiProperty({
    example: 1,
    description: 'Category ID',
    required: false,
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiProperty({
    example: 'Introduction to Web Development',
    description: 'Course title',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'intro-to-web-development',
    description: 'Unique course slug',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    example: 'Learn the fundamentals of web development...',
    description: 'Detailed course description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Module 1: HTML Basics\nModule 2: CSS...',
    description: 'Course syllabus',
    required: false,
  })
  @IsOptional()
  @IsString()
  syllabus?: string;

  @ApiProperty({
    example: ['Build responsive websites', 'Master HTML & CSS'],
    description: 'Learning outcomes',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @ApiProperty({
    example: 'https://example.com/thumbnail.jpg',
    description: 'Thumbnail image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({
    example: 'https://example.com/promo.mp4',
    description: 'Promotional video URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  promoVideoUrl?: string;

  @ApiProperty({
    enum: CourseLevel,
    example: CourseLevel.beginner,
    description: 'Course difficulty level',
  })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({
    example: 40,
    description: 'Course duration in hours',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number;

  @ApiProperty({
    example: 8,
    description: 'Course duration in weeks',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @ApiProperty({
    example: 'uz',
    description: 'Course language code',
    default: 'uz',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiProperty({
    example: '99.99',
    description: 'Original course price',
  })
  @IsDecimal()
  originalPrice: string;

  @ApiProperty({
    example: '79.99',
    description: 'Discounted course price',
    required: false,
  })
  @IsOptional()
  @IsDecimal()
  discountPrice?: string;

  @ApiProperty({
    example: 20,
    description: 'Discount percentage',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiProperty({
    example: 'UZS',
    description: 'Currency code',
    default: 'UZS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({
    example: ['Basic programming knowledge'],
    description: 'Course prerequisites',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({
    example: ['Students', 'Professionals'],
    description: 'Target audience',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiProperty({
    example: '2024-01-15',
    description: 'Course start date',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    example: '2024-03-15',
    description: 'Course end date',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    example: 'Classes every Monday and Wednesday at 7 PM',
    description: 'Schedule information',
    required: false,
  })
  @IsOptional()
  @IsString()
  scheduleInfo?: string;

  @ApiProperty({
    example: true,
    description: 'Is course active',
    default: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    description: 'Is course featured',
    default: false,
  })
  @IsOptional()
  isFeatured?: boolean;
}
