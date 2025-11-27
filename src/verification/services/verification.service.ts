import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVerificationRequestDto,
  UpdateVerificationRequestDto,
  QueryVerificationDto,
  StudentVerificationDto,
  VerificationStatus,
  VerificationRequestType,
  AddUniversityDomainDto,
} from '../dto/verification.dto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // VERIFICATION REQUEST METHODS
  // ==========================================

  async createRequest(
    createVerificationDto: CreateVerificationRequestDto,
    userId: string,
  ) {
    // Check if user already has a pending verification of the same type
    const existingRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        userId,
        requestType: createVerificationDto.requestType,
        status: VerificationStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        `You already have a pending ${createVerificationDto.requestType} request`,
      );
    }

    const verificationRequest = await this.prisma.verificationRequest.create({
      data: {
        userId,
        requestType: createVerificationDto.requestType,
        submittedDocuments: createVerificationDto.submittedDocuments || {},
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verificationStatus: true,
          },
        },
      },
    });

    return this._formatVerificationResponse(verificationRequest);
  }

  async findAll(query: QueryVerificationDto, reviewerId?: string) {
    const {
      page = 1,
      limit = 20,
      status,
      requestType,
      userId,
      reviewedBy,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (requestType) {
      where.requestType = requestType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (reviewedBy || reviewedBy === null) {
      where.reviewedBy = reviewedBy;
    }

    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.verificationRequest.count({ where }),
    ]);

    return {
      data: requests.map((request) => this._formatVerificationResponse(request)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            verificationStatus: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    return this._formatVerificationResponse(request);
  }

  async update(id: string, updateVerificationDto: UpdateVerificationRequestDto, reviewerId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Cannot update a processed verification request');
    }

    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        ...updateVerificationDto,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verificationStatus: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If approved, update user's verification status
    if (updateVerificationDto.status === VerificationStatus.APPROVED) {
      await this.prisma.user.update({
        where: { id: request.userId },
        data: { verificationStatus: 'verified' },
      });
    }

    return this._formatVerificationResponse(updatedRequest);
  }

  async getUserRequests(userId: string, query: QueryVerificationDto) {
    return this.findAll({ ...query, userId });
  }

  // ==========================================
  // STUDENT VERIFICATION METHODS
  // ==========================================

  async submitStudentVerification(studentVerificationDto: StudentVerificationDto, userId: string) {
    // Verify university email domain
    const domain = studentVerificationDto.universityEmail.split('@')[1];
    const universityDomain = await this.prisma.universityDomain.findUnique({
      where: { domain, isActive: true },
      include: {
        university: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            nameRu: true,
          },
        },
      },
    });

    if (!universityDomain) {
      throw new BadRequestException('University email domain is not recognized');
    }

    // Check for existing pending student verification
    const existingRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        userId,
        requestType: VerificationRequestType.STUDENT_VERIFICATION,
        status: VerificationStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending student verification request');
    }

    const verificationRequest = await this.prisma.verificationRequest.create({
      data: {
        userId,
        requestType: VerificationRequestType.STUDENT_VERIFICATION,
        submittedDocuments: {
          studentId: studentVerificationDto.studentId,
          universityEmail: studentVerificationDto.universityEmail,
          universityId: universityDomain.university.id,
          universityName: universityDomain.university.nameUz || universityDomain.university.nameEn || universityDomain.university.nameRu,
          graduationDate: studentVerificationDto.graduationDate,
          fieldOfStudy: studentVerificationDto.fieldOfStudy,
          documents: studentVerificationDto.documents || [],
          verifiedDomain: domain,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verificationStatus: true,
          },
        },
      },
    });

    return this._formatVerificationResponse(verificationRequest);
  }

  async verifyStudentEmail(email: string) {
    const domain = email.split('@')[1];
    const universityDomain = await this.prisma.universityDomain.findUnique({
      where: { domain, isActive: true },
      include: {
        university: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            nameRu: true,
          },
        },
      },
    });

    return {
      isVerified: !!universityDomain,
      domain,
      universityId: universityDomain?.universityId || null,
    };
  }

  // ==========================================
  // UNIVERSITY DOMAIN METHODS
  // ==========================================

  async addUniversityDomain(addDomainDto: AddUniversityDomainDto) {
    // Check if domain already exists
    const existingDomain = await this.prisma.universityDomain.findUnique({
      where: { domain: addDomainDto.domain },
    });

    if (existingDomain) {
      throw new BadRequestException('Domain already exists');
    }

    // Verify university exists
    const university = await this.prisma.university.findUnique({
      where: { id: addDomainDto.universityId },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    const domain = await this.prisma.universityDomain.create({
      data: {
        domain: addDomainDto.domain,
        universityId: addDomainDto.universityId,
      },
      include: {
        university: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            nameRu: true,
          },
        },
      },
    });

    return domain;
  }

  async getUniversityDomains() {
    return this.prisma.universityDomain.findMany({
      where: { isActive: true },
      include: {
        university: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            nameRu: true,
          },
        },
      },
      orderBy: { domain: 'asc' },
    });
  }

  async updateUniversityDomainStatus(id: string, isActive: boolean) {
    const domain = await this.prisma.universityDomain.findUnique({
      where: { id },
    });

    if (!domain) {
      throw new NotFoundException('University domain not found');
    }

    return this.prisma.universityDomain.update({
      where: { id },
      data: { isActive },
    });
  }

  // ==========================================
  // ANALYTICS METHODS
  // ==========================================

  async getVerificationStats() {
    const [total, pending, approved, rejected, byType] = await Promise.all([
      this.prisma.verificationRequest.count(),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.PENDING } }),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.APPROVED } }),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.REJECTED } }),
      this.prisma.verificationRequest.groupBy({
        by: ['requestType'],
        _count: true,
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      byType: byType.reduce((acc, item) => {
        acc[item.requestType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private _formatVerificationResponse(request: any) {
    return {
      id: request.id,
      requestType: request.requestType,
      status: request.status,
      submittedDocuments: request.submittedDocuments,
      adminNotes: request.adminNotes,
      rejectionReason: request.rejectionReason,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      user: request.user,
      reviewer: request.reviewer,
    };
  }
}