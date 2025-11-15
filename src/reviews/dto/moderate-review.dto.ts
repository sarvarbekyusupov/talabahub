import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateReviewDto {
  @ApiProperty({
    description: 'Whether to approve the review',
    example: true,
  })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({
    description: 'Notes from the moderator',
    maxLength: 1000,
    example: 'Review approved. Meets community guidelines.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderationNotes?: string;
}
