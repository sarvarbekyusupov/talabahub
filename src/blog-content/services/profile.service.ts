import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStudentProfileDto } from '../dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
        role: 'student',
      },
      include: {
        studentProfile: true,
        university: { select: { id: true, nameEn: true, nameUz: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Get recent articles
    const recentArticles = await this.prisma.article.findMany({
      where: { authorId: user.id, status: 'published' },
      include: { stats: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    // Get top articles
    const topArticles = await this.prisma.article.findMany({
      where: { authorId: user.id, status: 'published' },
      include: { stats: true },
      orderBy: { stats: { clapsCount: 'desc' } },
      take: 5,
    });

    return {
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: user.studentProfile?.bio,
        fieldOfStudy: user.studentProfile?.fieldOfStudy,
        socialLinks: user.studentProfile?.socialLinks,
        university: user.university,
      },
      stats: {
        articles: user.studentProfile?.totalArticles || 0,
        followers: user.studentProfile?.totalFollowers || 0,
        following: user.studentProfile?.totalFollowing || 0,
        totalClaps: user.studentProfile?.totalClapsReceived || 0,
      },
      recentArticles,
      topArticles,
    };
  }

  async getCurrentProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        university: { select: { id: true, nameEn: true, nameUz: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: user.studentProfile?.bio,
        fieldOfStudy: user.studentProfile?.fieldOfStudy,
        socialLinks: user.studentProfile?.socialLinks,
        university: user.university,
      },
      stats: {
        articles: user.studentProfile?.totalArticles || 0,
        followers: user.studentProfile?.totalFollowers || 0,
        following: user.studentProfile?.totalFollowing || 0,
        totalClaps: user.studentProfile?.totalClapsReceived || 0,
        reputationScore: user.studentProfile?.reputationScore || 0,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    await this.prisma.studentProfile.upsert({
      where: { id: userId },
      update: {
        bio: dto.bio,
        fieldOfStudy: dto.fieldOfStudy,
        socialLinks: dto.socialLinks,
      },
      create: {
        id: userId,
        bio: dto.bio,
        fieldOfStudy: dto.fieldOfStudy,
        socialLinks: dto.socialLinks,
      },
    });

    return { updated: true };
  }

  async getStats(username: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
      },
      include: { studentProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Get articles
    const articles = await this.prisma.article.findMany({
      where: { authorId: user.id, status: 'published' },
      include: { stats: true },
    });

    let totalViews = 0;
    let totalClaps = 0;
    articles.forEach(a => {
      totalViews += a.stats?.viewsCount || 0;
      totalClaps += a.stats?.clapsCount || 0;
    });

    const avgClapPerArticle = articles.length > 0
      ? Math.round(totalClaps / articles.length)
      : 0;

    const topArticle = articles.reduce((best, current) => {
      if (!best) return current;
      const currentClaps = current.stats?.clapsCount || 0;
      const bestClaps = best.stats?.clapsCount || 0;
      return currentClaps > bestClaps ? current : best;
    }, null as any);

    return {
      totalViews,
      totalClaps,
      totalArticles: articles.length,
      avgClapPerArticle,
      topPerformingArticle: topArticle,
      growthOverTime: [],
    };
  }
}
