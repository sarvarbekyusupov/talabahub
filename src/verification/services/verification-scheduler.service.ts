import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  UserVerificationStatus,
  VerificationRequestStatus,
} from '@prisma/client';

@Injectable()
export class VerificationSchedulerService {
  private readonly logger = new Logger(VerificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Check for expired verifications every day at 2 AM
   */
  @Cron('0 2 * * *') // Every day at 2 AM
  async handleExpiredVerifications() {
    this.logger.log('Starting daily verification expiration check...');

    try {
      const expiredVerifications = await this.getExpiredVerifications();

      if (expiredVerifications.length === 0) {
        this.logger.log('No expired verifications found');
        return;
      }

      this.logger.log(`Found ${expiredVerifications.length} expired verifications`);

      for (const user of expiredVerifications) {
        await this.expireVerification(user.id);

        // Send expiration notification email
        await this.mailService.sendVerificationExpired(
          user.email,
          user.firstName,
          'Your student verification has expired. Please re-verify to continue accessing all features.'
        );
      }

      this.logger.log(`Processed ${expiredVerifications.length} expired verifications`);
    } catch (error) {
      this.logger.error('Error processing expired verifications:', error);
    }
  }

  /**
   * Check for verifications expiring soon (7 days before) and send reminders
   */
  @Cron('0 9 * * *') // Every day at 9 AM
  async sendExpirationReminders() {
    this.logger.log('Starting daily expiration reminder check...');

    try {
      const soonToExpire = await this.getSoonToExpireVerifications(7); // 7 days before

      if (soonToExpire.length === 0) {
        this.logger.log('No verifications expiring soon');
        return;
      }

      this.logger.log(`Found ${soonToExpire.length} verifications expiring soon`);

      for (const user of soonToExpire) {
        await this.mailService.sendVerificationExpiringSoon(
          user.email,
          user.firstName,
          user.nextVerificationDue?.toLocaleDateString() || '',
          'Your student verification will expire soon. Please re-verify to maintain access to all features.'
        );
      }

      this.logger.log(`Sent ${soonToExpire.length} expiration reminders`);
    } catch (error) {
      this.logger.error('Error sending expiration reminders:', error);
    }
  }

  /**
   * Check for long pending verification requests and flag them
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async flagLongPendingVerifications() {
    this.logger.log('Checking for long pending verification requests...');

    try {
      const longPendingThreshold = 72; // 72 hours = 3 days
      const longPendingRequests = await this.getLongPendingVerifications(longPendingThreshold);

      if (longPendingRequests.length === 0) {
        this.logger.log('No long pending verification requests found');
        return;
      }

      this.logger.log(`Found ${longPendingRequests.length} long pending requests`);

      for (const request of longPendingRequests) {
        // Escalate priority for long pending requests
        await this.prisma.verificationRequest.update({
          where: { id: request.id },
          data: { priority: 3 }, // High priority
        });

        // Log the escalation
        await this.prisma.verificationAuditLog.create({
          data: {
            userId: request.userId,
            action: 'PENDING_REQUEST_ESCALATED',
            metadata: {
              requestId: request.id,
              pendingHours: longPendingThreshold,
              submittedAt: request.submittedAt,
            },
          },
        });
      }

      this.logger.log(`Escalated ${longPendingRequests.length} long pending requests`);
    } catch (error) {
      this.logger.error('Error flagging long pending verifications:', error);
    }
  }

  /**
   * Weekly verification statistics and cleanup
   */
  @Cron(CronExpression.EVERY_WEEK) // Every week
  async generateWeeklyStats() {
    this.logger.log('Generating weekly verification statistics...');

    try {
      const stats = await this.generateVerificationStats();

      // Log weekly statistics for monitoring
      this.logger.log('Weekly Verification Statistics:', {
        totalVerified: stats.totalVerified,
        pendingVerifications: stats.pendingVerifications,
        expiredVerifications: stats.expiredVerifications,
        averageReviewTime: stats.averageReviewTime,
        topUniversities: stats.topUniversities.slice(0, 5),
      });

      // Store statistics in database (create a verification_stats table if needed)
      // This could be used for analytics and reporting

    } catch (error) {
      this.logger.error('Error generating weekly stats:', error);
    }
  }

  /**
   * Get users with expired verifications
   */
  private async getExpiredVerifications(): Promise<any[]> {
    const now = new Date();

    return this.prisma.user.findMany({
      where: {
        verificationStatus: UserVerificationStatus.verified,
        OR: [
          { expectedGraduationDate: { lt: now } },
          { nextVerificationDue: { lt: now } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        expectedGraduationDate: true,
        nextVerificationDue: true,
      },
    });
  }

  /**
   * Get users whose verifications will expire soon
   */
  private async getSoonToExpireVerifications(daysBefore: number): Promise<any[]> {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(now.getDate() + daysBefore);

    return this.prisma.user.findMany({
      where: {
        verificationStatus: UserVerificationStatus.verified,
        nextVerificationDue: {
          gte: now,
          lte: warningDate,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        nextVerificationDue: true,
      },
    });
  }

  /**
   * Get verification requests that have been pending too long
   */
  private async getLongPendingVerifications(hoursThreshold: number): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

    return this.prisma.verificationRequest.findMany({
      where: {
        status: VerificationRequestStatus.pending,
        submittedAt: { lt: thresholdDate },
        priority: { lt: 3 }, // Not already high priority
      },
      select: {
        id: true,
        userId: true,
        submittedAt: true,
        priority: true,
      },
    });
  }

  /**
   * Expire a user's verification
   */
  private async expireVerification(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: UserVerificationStatus.verification_expired,
        verificationNotes: 'Verification expired. Please re-verify your student status.',
      },
    });

    await this.prisma.verificationAuditLog.create({
      data: {
        userId,
        action: 'VERIFICATION_EXPIRED',
        previousStatus: UserVerificationStatus.verified,
        newStatus: UserVerificationStatus.verification_expired,
        reason: 'Automatic expiration based on graduation date or verification due date',
      },
    });
  }

