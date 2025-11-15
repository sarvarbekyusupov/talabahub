import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsArray,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscountDto {
  @ApiProperty({ example: 1, description: 'Brand ID' })
  @IsInt()
  brandId: number;

  @ApiProperty({ example: 1, required: false, description: 'Category ID' })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiProperty({ example: 'Summer Sale Offer', description: 'Discount title' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Get 20% off on all items during summer',
    required: false,
    description: 'Discount description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Valid on purchases above 100,000 UZS. Not applicable on sale items.',
    required: false,
    description: 'Terms and conditions',
  })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiProperty({
    example: 'Visit the store and present the promo code at checkout',
    required: false,
    description: 'How to use the discount',
  })
  @IsOptional()
  @IsString()
  howToUse?: string;

  @ApiProperty({
    example: 'https://example.com/discount.jpg',
    required: false,
    description: 'Discount image URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    enum: ['percentage', 'fixed_amount', 'promo_code'],
    example: 'percentage',
    description: 'Type of discount',
  })
  @IsString()
  discountType: string;

  @ApiProperty({
    example: 20,
    description: 'Discount value (percentage or fixed amount)',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discountValue: number;

  @ApiProperty({
    example: 100000,
    required: false,
    description: 'Minimum purchase amount required',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPurchaseAmount?: number;

  @ApiProperty({
    example: 50000,
    required: false,
    description: 'Maximum discount amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({
    example: 'SUMMER20',
    required: false,
    description: 'Promo code',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  promoCode?: string;

  @ApiProperty({
    example: '2024-06-01T00:00:00Z',
    description: 'Start date of the discount',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2024-08-31T23:59:59Z',
    description: 'End date of the discount',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: 1,
    default: 1,
    description: 'Maximum times one user can use this discount',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @ApiProperty({
    example: 100,
    required: false,
    description: 'Total times this discount can be used across all users',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @ApiProperty({
    example: [1, 2, 3],
    required: false,
    description: 'Array of university IDs eligible for this discount',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  universityIds?: number[];

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Minimum course year eligible for this discount',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minCourseYear?: number;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Is the discount active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is the discount featured',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Is the discount exclusive',
  })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;
}
