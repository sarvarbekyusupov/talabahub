import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString, IsEnum, IsUrl } from 'class-validator';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CreateArticleDto {
  @ApiProperty({ example: '10 Tips for Job Interview Success' })
  @IsString()
  title: string;

  @ApiProperty({ example: '10-tips-for-job-interview-success' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'A comprehensive guide to acing your job interviews...' })
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: 'Lorem ipsum dolor sit amet...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  featuredImage?: string;

  @ApiPropertyOptional({ example: 'Job Interview Tips - Career Guide' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Learn the best job interview techniques...' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: ['interview', 'jobs', 'career', 'tips'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  readTimeMinutes?: number;

  @ApiPropertyOptional({ example: 'https://example.com/category/image.jpg' })
  @IsOptional()
  @IsUrl()
  categoryImageUrl?: string;

  @ApiPropertyOptional({ example: ['tag1', 'tag2'] })
  @IsOptional()
  @IsArray()
  tagNames?: string[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ enum: ArticleStatus, default: ArticleStatus.DRAFT })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}

export class UpdateArticleDto {
  @ApiPropertyOptional({ example: 'Updated Article Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'updated-article-slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Updated excerpt...' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ example: 'Updated content...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
  @IsOptional()
  @IsUrl()
  featuredImage?: string;

  @ApiPropertyOptional({ example: 'updated meta title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'updated meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: ['updated', 'keywords'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  readTimeMinutes?: number;

  @ApiPropertyOptional({ enum: ArticleStatus })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ example: ['tag1', 'tag2'] })
  @IsOptional()
  @IsArray()
  tagNames?: string[];
}

export class QueryArticlesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'interview' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'published' })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ example: ['tag1', 'tag2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'authorId' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}