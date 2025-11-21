import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApproveArticleDto,
  RejectArticleDto,
  FeatureArticleDto,
  PendingArticlesFilterDto,
  ReportsFilterDto,
  ResolveReportDto,
  WarnUserDto,
  SuspendUserDto,
} from '../dto';
import { NotificationsService } from './notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getPendingArticles(filters: PendingArticlesFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: { status: 'pending' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              university: { select: { nameEn: true } },
            },
          },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where: { status: 'pending' } }),
    ]);

    return {
      data: articles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async approveArticle(id: string, dto: ApproveArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== 'pending') {
      throw new ForbiddenException('Article is not pending');
    }

    await this.prisma.article.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        featured: dto.featured || false,
        featuredAt: dto.featured ? new Date() : null,
      },
    });

    // Notify followers about new article
    const followers = await this.prisma.follow.findMany({
      where: { followingId: article.authorId },
      select: { followerId: true },
    });

    // Bulk notification creation could be optimized
    for (const follower of followers) {
      await this.prisma.blogNotification.create({
        data: {
          userId: follower.followerId,
          type: 'new_response', // Reusing type for article published
          actorId: article.authorId,
          entityType: 'article',
          entityId: id,
          message: 'New article published by someone you follow',
        },
      });
    }

    return { approved: true, published: true };
  }

  async rejectArticle(id: string, dto: RejectArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.article.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: dto.reason,
      },
    });

    // Could send email notification here
    return { rejected: true };
  }

  async featureArticle(id: string, dto: FeatureArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.article.update({
      where: { id },
      data: {
        featured: true,
        featuredAt: new Date(),
      },
    });

    await this.notificationsService.createFeaturedNotification(
      article.authorId,
      id,
    );

    return { featured: true };
  }

  async unfeatureArticle(id: string) {
    await this.prisma.article.update({
      where: { id },
      data: {
        featured: false,
        featuredAt: null,
      },
    });

    return { featured: false };
  }

  async deleteArticle(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.article.delete({ where: { id } });

    // Update author stats
    await this.prisma.studentProfile.update({
      where: { id: article.authorId },
      data: { totalArticles: { decrement: 1 } },
    });

    return { deleted: true };
  }

  async getReports(filters: ReportsFilterDto) {
    const { status, type, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.entityType = type;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(id: string, dto: ResolveReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.report.update({
      where: { id },
      data: {
        status: 'resolved',
        actionTaken: dto.action,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Take action based on decision
    if (dto.action === 'removed') {
      if (report.entityType === 'article') {
        await this.prisma.article.delete({ where: { id: report.entityId } });
      } else if (report.entityType === 'response') {
        await this.prisma.response.delete({ where: { id: report.entityId } });
      }
    }

    return { resolved: true };
  }

  async warnUser(userId: string, dto: WarnUserDto) {
    // Create notification for the user
    await this.prisma.blogNotification.create({
      data: {
        userId,
        type: 'milestone', // Reusing type for warning
        entityType: 'user',
        entityId: userId,
        message: `Warning: ${dto.reason}`,
      },
    });

    return { warned: true };
  }

  async suspendUser(userId: string, dto: SuspendUserDto) {
    // Mark user as inactive
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Create notification
    await this.prisma.blogNotification.create({
      data: {
        userId,
        type: 'milestone',
        entityType: 'user',
        entityId: userId,
        message: `Account suspended: ${dto.reason}`,
      },
    });

    return { suspended: true };
  }
}
