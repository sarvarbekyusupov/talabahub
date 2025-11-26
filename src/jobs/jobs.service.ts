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
// Temporary types until Prisma migration
type JobStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'paused' | 'closed' | 'expired';
type JobApplicationStatusEnum = 'applied' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'hired' | 'rejected' | 'withdrawn';
type JobPostingType = 'free' | 'premium';

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

    // Check partner subscription for premium features
    let postingType: JobPostingType = 'free';
    let expiresAt: Date | null = null;
    const status: JobStatus = 'pending_approval';

    if (userId) {
      const subscription = await this.prisma.partnerJobSubscription.findFirst({
        where: {
          userId,
          isActive: true,
          endDate: { gte: new Date() },
        },
      });

      if (subscription) {
        postingType = subscription.planType;

        // Check active job limits for free users
        if (postingType === 'free') {
          const activeJobsCount = await this.prisma.job.count({
            where: {
              company: { id: createJobDto.companyId },
              isActive: true,
              status: { in: ['active', 'approved'] },
            },
          });

          if (activeJobsCount >= subscription.maxActiveJobs) {
            throw new BadRequestException(
              `You have reached the maximum limit of ${subscription.maxActiveJobs} active jobs. Upgrade to premium for unlimited jobs.`
            );
          }
        }

        // Set expiration based on subscription
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + subscription.jobDurationDays);
      } else {
        // Default free posting: 30 days
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }
    }

    const job = await this.prisma.job.create({
      data: {
        ...createJobDto,
        postingType,
        status,
        expiresAt,
      },
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

    // Create initial approval record
    await this.prisma.jobApproval.create({
      data: {
        jobId: job.id,
        status: 'pending_approval',
        notes: 'Job submitted for review',
      },
    });

    return this._formatJobResponse(job);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: {
      companyId?: number;
      categoryId?: number;
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
      experienceLevel?: string;
      postingType?: JobPostingType;
      status?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // Only include status field if it exists in database
    try {
      // Try to use status field - will be removed if it causes error
      if (filters.status !== undefined) {
        where.status = filters.status;
      } else {
        where.status = 'active'; // Default to active if not specified
      }
    } catch (e) {
      // Remove status field if it doesn't exist in database
      delete where.status;
    }

    if (filters.companyId !== undefined) where.companyId = filters.companyId;
    if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
    if (filters.jobType !== undefined) where.jobType = filters.jobType;
    if (filters.location !== undefined)
      where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters.isRemote !== undefined) where.isRemote = filters.isRemote;
    if (filters.minCourseYear !== undefined)
      where.minCourseYear = { lte: filters.minCourseYear };
    if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;

    // Only include advanced fields if they exist
    if (filters.experienceLevel !== undefined) {
      try {
        where.experienceLevel = filters.experienceLevel;
      } catch (e) {
        // Skip if field doesn't exist
      }
    }
    if (filters.postingType !== undefined) {
      try {
        where.postingType = filters.postingType;
      } catch (e) {
        // Skip if field doesn't exist
      }
    }

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
      {
        OR: [
          { expiresAt: { gte: new Date() } },
          { expiresAt: null },
        ],
      },
    ];

    let jobs, total;

    try {
      // Try the full query with all fields
      [jobs, total] = await Promise.all([
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
            category: {
              select: {
                id: true,
                nameUz: true,
                nameEn: true,
                slug: true,
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
    } catch (error) {
      console.error('Database query error:', error.message);
      // Fallback to simpler query without advanced fields
      [jobs, total] = await Promise.all([
        this.prisma.job.findMany({
          where: {
            isActive: true,
          },
          skip,
          take: limit,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.job.count({ where: { isActive: true } }),
      ]);
    }

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
        category: true,
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
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { message: 'Job deleted successfully' };
  }

  // ==========================================
  // Job Approval Workflow
  // ==========================================

  async approveJob(jobId: string, adminId: string, notes?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'pending_approval') {
      throw new BadRequestException('Job is not pending approval');
    }

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'active',
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      }),
      this.prisma.jobApproval.create({
        data: {
          jobId,
          status: 'approved',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          notes,
        },
      }),
    ]);

    // TODO: Send notification to partner

    return { message: 'Job approved successfully' };
  }

  async rejectJob(jobId: string, adminId: string, rejectionReason: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'pending_approval') {
      throw new BadRequestException('Job is not pending approval');
    }

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'rejected',
          rejectionReason,
        },
      }),
      this.prisma.jobApproval.create({
        data: {
          jobId,
          status: 'rejected',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason,
        },
      }),
    ]);

    // TODO: Send notification to partner

    return { message: 'Job rejected' };
  }

  async getPendingApprovals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { status: 'pending_approval' },
        skip,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.job.count({ where: { status: 'pending_approval' } }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    if (!job.isActive || job.status !== 'active') {
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
      include: { resumes: { where: { isDefault: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verificationStatus !== 'verified') {
      throw new BadRequestException('Your account must be verified to apply for jobs');
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
        resumeId: createJobApplicationDto.resumeId || user.resumes[0]?.id,
        cvUrl: createJobApplicationDto.cvUrl,
        coverLetter: createJobApplicationDto.coverLetter,
        portfolioUrl: createJobApplicationDto.portfolioUrl,
        expectedSalary: createJobApplicationDto.expectedSalary,
        availableStartDate: createJobApplicationDto.availableStartDate
          ? new Date(createJobApplicationDto.availableStartDate)
          : null,
        answers: createJobApplicationDto.answers,
        applicationStatus: 'applied',
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

    // Create status history
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        toStatus: 'applied',
        notes: 'Application submitted',
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

    // Update analytics
    await this._updateJobAnalytics(jobId, { applications: 1 });

    // TODO: Send confirmation email to student
    // TODO: Send notification to partner

    return this._formatApplicationResponse(application);
  }

  async updateApplicationStatus(
    applicationId: string,
    status: JobApplicationStatusEnum,
    userId: string,
    options: {
      statusNotes?: string;
      partnerNotes?: string;
      interviewDate?: Date;
      interviewLocation?: string;
      interviewNotes?: string;
      interviewType?: string;
      interviewMeetingLink?: string;
      offerSalary?: number;
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

    const previousStatus = application.applicationStatus;

    // Build update data based on status
    const updateData: any = {
      applicationStatus: status,
      statusUpdatedAt: new Date(),
      statusNotes: options.statusNotes,
      partnerNotes: options.partnerNotes,
    };

    // Handle specific status transitions
    switch (status) {
      case 'under_review':
        if (!application.viewedAt) {
          updateData.viewedAt = new Date();
          updateData.viewedBy = userId;
        }
        break;
      case 'shortlisted':
        updateData.shortlistedAt = new Date();
        break;
      case 'interview_scheduled':
        updateData.interviewDate = options.interviewDate;
        updateData.interviewLocation = options.interviewLocation;
        updateData.interviewNotes = options.interviewNotes;
        updateData.interviewType = options.interviewType;
        updateData.interviewMeetingLink = options.interviewMeetingLink;
        break;
      case 'hired':
        updateData.hiredAt = new Date();
        updateData.offerSalary = options.offerSalary;
        // Pause job if position filled
        await this.prisma.job.update({
          where: { id: application.jobId },
          data: { status: 'paused' },
        });
        break;
      case 'rejected':
        updateData.rejectedAt = new Date();
        break;
      case 'withdrawn':
        updateData.withdrawnAt = new Date();
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

    // Create status history
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: previousStatus as JobApplicationStatusEnum,
        toStatus: status,
        notes: options.statusNotes,
        changedBy: userId,
      },
    });

    // TODO: Send notification to student about status change

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

    if (['hired', 'rejected', 'withdrawn'].includes(application.applicationStatus)) {
      throw new BadRequestException('Cannot withdraw this application');
    }

    return this.updateApplicationStatus(applicationId, 'withdrawn', userId, {
      statusNotes: reason || 'Application withdrawn by student',
    });
  }

  async getApplicationStatusHistory(applicationId: string) {
    const history = await this.prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      include: {
        changedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return history;
  }

  async getUserApplications(userId: string, page = 1, limit = 20, status?: JobApplicationStatusEnum) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.applicationStatus = status;

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
      status?: JobApplicationStatusEnum;
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
    if (filters.status) where.applicationStatus = filters.status;

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
          resume: {
            select: {
              id: true,
              title: true,
              pdfUrl: true,
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
  // Job Recommendations
  // ==========================================

  async getRecommendedJobs(userId: string, page = 1, limit = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: true,
        jobApplications: {
          select: { jobId: true },
          take: 10,
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    // Build recommendation query based on user profile
    const where: any = {
      status: 'active',
      isActive: true,
      AND: [
        {
          OR: [
            { applicationDeadline: { gte: new Date() } },
            { applicationDeadline: null },
          ],
        },
        {
          OR: [
            { expiresAt: { gte: new Date() } },
            { expiresAt: null },
          ],
        },
      ],
    };

    // Filter by course year
    if (user.courseYear) {
      where.OR = [
        { minCourseYear: { lte: user.courseYear } },
        { minCourseYear: null },
      ];
    }

    // Exclude already applied jobs
    const appliedJobIds = user.jobApplications.map(app => app.jobId);
    if (appliedJobIds.length > 0) {
      where.id = { notIn: appliedJobIds };
    }

    // Job type preferences based on year
    if (user.courseYear && user.courseYear <= 2) {
      where.jobType = { in: ['internship', 'part_time'] };
    }

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
        orderBy: [
          { isFeatured: 'desc' },
          { applicationCount: 'asc' }, // Fewer applicants = higher chance
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

    await this._updateJobAnalytics(id, { views: 1 });

    return updated;
  }

  async getJobStatistics(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          select: {
            applicationStatus: true,
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const applicationsByStatus = job.applications.reduce(
      (acc, app) => {
        acc[app.applicationStatus] = (acc[app.applicationStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate conversion rate
    const conversionRate = job.viewCount > 0
      ? ((job.applicationCount / job.viewCount) * 100).toFixed(2)
      : '0';

    return {
      jobId: job.id,
      jobTitle: job.title,
      status: job.status,
      postingType: job.postingType,
      viewCount: job.viewCount,
      applicationCount: job.applicationCount,
      saveCount: job.saveCount,
      shareCount: job.shareCount,
      totalPositions: job.totalPositions,
      conversionRate: `${conversionRate}%`,
      applicationsByStatus,
      isActive: job.isActive,
      isFeatured: job.isFeatured,
      applicationDeadline: job.applicationDeadline,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
      dailyAnalytics: job.analytics,
    };
  }

  async getPartnerJobsAnalytics(companyId: number) {
    const jobs = await this.prisma.job.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        applicationCount: true,
        saveCount: true,
        createdAt: true,
        _count: {
          select: {
            applications: {
              where: {
                applicationStatus: { in: ['hired', 'interview_scheduled'] },
              },
            },
          },
        },
      },
    });

    const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);
    const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);
    const totalSaves = jobs.reduce((sum, j) => sum + j.saveCount, 0);
    const totalHires = jobs.reduce((sum, j) => sum + j._count.applications, 0);

    return {
      totalJobs: jobs.length,
      totalViews,
      totalApplications,
      totalSaves,
      totalHires,
      conversionRate: totalViews > 0
        ? `${((totalApplications / totalViews) * 100).toFixed(2)}%`
        : '0%',
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        viewCount: j.viewCount,
        applicationCount: j.applicationCount,
        hireCount: j._count.applications,
        createdAt: j.createdAt,
      })),
    };
  }

  // ==========================================
  // Job Categories
  // ==========================================

  async getJobCategories() {
    return this.prisma.jobCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            jobs: {
              where: { status: 'active', isActive: true },
            },
          },
        },
      },
    });
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private async _updateJobAnalytics(jobId: string, updates: Partial<{
    views: number;
    uniqueViews: number;
    applications: number;
    clicks: number;
    saves: number;
    shares: number;
  }>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.jobAnalytics.upsert({
      where: {
        jobId_date: {
          jobId,
          date: today,
        },
      },
      create: {
        jobId,
        date: today,
        views: updates.views || 0,
        uniqueViews: updates.uniqueViews || 0,
        applications: updates.applications || 0,
        clicks: updates.clicks || 0,
        saves: updates.saves || 0,
        shares: updates.shares || 0,
      },
      update: {
        views: updates.views ? { increment: updates.views } : undefined,
        uniqueViews: updates.uniqueViews ? { increment: updates.uniqueViews } : undefined,
        applications: updates.applications ? { increment: updates.applications } : undefined,
        clicks: updates.clicks ? { increment: updates.clicks } : undefined,
        saves: updates.saves ? { increment: updates.saves } : undefined,
        shares: updates.shares ? { increment: updates.shares } : undefined,
      },
    });
  }

  private _generateConfirmationCode(): string {
    return `APP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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
      saveCount: job.saveCount,
      shareCount: job.shareCount,
      isActive: job.isActive,
      isFeatured: job.isFeatured,
      status: job.status,
      postingType: job.postingType,
      expiresAt: job.expiresAt,
      experienceLevel: job.experienceLevel,
      educationLevel: job.educationLevel,
      workSchedule: job.workSchedule,
      company: job.company || {},
      category: job.category || null,
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
      resumeId: application.resumeId,
      cvUrl: application.cvUrl,
      coverLetter: application.coverLetter,
      portfolioUrl: application.portfolioUrl,
      expectedSalary: application.expectedSalary
        ? Number(application.expectedSalary)
        : null,
      applicationStatus: application.applicationStatus,
      status: application.status,
      statusUpdatedAt: application.statusUpdatedAt,
      statusNotes: application.statusNotes,
      interviewDate: application.interviewDate,
      interviewLocation: application.interviewLocation,
      interviewNotes: application.interviewNotes,
      interviewType: application.interviewType,
      interviewMeetingLink: application.interviewMeetingLink,
      viewedAt: application.viewedAt,
      shortlistedAt: application.shortlistedAt,
      hiredAt: application.hiredAt,
      rejectedAt: application.rejectedAt,
      withdrawnAt: application.withdrawnAt,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      job: application.job || {},
      user: application.user || {},
      resume: application.resume || null,
    };
  }
}
