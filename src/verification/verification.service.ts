import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  SubmitVerificationDto,
  VerificationDocumentTypeDto,
} from './dto/submit-verification.dto';
import {
  ReviewVerificationDto,
  VerificationDecision,
  RejectionReason,
  VerificationListQueryDto,
} from './dto/review-verification.dto';
import {
  UpdateVerificationStatusDto,
  ManualVerificationStatus,
  TriggerReverificationDto,
} from './dto/update-verification-status.dto';
import {
  VerificationStatusResponse,
  VerificationRequestResponse,
  VerificationListResponse,
  VerificationStatsResponse,
} from './dto/verification-response.dto';
import { randomBytes } from 'crypto';
import {
  UserVerificationStatus,
  StudentVerificationMethod,
  VerificationRequestStatus,
  VerificationRequestType,
  VerificationDocumentType,
} from '@prisma/client';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // =============================================
  // EMAIL VERIFICATION
  // =============================================

  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = this.generateToken();

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token },
    });

    await this.mailService.sendEmailVerification(
      user.email,
      token,
      user.firstName,
    );

    return { message: 'Verification email sent successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string; autoVerified: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // Check if email domain is from a university with auto-verification
    const emailDomain = user.email.split('@')[1];
    const universityDomain = await this.prisma.universityDomain.findFirst({
      where: {
        domain: emailDomain,
        isActive: true,
        autoVerify: true,
      },
      include: {
        university: true,
      },
    });

    // Also check the main university email domain
    const university = await this.prisma.university.findFirst({
      where: {
        emailDomain: emailDomain,
        isActive: true,
        autoVerifyEmail: true,
      },
    });

    const autoVerify = universityDomain || university;
    const universityId = universityDomain?.universityId || university?.id;

    // Update user verification status
    const updateData: any = {
      isEmailVerified: true,
      emailVerificationToken: null,
      verificationStatus: autoVerify
        ? UserVerificationStatus.verified
        : UserVerificationStatus.email_verified,
    };

    if (autoVerify) {
      updateData.verificationMethod = StudentVerificationMethod.university_email;
      updateData.verificationDate = new Date();
      updateData.lastVerificationDate = new Date();
      // Set next verification due to September of next academic year
      const nextYear = new Date().getMonth() >= 8
        ? new Date().getFullYear() + 1
        : new Date().getFullYear();
      updateData.nextVerificationDue = new Date(nextYear, 8, 1); // September 1st

      if (universityId && !user.universityId) {
        updateData.universityId = universityId;
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Log the verification
    await this.createAuditLog(user.id, 'email_verified', {
      previousStatus: user.verificationStatus,
      newStatus: updateData.verificationStatus,
      autoVerified: !!autoVerify,
      universityId,
    });

    // Send welcome email
    await this.mailService.sendWelcomeEmail(user.email, user.firstName);

    if (autoVerify) {
      return {
        message: 'Email verified and student status automatically confirmed based on your university email.',
        autoVerified: true,
      };
    }

    return {
      message: 'Email verified successfully. Please complete student verification to access all features.',
      autoVerified: false,
    };
  }

  // =============================================
  // STUDENT VERIFICATION REQUEST
  // =============================================

  async submitVerificationRequest(
    userId: string,
    dto: SubmitVerificationDto,
  ): Promise<VerificationRequestResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationRequests: {
          where: {
            status: {
              in: [VerificationRequestStatus.pending, VerificationRequestStatus.more_info_needed],
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    if (user.verificationStatus === UserVerificationStatus.verified) {
      throw new BadRequestException('Your account is already verified');
    }

    if (user.verificationStatus === UserVerificationStatus.suspended) {
      throw new ForbiddenException('Your account is suspended. Please contact support.');
    }

    // Check for existing pending request
    if (user.verificationRequests.length > 0) {
      throw new ConflictException('You already have a pending verification request');
    }

    // Update user profile with provided information
    const userUpdateData: any = {};
    if (dto.universityId) userUpdateData.universityId = dto.universityId;
    if (dto.studentIdNumber) userUpdateData.studentIdNumber = dto.studentIdNumber;
    if (dto.faculty) userUpdateData.faculty = dto.faculty;
    if (dto.courseYear) userUpdateData.courseYear = dto.courseYear;
    if (dto.graduationYear) userUpdateData.graduationYear = dto.graduationYear;
    if (dto.expectedGraduationDate) {
      userUpdateData.expectedGraduationDate = new Date(dto.expectedGraduationDate);
    }

    // Determine request type
    const requestType = user.verificationAttempts > 0
      ? VerificationRequestType.reverification
      : VerificationRequestType.initial;

    // Calculate priority (re-submissions get higher priority)
    const priority = user.verificationAttempts > 0 ? 2 : 1;

    // Create verification request
    const verificationRequest = await this.prisma.verificationRequest.create({
      data: {
        userId,
        requestType,
        status: VerificationRequestStatus.pending,
        userNotes: dto.userNotes,
        priority,
        documents: dto.documents
          ? {
              create: dto.documents.map((doc) => ({
                documentType: doc.documentType as unknown as VerificationDocumentType,
                fileUrl: doc.fileUrl,
                originalFilename: doc.originalFilename,
                mimeType: doc.mimeType,
                fileSize: doc.fileSize,
              })),
            }
          : undefined,
      },
      include: {
        documents: true,
        user: {
          include: {
            university: true,
          },
        },
      },
    });

    // Update user status and increment attempts
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userUpdateData,
        verificationStatus: UserVerificationStatus.pending_verification,
        verificationAttempts: { increment: 1 },
      },
    });

    // Log the submission
    await this.createAuditLog(userId, 'verification_submitted', {
      requestId: verificationRequest.id,
      requestType,
      documentsCount: dto.documents?.length || 0,
    });

    return this.formatVerificationRequest(verificationRequest);
  }

  async getVerificationStatus(userId: string): Promise<VerificationStatusResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationRequests: {
          where: {
            status: {
              in: [VerificationRequestStatus.pending, VerificationRequestStatus.more_info_needed],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pendingRequest = user.verificationRequests[0];
    const isVerified = user.verificationStatus === UserVerificationStatus.verified;

    return {
      verificationStatus: user.verificationStatus,
      isEmailVerified: user.isEmailVerified,
      verificationMethod: user.verificationMethod || undefined,
      verificationDate: user.verificationDate || undefined,
      nextVerificationDue: user.nextVerificationDue || undefined,
      pendingRequestId: pendingRequest?.id,
      rejectionReason: user.verificationNotes || undefined,
      canApplyForJobs: isVerified,
      canUseDiscounts: isVerified,
      canRegisterEvents: isVerified,
      message: this.getVerificationStatusMessage(user.verificationStatus, user.isEmailVerified),
    };
  }

  async getUserVerificationHistory(userId: string): Promise<VerificationRequestResponse[]> {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { userId },
      include: {
        documents: true,
        user: {
          include: { university: true },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.formatVerificationRequest(r));
  }

  // =============================================
  // ADMIN VERIFICATION REVIEW
  // =============================================

  async getPendingVerifications(
    query: VerificationListQueryDto,
  ): Promise<VerificationListResponse> {
    const { page = 1, limit = 20, status, requestType, universityId, sortBy = 'oldest' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      where.status = VerificationRequestStatus.pending;
    }

    if (requestType) {
      where.requestType = requestType;
    }

    if (universityId) {
      where.user = { universityId };
    }

    const orderBy: any = {};
    switch (sortBy) {
      case 'newest':
        orderBy.submittedAt = 'desc';
        break;
      case 'priority':
        orderBy.priority = 'desc';
        break;
      default:
        orderBy.submittedAt = 'asc';
    }

    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where,
        include: {
          documents: true,
          user: {
            include: { university: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.verificationRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.formatVerificationRequest(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVerificationRequest(requestId: string): Promise<VerificationRequestResponse> {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        documents: true,
        user: {
          include: { university: true },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    return this.formatVerificationRequest(request);
  }

  async reviewVerification(
    requestId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ): Promise<VerificationRequestResponse> {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== VerificationRequestStatus.pending &&
        request.status !== VerificationRequestStatus.more_info_needed) {
      throw new BadRequestException('This request has already been reviewed');
    }

    let requestStatus: VerificationRequestStatus;
    let userStatus: UserVerificationStatus;
    let verificationMethod: StudentVerificationMethod | undefined;

    switch (dto.decision) {
      case VerificationDecision.APPROVE:
        requestStatus = VerificationRequestStatus.approved;
        userStatus = UserVerificationStatus.verified;
        verificationMethod = StudentVerificationMethod.student_id_upload;
        break;
      case VerificationDecision.REJECT:
        if (!dto.rejectionReason) {
          throw new BadRequestException('Rejection reason is required');
        }
        requestStatus = VerificationRequestStatus.rejected;
        userStatus = UserVerificationStatus.rejected;
        break;
      case VerificationDecision.REQUEST_MORE_INFO:
        requestStatus = VerificationRequestStatus.more_info_needed;
        userStatus = UserVerificationStatus.email_verified; // Reset to allow re-submission
        break;
      case VerificationDecision.FLAG_FOR_INVESTIGATION:
        requestStatus = VerificationRequestStatus.pending;
        userStatus = UserVerificationStatus.suspended;
        break;
      default:
        throw new BadRequestException('Invalid decision');
    }

    // Format rejection reason message
    const rejectionMessage = dto.rejectionReason
      ? this.formatRejectionReason(dto.rejectionReason, dto.rejectionMessage)
      : dto.rejectionMessage;

    // Update verification request
    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: requestStatus,
        reviewedAt: new Date(),
        reviewedById: adminId,
        rejectionReason: rejectionMessage,
        adminNotes: dto.adminNotes,
      },
      include: {
        documents: true,
        user: {
          include: { university: true },
        },
      },
    });

    // Update user status
    const userUpdateData: any = {
      verificationStatus: userStatus,
      verificationNotes: rejectionMessage,
      verifiedById: dto.decision === VerificationDecision.APPROVE ? adminId : undefined,
    };

    if (dto.decision === VerificationDecision.APPROVE) {
      userUpdateData.verificationMethod = verificationMethod;
      userUpdateData.verificationDate = new Date();
      userUpdateData.lastVerificationDate = new Date();
      // Set next verification to September of next academic year
      const nextYear = new Date().getMonth() >= 8
        ? new Date().getFullYear() + 1
        : new Date().getFullYear();
      userUpdateData.nextVerificationDue = new Date(nextYear, 8, 1);
    }

    await this.prisma.user.update({
      where: { id: request.userId },
      data: userUpdateData,
    });

    // Log the review
    await this.createAuditLog(
      request.userId,
      `verification_${dto.decision.toLowerCase()}`,
      {
        requestId,
        decision: dto.decision,
        rejectionReason: dto.rejectionReason,
        adminNotes: dto.adminNotes,
      },
      adminId,
    );

    // Send notification email
    await this.sendVerificationResultEmail(
      request.user,
      dto.decision,
      rejectionMessage,
    );

    return this.formatVerificationRequest(updatedRequest);
  }

  async getVerificationStats(): Promise<VerificationStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pending,
      approvedToday,
      rejectedToday,
      totalVerified,
      oldestPending,
      reviewTimes,
      byUniversity,
    ] = await Promise.all([
      // Pending count
      this.prisma.verificationRequest.count({
        where: { status: VerificationRequestStatus.pending },
      }),
      // Approved today
      this.prisma.verificationRequest.count({
        where: {
          status: VerificationRequestStatus.approved,
          reviewedAt: { gte: today },
        },
      }),
      // Rejected today
      this.prisma.verificationRequest.count({
        where: {
          status: VerificationRequestStatus.rejected,
          reviewedAt: { gte: today },
        },
      }),
      // Total verified users
      this.prisma.user.count({
        where: { verificationStatus: UserVerificationStatus.verified },
      }),
      // Oldest pending
      this.prisma.verificationRequest.findFirst({
        where: { status: VerificationRequestStatus.pending },
        orderBy: { submittedAt: 'asc' },
      }),
      // Average review time (last 100 reviews)
      this.prisma.verificationRequest.findMany({
        where: {
          status: { in: [VerificationRequestStatus.approved, VerificationRequestStatus.rejected] },
          reviewedAt: { not: null },
        },
        select: { submittedAt: true, reviewedAt: true },
        orderBy: { reviewedAt: 'desc' },
        take: 100,
      }),
      // By university
      this.prisma.university.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nameUz: true,
          _count: {
            select: {
              users: {
                where: { verificationStatus: UserVerificationStatus.verified },
              },
            },
          },
        },
      }),
    ]);

    // Calculate average review time
    let avgReviewTimeHours = 0;
    if (reviewTimes.length > 0) {
      const totalHours = reviewTimes.reduce((sum, r) => {
        if (r.reviewedAt) {
          return sum + (r.reviewedAt.getTime() - r.submittedAt.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgReviewTimeHours = Math.round((totalHours / reviewTimes.length) * 10) / 10;
    }

    // Calculate oldest pending days
    const oldestPendingDays = oldestPending
      ? Math.floor((Date.now() - oldestPending.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Get pending by university
    const pendingByUniversity = await this.prisma.verificationRequest.groupBy({
      by: ['userId'],
      where: { status: VerificationRequestStatus.pending },
    });

    return {
      pending,
      approvedToday,
      rejectedToday,
      totalVerified,
      averageReviewTimeHours: avgReviewTimeHours,
      oldestPendingDays,
      byUniversity: byUniversity.map((u) => ({
        universityId: u.id,
        universityName: u.nameUz,
        pending: 0, // Would need separate query
        verified: u._count.users,
      })),
    };
  }

  // =============================================
  // MANUAL STATUS MANAGEMENT
  // =============================================

  async updateUserVerificationStatus(
    userId: string,
    adminId: string,
    dto: UpdateVerificationStatusDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const statusMap: Record<ManualVerificationStatus, UserVerificationStatus> = {
      [ManualVerificationStatus.VERIFIED]: UserVerificationStatus.verified,
      [ManualVerificationStatus.SUSPENDED]: UserVerificationStatus.suspended,
      [ManualVerificationStatus.GRADUATED]: UserVerificationStatus.graduated,
      [ManualVerificationStatus.REJECTED]: UserVerificationStatus.rejected,
    };

    const newStatus = statusMap[dto.status];
    const previousStatus = user.verificationStatus;

    const updateData: any = {
      verificationStatus: newStatus,
      verificationNotes: dto.reason || dto.notes,
    };

    if (dto.status === ManualVerificationStatus.VERIFIED) {
      updateData.verificationMethod = StudentVerificationMethod.manual_review;
      updateData.verificationDate = new Date();
      updateData.verifiedById = adminId;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.createAuditLog(
      userId,
      'manual_status_update',
      {
        previousStatus,
        newStatus,
        reason: dto.reason,
        notes: dto.notes,
      },
      adminId,
    );

    return {
      message: `User verification status updated to ${dto.status}`,
    };
  }

  async triggerReverification(
    userId: string,
    adminId: string,
    dto: TriggerReverificationDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const gracePeriodDays = dto.gracePeriodDays || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + gracePeriodDays);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nextVerificationDue: dueDate,
        verificationNotes: dto.reason || 'Re-verification required',
      },
    });

    await this.createAuditLog(
      userId,
      'reverification_triggered',
      {
        reason: dto.reason,
        gracePeriodDays,
        dueDate,
      },
      adminId,
    );

    // TODO: Send email notification about re-verification

    return {
      message: `Re-verification triggered. User has ${gracePeriodDays} days to re-verify.`,
    };
  }

  // =============================================
  // FRAUD DETECTION
  // =============================================

  async checkForDuplicates(userId: string): Promise<{
    hasDuplicates: boolean;
    duplicates: any[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const duplicates: any[] = [];

    // Check for same student ID number
    if (user.studentIdNumber) {
      const sameStudentId = await this.prisma.user.findMany({
        where: {
          studentIdNumber: user.studentIdNumber,
          id: { not: userId },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
      duplicates.push(...sameStudentId.map((u) => ({ ...u, reason: 'Same student ID' })));
    }

    // Check for same device fingerprint
    if (user.deviceFingerprint) {
      const sameDevice = await this.prisma.user.findMany({
        where: {
          deviceFingerprint: user.deviceFingerprint,
          id: { not: userId },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
      duplicates.push(...sameDevice.map((u) => ({ ...u, reason: 'Same device' })));
    }

    // Check for similar names at same university
    if (user.universityId) {
      const similarNames = await this.prisma.user.findMany({
        where: {
          universityId: user.universityId,
          firstName: user.firstName,
          lastName: user.lastName,
          id: { not: userId },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
      duplicates.push(...similarNames.map((u) => ({ ...u, reason: 'Same name at university' })));
    }

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }

  async updateFraudScore(userId: string, scoreChange: number, reason: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fraudScore: { increment: scoreChange },
      },
    });

    await this.createAuditLog(userId, 'fraud_score_updated', {
      scoreChange,
      reason,
    });
  }

  // =============================================
  // RE-VERIFICATION CRON JOB HELPERS
  // =============================================

  async getExpiredVerifications(): Promise<any[]> {
    const now = new Date();

    return this.prisma.user.findMany({
      where: {
        verificationStatus: UserVerificationStatus.verified,
        OR: [
          { expectedGraduationDate: { lt: now } },
          { nextVerificationDue: { lt: now } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        expectedGraduationDate: true,
        nextVerificationDue: true,
      },
    });
  }

  async expireVerification(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: UserVerificationStatus.verification_expired,
        verificationNotes: 'Verification expired. Please re-verify your student status.',
      },
    });

    await this.createAuditLog(userId, 'verification_expired', {
      reason: 'Automatic expiration',
    });
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async createAuditLog(
    userId: string,
    action: string,
    metadata: any,
    performedById?: string,
  ): Promise<void> {
    await this.prisma.verificationAuditLog.create({
      data: {
        userId,
        action,
        previousStatus: metadata.previousStatus,
        newStatus: metadata.newStatus,
        performedById,
        reason: metadata.reason,
        metadata,
      },
    });
  }

  private getVerificationStatusMessage(
    status: UserVerificationStatus,
    isEmailVerified: boolean,
  ): string {
    if (!isEmailVerified) {
      return 'Please verify your email address to continue.';
    }

    switch (status) {
      case UserVerificationStatus.unverified:
        return 'Please complete student verification to access all features.';
      case UserVerificationStatus.email_verified:
        return 'Email verified. Please upload your student ID to complete verification.';
      case UserVerificationStatus.pending_verification:
        return 'Your verification is under review. Usually takes 24-48 hours.';
      case UserVerificationStatus.verified:
        return 'Your account is fully verified. You have access to all features.';
      case UserVerificationStatus.verification_expired:
        return 'Your verification has expired. Please re-verify your student status.';
      case UserVerificationStatus.rejected:
        return 'Your verification was rejected. Please check the reason and re-submit.';
      case UserVerificationStatus.suspended:
        return 'Your account is suspended. Please contact support.';
      case UserVerificationStatus.graduated:
        return 'You are registered as a graduate. Student features are no longer available.';
      default:
        return 'Unknown verification status.';
    }
  }

  private formatRejectionReason(reason: RejectionReason, customMessage?: string): string {
    const messages: Record<RejectionReason, string> = {
      [RejectionReason.ID_NOT_CLEAR]: 'The uploaded ID is not clear or readable. Please upload a clearer photo.',
      [RejectionReason.ID_EXPIRED]: 'Your student ID has expired. Please upload a valid, current ID.',
      [RejectionReason.NAME_MISMATCH]: 'The name on your ID does not match your account name.',
      [RejectionReason.UNIVERSITY_NOT_RECOGNIZED]: 'We could not recognize the university on your ID.',
      [RejectionReason.SUSPECTED_FRAUD]: 'We detected potential issues with your submission.',
      [RejectionReason.INCOMPLETE_INFORMATION]: 'Some required information is missing from your submission.',
      [RejectionReason.DUPLICATE_ACCOUNT]: 'We found another account with the same credentials.',
      [RejectionReason.OTHER]: customMessage || 'Your verification was rejected.',
    };

    return customMessage
      ? `${messages[reason]} ${customMessage}`
      : messages[reason];
  }

  private formatVerificationRequest(request: any): VerificationRequestResponse {
    return {
      id: request.id,
      userId: request.userId,
      requestType: request.requestType,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      rejectionReason: request.rejectionReason,
      adminNotes: request.adminNotes,
      userNotes: request.userNotes,
      priority: request.priority,
      documents: request.documents?.map((doc: any) => ({
        id: doc.id,
        documentType: doc.documentType,
        fileUrl: doc.fileUrl,
        thumbnailUrl: doc.thumbnailUrl,
        originalFilename: doc.originalFilename,
        uploadedAt: doc.uploadedAt,
      })) || [],
      user: {
        id: request.user.id,
        email: request.user.email,
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        middleName: request.user.middleName,
        avatarUrl: request.user.avatarUrl,
        phone: request.user.phone,
        studentIdNumber: request.user.studentIdNumber,
        faculty: request.user.faculty,
        courseYear: request.user.courseYear,
        graduationYear: request.user.graduationYear,
        universityName: request.user.university?.nameUz,
        createdAt: request.user.createdAt,
        verificationAttempts: request.user.verificationAttempts,
      },
    };
  }

  private async sendVerificationResultEmail(
    user: any,
    decision: VerificationDecision,
    message?: string,
  ): Promise<void> {
    // TODO: Create proper email templates for these
    try {
      switch (decision) {
        case VerificationDecision.APPROVE:
          // Send approval email
          // await this.mailService.sendVerificationApproved(user.email, user.firstName);
          break;
        case VerificationDecision.REJECT:
          // Send rejection email
          // await this.mailService.sendVerificationRejected(user.email, user.firstName, message);
          break;
        case VerificationDecision.REQUEST_MORE_INFO:
          // Send more info needed email
          // await this.mailService.sendVerificationMoreInfo(user.email, user.firstName, message);
          break;
      }
    } catch (error) {
      console.error('Failed to send verification result email:', error);
    }
  }
}
