import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum ManualVerificationStatus {
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
  GRADUATED = 'graduated',
  REJECTED = 'rejected',
}

export class UpdateVerificationStatusDto {
  @ApiProperty({ enum: ManualVerificationStatus })
  @IsEnum(ManualVerificationStatus)
  status: ManualVerificationStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class TriggerReverificationDto {
  @ApiPropertyOptional({ description: 'Reason for triggering re-verification' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Grace period in days', default: 14 })
  @IsOptional()
  gracePeriodDays?: number = 14;
}
