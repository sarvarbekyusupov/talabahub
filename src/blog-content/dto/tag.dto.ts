import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'programming',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tag category',
    enum: ['study', 'career', 'life', 'tech', 'personal'],
  })
  @IsEnum(['study', 'career', 'life', 'tech', 'personal'])
  category: string;
}

export class TagFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: ['study', 'career', 'life', 'tech', 'personal'],
  })
  @IsOptional()
  @IsEnum(['study', 'career', 'life', 'tech', 'personal'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Show only popular tags',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  popular?: boolean;

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
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class TagResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() category: string;
  @ApiProperty() articleCount: number;
}

export class TagDetailsResponseDto extends TagResponseDto {
  @ApiProperty() topArticles: any[];
  @ApiProperty() latestArticles: any[];
  @ApiProperty() topWriters: any[];
}
