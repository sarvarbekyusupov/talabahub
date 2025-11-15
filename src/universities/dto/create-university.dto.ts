import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUniversityDto {
  @ApiProperty({
    example: "O'zbekiston Milliy Universiteti",
    description: 'University name in Uzbek',
  })
  @IsString()
  @MinLength(3, { message: 'University name must be at least 3 characters long' })
  @MaxLength(255, { message: 'University name must not exceed 255 characters' })
  nameUz: string;

  @ApiProperty({
    example: 'National University of Uzbekistan',
    required: false,
    description: 'University name in English',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiProperty({
    example: 'Национальный университет Узбекистана',
    required: false,
    description: 'University name in Russian',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameRu?: string;

  @ApiProperty({
    example: 'nuu.uz',
    required: false,
    description: 'University email domain for student email verification',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emailDomain?: string;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    required: false,
    description: 'University logo URL',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;

  @ApiProperty({
    example: 'https://nuu.uz',
    required: false,
    description: 'University website URL',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiProperty({
    example: 'Tashkent, Uzbekistan',
    required: false,
    description: 'Full address of the university',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Tashkent',
    required: false,
    description: 'City where the university is located',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    example: 'Tashkent Region',
    required: false,
    description: 'Region where the university is located',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;
}
