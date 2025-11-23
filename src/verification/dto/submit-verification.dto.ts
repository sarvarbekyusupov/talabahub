import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum VerificationDocumentTypeDto {
  STUDENT_ID_FRONT = 'student_id_front',
  STUDENT_ID_BACK = 'student_id_back',
  ENROLLMENT_CERTIFICATE = 'enrollment_certificate',
  PAYMENT_RECEIPT = 'payment_receipt',
  OTHER = 'other',
}

export class UploadVerificationDocumentDto {
  @ApiProperty({ enum: VerificationDocumentTypeDto })
  @IsEnum(VerificationDocumentTypeDto)
  documentType: VerificationDocumentTypeDto;

  @ApiProperty({ description: 'URL of the uploaded document' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'Original filename' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;

  @ApiPropertyOptional({ description: 'MIME type of the file' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

export class SubmitVerificationDto {
  @ApiPropertyOptional({ description: 'University ID' })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiPropertyOptional({ description: 'Student ID number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentIdNumber?: string;

  @ApiPropertyOptional({ description: 'Faculty or department name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  faculty?: string;

  @ApiPropertyOptional({ description: 'Current year of study (1-6)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  courseYear?: number;

  @ApiPropertyOptional({ description: 'Expected graduation year' })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2040)
  graduationYear?: number;

  @ApiPropertyOptional({ description: 'Expected graduation date' })
  @IsOptional()
  @IsDateString()
  expectedGraduationDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes from student' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userNotes?: string;

  @ApiPropertyOptional({
    type: [UploadVerificationDocumentDto],
    description: 'Uploaded verification documents',
  })
  @IsOptional()
  documents?: UploadVerificationDocumentDto[];
}

export class ResendVerificationEmailDto {
  @ApiPropertyOptional({ description: 'Email address to resend to (defaults to user email)' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class VerifyEmailTokenDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  token: string;
}
