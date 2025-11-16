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

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createJobDto: CreateJobDto) {
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
    companyId?: number,
    jobType?: string,
    location?: string,
    isRemote?: boolean,
    minCourseYear?: number,
    isActive?: boolean,
    isFeatured?: boolean,
    minSalary?: number,
    maxSalary?: number,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId !== undefined) where.companyId = companyId;
    if (jobType !== undefined) where.jobType = jobType;
    if (location !== undefined)
      where.location = { contains: location, mode: 'insensitive' };
    if (isRemote !== undefined) where.isRemote = isRemote;
    if (minCourseYear !== undefined)
      where.minCourseYear = { lte: minCourseYear };
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    // Salary filtering
    if (minSalary !== undefined) {
      where.salaryMax = { gte: minSalary };
    }
    if (maxSalary !== undefined) {
      where.salaryMin = { lte: maxSalary };
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
              isVerified: true,
            },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
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

  async update(id: string, updateJobDto: UpdateJobDto) {
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

    const { companyId, ...updateData } = updateJobDto;

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: updateData,
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
        updatedAt: new Date(),
      },
    });

    return { message: 'Job deleted successfully' };
  }

  async createApplication(
    jobId: string,
    userId: string,
    createJobApplicationDto: CreateJobApplicationDto,
  ) {
    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
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

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        ...createJobApplicationDto,
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

  async getUserApplications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: { userId },
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
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.jobApplication.count({ where: { userId } }),
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
    status?: string,
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
    if (status !== undefined) where.status = status;

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

  async updateApplicationStatus(
    applicationId: string,
    status: 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected',
    statusNotes?: string,
    interviewDate?: Date,
    interviewLocation?: string,
    interviewNotes?: string,
  ) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    const updatedApplication = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status,
        statusUpdatedAt: new Date(),
        statusNotes,
        interviewDate,
        interviewLocation,
        interviewNotes,
      },
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

  async getJobStatistics(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const applicationsByStatus = job.applications.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      jobId: job.id,
      jobTitle: job.title,
      viewCount: job.viewCount,
      applicationCount: job.applicationCount,
      totalPositions: job.totalPositions,
      filledPositions: job.totalPositions - job.totalPositions, // Placeholder logic
      applicationsByStatus,
      isActive: job.isActive,
      isFeatured: job.isFeatured,
      applicationDeadline: job.applicationDeadline,
      createdAt: job.createdAt,
    };
  }

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
      salaryMin: job.salaryMin ? job.salaryMin.toNumber() : null,
      salaryMax: job.salaryMax ? job.salaryMax.toNumber() : null,
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
        ? application.expectedSalary.toNumber()
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
