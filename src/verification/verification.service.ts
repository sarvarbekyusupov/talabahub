import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UniversityDomainService } from './services/university-domain.service';
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
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly universityDomainService: UniversityDomainService,
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

  async verifyEmail(token: string): Promise<{ message: string; autoVerified: boolean; universityName?: string }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check for fraud suspicion
    const suspicionCheck = await this.universityDomainService.checkEmailSuspicion(user.email, user.id);
    if (suspicionCheck.suspicious) {
      await this.logVerificationActivity(user.id, 'EMAIL_VERIFICATION_FLAGGED', {
        reasons: suspicionCheck.reasons,
        score: suspicionCheck.score,
        email: user.email,
      });

      // Allow but mark for manual review
      this.logger.warn(`Suspicious email flagged: ${user.email}`, {
        userId: user.id,
        reasons: suspicionCheck.reasons,
        score: suspicionCheck.score,
      });
    }

    // Analyze email for university verification
    const emailAnalysis = await this.universityDomainService.analyzeEmail(user.email);

    let autoVerified = false;
    let universityName: string | undefined;
    const updateData: any = {
      isEmailVerified: true,
      emailVerificationToken: null,
      verificationStatus: UserVerificationStatus.email_verified, // Default status
    };

    // Handle auto-verification for university emails
    if (emailAnalysis.isUniversity && emailAnalysis.autoVerify && emailAnalysis.confidence === 'high') {
      autoVerified = true;
      universityName = emailAnalysis.universityName;

      updateData.verificationStatus = UserVerificationStatus.verified;
      updateData.verificationMethod = StudentVerificationMethod.university_email;
      updateData.verificationDate = new Date();
      updateData.lastVerificationDate = new Date();

      // Set next verification due to graduation date + 3 months buffer
      const graduationYear = new Date().getFullYear() + 4; // Assume 4-year program
      updateData.expectedGraduationDate = new Date(graduationYear, 8, 1); // September 1
      updateData.nextVerificationDue = new Date(graduationYear + 1, 8, 1); // Next September

      if (emailAnalysis.universityId) {
        updateData.universityId = emailAnalysis.universityId;
      }

      await this.logVerificationActivity(user.id, 'AUTO_VERIFICATION_SUCCESS', {
        email: user.email,
        university: emailAnalysis.universityName,
        domain: emailAnalysis.domain,
        confidence: emailAnalysis.confidence,
      });
    } else if (emailAnalysis.isUniversity && emailAnalysis.confidence === 'medium') {
      // University email but requires manual review
      updateData.verificationStatus = UserVerificationStatus.email_verified;
      updateData.requiresManualReview = true;

      await this.logVerificationActivity(user.id, 'MANUAL_VERIFICATION_REQUIRED', {
        email: user.email,
        domain: emailAnalysis.domain,
        confidence: emailAnalysis.confidence,
        reason: 'Medium confidence university domain',
      });
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Log the email verification
    await this.logVerificationActivity(user.id, 'EMAIL_VERIFIED', {
      email: user.email,
      autoVerified,
      requiresManualReview: emailAnalysis.requiresManualReview,
      suspicionScore: suspicionCheck.score,
    });

    // Send appropriate email
    if (autoVerified) {
      await this.sendVerificationResultEmail(user, VerificationDecision.APPROVE);
    } else {
      // Send email to complete verification with documents
      await this.mailService.sendVerificationMoreInfo(
        user.email,
        user.firstName,
        'Your email has been verified! Please complete your student verification by uploading your student ID.',
        emailAnalysis.requiresManualReview ?
          ['Your university email requires manual verification', 'Please upload your student ID to complete verification'] :
          ['Upload your student ID to unlock all features']
      );
    }

    return {
      message: autoVerified
        ? `Email verified! Your student status has been confirmed automatically through ${universityName || 'your university'}.`
        : 'Email verified successfully! Please complete your student verification to access all features.',
      autoVerified,
      universityName,
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
  // GRACE PERIOD MANAGEMENT
  // =============================================

  async enterGracePeriod(
    userId: string,
    gracePeriodDays: number = 14,
    reason: string = 'Verification expired - grace period granted',
  ): Promise<{ message: string; gracePeriodEnds: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + gracePeriodDays);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: UserVerificationStatus.grace_period,
        nextVerificationDue: gracePeriodEnds,
        verificationNotes: reason,
      },
    });

    await this.createAuditLog(userId, 'grace_period_started', {
      previousStatus: user.verificationStatus,
      newStatus: UserVerificationStatus.grace_period,
      gracePeriodDays,
      gracePeriodEnds,
      reason,
    });

    // Send grace period notification email
    await this.mailService.sendGracePeriodStarted(
      user.email,
      user.firstName,
      gracePeriodEnds.toLocaleDateString(),
      reason,
    );

    return {
      message: `Grace period granted. You have ${gracePeriodDays} days to re-verify your student status.`,
      gracePeriodEnds,
    };
  }

  async checkGracePeriodEligibility(userId: string): Promise<{
    eligible: boolean;
    reason: string;
    suggestedGracePeriodDays: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationRequests: {
          where: { status: VerificationRequestStatus.rejected },
          orderBy: { reviewedAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is currently in grace period
    if (user.verificationStatus === UserVerificationStatus.grace_period) {
      return {
        eligible: false,
        reason: 'User is already in grace period',
        suggestedGracePeriodDays: 0,
      };
    }

    // Check if user has verified history
    const hasVerifiedHistory = user.verificationDate !== null;
    if (!hasVerifiedHistory) {
      return {
        eligible: false,
        reason: 'No previous verification history found',
        suggestedGracePeriodDays: 0,
      };
    }

    // Calculate suggested grace period based on user history
    let gracePeriodDays = 7; // Default
    let eligible = false;
    let reason = '';

    // Check verification history length
    const verificationDuration = user.verificationDate
      ? Math.floor((Date.now() - user.verificationDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Long-term verified users get longer grace period
    if (verificationDuration > 365) {
      gracePeriodDays = 21;
      eligible = true;
      reason = 'Long-term verified user (1+ year)';
    } else if (verificationDuration > 180) {
      gracePeriodDays = 14;
      eligible = true;
      reason = 'Established verified user (6+ months)';
    } else if (verificationDuration > 30) {
      gracePeriodDays = 10;
      eligible = true;
      reason = 'Recent verified user (1+ month)';
    }

    // Check for fraud history
    if (user.fraudScore && user.fraudScore > 50) {
      gracePeriodDays = Math.max(3, gracePeriodDays - 7); // Reduce grace period for high fraud scores
      reason += ' (adjusted for fraud history)';
    }

    // Check for recent rejections
    const recentRejections = user.verificationRequests.filter(
      req => req.reviewedAt &&
      Date.now() - req.reviewedAt.getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
    );

    if (recentRejections.length > 2) {
      eligible = false;
      reason = 'Too many recent rejections';
      gracePeriodDays = 0;
    } else if (recentRejections.length > 0) {
      gracePeriodDays = Math.max(5, gracePeriodDays - 5); // Reduce grace period for recent rejections
      reason += ' (adjusted for recent rejections)';
    }

    return {
      eligible,
      reason: reason || 'Standard grace period eligibility',
      suggestedGracePeriodDays: eligible ? gracePeriodDays : 0,
    };
  }

  async extendGracePeriod(
    userId: string,
    additionalDays: number,
    adminId: string,
    reason: string,
  ): Promise<{ message: string; newGracePeriodEnds: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verificationStatus !== UserVerificationStatus.grace_period) {
      throw new BadRequestException('User is not currently in grace period');
    }

    const currentEndDate = user.nextVerificationDue || new Date();
    const newGracePeriodEnds = new Date(currentEndDate);
    newGracePeriodEnds.setDate(newGracePeriodEnds.getDate() + additionalDays);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nextVerificationDue: newGracePeriodEnds,
        verificationNotes: `Grace period extended. ${reason}`,
      },
    });

    await this.createAuditLog(userId, 'grace_period_extended', {
      previousEndDate: currentEndDate,
      newEndDate: newGracePeriodEnds,
      additionalDays,
      reason,
      performedById: adminId,
    }, adminId);

    // Send extension notification email
    await this.mailService.sendGracePeriodExtended(
      user.email,
      user.firstName,
      newGracePeriodEnds.toLocaleDateString(),
      reason,
    );

    return {
      message: `Grace period extended by ${additionalDays} days.`,
      newGracePeriodEnds,
    };
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

  private async logVerificationActivity(
    userId: string,
    action: string,
    metadata: any,
  ): Promise<void> {
    await this.createAuditLog(userId, action, metadata);
  }

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
    try {
      switch (decision) {
        case VerificationDecision.APPROVE:
          // Send approval email
          await this.mailService.sendVerificationApproved(
            user.email,
            user.firstName,
            user.nextVerificationDue?.toLocaleDateString()
          );
          break;
        case VerificationDecision.REJECT:
          // Send rejection email
          await this.mailService.sendVerificationRejected(
            user.email,
            user.firstName,
            message || 'Your verification was rejected. Please re-submit with correct documents.'
          );
          break;
        case VerificationDecision.REQUEST_MORE_INFO:
          // Send more info needed email
          await this.mailService.sendVerificationMoreInfo(
            user.email,
            user.firstName,
            message || 'We need additional information to complete your verification.',
            ['Please provide clear documents', 'Ensure all information is visible']
          );
          break;
      }
    } catch (error) {
      console.error('Failed to send verification result email:', error);
    }
  }

  // =============================================
  // UNIVERSITY DOMAIN MANAGEMENT
  // =============================================

  async getSupportedDomains() {
    return this.universityDomainService.getSupportedDomains();
  }

  async addUniversityDomain(data: {
    universityId: number;
    domain: string;
    autoVerify: boolean;
  }) {
    return this.universityDomainService.addUniversityDomain(data);
  }
}
