import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getStudentAnalytics(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: userId },
    });

    // Get all articles by user
    const articles = await this.prisma.article.findMany({
      where: { authorId: userId, status: 'published' },
      include: { stats: true },
    });

    // Calculate totals
    let totalViews = 0;
    let totalClaps = 0;
    articles.forEach(a => {
      totalViews += a.stats?.viewsCount || 0;
      totalClaps += a.stats?.clapsCount || 0;
    });

    const avgClapPerArticle = articles.length > 0
      ? Math.round(totalClaps / articles.length)
      : 0;

    // Get top performing article
    const topArticle = articles.reduce((best, current) => {
      const currentClaps = current.stats?.clapsCount || 0;
      const bestClaps = best?.stats?.clapsCount || 0;
      return currentClaps > bestClaps ? current : best;
    }, articles[0]);

    // Get follower growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentFollowers = await this.prisma.follow.count({
      where: {
        followingId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Views over time
    const viewsOverTime = await this.prisma.articleView.groupBy({
      by: ['createdAt'],
      where: {
        article: { authorId: userId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    return {
      totalViews,
      totalClaps,
      totalFollowers: profile?.totalFollowers || 0,
      articlesPublished: articles.length,
      avgClapsPerArticle: avgClapPerArticle,
      readRatio: 0.65, // Placeholder
      viewsOverTime,
      topArticles: articles
        .sort((a, b) => (b.stats?.clapsCount || 0) - (a.stats?.clapsCount || 0))
        .slice(0, 5),
      followerGrowth: recentFollowers,
      topPerformingArticle: topArticle,
    };
  }

  async getPlatformAnalytics() {
    const [
      totalArticles,
      totalWriters,
      pendingArticles,
      pendingReports,
    ] = await Promise.all([
      this.prisma.article.count({ where: { status: 'published' } }),
      this.prisma.user.count({
        where: {
          role: 'student',
          articles: { some: { status: 'published' } },
        },
      }),
      this.prisma.article.count({ where: { status: 'pending' } }),
      this.prisma.report.count({ where: { status: 'pending' } }),
    ]);

    // Calculate total stats
    const stats = await this.prisma.articleStats.aggregate({
      _sum: {
        viewsCount: true,
        clapsCount: true,
      },
    });

    // Active writers this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const activeWriters = await this.prisma.user.count({
      where: {
        role: 'student',
        articles: {
          some: {
            publishedAt: { gte: monthAgo },
          },
        },
      },
    });

    // Top universities
    const topUniversities = await this.prisma.article.groupBy({
      by: ['authorId'],
      where: { status: 'published' },
      _count: true,
    });

    // Top categories (tags)
    const topTags = await this.prisma.tag.findMany({
      orderBy: { articleCount: 'desc' },
      take: 10,
    });

    return {
      totalArticles,
      totalStudentWriters: totalWriters,
      totalViews: stats._sum.viewsCount || 0,
      totalClaps: stats._sum.clapsCount || 0,
      activeWritersThisMonth: activeWriters,
      articlesPending: pendingArticles,
      reportsPending: pendingReports,
      topUniversities: [],
      topCategories: topTags,
      growthMetrics: [],
    };
  }
}
