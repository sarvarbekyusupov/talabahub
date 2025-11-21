import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto, TagFilterDto } from '../dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  async create(dto: CreateTagDto) {
    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Tag already exists');

    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name.toLowerCase(),
        slug,
        category: dto.category as any,
      },
    });

    return tag;
  }

  async findAll(filters: TagFilterDto) {
    const { category, popular, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (category) where.category = category;

    let orderBy: any = { name: 'asc' };
    if (popular) {
      orderBy = { articleCount: 'desc' };
    }

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      data: tags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('Tag not found');

    // Get top articles with this tag
    const topArticles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        tags: { some: { tagId: tag.id } },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        stats: true,
      },
      orderBy: { stats: { clapsCount: 'desc' } },
      take: 10,
    });

    // Get latest articles
    const latestArticles = await this.prisma.article.findMany({
      where: {
        status: 'published',
        tags: { some: { tagId: tag.id } },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        stats: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    // Get top writers for this tag
    const topWriters = await this.prisma.user.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            tags: { some: { tagId: tag.id } },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        studentProfile: true,
        _count: {
          select: {
            articles: {
              where: { tags: { some: { tagId: tag.id } } },
            },
          },
        },
      },
      take: 10,
    });

    return {
      tag,
      topArticles,
      latestArticles,
      topWriters,
    };
  }

  async search(query: string) {
    const tags = await this.prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { articleCount: 'desc' },
      take: 10,
    });

    return tags;
  }
}
