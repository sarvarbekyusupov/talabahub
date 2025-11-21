import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsObject,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Clap DTOs
export class ClapDto {
  @ApiProperty({
    description: 'Number of claps (1-50)',
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  count: number;
}

export class ClapResponseDto {
  @ApiProperty() totalClaps: number;
  @ApiProperty() yourClaps: number;
}

// Response (Comment) DTOs
export class CreateResponseDto {
  @ApiProperty({
    description: 'Response content as JSON (rich text)',
  })
  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Parent response ID for replies',
  })
  @IsOptional()
  @IsUUID()
  parentResponseId?: string;

  @ApiPropertyOptional({
    description: 'Highlighted text from article',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  highlightedText?: string;

  @ApiPropertyOptional({
    description: 'Highlight start position',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  highlightPositionStart?: number;

  @ApiPropertyOptional({
    description: 'Highlight end position',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  highlightPositionEnd?: number;
}

export class UpdateResponseDto {
  @ApiProperty({
    description: 'Updated response content',
  })
  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;
}

export class ResponseFilterDto {
  @ApiPropertyOptional({
    description: 'Sort responses',
    enum: ['best', 'newest', 'oldest'],
    default: 'best',
  })
  @IsOptional()
  @IsEnum(['best', 'newest', 'oldest'])
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

// Bookmark DTOs
export class CreateBookmarkDto {
  @ApiPropertyOptional({
    description: 'Collection ID to add bookmark to',
  })
  @IsOptional()
  @IsUUID()
  collectionId?: string;
}

export class MoveBookmarkDto {
  @ApiProperty({
    description: 'Target collection ID',
  })
  @IsUUID()
  collectionId: string;
}

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Collection name',
    example: 'Career Resources',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Collection description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCollectionDto {
  @ApiPropertyOptional({
    description: 'Collection name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Collection description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Share DTO
export class ShareDto {
  @ApiProperty({
    description: 'Platform shared to',
    enum: ['telegram', 'whatsapp', 'facebook', 'twitter', 'copy_link', 'instagram'],
  })
  @IsEnum(['telegram', 'whatsapp', 'facebook', 'twitter', 'copy_link', 'instagram'])
  platform: string;
}

// Report DTO
export class CreateReportDto {
  @ApiProperty({
    description: 'Report reason',
    enum: ['spam', 'inappropriate', 'harassment', 'plagiarism', 'other'],
  })
  @IsEnum(['spam', 'inappropriate', 'harassment', 'plagiarism', 'other'])
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