  /**
   * Generate verification statistics
   */
  private async generateVerificationStats(): Promise<{
    totalVerified: number;
    pendingVerifications: number;
    expiredVerifications: number;
    averageReviewTime: number;
    topUniversities: Array<{ universityName: string; count: number }>;
  }> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalVerified,
      pendingVerifications,
      expiredVerifications,
      reviewTimes,
      topUniversities,
    ] = await Promise.all([
      // Total verified users
      this.prisma.user.count({
        where: { verificationStatus: UserVerificationStatus.verified },
      }),
      // Pending verifications
      this.prisma.verificationRequest.count({
        where: { status: VerificationRequestStatus.pending },
      }),
      // Expired verifications
      this.prisma.user.count({
        where: { verificationStatus: UserVerificationStatus.verification_expired },
      }),
      // Average review time (last week)
      this.prisma.verificationRequest.findMany({
        where: {
          status: { in: [VerificationRequestStatus.approved, VerificationRequestStatus.rejected] },
          reviewedAt: { gte: oneWeekAgo },
        },
        select: { submittedAt: true, reviewedAt: true },
      }),
      // Top universities by verified students
      this.prisma.university.findMany({
        where: { isActive: true },
        select: {
          nameUz: true,
          _count: {
            select: {
              users: {
                where: { verificationStatus: UserVerificationStatus.verified },
              },
            },
          },
        },
        orderBy: {
          users: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Calculate average review time
    let averageReviewTime = 0;
    if (reviewTimes.length > 0) {
      const totalHours = reviewTimes.reduce((sum, r) => {
        if (r.reviewedAt && r.submittedAt) {
          return sum + (r.reviewedAt.getTime() - r.submittedAt.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      averageReviewTime = Math.round((totalHours / reviewTimes.length) * 10) / 10;
    }

    return {
      totalVerified,
      pendingVerifications,
      expiredVerifications,
      averageReviewTime,
      topUniversities: topUniversities.map((u) => ({
        universityName: u.nameUz,
        count: u._count.users,
      })),
    };
  }
}