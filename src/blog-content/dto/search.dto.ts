import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchDto {
  @ApiProperty({
    description: 'Search query',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({
    description: 'Search type',
    enum: ['articles', 'students', 'tags'],
  })
  @IsOptional()
  @IsEnum(['articles', 'students', 'tags'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by university ID',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  universityId?: number;

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

export class SearchSuggestionsDto {
  @ApiProperty({
    description: 'Search query for suggestions',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}

export class SearchResultsResponseDto {
  @ApiProperty() results: any[];
  @ApiProperty() total: number;
  @ApiProperty() facets: {
    types: { articles: number; students: number; tags: number };
  };
}

export class SearchSuggestionsResponseDto {
  @ApiProperty() articles: { title: string; slug: string }[];
  @ApiProperty() students: { username: string; name: string }[];
  @ApiProperty() tags: { name: string; slug: string }[];
}
