import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerificationStatusResponse {
  @ApiProperty()
  verificationStatus: string;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiPropertyOptional()
  verificationMethod?: string;

  @ApiPropertyOptional()
  verificationDate?: Date;

  @ApiPropertyOptional()
  nextVerificationDue?: Date;

  @ApiPropertyOptional()
  pendingRequestId?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  canApplyForJobs: boolean;

  @ApiProperty()
  canUseDiscounts: boolean;

  @ApiProperty()
  canRegisterEvents: boolean;

  @ApiProperty()
  message: string;
}

export class VerificationRequestResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  requestType: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  submittedAt: Date;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  userNotes?: string;

  @ApiProperty()
  priority: number;

  @ApiProperty({ type: () => [VerificationDocumentResponse] })
  documents: VerificationDocumentResponse[];

  @ApiProperty({ type: () => VerificationUserInfo })
  user: VerificationUserInfo;
}

export class VerificationDocumentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentType: string;

  @ApiProperty()
  fileUrl: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  originalFilename?: string;

  @ApiProperty()
  uploadedAt: Date;
}

export class VerificationUserInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  middleName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  studentIdNumber?: string;

  @ApiPropertyOptional()
  faculty?: string;

  @ApiPropertyOptional()
  courseYear?: number;

  @ApiPropertyOptional()
  graduationYear?: number;

  @ApiPropertyOptional()
  universityName?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  verificationAttempts: number;
}

export class VerificationListResponse {
  @ApiProperty({ type: [VerificationRequestResponse] })
  requests: VerificationRequestResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class VerificationStatsResponse {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  approvedToday: number;

  @ApiProperty()
  rejectedToday: number;

  @ApiProperty()
  totalVerified: number;

  @ApiProperty()
  averageReviewTimeHours: number;

  @ApiProperty()
  oldestPendingDays: number;

  @ApiProperty({ type: () => [UniversityVerificationStats] })
  byUniversity: UniversityVerificationStats[];
}

export class UniversityVerificationStats {
  @ApiProperty()
  universityId: number;

  @ApiProperty()
  universityName: string;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  verified: number;
}
