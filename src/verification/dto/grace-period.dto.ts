import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsUUID, MaxLength } from 'class-validator';

export class EnterGracePeriodDto {
  @ApiProperty({ description: 'User ID to grant grace period to' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Number of days for grace period (default: 14)' })
  @IsOptional()
  @IsInt()
  gracePeriodDays?: number = 14;

  @ApiPropertyOptional({ description: 'Reason for granting grace period' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ExtendGracePeriodDto {
  @ApiProperty({ description: 'User ID to extend grace period for' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Additional days to extend grace period' })
  @IsInt()
  additionalDays: number;

  @ApiProperty({ description: 'Reason for extending grace period' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class UniversityDomainDto {
  @ApiProperty({ description: 'University ID' })
  @IsInt()
  universityId: number;

  @ApiProperty({ description: 'University email domain (e.g., @university.uz)' })
  @IsString()
  @MaxLength(255)
  domain: string;

  @ApiProperty({ description: 'Whether to auto-verify emails from this domain' })
  @IsBoolean()
  autoVerify: boolean;
}

export class UpdateFraudScoreDto {
  @ApiProperty({ description: 'Change in fraud score (positive or negative)' })
  @IsInt()
  scoreChange: number;

  @ApiProperty({ description: 'Reason for updating fraud score' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class GracePeriodEligibilityResponse {
  @ApiProperty()
  eligible: boolean;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  suggestedGracePeriodDays?: number;

  @ApiPropertyOptional()
  currentStatus?: string;

  @ApiPropertyOptional()
  lastVerificationDate?: Date;
}

export class ExpiringGracePeriodResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  nextVerificationDue: Date | null;

  @ApiPropertyOptional()
  verificationNotes?: string | null;
}

export class SuspiciousEmailResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  fraudScore: number;

  @ApiProperty()
  verificationStatus: string;

  @ApiProperty()
  createdAt: Date;
}