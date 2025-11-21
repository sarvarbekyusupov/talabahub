import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDto, SearchSuggestionsDto } from '../dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(dto: SearchDto) {
    const { q, type, universityId, page = 1, limit = 20 } = dto;

    const results: any = { articles: [], students: [], tags: [] };
    const counts = { articles: 0, students: 0, tags: 0 };

    // Search articles
    if (!type || type === 'articles') {
      const articleWhere: any = {
        status: 'published',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { subtitle: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (universityId) {
        articleWhere.author = { universityId };
      }

      const [articles, articleCount] = await Promise.all([
        this.prisma.article.findMany({
          where: articleWhere,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            stats: true,
            tags: { include: { tag: true } },
          },
          orderBy: { stats: { clapsCount: 'desc' } },
          skip: type === 'articles' ? (page - 1) * limit : 0,
          take: type === 'articles' ? limit : 5,
        }),
        this.prisma.article.count({ where: articleWhere }),
      ]);
      results.articles = articles;
      counts.articles = articleCount;
    }

    // Search students
    if (!type || type === 'students') {
      const studentWhere: any = {
        role: 'student',
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (universityId) {
        studentWhere.universityId = universityId;
      }

      const [students, studentCount] = await Promise.all([
        this.prisma.user.findMany({
          where: studentWhere,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            studentProfile: true,
            university: { select: { id: true, nameEn: true } },
          },
          skip: type === 'students' ? (page - 1) * limit : 0,
          take: type === 'students' ? limit : 5,
        }),
        this.prisma.user.count({ where: studentWhere }),
      ]);
      results.students = students;
      counts.students = studentCount;
    }

    // Search tags
    if (!type || type === 'tags') {
      const [tags, tagCount] = await Promise.all([
        this.prisma.tag.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
          orderBy: { articleCount: 'desc' },
          skip: type === 'tags' ? (page - 1) * limit : 0,
          take: type === 'tags' ? limit : 5,
        }),
        this.prisma.tag.count({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
        }),
      ]);
      results.tags = tags;
      counts.tags = tagCount;
    }

    // Combine results based on type
    let combinedResults: any[] = [];
    if (type === 'articles') {
      combinedResults = results.articles;
    } else if (type === 'students') {
      combinedResults = results.students;
    } else if (type === 'tags') {
      combinedResults = results.tags;
    } else {
      combinedResults = [
        ...results.articles.map((a: any) => ({ ...a, _type: 'article' })),
        ...results.students.map((s: any) => ({ ...s, _type: 'student' })),
        ...results.tags.map((t: any) => ({ ...t, _type: 'tag' })),
      ];
    }

    const total = type
      ? counts[type as keyof typeof counts]
      : counts.articles + counts.students + counts.tags;

    return {
      results: combinedResults,
      total,
      facets: { types: counts },
    };
  }

  async getSuggestions(dto: SearchSuggestionsDto) {
    const { q } = dto;

    const [articles, students, tags] = await Promise.all([
      this.prisma.article.findMany({
        where: {
          status: 'published',
          title: { contains: q, mode: 'insensitive' },
        },
        select: { title: true, slug: true },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: {
          role: 'student',
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        take: 5,
      }),
      this.prisma.tag.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { name: true, slug: true },
        take: 5,
      }),
    ]);

    return {
      articles: articles.map(a => ({ title: a.title, slug: a.slug })),
      students: students.map(s => ({
        username: s.id,
        name: `${s.firstName} ${s.lastName}`,
      })),
      tags: tags.map(t => ({ name: t.name, slug: t.slug })),
    };
  }
}
