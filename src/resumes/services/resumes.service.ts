import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateResumeDto,
  UpdateResumeDto,
  QueryResumeDto,
  ExperienceDto,
  EducationDto,
  SkillDto,
  LanguageDto,
  CertificationDto,
  ProjectDto,
  ResumeAnalyticsDto,
} from '../dto/resume.dto';

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // RESUME CRUD METHODS
  // ==========================================

  async create(createResumeDto: CreateResumeDto, userId: string) {
    // Check if user already has a resume with the same title
    const existingResume = await this.prisma.resume.findFirst({
      where: {
        userId,
        title: createResumeDto.title,
      },
    });

    if (existingResume) {
      throw new BadRequestException('You already have a resume with this title');
    }

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: createResumeDto.title,
        summary: createResumeDto.summary,
        experience: createResumeDto.experience || [] as any,
        education: createResumeDto.education || [] as any,
        skills: createResumeDto.skills || [] as any,
        languages: createResumeDto.languages || [] as any,
        certifications: createResumeDto.certifications || [] as any,
        projects: createResumeDto.projects || [] as any,
        template: createResumeDto.template || 'modern',
        isPublic: createResumeDto.isPublic || false,
      },
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
      },
    });

    return this._formatResumeResponse(resume);
  }

  async findAll(query: QueryResumeDto, currentUserId?: string) {
    const {
      page = 1,
      limit = 20,
      userId,
      isPublic,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Filter by user ownership or public visibility
    if (currentUserId) {
      if (userId) {
        where.userId = userId;
      } else if (isPublic !== undefined) {
        where.isPublic = isPublic;
      } else {
        where.OR = [
          { userId: currentUserId },
          { isPublic: true },
        ];
      }
    } else {
      where.isPublic = true;
    }

    // Search functionality
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [resumes, total] = await Promise.all([
      this.prisma.resume.findMany({
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
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.resume.count({ where }),
    ]);

    return {
      data: resumes.map((resume) => this._formatResumeResponse(resume)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUserId?: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
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
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Check access permissions
    if (resume.userId !== currentUserId && !resume.isPublic) {
      throw new ForbiddenException('You do not have permission to view this resume');
    }

    // Increment view count for public resumes (but not for owner)
    if (resume.isPublic && resume.userId !== currentUserId) {
      await this.prisma.resume.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return this._formatResumeResponse(resume);
  }

  async update(id: string, updateResumeDto: UpdateResumeDto, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only edit your own resumes');
    }

    const updatedResume = await this.prisma.resume.update({
      where: { id },
      data: {
        ...updateResumeDto,
        lastSavedAt: new Date(),
      } as any,
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
      },
    });

    return this._formatResumeResponse(updatedResume);
  }

  async remove(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only delete your own resumes');
    }

    await this.prisma.resume.delete({
      where: { id },
    });

    return { message: 'Resume deleted successfully' };
  }

  async getUserResumes(userId: string, query: QueryResumeDto) {
    return this.findAll({ ...query, userId }, userId);
  }

  async duplicateResume(id: string, userId: string, newTitle?: string) {
    const originalResume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!originalResume) {
      throw new NotFoundException('Resume not found');
    }

    if (originalResume.userId !== userId && !originalResume.isPublic) {
      throw new ForbiddenException('You can only duplicate your own resumes or public resumes');
    }

    const title = newTitle || `${originalResume.title} (Copy)`;

    const duplicatedResume = await this.prisma.resume.create({
      data: {
        userId,
        title,
        summary: originalResume.summary,
        experience: originalResume.experience as any,
        education: originalResume.education as any,
        skills: originalResume.skills as any,
        languages: originalResume.languages as any,
        certifications: originalResume.certifications as any,
        projects: originalResume.projects as any,
        template: originalResume.template,
        isPublic: false, // Duplicated resumes are private by default
      },
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
      },
    });

    return this._formatResumeResponse(duplicatedResume);
  }

  // ==========================================
  // EXPERIENCE MANAGEMENT
  // ==========================================

  async addExperience(resumeId: string, experience: ExperienceDto, userId: string) {
    const resume = await this._checkResumeOwnership(resumeId, userId);

    const updatedExperience = [...(resume.experience as any[] || []), experience];

    const updatedResume = await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        experience: updatedExperience as any,
        lastSavedAt: new Date(),
      },
    });

    return this._formatResumeResponse(updatedResume);
  }

  async updateExperience(resumeId: string, index: number, experience: ExperienceDto, userId: string) {
    const resume = await this._checkResumeOwnership(resumeId, userId);

    const experiences = resume.experience as any[] || [];
    if (index < 0 || index >= experiences.length) {
      throw new BadRequestException('Invalid experience index');
    }

    experiences[index] = experience;

    const updatedResume = await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        experience: experiences as any,
        lastSavedAt: new Date(),
      },
    });

    return this._formatResumeResponse(updatedResume);
  }

  async removeExperience(resumeId: string, index: number, userId: string) {
    const resume = await this._checkResumeOwnership(resumeId, userId);

    const experiences = resume.experience as any[] || [];
    if (index < 0 || index >= experiences.length) {
      throw new BadRequestException('Invalid experience index');
    }

    experiences.splice(index, 1);

    const updatedResume = await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        experience: experiences as any,
        lastSavedAt: new Date(),
      },
    });

    return this._formatResumeResponse(updatedResume);
  }

  // ==========================================
  // TEMPLATES
  // ==========================================

  async getAvailableTemplates() {
    const templates = [
      {
        name: 'modern',
        description: 'Clean and modern design with professional layout',
        previewUrl: '/templates/modern-preview.png',
        category: 'professional',
        isPremium: false,
      },
      {
        name: 'creative',
        description: 'Creative design for creative professionals',
        previewUrl: '/templates/creative-preview.png',
        category: 'creative',
        isPremium: false,
      },
      {
        name: 'executive',
        description: 'Executive style for senior professionals',
        previewUrl: '/templates/executive-preview.png',
        category: 'professional',
        isPremium: true,
      },
      {
        name: 'minimal',
        description: 'Minimal and clean design',
        previewUrl: '/templates/minimal-preview.png',
        category: 'minimal',
        isPremium: false,
      },
    ];

    return templates;
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  async getResumeAnalytics(userId: string) {
    const [totalResumes, publicResumes, totalViews, recentViews] = await Promise.all([
      this.prisma.resume.count({ where: { userId } }),
      this.prisma.resume.count({ where: { userId, isPublic: true } }),
      this.prisma.resume.aggregate({
        where: { userId },
        _sum: { viewCount: true },
      }),
      this.prisma.resume.findMany({
        where: { userId },
        select: { id: true, title: true, viewCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalResumes,
      publicResumes,
      totalViews: totalViews._sum.viewCount || 0,
      averageViews: totalResumes > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalResumes) : 0,
      recentResumes: recentViews.map((resume) => ({
        id: resume.id,
        title: resume.title,
        views: resume.viewCount,
        createdAt: resume.createdAt,
      })),
    };
  }

  async getPopularResumes(limit = 10) {
    const resumes = await this.prisma.resume.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        summary: true,
        viewCount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });

    return resumes;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async _checkResumeOwnership(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only edit your own resumes');
    }

    return resume;
  }

  private _formatResumeResponse(resume: any) {
    return {
      id: resume.id,
      title: resume.title,
      summary: resume.summary,
      experience: resume.experience || [],
      education: resume.education || [],
      skills: resume.skills || [],
      languages: resume.languages || [],
      certifications: resume.certifications || [],
      projects: resume.projects || [],
      fileUrl: resume.fileUrl,
      template: resume.template,
      isPublic: resume.isPublic,
      viewCount: resume.viewCount || 0,
      lastSavedAt: resume.lastSavedAt,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      user: resume.user,
    };
  }
}