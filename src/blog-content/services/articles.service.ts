import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  PublishArticleDto,
  UpdateArticleDto,
  ArticleFilterDto,
  TrackViewDto,
} from '../dto';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  // Helper to generate slug
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  // Helper to calculate reading time
  private calculateReadingTime(content: any): number {
    const text = JSON.stringify(content);
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / 200); // 200 words per minute
  }

  // Helper to count words
  private countWords(content: any): number {
    const text = JSON.stringify(content);
    return text.split(/\s+/).length;
  }

  // Draft operations
  async createDraft(dto: CreateDraftDto, userId: string) {
    const draft = await this.prisma.draft.create({
      data: {
        authorId: userId,
        title: dto.title,
        content: dto.content || {},
      },
    });
    return { draftId: draft.id, savedAt: draft.lastSavedAt };
  }

  async updateDraft(id: string, dto: UpdateDraftDto, userId: string) {
    const draft = await this.prisma.draft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.authorId !== userId) throw new ForbiddenException('Not your draft');

    const updated = await this.prisma.draft.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        lastSavedAt: new Date(),
      },
    });
    return { savedAt: updated.lastSavedAt };
  }

  async getDraft(id: string, userId: string) {
    const draft = await this.prisma.draft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.authorId !== userId) throw new ForbiddenException('Not your draft');
    return draft;
  }

  async getUserDrafts(userId: string) {
    return this.prisma.draft.findMany({
      where: { authorId: userId },
      orderBy: { lastSavedAt: 'desc' },
    });
  }

  async deleteDraft(id: string, userId: string) {
    const draft = await this.prisma.draft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.authorId !== userId) throw new ForbiddenException('Not your draft');

    await this.prisma.draft.delete({ where: { id } });
    return { deleted: true };
  }

  // Publish article from draft
  async publishArticle(draftId: string, dto: PublishArticleDto, userId: string) {
    // Validate minimum requirements
    const wordCount = this.countWords(dto.content);
    if (wordCount < 300) {
      throw new BadRequestException('Article must be at least 300 words');
    }

    // Check for existing slug
    let slug = this.generateSlug(dto.title);
    const existing = await this.prisma.article.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create article
    const article = await this.prisma.article.create({
      data: {
        authorId: userId,
        title: dto.title,
        subtitle: dto.subtitle,
        slug,
        content: dto.content,
        featuredImageUrl: dto.featuredImageUrl,
        readingTimeMinutes: this.calculateReadingTime(dto.content),
        wordCount,
        status: 'pending',
        tags: {
          create: dto.tagIds.map(tagId => ({ tagId })),
        },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    // Create article stats
    await this.prisma.articleStats.create({
      data: { articleId: article.id },
    });

    // Delete draft if it exists
    if (draftId) {
      await this.prisma.draft.deleteMany({
        where: { id: draftId, authorId: userId },
      });
    }

    // Update student profile stats
    await this.prisma.studentProfile.upsert({
      where: { id: userId },
      update: { totalArticles: { increment: 1 } },
      create: {
        id: userId,
        totalArticles: 1,
      },
    });

    return { articleId: article.id, status: 'pending' };
  }

  // Get article by ID
  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: true,
          },
        },
        stats: true,
        tags: {
          include: { tag: true },
        },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  // Get article by slug
  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: true,
          },
        },
        stats: true,
        tags: {
          include: { tag: true },
        },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  // List articles with filters
  async findAll(filters: ArticleFilterDto) {
    const {
      status = 'published',
      author,
      universityId,
      tag,
      sort = 'latest',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      status: status as any,
    };

    if (author) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { contains: author } },
            { firstName: { contains: author, mode: 'insensitive' } },
            { lastName: { contains: author, mode: 'insensitive' } },
          ],
        },
      });
      if (user) where.authorId = user.id;
    }

    if (universityId) {
      where.author = { universityId };
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      };
    }

    let orderBy: any = { publishedAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { stats: { clapsCount: 'desc' } };
    } else if (sort === 'trending') {
      // Trending based on recent engagement
      orderBy = { stats: { viewsCount: 'desc' } };
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          stats: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
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

  // Get articles by author
  async findByAuthor(username: string, page = 1, limit = 20) {
    // Find user by username pattern (using email or name)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const where = { authorId: user.id, status: 'published' as any };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          stats: true,
          tags: { include: { tag: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
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

  // Update article
  async update(id: string, dto: UpdateArticleDto, userId: string, userRole: string) {
    const article = await this.findById(id);

    if (article.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only update your own articles');
    }

    let updateData: any = {
      title: dto.title,
      subtitle: dto.subtitle,
      content: dto.content,
      featuredImageUrl: dto.featuredImageUrl,
    };

    if (dto.content) {
      updateData.wordCount = this.countWords(dto.content);
      updateData.readingTimeMinutes = this.calculateReadingTime(dto.content);
    }

    if (dto.title) {
      const newSlug = this.generateSlug(dto.title);
      if (newSlug !== article.slug) {
        const existing = await this.prisma.article.findFirst({
          where: { slug: newSlug, id: { not: id } },
        });
        if (existing) {
          updateData.slug = `${newSlug}-${Date.now()}`;
        } else {
          updateData.slug = newSlug;
        }
      }
    }

    // Update tags if provided
    if (dto.tagIds) {
      await this.prisma.articleTag.deleteMany({ where: { articleId: id } });
      await this.prisma.articleTag.createMany({
        data: dto.tagIds.map(tagId => ({ articleId: id, tagId })),
      });
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
        tags: { include: { tag: true } },
      },
    });

    return { updated: true, article: updated };
  }

  // Delete article (soft delete by changing status)
  async delete(id: string, userId: string, userRole: string) {
    const article = await this.findById(id);

    if (article.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own articles');
    }

    await this.prisma.article.delete({ where: { id } });

    // Update student profile stats
    await this.prisma.studentProfile.update({
      where: { id: userId },
      data: { totalArticles: { decrement: 1 } },
    });

    return { deleted: true };
  }

  // Track article view
  async trackView(id: string, dto: TrackViewDto, userId?: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    // Check if this session already viewed
    const existingView = await this.prisma.articleView.findFirst({
      where: {
        articleId: id,
        sessionId: dto.sessionId,
      },
    });

    if (existingView) {
      // Update existing view
      await this.prisma.articleView.update({
        where: { id: existingView.id },
        data: {
          readPercentage: Math.max(existingView.readPercentage, dto.readPercentage || 0),
          timeSpentSeconds: existingView.timeSpentSeconds + (dto.timeSpentSeconds || 0),
        },
      });
    } else {
      // Create new view
      await this.prisma.articleView.create({
        data: {
          articleId: id,
          userId,
          sessionId: dto.sessionId,
          readPercentage: dto.readPercentage || 0,
          timeSpentSeconds: dto.timeSpentSeconds || 0,
          referrer: dto.referrer,
          deviceType: dto.deviceType,
        },
      });

      // Update stats
      await this.prisma.articleStats.update({
        where: { articleId: id },
        data: {
          viewsCount: { increment: 1 },
          uniqueViewsCount: { increment: userId ? 1 : 0 },
        },
      });
    }

    return { tracked: true };
  }

  // Get article stats
  async getStats(id: string) {
    const stats = await this.prisma.articleStats.findUnique({
      where: { articleId: id },
    });
    if (!stats) throw new NotFoundException('Stats not found');
    return stats;
  }

  // Get detailed stats (author only)
  async getDetailedStats(id: string, userId: string) {
    const article = await this.findById(id);
    if (article.authorId !== userId) {
      throw new ForbiddenException('You can only view your own article stats');
    }

    const stats = await this.prisma.articleStats.findUnique({
      where: { articleId: id },
    });

    // Get views over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const views = await this.prisma.articleView.groupBy({
      by: ['createdAt'],
      where: {
        articleId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Get top referrers
    const referrers = await this.prisma.articleView.groupBy({
      by: ['referrer'],
      where: { articleId: id, referrer: { not: null } },
      _count: true,
      orderBy: { _count: { referrer: 'desc' } },
      take: 10,
    });

    // Get device breakdown
    const devices = await this.prisma.articleView.groupBy({
      by: ['deviceType'],
      where: { articleId: id },
      _count: true,
    });

    return {
      ...stats,
      viewsOverTime: views,
      topReferrers: referrers,
      deviceBreakdown: devices,
    };
  }

  // Get related articles
  async getRelated(id: string, limit = 5) {
    const article = await this.findById(id);
    const tagIds = article.tags.map(t => t.tagId);

    const related = await this.prisma.article.findMany({
      where: {
        id: { not: id },
        status: 'published',
        tags: {
          some: { tagId: { in: tagIds } },
        },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        stats: true,
      },
      orderBy: { stats: { clapsCount: 'desc' } },
      take: limit,
    });

    return related;
  }
}
