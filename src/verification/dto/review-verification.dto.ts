import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export enum VerificationDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_MORE_INFO = 'request_more_info',
  FLAG_FOR_INVESTIGATION = 'flag_for_investigation',
}

export enum RejectionReason {
  ID_NOT_CLEAR = 'id_not_clear',
  ID_EXPIRED = 'id_expired',
  NAME_MISMATCH = 'name_mismatch',
  UNIVERSITY_NOT_RECOGNIZED = 'university_not_recognized',
  SUSPECTED_FRAUD = 'suspected_fraud',
  INCOMPLETE_INFORMATION = 'incomplete_information',
  DUPLICATE_ACCOUNT = 'duplicate_account',
  OTHER = 'other',
}

export class ReviewVerificationDto {
  @ApiProperty({ enum: VerificationDecision })
  @IsEnum(VerificationDecision)
  decision: VerificationDecision;

  @ApiPropertyOptional({ enum: RejectionReason, description: 'Reason for rejection (required if rejecting)' })
  @IsOptional()
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;

  @ApiPropertyOptional({ description: 'Custom rejection message or request for more info' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionMessage?: string;

  @ApiPropertyOptional({ description: 'Admin notes (internal, not shown to user)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

export class BulkReviewVerificationDto {
  @ApiProperty({ type: [String], description: 'Array of verification request IDs' })
  @IsUUID('4', { each: true })
  requestIds: string[];

  @ApiProperty({ enum: VerificationDecision })
  @IsEnum(VerificationDecision)
  decision: VerificationDecision;

  @ApiPropertyOptional({ enum: RejectionReason })
  @IsOptional()
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;

  @ApiPropertyOptional({ description: 'Message for all selected requests' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class VerificationListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ['pending', 'approved', 'rejected', 'more_info_needed'],
    description: 'Filter by status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['initial', 'reverification', 'appeal'],
    description: 'Filter by request type',
  })
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ description: 'Filter by university ID' })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiPropertyOptional({
    enum: ['oldest', 'newest', 'priority'],
    default: 'oldest',
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'oldest';
}
