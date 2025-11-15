import { IsString, IsOptional, IsInt, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name in Uzbek',
    example: 'Elektronika',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameUz: string;

  @ApiPropertyOptional({
    description: 'Category name in English',
    example: 'Electronics',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional({
    description: 'Category name in Russian',
    example: 'Электроника',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  nameRu?: string;

  @ApiProperty({
    description: 'URL-friendly slug for the category',
    example: 'elektronika',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    description: 'Icon name or URL for the category',
    example: 'electronics',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All kinds of electronic devices and accessories',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchical categories',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Display order of the category',
    example: 0,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
