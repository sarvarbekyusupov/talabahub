import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationFilterDto } from '../dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(userId: string, filters: NotificationFilterDto) {
    const { unread, page = 1, limit = 20 } = filters;

    const where: any = { userId };
    if (unread) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.blogNotification.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogNotification.count({ where }),
      this.prisma.blogNotification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.blogNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { read: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.blogNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.blogNotification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  // Helper methods to create notifications
  async createFollowNotification(userId: string, actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { firstName: true, lastName: true },
    });

    await this.prisma.blogNotification.create({
      data: {
        userId,
        type: 'new_follower',
        actorId,
        entityType: 'user',
        entityId: actorId,
        message: `${actor?.firstName} ${actor?.lastName} started following you`,
      },
    });
  }

  async createMilestoneNotification(userId: string, articleId: string, milestone: number) {
    await this.prisma.blogNotification.create({
      data: {
        userId,
        type: 'milestone',
        entityType: 'article',
        entityId: articleId,
        message: `Your article reached ${milestone} claps!`,
      },
    });
  }

  async createResponseNotification(
    articleAuthorId: string,
    responderId: string,
    articleId: string,
    responseId: string,
  ) {
    if (articleAuthorId === responderId) return; // Don't notify yourself

    const responder = await this.prisma.user.findUnique({
      where: { id: responderId },
      select: { firstName: true, lastName: true },
    });

    await this.prisma.blogNotification.create({
      data: {
        userId: articleAuthorId,
        type: 'new_response',
        actorId: responderId,
        entityType: 'response',
        entityId: responseId,
        message: `${responder?.firstName} ${responder?.lastName} commented on your article`,
      },
    });
  }

  async createFeaturedNotification(userId: string, articleId: string) {
    await this.prisma.blogNotification.create({
      data: {
        userId,
        type: 'featured',
        entityType: 'article',
        entityId: articleId,
        message: `Congratulations! Your article was featured`,
      },
    });
  }
}
