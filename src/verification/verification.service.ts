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
} from './dto/review-verification.dto';
import {
  VerificationStatusResponse,
  VerificationRequestResponse,
} from './dto/verification-response.dto';
import { randomBytes } from 'crypto';
import {
  UserVerificationStatus,
  StudentVerificationMethod,
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

    // Analyze email for university verification
    const emailAnalysis = await this.universityDomainService.analyzeEmail(user.email);

    let autoVerified = false;
    let universityName: string | undefined;
    const updateData: any = {
      isEmailVerified: true,
      emailVerificationToken: null,
      verificationStatus: UserVerificationStatus.pending, // Default to pending
    };

    // Handle auto-verification for university emails
    if (emailAnalysis.isUniversity && emailAnalysis.autoVerify && emailAnalysis.confidence === 'high') {
      autoVerified = true;
      universityName = emailAnalysis.universityName;

      updateData.verificationStatus = UserVerificationStatus.verified;
      updateData.verificationDate = new Date();

      if (emailAnalysis.universityId) {
        updateData.universityId = emailAnalysis.universityId;
      }

      this.logger.log(`Auto-verified user: ${user.email} through ${universityName}`);
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
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
  // STUDENT VERIFICATION
  // =============================================

  async submitVerificationRequest(
    userId: string,
    dto: SubmitVerificationDto,
  ): Promise<{ message: string; status: UserVerificationStatus }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (user.verificationStatus === UserVerificationStatus.pending) {
      throw new ConflictException('You already have a pending verification request');
    }

    // Update user profile with provided information
    const userUpdateData: any = {};
    if (dto.universityId) userUpdateData.universityId = dto.universityId;
    if (dto.studentIdNumber) userUpdateData.studentIdNumber = dto.studentIdNumber;
    if (dto.studentIdPhoto) userUpdateData.studentIdPhoto = dto.studentIdPhoto;
    if (dto.faculty) userUpdateData.faculty = dto.faculty;
    if (dto.courseYear) userUpdateData.courseYear = dto.courseYear;
    if (dto.graduationYear) userUpdateData.graduationYear = dto.graduationYear;

    // Update user status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userUpdateData,
        verificationStatus: UserVerificationStatus.pending,
      },
    });

    this.logger.log(`Verification request submitted by user: ${user.email}`);

    return {
      message: 'Verification request submitted successfully',
      status: UserVerificationStatus.pending,
    };
  }

  async getVerificationStatus(userId: string): Promise<VerificationStatusResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isVerified = user.verificationStatus === UserVerificationStatus.verified;

    return {
      verificationStatus: user.verificationStatus,
      isEmailVerified: user.isEmailVerified,
      verificationMethod: undefined, // Not storing this in simplified version
      verificationDate: user.verificationDate || undefined,
      nextVerificationDue: undefined, // Not using this field
      pendingRequestId: undefined, // Not using request model
      rejectionReason: user.verificationNotes || undefined,
      canApplyForJobs: isVerified,
      canUseDiscounts: isVerified,
      canRegisterEvents: isVerified,
      message: this.getVerificationStatusMessage(user.verificationStatus, user.isEmailVerified),
    };
  }

  // =============================================
  // ADMIN VERIFICATION REVIEW
  // =============================================

  async getPendingVerifications(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ users: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const where = {
      verificationStatus: UserVerificationStatus.pending,
      isEmailVerified: true,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          university: true,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.formatUserForVerification(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewVerification(
    userId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ): Promise<{ message: string; user: any }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verificationStatus !== UserVerificationStatus.pending) {
      throw new BadRequestException('This verification has already been reviewed');
    }

    let newStatus: UserVerificationStatus;
    let verificationMethod: StudentVerificationMethod | undefined;

    switch (dto.decision) {
      case VerificationDecision.APPROVE:
        newStatus = UserVerificationStatus.verified;
        verificationMethod = StudentVerificationMethod.manual_review;
        break;
      case VerificationDecision.REJECT:
        if (!dto.rejectionReason) {
          throw new BadRequestException('Rejection reason is required');
        }
        newStatus = UserVerificationStatus.rejected;
        break;
      case VerificationDecision.REQUEST_MORE_INFO:
        newStatus = UserVerificationStatus.pending; // Keep as pending for resubmission
        break;
      default:
        throw new BadRequestException('Invalid decision');
    }

    // Format rejection reason message
    const rejectionMessage = dto.rejectionReason
      ? this.formatRejectionReason(dto.rejectionReason, dto.rejectionMessage)
      : dto.rejectionMessage;

    // Update user status
    const userUpdateData: any = {
      verificationStatus: newStatus,
      verificationNotes: rejectionMessage,
    };

    if (dto.decision === VerificationDecision.APPROVE) {
      userUpdateData.verificationDate = new Date();
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
      include: {
        university: true,
      },
    });

    this.logger.log(`Verification review completed for user: ${user.email}, decision: ${dto.decision}`);

    // Send notification email
    await this.sendVerificationResultEmail(
      updatedUser,
      dto.decision,
      rejectionMessage,
    );

    return {
      message: `Verification ${dto.decision.toLowerCase()}d successfully`,
      user: this.formatUserForVerification(updatedUser),
    };
  }

  // =============================================
  // BASIC STATUS MANAGEMENT
  // =============================================

  async updateUserVerificationStatus(
    userId: string,
    adminId: string,
    status: UserVerificationStatus,
    reason?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {
      verificationStatus: status,
      verificationNotes: reason,
    };

    if (status === UserVerificationStatus.verified) {
      updateData.verificationDate = new Date();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    this.logger.log(`User verification status updated: ${user.email} -> ${status}`);

    return {
      message: `User verification status updated to ${status}`,
    };
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getVerificationStatusMessage(
    status: UserVerificationStatus,
    isEmailVerified: boolean,
  ): string {
    if (!isEmailVerified) {
      return 'Please verify your email address to continue.';
    }

    switch (status) {
      case UserVerificationStatus.pending:
        return 'Your verification is under review. Usually takes 24-48 hours.';
      case UserVerificationStatus.verified:
        return 'Your account is fully verified. You have access to all features.';
      case UserVerificationStatus.rejected:
        return 'Your verification was rejected. Please check the reason and re-submit.';
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

  private formatUserForVerification(user: any): any {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      studentIdNumber: user.studentIdNumber,
      studentIdPhoto: user.studentIdPhoto,
      faculty: user.faculty,
      courseYear: user.courseYear,
      graduationYear: user.graduationYear,
      universityName: user.university?.nameUz,
      verificationStatus: user.verificationStatus,
      verificationDate: user.verificationDate,
      verificationNotes: user.verificationNotes,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
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