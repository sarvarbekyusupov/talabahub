import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsUrl,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDraftDto {
  @ApiPropertyOptional({
    description: 'Draft title',
    example: 'My First Article',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Draft content as JSON',
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;
}

export class UpdateDraftDto extends PartialType(CreateDraftDto) {}

export class PublishArticleDto {
  @ApiProperty({
    description: 'Article title',
    example: 'How I Got My First Internship at Google',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Title must be at least 10 characters' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Article subtitle',
    example: 'A complete guide for Uzbek students',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiProperty({
    description: 'Article content as JSON (rich text structure)',
  })
  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;

  @ApiProperty({
    description: 'Featured image URL',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  featuredImageUrl: string;

  @ApiProperty({
    description: 'Tag IDs for the article',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[];
}

export class UpdateArticleDto {
  @ApiPropertyOptional({
    description: 'Article title',
    example: 'Updated Title',
    minLength: 10,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Article subtitle',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional({
    description: 'Article content as JSON',
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Featured image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  featuredImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Tag IDs for the article',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class ArticleFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['draft', 'pending', 'published', 'rejected'],
  })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'published', 'rejected'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by author username',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter by university ID',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  universityId?: number;

  @ApiPropertyOptional({
    description: 'Filter by tag slug',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Sort by',
    enum: ['latest', 'popular', 'trending'],
    default: 'latest',
  })
  @IsOptional()
  @IsEnum(['latest', 'popular', 'trending'])
  sort?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class TrackViewDto {
  @ApiProperty({
    description: 'Session ID for tracking',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Read percentage (0-100)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  readPercentage?: number;

  @ApiPropertyOptional({
    description: 'Time spent in seconds',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;

  @ApiPropertyOptional({
    description: 'Referrer URL',
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    enum: ['mobile', 'desktop', 'tablet'],
  })
  @IsOptional()
  @IsEnum(['mobile', 'desktop', 'tablet'])
  deviceType?: string;
}

export class ArticleStatsResponseDto {
  @ApiProperty() viewsCount: number;
  @ApiProperty() clapsCount: number;
  @ApiProperty() responsesCount: number;
  @ApiProperty() bookmarksCount: number;
  @ApiProperty() sharesCount: number;
}

export class DetailedStatsResponseDto extends ArticleStatsResponseDto {
  @ApiProperty() uniqueViewsCount: number;
  @ApiProperty() uniqueClappers: number;
  @ApiProperty() readRatio: number;
  @ApiProperty() avgReadTimeSeconds: number;
  @ApiProperty() viewsOverTime: any[];
  @ApiProperty() topReferrers: any[];
  @ApiProperty() deviceBreakdown: any;
}
