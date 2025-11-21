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
  Max,
  MinLength,
  MaxLength,
  Matches,
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
    enum: ['percentage', 'fixed_amount', 'promo_code', 'buy_one_get_one', 'free_item', 'cashback'],
    example: 'percentage',
    description: 'Type of discount',
  })
  @IsEnum(['percentage', 'fixed_amount', 'promo_code', 'buy_one_get_one', 'free_item', 'cashback'])
  discountType: 'percentage' | 'fixed_amount' | 'promo_code' | 'buy_one_get_one' | 'free_item' | 'cashback';

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

  // Usage limit type
  @ApiProperty({
    enum: ['one_time', 'daily', 'weekly', 'monthly', 'unlimited'],
    example: 'one_time',
    default: 'one_time',
    description: 'Type of usage limit',
  })
  @IsOptional()
  @IsEnum(['one_time', 'daily', 'weekly', 'monthly', 'unlimited'])
  usageLimitType?: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'unlimited';

  @ApiProperty({ example: 1, required: false, description: 'Daily claim limit per user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyClaimLimit?: number;

  @ApiProperty({ example: 3, required: false, description: 'Weekly claim limit per user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyClaimLimit?: number;

  @ApiProperty({ example: 5, required: false, description: 'Monthly claim limit per user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyClaimLimit?: number;

  // BOGO and Free Item fields
  @ApiProperty({ example: 'Pizza Margherita', required: false, description: 'BOGO product name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bogoProductName?: string;

  @ApiProperty({ example: 'Free Coca-Cola', required: false, description: 'Free item name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  freeItemName?: string;

  @ApiProperty({ example: 10000, required: false, description: 'Free item value in UZS' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  freeItemValue?: number;

  // Cashback fields
  @ApiProperty({ example: 5, required: false, description: 'Cashback percentage' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  cashbackPercentage?: number;

  @ApiProperty({ example: 50000, required: false, description: 'Maximum cashback amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxCashbackAmount?: number;

  @ApiProperty({ example: 3, required: false, description: 'Days to wait before cashback is paid' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cashbackDelayDays?: number;

  // Time restrictions
  @ApiProperty({ example: '12:00', required: false, description: 'Active time start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'activeTimeStart must be in HH:mm format' })
  activeTimeStart?: string;

  @ApiProperty({ example: '14:00', required: false, description: 'Active time end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'activeTimeEnd must be in HH:mm format' })
  activeTimeEnd?: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    required: false,
    description: 'Active days of week (0=Sunday, 6=Saturday)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  activeDaysOfWeek?: number[];

  // Targeting
  @ApiProperty({ example: false, default: false, description: 'Only for first-time users' })
  @IsOptional()
  @IsBoolean()
  isFirstTimeOnly?: boolean;

  @ApiProperty({ example: false, default: false, description: 'Is this a referral bonus discount' })
  @IsOptional()
  @IsBoolean()
  isReferralBonus?: boolean;

  @ApiProperty({ example: 25000, required: false, description: 'Referral bonus value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  referralBonusValue?: number;

  @ApiProperty({
    example: ['Pizza', 'Burger', 'Salad'],
    required: false,
    description: 'Specific products this discount applies to',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificProducts?: string[];

  // Location restrictions
  @ApiProperty({
    example: ['Toshkent', 'Samarqand'],
    required: false,
    description: 'Cities where discount is valid',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCities?: string[];

  @ApiProperty({
    example: ['Toshkent viloyati'],
    required: false,
    description: 'Regions where discount is valid',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRegions?: string[];

  @ApiProperty({ example: false, default: false, description: 'Requires location verification' })
  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @ApiProperty({ example: 1000, required: false, description: 'Location radius in meters' })
  @IsOptional()
  @IsInt()
  @Min(0)
  locationRadius?: number;

  @ApiProperty({ example: 41.2995, required: false, description: 'Store latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  locationLat?: number;

  @ApiProperty({ example: 69.2401, required: false, description: 'Store longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  locationLng?: number;

  // Verification method
  @ApiProperty({
    enum: ['promo_code', 'qr_code', 'student_card', 'auto'],
    example: 'promo_code',
    default: 'promo_code',
    description: 'How students claim/verify the discount',
  })
  @IsOptional()
  @IsEnum(['promo_code', 'qr_code', 'student_card', 'auto'])
  verificationMethod?: 'promo_code' | 'qr_code' | 'student_card' | 'auto';

  @ApiProperty({ example: 24, default: 24, description: 'Hours until claim expires' })
  @IsOptional()
  @IsInt()
  @Min(1)
  claimExpiryHours?: number;

  @ApiProperty({ example: true, default: true, description: 'Partner must verify claim' })
  @IsOptional()
  @IsBoolean()
  requiresPartnerVerification?: boolean;

  // Monetization
  @ApiProperty({ example: 100000, required: false, description: 'Listing fee in UZS' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  listingFee?: number;

  @ApiProperty({ example: 1000, required: false, description: 'Fee per claim in UZS' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  performanceFee?: number;

  @ApiProperty({ example: 50000, required: false, description: 'Featured placement fee in UZS' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  featuredPlacementFee?: number;

  // Seasonal tag
  @ApiProperty({
    example: 'back_to_school',
    required: false,
    description: 'Seasonal campaign tag',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  seasonalTag?: string;
}
