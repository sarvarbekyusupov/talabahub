import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FeedFilterDto {
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

export class TrendingFilterDto extends FeedFilterDto {
  @ApiPropertyOptional({
    description: 'Timeframe for trending',
    enum: ['today', 'week', 'month'],
    default: 'week',
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month'])
  timeframe?: string;
}
