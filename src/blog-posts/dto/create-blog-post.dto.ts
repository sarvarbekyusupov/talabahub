import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  IsArray,
  IsUrl,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogPostDto {
  @ApiProperty({
    description: 'Blog post title',
    example: 'Getting Started with NestJS',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @ApiProperty({
    description: 'Blog post content (main body)',
    example: 'This is the detailed content of the blog post...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Content must be at least 10 characters long' })
  content: string;

  @ApiPropertyOptional({
    description: 'Blog post excerpt (short summary)',
    example: 'A brief summary of the blog post content',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Excerpt must be at least 10 characters long' })
  @MaxLength(500, { message: 'Excerpt must not exceed 500 characters' })
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @IsPositive()
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: 'https://example.com/image.jpg',
  })
  @IsUrl({}, { message: 'Featured image must be a valid URL' })
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Getting Started with NestJS - Complete Guide',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Meta title must not exceed 255 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example: 'Learn how to get started with NestJS framework',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Meta description must not exceed 500 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Meta keywords for SEO',
    example: ['nestjs', 'backend', 'typescript'],
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  metaKeywords?: string[];
}
