import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { UpdateBlogPostStatusDto } from './dto/update-blog-post-status.dto';

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface FilterOptions {
  authorId?: string;
  categoryId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  isFeatured?: boolean;
}

@Injectable()
export class BlogPostsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new blog post (draft by default)
   */
  async create(createBlogPostDto: CreateBlogPostDto, authorId: string) {
    const { title, content, excerpt, categoryId, featuredImage, metaKeywords } =
      createBlogPostDto;

    // Generate slug from title
    const slug = this.generateSlug(title);

    // Check if slug already exists
    const existingPost = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (existingPost) {
      throw new BadRequestException(
        'A blog post with this title slug already exists',
      );
    }

    return this.prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        featuredImage,
        metaKeywords,
        authorId,
        status: 'draft',
        readTimeMinutes: this.calculateReadTime(content),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Get all published blog posts with pagination and filtering
   */
  async findAll(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {},
  ) {
    const {
      authorId,
      categoryId,
      status = 'published',
      startDate,
      endDate,
      isFeatured,
    } = filters;
    const { page = 1, limit = 10 } = pagination;

    const skip = (page - 1) * limit;

    const where: any = {
      status,
      ...(authorId && { authorId }),
      ...(categoryId && { categoryId }),
      ...(isFeatured !== undefined && { featured: isFeatured }),
      ...(startDate &&
        endDate && {
          publishedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
          category: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single blog post by ID
   */
  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        category: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return post;
  }

  /**
   * Get blog post by slug (public endpoint)
   */
  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        category: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug ${slug} not found`);
    }

    return post;
  }

  /**
   * Update blog post (only by author or admin)
   */
  async update(
    id: string,
    updateBlogPostDto: UpdateBlogPostDto,
    userId: string,
    userRole: string,
  ) {
    const post = await this.findOne(id);

    // Check authorization (only author or admin can update)
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only update your own posts');
    }

    const { title, content, excerpt, categoryId, featuredImage, metaKeywords } =
      updateBlogPostDto;

    let slug = post.slug;

    // If title changed, regenerate slug
    if (title && title !== post.title) {
      const newSlug = this.generateSlug(title);
      const existingPost = await this.prisma.blogPost.findUnique({
        where: { slug: newSlug },
      });

      if (existingPost && existingPost.id !== id) {
        throw new BadRequestException(
          'A blog post with this title slug already exists',
        );
      }

      slug = newSlug;
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        title: title || undefined,
        slug,
        content: content || undefined,
        excerpt: excerpt || undefined,
        categoryId: categoryId || undefined,
        featuredImage: featuredImage || undefined,
        metaKeywords: metaKeywords || undefined,
        readTimeMinutes: content ? this.calculateReadTime(content) : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Delete blog post (only by author or admin)
   */
  async remove(id: string, userId: string, userRole: string) {
    const post = await this.findOne(id);

    // Check authorization
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.blogPost.delete({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Publish a draft post
   */
  async publish(id: string, userId: string, userRole: string) {
    const post = await this.findOne(id);

    // Check authorization
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only publish your own posts');
    }

    if (post.status === 'published') {
      throw new BadRequestException('Post is already published');
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Unpublish a published post
   */
  async unpublish(id: string, userId: string, userRole: string) {
    const post = await this.findOne(id);

    // Check authorization
    if (post.authorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only unpublish your own posts');
    }

    if (post.status === 'draft') {
      throw new BadRequestException('Post is already a draft');
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'draft',
        publishedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Update blog post status (admin only)
   */
  async updateStatus(id: string, updateStatusDto: UpdateBlogPostStatusDto) {
    const post = await this.findOne(id);

    const { status } = updateStatusDto;

    if (status === post.status) {
      throw new BadRequestException(
        `Post is already in ${status} status`,
      );
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Search blog posts by title, content, or keywords
   */
  async search(
    query: string,
    filters: FilterOptions = {},
    pagination: PaginationOptions = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const { status = 'published', categoryId } = filters;
    const skip = (page - 1) * limit;

    const searchQuery = query.toLowerCase();

    const where: any = {
      status,
      ...(categoryId && { categoryId }),
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { content: { contains: searchQuery, mode: 'insensitive' } },
        { excerpt: { contains: searchQuery, mode: 'insensitive' } },
        {
          metaKeywords: {
            hasSome: [searchQuery],
          },
        },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      query,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get featured blog posts
   */
  async getFeaturedPosts(limit: number = 5) {
    return this.prisma.blogPost.findMany({
      where: {
        status: 'published',
        featured: true,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get posts by category
   */
  async getByCategory(
    categoryId: number,
    pagination: PaginationOptions = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: {
          categoryId,
          status: 'published',
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({
        where: { categoryId, status: 'published' },
      }),
    ]);

    return {
      data: posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get posts by author
   */
  async getByAuthor(
    authorId: string,
    pagination: PaginationOptions = {},
    status?: string,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      authorId,
      ...(status && { status }),
    };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toggle featured status (admin only)
   */
  async toggleFeatured(id: string) {
    const post = await this.findOne(id);

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        featured: !post.featured,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });
  }

  /**
   * Get trending posts (most viewed recently published)
   */
  async getTrendingPosts(limit: number = 10) {
    return this.prisma.blogPost.findMany({
      where: {
        status: 'published',
        publishedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
  }

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Calculate read time in minutes
   */
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}
