import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApproveArticleDto {
  @ApiPropertyOptional({
    description: 'Feature the article',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class RejectArticleDto {
  @ApiProperty({
    description: 'Rejection reason',
    example: 'Content does not meet quality standards',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class FeatureArticleDto {
  @ApiProperty({
    description: 'Feature duration',
    enum: ['24h', 'week'],
  })
  @IsEnum(['24h', 'week'])
  duration: string;
}

export class PendingArticlesFilterDto {
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

export class ReportsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'reviewed', 'resolved', 'dismissed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: ['article', 'response'],
  })
  @IsOptional()
  @IsEnum(['article', 'response'])
  type?: string;

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

export class ResolveReportDto {
  @ApiProperty({
    description: 'Action taken',
    enum: ['removed', 'warned', 'dismissed'],
  })
  @IsEnum(['removed', 'warned', 'dismissed'])
  action: string;

  @ApiPropertyOptional({
    description: 'Notes about the resolution',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class WarnUserDto {
  @ApiProperty({
    description: 'Warning reason',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class SuspendUserDto {
  @ApiProperty({
    description: 'Suspension duration',
    enum: ['7d', '30d', 'permanent'],
  })
  @IsEnum(['7d', '30d', 'permanent'])
  duration: string;

  @ApiProperty({
    description: 'Suspension reason',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class PlatformAnalyticsResponseDto {
  @ApiProperty() totalArticles: number;
  @ApiProperty() totalStudentWriters: number;
  @ApiProperty() totalViews: number;
  @ApiProperty() totalClaps: number;
  @ApiProperty() activeWritersThisMonth: number;
  @ApiProperty() articlesPending: number;
  @ApiProperty() reportsPending: number;
  @ApiProperty() topUniversities: any[];
  @ApiProperty() topCategories: any[];
  @ApiProperty() growthMetrics: any[];
}
