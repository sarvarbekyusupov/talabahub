import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // CLAPS (Likes) METHODS
  // ==========================================

  async clapArticle(blogPostId: string, authorId: string) {
    // Verify blog post exists
    const blogPost = await this.prisma.blogPost.findUnique({
      where: { id: blogPostId },
    });

    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Check if user has already clapped this article
    const existingClap = await this.prisma.clap.findUnique({
      where: {
        blogPostId_authorId: {
          blogPostId,
          authorId,
        },
      },
    });

    if (existingClap) {
      // Remove clap
      await this.prisma.clap.delete({
        where: { id: existingClap.id },
      });

      return {
        action: 'removed',
        clapCount: existingClap.count - 1,
        message: 'Clap removed successfully',
      };
    } else {
      // Add clap
      const clap = await this.prisma.clap.create({
        data: {
          blogPostId,
          authorId,
          count: 1,
        },
        include: {
          blogPost: {
            select: {
              id: true,
              title: true,
              _count: {
                select: {
                  claps: true,
                },
              },
            },
          },
        },
      });

      return {
        action: 'added',
        clapCount: clap.count,
        totalClaps: clap.blogPost._count?.claps || 0,
        message: 'Clap added successfully',
      };
    }
  }

  async getArticleClapCount(blogPostId: string) {
    const count = await this.prisma.clap.aggregate({
      where: { blogPostId },
      _sum: {
        count: true,
      },
    });

    return {
      blogPostId,
      totalClaps: count._sum.count || 0,
    };
  }

  async getUserClaps(authorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [claps, total] = await Promise.all([
      this.prisma.clap.findMany({
        where: { authorId },
        skip,
        take: limit,
        include: {
          blogPost: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              featuredImage: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clap.count({ where: { authorId } }),
    ]);

    return {
      data: claps.map((clap) => ({
        id: clap.id,
        count: clap.count,
        createdAt: clap.createdAt,
        blogPost: (clap as any).blogPost,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // BOOKMARKS METHODS
  // ==========================================

  async bookmarkArticle(blogPostId: string, authorId: string) {
    // Verify blog post exists
    const blogPost = await this.prisma.blogPost.findUnique({
      where: { id: blogPostId },
    });

    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Check if user has already bookmarked this article
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        blogPostId_authorId: {
          blogPostId,
          authorId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await this.prisma.bookmark.delete({
        where: { id: existingBookmark.id },
      });

      return {
        action: 'removed',
        isBookmarked: false,
        message: 'Bookmark removed successfully',
      };
    } else {
      // Add bookmark
      const bookmark = await this.prisma.bookmark.create({
        data: {
          blogPostId,
          authorId,
        },
        include: {
          blogPost: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              featuredImage: true,
              status: true,
              createdAt: true,
              _count: {
                select: {
                  bookmarks: true,
                },
              },
            },
          },
        },
      });

      return {
        action: 'added',
        isBookmarked: true,
        message: 'Bookmark added successfully',
        totalBookmarks: bookmark.blogPost._count?.bookmarks || 0,
      };
    }
  }

  async getArticleBookmarkCount(blogPostId: string) {
    const count = await this.prisma.bookmark.count({
      where: { blogPostId },
    });

    return {
      blogPostId,
      totalBookmarks: count,
    };
  }

  async getUserBookmarks(authorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { authorId },
        skip,
        take: limit,
        include: {
          blogPost: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              featuredImage: true,
              status: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
              _count: {
                select: {
                  bookmarks: true,
                  claps: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookmark.count({ where: { authorId } }),
    ]);

    return {
      data: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        createdAt: bookmark.createdAt,
        blogPost: (bookmark as any).blogPost,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserBookmarkStatus(blogPostId: string, authorId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        blogPostId_authorId: {
          blogPostId,
          authorId,
        },
      },
    });

    return {
      blogPostId,
      isBookmarked: !!bookmark,
    };
  }

  // ==========================================
  // ANALYTICS METHODS
  // ==========================================

  async getEngagementStats(blogPostId: string) {
    const [clapCount, bookmarkCount, commentCount] = await Promise.all([
      this.prisma.clap.aggregate({
        where: { blogPostId },
        _sum: { count: true },
      }),
      this.prisma.bookmark.count({
        where: { blogPostId },
      }),
      this.prisma.comment.count({
        where: { blogPostId },
      }),
    ]);

    return {
      blogPostId,
      claps: clapCount._sum.count || 0,
      bookmarks: bookmarkCount,
      comments: commentCount,
      totalEngagement: (clapCount._sum.count || 0) + bookmarkCount + commentCount,
    };
  }

  async getPopularArticles(limit = 10) {
    // Get articles with highest engagement (claps + bookmarks + comments)
    const articles = await this.prisma.blogPost.findMany({
      where: {
        status: 'published',
      },
      include: {
        _count: {
          select: {
            claps: true,
            bookmarks: true,
            comments: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate engagement score and sort
    const articlesWithScore = articles.map((article) => ({
      ...article,
      engagementScore:
        (article._count.claps || 0) * 2 +
        (article._count.bookmarks || 0) * 3 +
        (article._count.comments || 0),
    }));

    // Sort by engagement score
    articlesWithScore.sort((a, b) => b.engagementScore - a.engagementScore);

    return articlesWithScore.slice(0, limit).map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage,
      status: article.status,
      createdAt: article.createdAt,
      author: article.author,
      engagement: {
        claps: article._count?.claps || 0,
        bookmarks: article._count?.bookmarks || 0,
        comments: article._count?.comments || 0,
        score: article.engagementScore,
        viewCount: article.viewCount || 0,
      },
    }));
  }
}