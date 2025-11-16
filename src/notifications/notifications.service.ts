import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProducer } from '../queue/email.producer';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
  ) {}

  async create(userId: string, createNotificationDto: CreateNotificationDto) {
    // Create notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        data: createNotificationDto.data,
        actionUrl: createNotificationDto.actionUrl,
        actionLabel: createNotificationDto.actionLabel,
        status: 'pending',
      },
    });

    // Get user's notification preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        notificationPreferences: true,
      },
    });

    // Send email if user has email notifications enabled
    if (user && (user.notificationPreferences as any)?.email !== false) {
      await this.emailProducer.sendNotificationEmail({
        to: user.email,
        subject: createNotificationDto.title,
        message: createNotificationDto.message,
        actionUrl: createNotificationDto.actionUrl,
        actionLabel: createNotificationDto.actionLabel,
      });

      // Mark as sent
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    }

    return notification;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted successfully' };
  }

  // Helper method to send job alert notifications
  async sendJobAlert(userId: string, job: any) {
    return this.create(userId, {
      type: 'in_app',
      title: 'New Job Matching Your Criteria',
      message: `A new job "${job.title}" has been posted that matches your saved search.`,
      data: { jobId: job.id, category: 'job_alert' },
      actionUrl: `/jobs/${job.id}`,
      actionLabel: 'View Job',
    });
  }

  // Helper method to send application status update
  async sendApplicationStatusUpdate(userId: string, application: any) {
    const statusMessages = {
      pending: 'Your application is being reviewed',
      reviewed: 'Your application has been reviewed',
      interview: 'You have been invited for an interview!',
      accepted: 'Congratulations! Your application has been accepted',
      rejected: 'Your application was not successful this time',
    };

    return this.create(userId, {
      type: 'in_app',
      title: 'Application Status Update',
      message: statusMessages[application.status] || 'Your application status has been updated',
      data: { applicationId: application.id, jobId: application.jobId, category: 'job_application_status' },
      actionUrl: `/jobs/applications/${application.id}`,
      actionLabel: 'View Application',
    });
  }
}
