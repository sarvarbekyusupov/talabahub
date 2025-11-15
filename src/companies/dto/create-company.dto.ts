import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDecimal,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUrl,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Google', description: 'Company name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'google', description: 'Company slug (URL-friendly)' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    example: 'https://example.com/logo.jpg',
    required: false,
    description: 'Logo URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiProperty({
    example: 'https://example.com/banner.jpg',
    required: false,
    description: 'Banner URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @ApiProperty({
    example: 'Google is a search engine company',
    required: false,
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'https://google.com',
    required: false,
    description: 'Company website',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiProperty({
    example: 'contact@google.com',
    required: false,
    description: 'Company email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    example: '+1-650-253-0000',
    required: false,
    description: 'Company phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    example: '1600 Amphitheatre Parkway, Mountain View, CA',
    required: false,
    description: 'Company address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Technology',
    required: false,
    description: 'Industry sector',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiProperty({
    example: '5000+',
    required: false,
    description: 'Company size (e.g., 1-50, 51-200, 201-500, 501-1000, 1000+)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;

  @ApiProperty({
    example: 1998,
    required: false,
    description: 'Year company was founded',
  })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  foundedYear?: number;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Is company active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is company verified',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
