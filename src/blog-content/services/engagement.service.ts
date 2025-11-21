import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClapDto,
  CreateResponseDto,
  UpdateResponseDto,
  ResponseFilterDto,
  CreateBookmarkDto,
  MoveBookmarkDto,
  CreateCollectionDto,
  UpdateCollectionDto,
  ShareDto,
  CreateReportDto,
} from '../dto';
import { NotificationsService } from './notifications.service';

@Injectable()
export class EngagementService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CLAPS ====================

  async clapArticle(articleId: string, dto: ClapDto, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.authorId === userId) {
      throw new BadRequestException('Cannot clap your own article');
    }

    // Check existing claps
    const existing = await this.prisma.clap.findUnique({
      where: { articleId_userId: { articleId, userId } },
    });

    let totalUserClaps = dto.count;
    if (existing) {
      const newTotal = Math.min(existing.clapCount + dto.count, 50);
      totalUserClaps = newTotal;
      await this.prisma.clap.update({
        where: { id: existing.id },
        data: { clapCount: newTotal },
      });
    } else {
      totalUserClaps = Math.min(dto.count, 50);
      await this.prisma.clap.create({
        data: {
          articleId,
          userId,
          clapCount: totalUserClaps,
        },
      });
    }

    // Update article stats
    const stats = await this.prisma.articleStats.update({
      where: { articleId },
      data: {
        clapsCount: { increment: existing ? dto.count : totalUserClaps },
        uniqueClappers: existing ? undefined : { increment: 1 },
      },
    });

    // Update author's total claps
    await this.prisma.studentProfile.upsert({
      where: { id: article.authorId },
      update: { totalClapsReceived: { increment: existing ? dto.count : totalUserClaps } },
      create: {
        id: article.authorId,
        totalClapsReceived: totalUserClaps,
      },
    });

    // Send notification at milestones
    const milestones = [10, 50, 100, 500, 1000];
    for (const milestone of milestones) {
      if (stats.clapsCount >= milestone && stats.clapsCount - (existing ? dto.count : totalUserClaps) < milestone) {
        await this.notificationsService.createMilestoneNotification(
          article.authorId,
          articleId,
          milestone,
        );
        break;
      }
    }

    return {
      totalClaps: stats.clapsCount,
      yourClaps: totalUserClaps,
    };
  }

  async getUserClaps(articleId: string, userId: string) {
    const clap = await this.prisma.clap.findUnique({
      where: { articleId_userId: { articleId, userId } },
    });
    return { yourClaps: clap?.clapCount || 0 };
  }

  // ==================== RESPONSES ====================

  async createResponse(articleId: string, dto: CreateResponseDto, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) throw new NotFoundException('Article not found');

    // Validate parent response if provided
    if (dto.parentResponseId) {
      const parent = await this.prisma.response.findUnique({
        where: { id: dto.parentResponseId },
      });
      if (!parent || parent.articleId !== articleId) {
        throw new BadRequestException('Invalid parent response');
      }
      // Max 2 levels of nesting
      if (parent.parentResponseId) {
        throw new BadRequestException('Cannot reply to a reply');
      }
    }

    const response = await this.prisma.response.create({
      data: {
        articleId,
        authorId: userId,
        parentResponseId: dto.parentResponseId,
        content: dto.content,
        highlightedText: dto.highlightedText,
        highlightPositionStart: dto.highlightPositionStart,
        highlightPositionEnd: dto.highlightPositionEnd,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Update stats
    await this.prisma.articleStats.update({
      where: { articleId },
      data: { responsesCount: { increment: 1 } },
    });

    // Update parent response replies count
    if (dto.parentResponseId) {
      await this.prisma.response.update({
        where: { id: dto.parentResponseId },
        data: { repliesCount: { increment: 1 } },
      });
    }

    // Send notification
    await this.notificationsService.createResponseNotification(
      article.authorId,
      userId,
      articleId,
      response.id,
    );

    return { responseId: response.id, created: true };
  }

  async getArticleResponses(articleId: string, filters: ResponseFilterDto) {
    const { sort = 'best', page = 1, limit = 20 } = filters;

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'best') {
      orderBy = [{ clapsCount: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const where = {
      articleId,
      parentResponseId: null, // Only top-level responses
    };

    const [responses, total] = await Promise.all([
      this.prisma.response.findMany({
        where,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          replies: {
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.response.count({ where }),
    ]);

    return {
      data: responses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateResponse(id: string, dto: UpdateResponseDto, userId: string) {
    const response = await this.prisma.response.findUnique({ where: { id } });
    if (!response) throw new NotFoundException('Response not found');
    if (response.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own response');
    }

    // Check 15 minute edit window
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - response.createdAt.getTime() > fifteenMinutes) {
      throw new BadRequestException('Can only edit within 15 minutes');
    }

    await this.prisma.response.update({
      where: { id },
      data: {
        content: dto.content,
        isEdited: true,
      },
    });

    return { updated: true, isEdited: true };
  }

  async deleteResponse(id: string, userId: string) {
    const response = await this.prisma.response.findUnique({ where: { id } });
    if (!response) throw new NotFoundException('Response not found');
    if (response.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own response');
    }

    await this.prisma.response.delete({ where: { id } });

    // Update stats
    await this.prisma.articleStats.update({
      where: { articleId: response.articleId },
      data: { responsesCount: { decrement: 1 } },
    });

    // Update parent replies count
    if (response.parentResponseId) {
      await this.prisma.response.update({
        where: { id: response.parentResponseId },
        data: { repliesCount: { decrement: 1 } },
      });
    }

    return { deleted: true };
  }

  async clapResponse(responseId: string, dto: ClapDto, userId: string) {
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
    });
    if (!response) throw new NotFoundException('Response not found');
    if (response.authorId === userId) {
      throw new BadRequestException('Cannot clap your own response');
    }

    const existing = await this.prisma.responseClap.findUnique({
      where: { responseId_userId: { responseId, userId } },
    });

    let totalUserClaps = dto.count;
    if (existing) {
      const newTotal = Math.min(existing.clapCount + dto.count, 50);
      totalUserClaps = newTotal;
      await this.prisma.responseClap.update({
        where: { id: existing.id },
        data: { clapCount: newTotal },
      });
    } else {
      totalUserClaps = Math.min(dto.count, 50);
      await this.prisma.responseClap.create({
        data: { responseId, userId, clapCount: totalUserClaps },
      });
    }

    const updated = await this.prisma.response.update({
      where: { id: responseId },
      data: { clapsCount: { increment: existing ? dto.count : totalUserClaps } },
    });

    return {
      totalClaps: updated.clapsCount,
      yourClaps: totalUserClaps,
    };
  }

  async reportResponse(responseId: string, dto: CreateReportDto, userId: string) {
    const response = await this.prisma.response.findUnique({ where: { id: responseId } });
    if (!response) throw new NotFoundException('Response not found');

    await this.prisma.report.create({
      data: {
        reporterId: userId,
        entityType: 'response',
        entityId: responseId,
        reason: dto.reason as any,
        description: dto.description,
      },
    });

    // Update response report count
    await this.prisma.response.update({
      where: { id: responseId },
      data: {
        reportCount: { increment: 1 },
        isReported: true,
      },
    });

    return { reported: true };
  }

  // ==================== BOOKMARKS ====================

  async bookmarkArticle(articleId: string, dto: CreateBookmarkDto, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (existing) throw new BadRequestException('Already bookmarked');

    await this.prisma.bookmark.create({
      data: {
        userId,
        articleId,
        collectionId: dto.collectionId,
      },
    });

    // Update stats
    await this.prisma.articleStats.update({
      where: { articleId },
      data: { bookmarksCount: { increment: 1 } },
    });

    // Update collection count if applicable
    if (dto.collectionId) {
      await this.prisma.bookmarkCollection.update({
        where: { id: dto.collectionId },
        data: { articleCount: { increment: 1 } },
      });
    }

    return { bookmarked: true };
  }

  async removeBookmark(articleId: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (!bookmark) throw new NotFoundException('Bookmark not found');

    await this.prisma.bookmark.delete({
      where: { id: bookmark.id },
    });

    // Update stats
    await this.prisma.articleStats.update({
      where: { articleId },
      data: { bookmarksCount: { decrement: 1 } },
    });

    // Update collection count
    if (bookmark.collectionId) {
      await this.prisma.bookmarkCollection.update({
        where: { id: bookmark.collectionId },
        data: { articleCount: { decrement: 1 } },
      });
    }

    return { removed: true };
  }

  async getUserBookmarks(userId: string) {
    const [bookmarks, collections] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        include: {
          article: {
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
              stats: true,
            },
          },
          collection: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookmarkCollection.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { bookmarks, collections };
  }

  async moveBookmark(articleId: string, dto: MoveBookmarkDto, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (!bookmark) throw new NotFoundException('Bookmark not found');

    // Update old collection count
    if (bookmark.collectionId) {
      await this.prisma.bookmarkCollection.update({
        where: { id: bookmark.collectionId },
        data: { articleCount: { decrement: 1 } },
      });
    }

    // Update bookmark
    await this.prisma.bookmark.update({
      where: { id: bookmark.id },
      data: { collectionId: dto.collectionId },
    });

    // Update new collection count
    await this.prisma.bookmarkCollection.update({
      where: { id: dto.collectionId },
      data: { articleCount: { increment: 1 } },
    });

    return { moved: true };
  }

  // ==================== COLLECTIONS ====================

  async createCollection(dto: CreateCollectionDto, userId: string) {
    const collection = await this.prisma.bookmarkCollection.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
    });
    return { collectionId: collection.id };
  }

  async updateCollection(id: string, dto: UpdateCollectionDto, userId: string) {
    const collection = await this.prisma.bookmarkCollection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.userId !== userId) {
      throw new ForbiddenException('Not your collection');
    }

    await this.prisma.bookmarkCollection.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });

    return { updated: true };
  }

  async deleteCollection(id: string, userId: string) {
    const collection = await this.prisma.bookmarkCollection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.userId !== userId) {
      throw new ForbiddenException('Not your collection');
    }

    await this.prisma.bookmarkCollection.delete({ where: { id } });
    return { deleted: true };
  }

  // ==================== SHARES ====================

  async shareArticle(articleId: string, dto: ShareDto, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.share.create({
      data: {
        articleId,
        userId,
        platform: dto.platform as any,
      },
    });

    // Update stats
    await this.prisma.articleStats.update({
      where: { articleId },
      data: { sharesCount: { increment: 1 } },
    });

    return { tracked: true };
  }
}
