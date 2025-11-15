import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  Length,
  MaxLength,
  IsIn,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Type of reviewable item',
    enum: ['brand', 'course', 'education-partner', 'company'],
    example: 'brand',
  })
  @IsString()
  @IsIn(['brand', 'course', 'education-partner', 'company'])
  reviewableType: string;

  @ApiProperty({
    description: 'ID of the reviewable item (numeric or UUID)',
    example: '123',
  })
  @IsString()
  reviewableId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Title of the review',
    maxLength: 255,
    example: 'Great experience with this brand',
  })
  @IsOptional()
  @IsString()
  @Length(5, 255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed review comment',
    maxLength: 5000,
    example: 'I had an excellent experience with this brand...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Pros of the reviewed item',
    maxLength: 2000,
    example: 'Great quality, fast delivery',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pros?: string;

  @ApiPropertyOptional({
    description: 'Cons of the reviewed item',
    maxLength: 2000,
    example: 'Expensive compared to competitors',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cons?: string;

  @ApiPropertyOptional({
    description: 'Whether review should be anonymous',
    example: false,
  })
  @IsOptional()
  isAnonymous?: boolean = false;
}
