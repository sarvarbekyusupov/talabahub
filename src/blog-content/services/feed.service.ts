import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedFilterDto, TrendingFilterDto } from '../dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  private getArticleIncludes() {
    return {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          university: { select: { id: true, nameEn: true } },
        },
      },
      stats: true,
      tags: { include: { tag: true } },
    };
  }

  async getPersonalizedFeed(userId: string, filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    // Get users being followed
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    // Get articles from followed users + trending
    const articles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        OR: [
          { authorId: { in: followingIds } },
          { featured: true },
        ],
      },
      include: this.getArticleIncludes(),
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: articles,
      nextOffset: articles.length === limit ? page + 1 : null,
    };
  }

  async getTrending(filters: TrendingFilterDto) {
    const { timeframe = 'week', page = 1, limit = 20 } = filters;

    const dateFilter = new Date();
    if (timeframe === 'today') {
      dateFilter.setDate(dateFilter.getDate() - 1);
    } else if (timeframe === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    const articles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: dateFilter },
      },
      include: this.getArticleIncludes(),
      orderBy: [
        { stats: { clapsCount: 'desc' } },
        { stats: { viewsCount: 'desc' } },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }

  async getByUniversity(universityId: number, filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const articles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        author: { universityId },
      },
      include: this.getArticleIncludes(),
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }

  async getLatest(filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const articles = await this.prisma.article.findMany({
      where: { status: 'published' },
      include: this.getArticleIncludes(),
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }

  async getPopular(filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const articles = await this.prisma.article.findMany({
      where: { status: 'published' },
      include: this.getArticleIncludes(),
      orderBy: { stats: { clapsCount: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }

  async getFeatured(filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const articles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        featured: true,
      },
      include: this.getArticleIncludes(),
      orderBy: { featuredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }

  async getFollowingFeed(userId: string, filters: FeedFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return { data: [] };
    }

    const articles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        authorId: { in: followingIds },
      },
      include: this.getArticleIncludes(),
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: articles };
  }
}
