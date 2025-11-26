import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { JobApplicationStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Job Posting Management
  // ==========================================

  async create(createJobDto: CreateJobDto, userId?: string) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: createJobDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const job = await this.prisma.job.create({
      data: createJobDto,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
          },
        },
      },
    });

    return this._formatJobResponse(job);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: {
      companyId?: number;
      jobType?: string;
      location?: string;
      isRemote?: boolean;
      minCourseYear?: number;
      isActive?: boolean;
      isFeatured?: boolean;
      minSalary?: number;
      maxSalary?: number;
      search?: string;
      skills?: string[];
    } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (filters.companyId !== undefined) where.companyId = filters.companyId;
    if (filters.jobType !== undefined) where.jobType = filters.jobType;
    if (filters.location !== undefined)
      where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters.isRemote !== undefined) where.isRemote = filters.isRemote;
    if (filters.minCourseYear !== undefined)
      where.minCourseYear = { lte: filters.minCourseYear };
    if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;

    // Salary filtering
    if (filters.minSalary !== undefined) {
      where.salaryMax = { gte: filters.minSalary };
    }
    if (filters.maxSalary !== undefined) {
      where.salaryMin = { lte: filters.maxSalary };
    }

    // Search in title and description
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Skills filtering
    if (filters.skills && filters.skills.length > 0) {
      where.requiredSkills = { hasSome: filters.skills };
    }

    // Filter by active deadline
    where.AND = [
      {
        OR: [
          { applicationDeadline: { gte: new Date() } },
          { applicationDeadline: null },
        ],
      },
    ];

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              industry: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs.map((j) => this._formatJobResponse(j)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            description: true,
            website: true,
            email: true,
            phone: true,
            address: true,
            industry: true,
            companySize: true,
            foundedYear: true,
            totalHires: true,
            rating: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this._formatJobResponse(job);
  }

  async update(id: string, updateJobDto: UpdateJobDto, userId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // If companyId is being updated, verify it exists
    if (updateJobDto.companyId && updateJobDto.companyId !== job.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: updateJobDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: updateJobDto,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
          },
        },
      },
    });

    return this._formatJobResponse(updatedJob);
  }

  async remove(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Soft delete
    await this.prisma.job.update({
      where: { id },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    return { message: 'Job deleted successfully' };
  }

  // ==========================================
  // Application Management
  // ==========================================

  async createApplication(
    jobId: string,
    userId: string,
    createJobApplicationDto: CreateJobApplicationDto,
  ) {
    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!job.isActive) {
      throw new BadRequestException('Job is not active');
    }

    // Check application deadline
    if (job.applicationDeadline && job.applicationDeadline < new Date()) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Check if user already applied for this job
    const existingApplication = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied for this job');
    }

    // Check student verification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Rate limiting: max 20 applications per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const applicationsToday = await this.prisma.jobApplication.count({
      where: {
        userId,
        appliedAt: { gte: todayStart },
      },
    });

    if (applicationsToday >= 20) {
      throw new BadRequestException('You have reached the daily application limit of 20');
    }

    // Create application
    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        cvUrl: createJobApplicationDto.cvUrl,
        coverLetter: createJobApplicationDto.coverLetter,
        portfolioUrl: createJobApplicationDto.portfolioUrl,
        expectedSalary: createJobApplicationDto.expectedSalary,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Increment job application count
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        applicationCount: {
          increment: 1,
        },
      },
    });

    return this._formatApplicationResponse(application);
  }

  async updateApplicationStatus(
    applicationId: string,
    status: JobApplicationStatus,
    userId: string,
    options: {
      statusNotes?: string;
      interviewDate?: Date;
      interviewLocation?: string;
      interviewNotes?: string;
    } = {},
  ) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    // Build update data based on status
    const updateData: any = {
      status,
      statusUpdatedAt: new Date(),
      statusNotes: options.statusNotes,
    };

    // Handle specific status transitions
    switch (status) {
      case 'interview': // Updated from interview_scheduled
        updateData.interviewDate = options.interviewDate;
        updateData.interviewLocation = options.interviewLocation;
        updateData.interviewNotes = options.interviewNotes;
        break;
    }

    const updatedApplication = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return this._formatApplicationResponse(updatedApplication);
  }

  async withdrawApplication(applicationId: string, userId: string, reason?: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    if (['accepted', 'rejected'].includes(application.status)) { // Updated from hired/withdrawn
      throw new BadRequestException('Cannot withdraw this application');
    }

    return this.updateApplicationStatus(applicationId, 'rejected', userId, { // Changed from withdrawn
      statusNotes: reason || 'Application withdrawn by student',
    });
  }

  async getUserApplications(userId: string, page = 1, limit = 20, status?: JobApplicationStatus) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              jobType: true,
              location: true,
              isRemote: true,
              salaryMin: true,
              salaryMax: true,
              salaryCurrency: true,
              companyId: true,
              createdAt: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data: applications.map((a) => this._formatApplicationResponse(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobApplications(
    jobId: string,
    filters: {
      status?: JobApplicationStatus;
      universityId?: number;
      minCourseYear?: number;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const skip = (page - 1) * limit;

    const where: any = { jobId };
    if (filters.status) where.status = filters.status;

    if (filters.universityId || filters.minCourseYear || filters.search) {
      where.user = {};
      if (filters.universityId) where.user.universityId = filters.universityId;
      if (filters.minCourseYear) where.user.courseYear = { gte: filters.minCourseYear };
      if (filters.search) {
        where.user.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              courseYear: true,
              university: {
                select: {
                  id: true,
                  nameUz: true,
                  nameEn: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data: applications.map((a) => this._formatApplicationResponse(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // Analytics
  // ==========================================

  async incrementViewCount(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
      },
    });

    return updated;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private _formatJobResponse(job: any) {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      jobType: job.jobType,
      location: job.location,
      isRemote: job.isRemote,
      salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
      salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
      salaryCurrency: job.salaryCurrency,
      isPaid: job.isPaid,
      minCourseYear: job.minCourseYear,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      languages: job.languages,
      applicationDeadline: job.applicationDeadline,
      totalPositions: job.totalPositions,
      applicationCount: job._count?.applications || job.applicationCount || 0,
      viewCount: job.viewCount,
      isActive: job.isActive,
      isFeatured: job.isFeatured,
      company: job.company || {},
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      closedAt: job.closedAt,
    };
  }

  private _formatApplicationResponse(application: any) {
    return {
      id: application.id,
      jobId: application.jobId,
      userId: application.userId,
      cvUrl: application.cvUrl,
      coverLetter: application.coverLetter,
      portfolioUrl: application.portfolioUrl,
      expectedSalary: application.expectedSalary
        ? Number(application.expectedSalary)
        : null,
      status: application.status,
      statusUpdatedAt: application.statusUpdatedAt,
      statusNotes: application.statusNotes,
      interviewDate: application.interviewDate,
      interviewLocation: application.interviewLocation,
      interviewNotes: application.interviewNotes,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      job: application.job || {},
      user: application.user || {},
    };
  }
}