import { IsString, IsEmail, IsOptional, IsUrl, IsNumber, IsPhoneNumber, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEducationPartnerDto {
  @ApiProperty({
    example: 'Tech Academy Uzbekistan',
    description: 'Name of the education partner',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'tech-academy-uzbekistan',
    description: 'URL-friendly slug for the partner',
  })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'URL to the partner logo',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/banner.png',
    description: 'URL to the partner banner',
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({
    example: 'Leading technology education provider',
    description: 'Detailed description of the education partner',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://techacademy.uz',
    description: 'Partner website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: 'contact@techacademy.uz',
    description: 'Contact email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+998 71 200 0000',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsPhoneNumber('UZ')
  phone?: string;

  @ApiPropertyOptional({
    example: 'Tashkent, Uzbekistan',
    description: 'Physical address of the education partner',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: {
      facebook: 'https://facebook.com/techacademy',
      instagram: 'https://instagram.com/techacademy',
      linkedin: 'https://linkedin.com/company/techacademy',
    },
    description: 'Social media links in JSON format',
  })
  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;

  @ApiPropertyOptional({
    example: 15.5,
    description: 'Commission rate percentage for the partner',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
