import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsEmail,
  MinLength,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBrandDto {
  @ApiProperty({
    example: 'Apple',
    description: 'Brand name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'apple',
    description: 'Brand slug (URL-friendly identifier)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    example: 'https://example.com/apple-logo.png',
    required: false,
    description: 'Brand logo URL',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiProperty({
    example: 'https://example.com/apple-banner.png',
    required: false,
    description: 'Brand banner URL',
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({
    example: 'Apple Inc. is a technology company specializing in consumer electronics.',
    required: false,
    description: 'Brand description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'https://www.apple.com',
    required: false,
    description: 'Brand website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    example: 'contact@apple.com',
    required: false,
    description: 'Brand contact email',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({
    example: '+1-234-567-8900',
    required: false,
    description: 'Brand contact phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiProperty({
    example: {
      instagram: 'https://instagram.com/apple',
      facebook: 'https://facebook.com/apple',
      twitter: 'https://twitter.com/apple',
    },
    required: false,
    description: 'Social media links',
  })
  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Category ID',
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiProperty({
    example: 5.0,
    default: 5.0,
    description: 'Commission rate percentage',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionRate?: number;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Is the brand active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is the brand featured',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    required: false,
    description: 'When the featured status expires',
  })
  @IsOptional()
  @IsString()
  featuredUntil?: string;
}
