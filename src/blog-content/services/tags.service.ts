import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTagDto: { name: string; description?: string; color?: string }) {
    const { name, description, color } = createTagDto;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if tag already exists
    const existingTag = await this.prisma.tag.findUnique({
      where: { slug },
    });

    if (existingTag) {
      throw new BadRequestException('Tag with this name already exists');
    }

    const tag = await this.prisma.tag.create({
      data: {
        name,
        slug,
        description,
        color,
      },
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
    });

    return this._formatTagResponse(tag);
  }

  async findAll(search?: string, limit = 100) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tags = await this.prisma.tag.findMany({
      where,
      take: limit,
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return tags.map((tag) => this._formatTagResponse(tag));
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
        blogPosts: {
          include: {
            blogPost: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                publishedAt: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this._formatTagResponse(tag);
  }

  async findBySlug(slug: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this._formatTagResponse(tag);
  }

  async update(id: string, updateTagDto: { name?: string; description?: string; color?: string }) {
    const { name, description, color } = updateTagDto;

    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException('Tag not found');
    }

    let slug = existingTag.slug;
    if (name && name !== existingTag.name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Check if new slug conflicts with another tag
      const conflictingTag = await this.prisma.tag.findUnique({
        where: { slug },
      });

      if (conflictingTag && conflictingTag.id !== id) {
        throw new BadRequestException('Tag with this name already exists');
      }
    }

    const updatedTag = await this.prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        color,
      },
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
    });

    return this._formatTagResponse(updatedTag);
  }

  async remove(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check if tag is being used by any blog posts
    const blogPostCount = await this.prisma.blogPostTag.count({
      where: { tagId: id },
    });

    if (blogPostCount > 0) {
      throw new BadRequestException(`Cannot delete tag: it is used by ${blogPostCount} blog post(s)`);
    }

    await this.prisma.tag.delete({
      where: { id },
    });

    return { message: 'Tag deleted successfully' };
  }

  async getPopularTags(limit = 10) {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
      orderBy: {
        blogPosts: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return tags.map((tag) => this._formatTagResponse(tag));
  }

  async updateTagUsage() {
    // This method can be called periodically to update the usage count
    // For now, we'll rely on the database _count relationships
    return { message: 'Tag usage counts are automatically calculated' };
  }

  private _formatTagResponse(tag: any) {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      color: tag.color,
      usageCount: tag._count?.blogPosts || 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      blogPosts: tag.blogPosts?.map((bp: any) => ({
        id: bp.blogPost.id,
        title: bp.blogPost.title,
        slug: bp.blogPost.slug,
        status: bp.blogPost.status,
        publishedAt: bp.blogPost.publishedAt,
      })) || [],
    };
  }
}