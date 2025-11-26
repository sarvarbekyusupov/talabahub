import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveDiscountDto {
  @ApiProperty({
    example: 'Discount meets all requirements',
    required: false,
    description: 'Approval notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDiscountDto {
  @ApiProperty({
    example: 'Discount value too high for the product category',
    description: 'Rejection reason',
  })
  @IsString()
  reason: string;
}

export class DiscountFilterDto {
  @ApiProperty({ required: false, description: 'Filter by brand ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  brandId?: number;

  @ApiProperty({ required: false, description: 'Filter by category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ required: false, description: 'Filter by university ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  universityId?: number;

  @ApiProperty({ required: false, description: 'Show only active discounts' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Show only featured discounts' })
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ required: false, description: 'Filter by discount type' })
  @IsOptional()
  @IsString()
  discountType?: string;

  @ApiProperty({ required: false, description: 'Sort by field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false, description: 'Sort order', example: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ default: 1, required: false, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ default: 20, required: false, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class AnalyticsQueryDto {
  @ApiProperty({ required: false, description: 'Start date for analytics' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date for analytics' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Group by period', example: 'day' })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}