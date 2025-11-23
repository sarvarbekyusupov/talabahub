import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateResumeDto,
  CreateResumeEducationDto,
  CreateResumeExperienceDto,
  CreateResumeSkillDto,
  CreateResumeLanguageDto,
  CreateResumeCertificationDto,
  CreateResumeProjectDto,
} from './dto/create-resume.dto';
import {
  UpdateResumeDto,
  UpdateResumeEducationDto,
  UpdateResumeExperienceDto,
} from './dto/update-resume.dto';

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Resume CRUD
  // ==========================================

  async create(userId: string, createResumeDto: CreateResumeDto) {
    const { educations, experiences, skills, languages, certifications, projects, ...resumeData } = createResumeDto;

    // If this is marked as default, unset other defaults
    if (createResumeDto.isDefault) {
      await this.prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const resume = await this.prisma.resume.create({
      data: {
        ...resumeData,
        userId,
        educations: educations?.length ? {
          create: educations.map((edu, index) => ({ ...edu, sortOrder: index })),
        } : undefined,
        experiences: experiences?.length ? {
          create: experiences.map((exp, index) => ({ ...exp, sortOrder: index })),
        } : undefined,
        skills: skills?.length ? {
          create: skills.map((skill, index) => ({ ...skill, sortOrder: index })),
        } : undefined,
        languages: languages?.length ? {
          create: languages.map((lang, index) => ({ ...lang, sortOrder: index })),
        } : undefined,
        certifications: certifications?.length ? {
          create: certifications.map((cert, index) => ({ ...cert, sortOrder: index })),
        } : undefined,
        projects: projects?.length ? {
          create: projects.map((proj, index) => ({ ...proj, sortOrder: index })),
        } : undefined,
      },
      include: this.getFullResumeInclude(),
    });

    return this.formatResumeResponse(resume);
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [resumes, total] = await Promise.all([
      this.prisma.resume.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: {
          _count: {
            select: {
              educations: true,
              experiences: true,
              skills: true,
              applications: true,
            },
          },
        },
      }),
      this.prisma.resume.count({ where: { userId } }),
    ]);

    return {
      data: resumes.map(r => ({
        id: r.id,
        title: r.title,
        isDefault: r.isDefault,
        privacy: r.privacy,
        viewCount: r.viewCount,
        downloadCount: r.downloadCount,
        educationsCount: r._count.educations,
        experiencesCount: r._count.experiences,
        skillsCount: r._count.skills,
        applicationsCount: r._count.applications,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: this.getFullResumeInclude(),
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Privacy check
    if (resume.privacy === 'private' && resume.userId !== userId) {
      throw new ForbiddenException('This resume is private');
    }

    return this.formatResumeResponse(resume);
  }

  async update(id: string, userId: string, updateResumeDto: UpdateResumeDto) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only update your own resumes');
    }

    // If setting as default, unset other defaults
    if (updateResumeDto.isDefault) {
      await this.prisma.resume.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updatedResume = await this.prisma.resume.update({
      where: { id },
      data: updateResumeDto,
      include: this.getFullResumeInclude(),
    });

    return this.formatResumeResponse(updatedResume);
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

  async setDefault(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    // Unset all defaults for user, then set this one
    await this.prisma.$transaction([
      this.prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.resume.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { message: 'Resume set as default' };
  }

  async incrementViewCount(id: string) {
    await this.prisma.resume.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementDownloadCount(id: string) {
    await this.prisma.resume.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  // ==========================================
  // Education Management
  // ==========================================

  async addEducation(resumeId: string, userId: string, dto: CreateResumeEducationDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeEducation.count({ where: { resumeId } });

    const education = await this.prisma.resumeEducation.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });

    return education;
  }

  async updateEducation(educationId: string, userId: string, dto: UpdateResumeEducationDto) {
    const education = await this.prisma.resumeEducation.findUnique({
      where: { id: educationId },
      include: { resume: true },
    });

    if (!education) {
      throw new NotFoundException('Education not found');
    }

    if (education.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    return this.prisma.resumeEducation.update({
      where: { id: educationId },
      data: dto,
    });
  }

  async removeEducation(educationId: string, userId: string) {
    const education = await this.prisma.resumeEducation.findUnique({
      where: { id: educationId },
      include: { resume: true },
    });

    if (!education) {
      throw new NotFoundException('Education not found');
    }

    if (education.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeEducation.delete({
      where: { id: educationId },
    });

    return { message: 'Education removed successfully' };
  }

  // ==========================================
  // Experience Management
  // ==========================================

  async addExperience(resumeId: string, userId: string, dto: CreateResumeExperienceDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeExperience.count({ where: { resumeId } });

    const experience = await this.prisma.resumeExperience.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });

    return experience;
  }

  async updateExperience(experienceId: string, userId: string, dto: UpdateResumeExperienceDto) {
    const experience = await this.prisma.resumeExperience.findUnique({
      where: { id: experienceId },
      include: { resume: true },
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    if (experience.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    return this.prisma.resumeExperience.update({
      where: { id: experienceId },
      data: dto,
    });
  }

  async removeExperience(experienceId: string, userId: string) {
    const experience = await this.prisma.resumeExperience.findUnique({
      where: { id: experienceId },
      include: { resume: true },
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    if (experience.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeExperience.delete({
      where: { id: experienceId },
    });

    return { message: 'Experience removed successfully' };
  }

  // ==========================================
  // Skills Management
  // ==========================================

  async addSkill(resumeId: string, userId: string, dto: CreateResumeSkillDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeSkill.count({ where: { resumeId } });

    return this.prisma.resumeSkill.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });
  }

  async removeSkill(skillId: string, userId: string) {
    const skill = await this.prisma.resumeSkill.findUnique({
      where: { id: skillId },
      include: { resume: true },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    if (skill.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeSkill.delete({
      where: { id: skillId },
    });

    return { message: 'Skill removed successfully' };
  }

  async bulkUpdateSkills(resumeId: string, userId: string, skills: CreateResumeSkillDto[]) {
    await this.verifyResumeOwnership(resumeId, userId);

    // Delete existing skills and create new ones
    await this.prisma.$transaction([
      this.prisma.resumeSkill.deleteMany({ where: { resumeId } }),
      this.prisma.resumeSkill.createMany({
        data: skills.map((skill, index) => ({
          ...skill,
          resumeId,
          sortOrder: index,
        })),
      }),
    ]);

    return { message: 'Skills updated successfully' };
  }

  // ==========================================
  // Languages Management
  // ==========================================

  async addLanguage(resumeId: string, userId: string, dto: CreateResumeLanguageDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeLanguage.count({ where: { resumeId } });

    return this.prisma.resumeLanguage.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });
  }

  async removeLanguage(languageId: string, userId: string) {
    const language = await this.prisma.resumeLanguage.findUnique({
      where: { id: languageId },
      include: { resume: true },
    });

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    if (language.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeLanguage.delete({
      where: { id: languageId },
    });

    return { message: 'Language removed successfully' };
  }

  // ==========================================
  // Certifications Management
  // ==========================================

  async addCertification(resumeId: string, userId: string, dto: CreateResumeCertificationDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeCertification.count({ where: { resumeId } });

    return this.prisma.resumeCertification.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });
  }

  async removeCertification(certificationId: string, userId: string) {
    const certification = await this.prisma.resumeCertification.findUnique({
      where: { id: certificationId },
      include: { resume: true },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    if (certification.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeCertification.delete({
      where: { id: certificationId },
    });

    return { message: 'Certification removed successfully' };
  }

  // ==========================================
  // Projects Management
  // ==========================================

  async addProject(resumeId: string, userId: string, dto: CreateResumeProjectDto) {
    await this.verifyResumeOwnership(resumeId, userId);

    const count = await this.prisma.resumeProject.count({ where: { resumeId } });

    return this.prisma.resumeProject.create({
      data: {
        ...dto,
        resumeId,
        sortOrder: count,
      },
    });
  }

  async removeProject(projectId: string, userId: string) {
    const project = await this.prisma.resumeProject.findUnique({
      where: { id: projectId },
      include: { resume: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    await this.prisma.resumeProject.delete({
      where: { id: projectId },
    });

    return { message: 'Project removed successfully' };
  }

  // ==========================================
  // Analytics
  // ==========================================

  async getResumeAnalytics(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        downloadCount: true,
        _count: {
          select: { applications: true },
        },
      },
    });

    const totalViews = resumes.reduce((sum, r) => sum + r.viewCount, 0);
    const totalDownloads = resumes.reduce((sum, r) => sum + r.downloadCount, 0);
    const totalApplications = resumes.reduce((sum, r) => sum + r._count.applications, 0);

    return {
      totalResumes: resumes.length,
      totalViews,
      totalDownloads,
      totalApplications,
      resumes: resumes.map(r => ({
        id: r.id,
        title: r.title,
        viewCount: r.viewCount,
        downloadCount: r.downloadCount,
        applicationsCount: r._count.applications,
      })),
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private async verifyResumeOwnership(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You can only modify your own resumes');
    }

    return resume;
  }

  private getFullResumeInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      educations: {
        orderBy: { sortOrder: 'asc' as const },
      },
      experiences: {
        orderBy: { sortOrder: 'asc' as const },
      },
      skills: {
        orderBy: { sortOrder: 'asc' as const },
      },
      languages: {
        orderBy: { sortOrder: 'asc' as const },
      },
      certifications: {
        orderBy: { sortOrder: 'asc' as const },
      },
      projects: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }

  private formatResumeResponse(resume: any) {
    return {
      id: resume.id,
      userId: resume.userId,
      title: resume.title,
      summary: resume.summary,
      phone: resume.phone,
      email: resume.email,
      location: resume.location,
      linkedinUrl: resume.linkedinUrl,
      githubUrl: resume.githubUrl,
      portfolioUrl: resume.portfolioUrl,
      pdfUrl: resume.pdfUrl,
      privacy: resume.privacy,
      isDefault: resume.isDefault,
      viewCount: resume.viewCount,
      downloadCount: resume.downloadCount,
      user: resume.user,
      educations: resume.educations || [],
      experiences: resume.experiences || [],
      skills: resume.skills || [],
      languages: resume.languages || [],
      certifications: resume.certifications || [],
      projects: resume.projects || [],
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }
}
