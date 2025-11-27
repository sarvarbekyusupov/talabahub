import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto, UpdateArticleDto, QueryArticlesDto, ArticleStatus } from '../dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto, authorId?: string) {
    const { tagNames, categoryId, ...articleData } = createArticleDto;

    // Check if slug is unique
    const existingArticle = await this.prisma.blogPost.findUnique({
      where: { slug: createArticleDto.slug },
    });

    if (existingArticle) {
      throw new BadRequestException('Article slug must be unique');
    }

    // Create article with tags
    const article = await this.prisma.blogPost.create({
      data: {
        ...articleData,
        authorId,
        categoryId,
        status: createArticleDto.status || ArticleStatus.DRAFT,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Add tags if provided
    if (tagNames && tagNames.length > 0) {
      await this.updateArticleTags(article.id, tagNames);
    }

    return this._formatArticleResponse(article);
  }

  async findAll(query: QueryArticlesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tags,
      categoryId,
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: {
              in: tags,
            },
          },
        },
      };
    }

    const [articles, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          category: {
            select: {
              id: true,
              nameUz: true,
              nameEn: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
              claps: true,
              bookmarks: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: articles.map((article) => this._formatArticleResponse(article)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const article = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            claps: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this._formatArticleResponse(article);
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            claps: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this._formatArticleResponse(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto, authorId?: string) {
    const article = await this.prisma.blogPost.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check if user is the author or admin
    if (authorId && article.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own articles');
    }

    const { tagNames, ...articleData } = updateArticleDto;

    // Check if slug is unique (if being updated)
    if (articleData.slug && articleData.slug !== article.slug) {
      const existingArticle = await this.prisma.blogPost.findUnique({
        where: { slug: articleData.slug },
      });

      if (existingArticle) {
        throw new BadRequestException('Article slug must be unique');
      }
    }

    const updatedArticle = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...articleData,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Update tags if provided
    if (tagNames !== undefined) {
      await this.updateArticleTags(id, tagNames);
    }

    return this._formatArticleResponse(updatedArticle);
  }

  async remove(id: string, authorId?: string) {
    const article = await this.prisma.blogPost.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check if user is the author or admin
    if (authorId && article.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own articles');
    }

    await this.prisma.blogPost.delete({
      where: { id },
    });

    return { message: 'Article deleted successfully' };
  }

  async incrementViewCount(id: string) {
    await this.prisma.blogPost.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return { message: 'View count incremented' };
  }

  async publishArticle(id: string) {
    const article = await this.prisma.blogPost.update({
      where: { id },
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return this._formatArticleResponse(article);
  }

  private async updateArticleTags(articleId: string, tagNames: string[]) {
    // Remove existing tags
    await this.prisma.blogPostTag.deleteMany({
      where: { blogPostId: articleId },
    });

    // Add new tags
    for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Create or find tag
      const tag = await this.prisma.tag.upsert({
        where: { slug },
        update: {},
        create: {
          name: tagName,
          slug,
        },
      });

      // Connect tag to article
      await this.prisma.blogPostTag.create({
        data: {
          blogPostId: articleId,
          tagId: tag.id,
        },
      });
    }
  }

  private _formatArticleResponse(article: any) {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      featuredImage: article.featuredImage,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      metaKeywords: article.metaKeywords,
      viewCount: article.viewCount || 0,
      readTimeMinutes: article.readTimeMinutes,
      status: article.status,
      publishedAt: article.publishedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      author: article.author || null,
      category: article.category || null,
      tags: article.tags?.map((pt: any) => pt.tag) || [],
      engagement: {
        commentsCount: article._count?.comments || 0,
        clapsCount: article._count?.claps || 0,
        bookmarksCount: article._count?.bookmarks || 0,
      },
    };
  }
}