import { IsString, IsEnum, IsOptional, IsObject, IsUUID, IsNotEmpty, IsEmail, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VerificationRequestType {
  STUDENT_VERIFICATION = 'student_verification',
  DOCUMENT_UPLOAD = 'document_upload',
  APPEAL = 'appeal'
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export class CreateVerificationRequestDto {
  @ApiProperty({
    description: 'Type of verification request',
    enum: VerificationRequestType,
    example: VerificationRequestType.STUDENT_VERIFICATION
  })
  @IsEnum(VerificationRequestType)
  requestType: VerificationRequestType;

  @ApiPropertyOptional({
    description: 'Submitted documents and metadata',
    example: {
      studentId: 'STU123456',
      university: 'Tashkent State University',
      documents: ['student_id_card.jpg', 'transcript.pdf']
    }
  })
  @IsOptional()
  @IsObject()
  submittedDocuments?: Record<string, any>;
}

export class UpdateVerificationRequestDto {
  @ApiPropertyOptional({
    description: 'Verification status',
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Admin notes about the verification',
    example: 'Student ID verified successfully'
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection',
    example: 'Document appears to be altered'
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class QueryVerificationDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20
  })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: VerificationStatus,
    example: VerificationStatus.PENDING
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Filter by request type',
    enum: VerificationRequestType,
    example: VerificationRequestType.STUDENT_VERIFICATION
  })
  @IsOptional()
  @IsEnum(VerificationRequestType)
  requestType?: VerificationRequestType;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-string'
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by reviewer ID',
    example: 'uuid-string'
  })
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;
}

export class StudentVerificationDto {
  @ApiProperty({
    description: 'Student ID number',
    example: 'STU123456'
  })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'University email address',
    example: 'student@university.edu'
  })
  @IsEmail()
  universityEmail: string;

  @ApiPropertyOptional({
    description: 'Expected graduation date',
    example: '2025-06-15'
  })
  @IsOptional()
  @IsDateString()
  graduationDate?: string;

  @ApiPropertyOptional({
    description: 'Field of study',
    example: 'Computer Science'
  })
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional({
    description: 'Array of document URLs',
    example: ['student_id.jpg', 'enrollment_letter.pdf']
  })
  @IsOptional()
  @IsArray()
  documents?: string[];
}

export class AddUniversityDomainDto {
  @ApiProperty({
    description: 'University domain',
    example: 'university.edu'
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({
    description: 'University ID',
    example: 1
  })
  @IsNotEmpty()
  universityId: number;
}