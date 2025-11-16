import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get partner analytics (jobs, courses, applications, enrollments)
   */
  async getPartnerAnalytics(partnerId: number) {
    // Get jobs posted by companies owned by this partner
    const jobs = await this.prisma.job.findMany({
      where: {
        company: {
          // Assuming there's a partnerId field in Company model
          // If not, this needs adjustment based on your schema
        },
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        applicationCount: true,
        isFeatured: true,
        isActive: true,
        createdAt: true,
      },
      take: 100,
    });

    const jobStats = {
      total: jobs.length,
      active: jobs.filter((j) => j.isActive).length,
      totalViews: jobs.reduce((sum, j) => sum + j.viewCount, 0),
      totalApplications: jobs.reduce((sum, j) => sum + j.applicationCount, 0),
    };

    // Get courses offered by this partner
    const courses = await this.prisma.course.findMany({
      where: { partnerId },
      select: {
        id: true,
        title: true,
        enrollmentCount: true,
        isActive: true,
        createdAt: true,
      },
    });

    const courseStats = {
      total: courses.length,
      active: courses.filter((c) => c.isActive).length,
      totalEnrollments: courses.reduce((sum, c) => sum + c.enrollmentCount, 0),
    };

    // Get recent activity
    const recentApplications = await this.prisma.jobApplication.findMany({
      where: {
        job: {
          company: {
            // partnerId filter here
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 10,
      include: {
        job: { select: { title: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const recentEnrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        course: { partnerId },
      },
      orderBy: { enrolledAt: 'desc' },
      take: 10,
      include: {
        course: { select: { title: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      jobs: jobStats,
      courses: courseStats,
      recentApplications,
      recentEnrollments,
    };
  }

  /**
   * Get admin dashboard analytics
   */
  async getAdminDashboard() {
    const [
      totalUsers,
      totalJobs,
      totalCourses,
      totalEvents,
      totalDiscounts,
      activeUsers,
      verifiedUsers,
      pendingVerifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.job.count(),
      this.prisma.course.count(),
      this.prisma.event.count(),
      this.prisma.discount.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { verificationStatus: 'verified' } }),
      this.prisma.user.count({ where: { verificationStatus: 'pending' } }),
    ]);

    // Get recent activity
    const recentUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        verificationStatus: true,
      },
    });

    const recentJobs = await this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
        applicationCount: true,
        viewCount: true,
        createdAt: true,
      },
    });

    // Get stats over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30Days = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const newJobsLast30Days = await this.prisma.job.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      overview: {
        totalUsers,
        totalJobs,
        totalCourses,
        totalEvents,
        totalDiscounts,
        activeUsers,
        verifiedUsers,
        pendingVerifications,
      },
      growth: {
        newUsersLast30Days,
        newJobsLast30Days,
      },
      recentActivity: {
        users: recentUsers,
        jobs: recentJobs,
      },
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const [
      totalNotifications,
      pendingNotifications,
      failedNotifications,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
    ] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { status: 'pending' } }),
      this.prisma.notification.count({ where: { status: 'failed' } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'pending' } }),
      this.prisma.transaction.count({ where: { status: 'completed' } }),
    ]);

    // Get database size and record counts
    const recordCounts = {
      users: await this.prisma.user.count(),
      jobs: await this.prisma.job.count(),
      courses: await this.prisma.course.count(),
      events: await this.prisma.event.count(),
      discounts: await this.prisma.discount.count(),
      applications: await this.prisma.jobApplication.count(),
      enrollments: await this.prisma.courseEnrollment.count(),
      eventRegistrations: await this.prisma.eventRegistration.count(),
    };

    return {
      notifications: {
        total: totalNotifications,
        pending: pendingNotifications,
        failed: failedNotifications,
      },
      transactions: {
        total: totalTransactions,
        pending: pendingTransactions,
        completed: completedTransactions,
      },
      database: {
        recordCounts,
      },
    };
  }

  /**
   * Get job analytics
   */
  async getJobAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, active, byType, topCompanies] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.count({ where: { ...where, isActive: true } }),
      this.prisma.job.groupBy({
        by: ['jobType'],
        where,
        _count: true,
      }),
      this.prisma.job.groupBy({
        by: ['companyId'],
        where,
        _count: true,
        _sum: {
          applicationCount: true,
          viewCount: true,
        },
        orderBy: {
          _count: {
            companyId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      total,
      active,
      byType,
      topCompanies,
    };
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = startDate;
      if (endDate) where.startDate.lte = endDate;
    }

    const [total, upcoming, past, byType] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.count({
        where: { ...where, startDate: { gte: new Date() } },
      }),
      this.prisma.event.count({
        where: { ...where, endDate: { lt: new Date() } },
      }),
      this.prisma.event.groupBy({
        by: ['eventType'],
        where,
        _count: true,
        _sum: {
          currentParticipants: true,
        },
      }),
    ]);

    return {
      total,
      upcoming,
      past,
      byType,
    };
  }
}
