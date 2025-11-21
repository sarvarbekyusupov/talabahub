import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimDiscountDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Device ID for fraud prevention',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    example: 41.2995,
    required: false,
    description: 'User latitude for location verification',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  latitude?: number;

  @ApiProperty({
    example: 69.2401,
    required: false,
    description: 'User longitude for location verification',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  longitude?: number;
}

export class VerifyClaimDto {
  @ApiProperty({
    example: 'STUDENT-A7F9-2024',
    description: 'Claim code to verify',
  })
  @IsString()
  claimCode: string;

  @ApiProperty({
    example: 150000,
    required: false,
    description: 'Transaction amount in UZS',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  transactionAmount?: number;

  @ApiProperty({
    example: 'Customer showed valid student ID',
    required: false,
    description: 'Verification notes',
  })
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

export class RedeemClaimDto {
  @ApiProperty({
    example: 150000,
    description: 'Transaction amount in UZS',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  transactionAmount: number;

  @ApiProperty({
    example: 30000,
    required: false,
    description: 'Actual discount amount applied',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiProperty({
    example: 'Successfully applied',
    required: false,
    description: 'Verification notes',
  })
  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @ApiProperty({
    example: 41.2995,
    required: false,
    description: 'Redemption location latitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  redeemLat?: number;

  @ApiProperty({
    example: 69.2401,
    required: false,
    description: 'Redemption location longitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  redeemLng?: number;
}

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

  @ApiProperty({ required: false, description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Filter by seasonal tag' })
  @IsOptional()
  @IsString()
  seasonalTag?: string;

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

  @ApiProperty({ required: false, description: 'User latitude for location-based sorting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLat?: number;

  @ApiProperty({ required: false, description: 'User longitude for location-based sorting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLng?: number;
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

export class FraudAlertActionDto {
  @ApiProperty({
    example: 'confirmed',
    description: 'New status for the alert',
  })
  @IsString()
  status: 'investigating' | 'confirmed' | 'dismissed';

  @ApiProperty({
    example: 'User confirmed to have multiple accounts',
    required: false,
    description: 'Resolution notes',
  })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({
    example: 'account_suspended',
    required: false,
    description: 'Action taken',
  })
  @IsOptional()
  @IsString()
  actionTaken?: string;
}
