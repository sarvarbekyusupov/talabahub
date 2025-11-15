import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T = any> {
  results: T[];
  total: number;
  query: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search across multiple entities
   */
  async globalSearch(query: string, limit = 20): Promise<{
    discounts: any[];
    jobs: any[];
    events: any[];
    brands: any[];
    companies: any[];
    courses: any[];
  }> {
    const [discounts, jobs, events, brands, companies, courses] = await Promise.all([
      this.searchDiscounts({ query, limit: 5 }),
      this.searchJobs({ query, limit: 5 }),
      this.searchEvents({ query, limit: 5 }),
      this.searchBrands({ query, limit: 5 }),
      this.searchCompanies({ query, limit: 5 }),
      this.searchCourses({ query, limit: 5 }),
    ]);

    return {
      discounts: discounts.results,
      jobs: jobs.results,
      events: events.results,
      brands: brands.results,
      companies: companies.results,
      courses: courses.results,
    };
  }

  /**
   * Search discounts using PostgreSQL full-text search
   */
  async searchDiscounts(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;

    // Escape single quotes in query
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT d.*, b.name as brand_name, b.logo as brand_logo,
             ts_rank(
               to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(b.name, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM discounts d
      LEFT JOIN brands b ON d.brand_id = b.id
      WHERE d.is_active = true
        AND to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(b.name, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC, d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM discounts d
      LEFT JOIN brands b ON d.brand_id = b.id
      WHERE d.is_active = true
        AND to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(b.name, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Search jobs using full-text search
   */
  async searchJobs(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT j.*, c.name as company_name, c.logo as company_logo,
             ts_rank(
               to_tsvector('english', COALESCE(j.title, '') || ' ' || COALESCE(j.description, '') || ' ' || COALESCE(c.name, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = true
        AND to_tsvector('english', COALESCE(j.title, '') || ' ' || COALESCE(j.description, '') || ' ' || COALESCE(c.name, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC, j.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = true
        AND to_tsvector('english', COALESCE(j.title, '') || ' ' || COALESCE(j.description, '') || ' ' || COALESCE(c.name, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Search events using full-text search
   */
  async searchEvents(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT e.*,
             ts_rank(
               to_tsvector('english', COALESCE(e.title, '') || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.location, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM events e
      WHERE e.is_active = true
        AND to_tsvector('english', COALESCE(e.title, '') || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.location, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC, e.start_date ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM events e
      WHERE e.is_active = true
        AND to_tsvector('english', COALESCE(e.title, '') || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.location, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Search brands
   */
  async searchBrands(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT b.*,
             ts_rank(
               to_tsvector('english', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM brands b
      WHERE b.is_active = true
        AND to_tsvector('english', COALESCE(b.name, '') || ' ' || COALESCE(b.description, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM brands b
      WHERE b.is_active = true
        AND to_tsvector('english', COALESCE(b.name, '') || ' ' || COALESCE(b.description, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Search companies
   */
  async searchCompanies(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT c.*,
             ts_rank(
               to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.industry, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM companies c
      WHERE c.is_active = true
        AND to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.industry, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM companies c
      WHERE c.is_active = true
        AND to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.industry, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Search courses
   */
  async searchCourses(options: SearchOptions): Promise<SearchResult> {
    const { query, limit = 20, offset = 0 } = options;
    const sanitizedQuery = query.replace(/'/g, "''");

    const results: any = await this.prisma.$queryRawUnsafe(`
      SELECT c.*,
             ts_rank(
               to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, '')),
               plainto_tsquery('english', '${sanitizedQuery}')
             ) as rank
      FROM courses c
      WHERE c.is_active = true
        AND to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM courses c
      WHERE c.is_active = true
        AND to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, ''))
        @@ plainto_tsquery('english', '${sanitizedQuery}')
    `);

    return {
      results,
      total: parseInt(total[0]?.count || '0'),
      query,
    };
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string, limit = 5): Promise<string[]> {
    const sanitizedQuery = query.replace(/'/g, "''");

    // Get suggestions from discounts, jobs, and events
    const suggestions: any = await this.prisma.$queryRawUnsafe(`
      SELECT DISTINCT title as suggestion
      FROM (
        SELECT title FROM discounts WHERE title ILIKE '%${sanitizedQuery}%' LIMIT ${limit}
        UNION
        SELECT title FROM jobs WHERE title ILIKE '%${sanitizedQuery}%' LIMIT ${limit}
        UNION
        SELECT title FROM events WHERE title ILIKE '%${sanitizedQuery}%' LIMIT ${limit}
      ) as combined
      LIMIT ${limit}
    `);

    return suggestions.map((s: any) => s.suggestion);
  }
}
