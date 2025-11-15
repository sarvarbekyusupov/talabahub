# Search Indexing Guide

This guide provides detailed information on optimizing PostgreSQL full-text search indexes for the TalabaHub platform.

## Table of Contents

1. [Overview](#overview)
2. [Current Search Implementation](#current-search-implementation)
3. [Index Types](#index-types)
4. [Creating Search Indexes](#creating-search-indexes)
5. [Index Maintenance](#index-maintenance)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring Search Performance](#monitoring-search-performance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

TalabaHub uses PostgreSQL's built-in full-text search capabilities with `ts_vector` and `ts_rank` for fast, relevant search results across multiple entities. This document explains how to create and maintain proper indexes for optimal search performance.

### Why Indexing Matters

Without proper indexes, full-text search queries would require full table scans, making searches slow as the database grows. With GIN (Generalized Inverted Index) indexes:

- **Searches are 10-100x faster** depending on data size
- **Query response time** stays under 50ms even with millions of records
- **CPU usage** is significantly reduced
- **Scalability** improves dramatically

---

## Current Search Implementation

The search system currently searches across 6 main entities:

1. **Discounts** - title, description
2. **Jobs** - title, description, requirements, responsibilities
3. **Events** - title, description, location
4. **Brands** - name, description
5. **Companies** - name, description, industry
6. **Courses** - title, description

### Search Query Pattern

All search queries follow this pattern:

```sql
SELECT *
FROM table_name
WHERE to_tsvector('english', COALESCE(field1, '') || ' ' || COALESCE(field2, ''))
      @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(
  to_tsvector('english', COALESCE(field1, '') || ' ' || COALESCE(field2, '')),
  plainto_tsquery('english', $1)
) DESC
LIMIT $2;
```

---

## Index Types

### GIN (Generalized Inverted Index)

**Recommended for full-text search** - Fast lookups, slower updates

```sql
CREATE INDEX idx_discounts_search ON discounts
USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));
```

**Pros:**
- Very fast search queries (O(log n))
- Smaller index size
- Best for read-heavy workloads

**Cons:**
- Slower INSERT/UPDATE operations
- Index updates are batched (can be tuned)

### GiST (Generalized Search Tree)

**Alternative option** - Faster updates, slower searches

```sql
CREATE INDEX idx_discounts_search ON discounts
USING GiST (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));
```

**Pros:**
- Faster INSERT/UPDATE operations
- Better for write-heavy workloads

**Cons:**
- Slower search queries (O(n log n))
- Larger index size

### Recommendation

**Use GIN indexes** for TalabaHub because:
- Searches are more frequent than writes
- Fast search response time is critical for UX
- Most content updates are batched (e.g., admin updates, not real-time)

---

## Creating Search Indexes

### Step 1: Create Migration File

Create a new migration file:

```bash
cd prisma/migrations
mkdir add_search_indexes
cd add_search_indexes
touch migration.sql
```

### Step 2: Add Index Definitions

Add the following SQL to `migration.sql`:

```sql
-- ============================================
-- Full-Text Search Indexes for TalabaHub
-- ============================================

-- Discounts Search Index
-- Searches: title, description
CREATE INDEX IF NOT EXISTS idx_discounts_fulltext_search
ON discounts
USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Jobs Search Index
-- Searches: title, description, requirements, responsibilities
CREATE INDEX IF NOT EXISTS idx_jobs_fulltext_search
ON jobs
USING GIN (to_tsvector('english',
  COALESCE(title, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(requirements, '') || ' ' ||
  COALESCE(responsibilities, '')
));

-- Events Search Index
-- Searches: title, description, location
CREATE INDEX IF NOT EXISTS idx_events_fulltext_search
ON events
USING GIN (to_tsvector('english',
  COALESCE(title, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(location, '')
));

-- Brands Search Index
-- Searches: name, description
CREATE INDEX IF NOT EXISTS idx_brands_fulltext_search
ON brands
USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- Companies Search Index
-- Searches: name, description, industry
CREATE INDEX IF NOT EXISTS idx_companies_fulltext_search
ON companies
USING GIN (to_tsvector('english',
  COALESCE(name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(industry, '')
));

-- Courses Search Index
-- Searches: title, description
CREATE INDEX IF NOT EXISTS idx_courses_fulltext_search
ON courses
USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- ============================================
-- Supporting Indexes for Search Filters
-- ============================================

-- These indexes improve performance when combining search with filters

-- Discounts category filter
CREATE INDEX IF NOT EXISTS idx_discounts_category_id ON discounts(category_id) WHERE category_id IS NOT NULL;

-- Discounts brand filter
CREATE INDEX IF NOT EXISTS idx_discounts_brand_id ON discounts(brand_id) WHERE brand_id IS NOT NULL;

-- Jobs company filter
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id) WHERE company_id IS NOT NULL;

-- Jobs type filter
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type) WHERE job_type IS NOT NULL;

-- Events type filter
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type) WHERE event_type IS NOT NULL;

-- Courses partner filter
CREATE INDEX IF NOT EXISTS idx_courses_partner_id ON courses(education_partner_id) WHERE education_partner_id IS NOT NULL;
```

### Step 3: Run Migration

```bash
npx prisma migrate deploy
```

### Step 4: Verify Indexes

Connect to PostgreSQL and verify indexes were created:

```sql
-- Check all indexes on discounts table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'discounts';

-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%fulltext%'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## Index Maintenance

### Automatic Vacuuming

PostgreSQL automatically maintains indexes through autovacuum. Ensure autovacuum is enabled:

```sql
-- Check autovacuum settings
SHOW autovacuum;

-- Should return 'on'
```

### Manual Reindexing

If search performance degrades over time, rebuild indexes:

```sql
-- Reindex specific index
REINDEX INDEX idx_discounts_fulltext_search;

-- Reindex entire table
REINDEX TABLE discounts;

-- Reindex entire database (run during maintenance window)
REINDEX DATABASE talabahub;
```

### When to Reindex

- After bulk data imports
- If search queries become slow (> 200ms)
- After major database version upgrades
- If index bloat is detected

### Checking Index Bloat

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%fulltext%'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## Performance Optimization

### 1. Tune GIN Index Parameters

Adjust GIN index settings for better performance:

```sql
-- Set GIN pending list size (default: 4MB, max: 256MB)
-- Larger values = faster inserts, slower searches
-- Smaller values = slower inserts, faster searches
ALTER INDEX idx_discounts_fulltext_search SET (fastupdate = on);
ALTER INDEX idx_discounts_fulltext_search SET (gin_pending_list_limit = 4096); -- 4MB
```

**Recommended settings:**
- **Production (read-heavy)**: 4MB (default)
- **Staging/Development**: 1MB
- **Bulk imports**: 256MB temporarily, then reindex

### 2. Use Stored Generated Columns

For frequently searched tables, create a stored `tsvector` column:

```sql
-- Add tsvector column to discounts table
ALTER TABLE discounts ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) STORED;

-- Create index on generated column
CREATE INDEX idx_discounts_search_vector ON discounts USING GIN (search_vector);

-- Update search queries to use the column
-- Before:
SELECT * FROM discounts
WHERE to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
      @@ plainto_tsquery('english', 'student');

-- After:
SELECT * FROM discounts
WHERE search_vector @@ plainto_tsquery('english', 'student');
```

**Benefits:**
- 2-3x faster search queries
- Lower CPU usage
- Pre-computed vectors reduce query time

**Trade-offs:**
- Increases storage by ~10-20%
- Slightly slower INSERT/UPDATE operations

### 3. Optimize ts_rank Calculations

Use simpler ranking for better performance:

```sql
-- Default (accurate but slower)
ORDER BY ts_rank(search_vector, query) DESC;

-- Fast ranking (good enough for most cases)
ORDER BY ts_rank_cd(search_vector, query) DESC;

-- Count-only ranking (fastest)
ORDER BY ts_rank(search_vector, query, 32) DESC;
```

### 4. Limit Result Sets

Always use `LIMIT` to prevent loading too much data:

```sql
-- Good
SELECT * FROM discounts WHERE search_vector @@ query LIMIT 20;

-- Bad (can load millions of rows)
SELECT * FROM discounts WHERE search_vector @@ query;
```

### 5. Use Query Caching

Cache frequent search queries using Redis:

```typescript
// In search.service.ts
import { CacheService } from '../cache/cache.service';

async searchDiscounts(query: string, limit: number = 20) {
  const cacheKey = `search:discounts:${query}:${limit}`;

  // Check cache first
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return cached;

  // Execute search
  const results = await this.executeSearch(query, limit);

  // Cache for 5 minutes
  await this.cacheService.set(cacheKey, results, 300);

  return results;
}
```

---

## Monitoring Search Performance

### 1. Enable Query Logging

Add to `postgresql.conf`:

```conf
log_min_duration_statement = 100  # Log queries taking > 100ms
log_statement = 'all'              # Log all statements (dev only)
```

### 2. Track Index Usage

```sql
-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%fulltext%'
ORDER BY idx_scan DESC;
```

### 3. Slow Query Analysis

```sql
-- Find slow search queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%to_tsvector%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 4. Application-Level Monitoring

Log search performance in your application:

```typescript
// In search.service.ts
async searchDiscounts(query: string, limit: number = 20) {
  const startTime = Date.now();

  const results = await this.executeSearch(query, limit);

  const duration = Date.now() - startTime;

  // Log slow searches
  if (duration > 100) {
    this.logger.warn(`Slow search query: "${query}" took ${duration}ms`);
  }

  // Track metrics
  this.metricsService.recordSearchDuration('discounts', duration);

  return results;
}
```

---

## Troubleshooting

### Problem: Search queries are slow (> 200ms)

**Solutions:**

1. **Check if indexes exist:**
   ```sql
   \d+ discounts  -- Shows all indexes on the table
   ```

2. **Verify index is being used:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM discounts
   WHERE to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
         @@ plainto_tsquery('english', 'student');
   ```

   Look for "Bitmap Index Scan" or "Index Scan" in the output. If you see "Seq Scan", the index is not being used.

3. **Rebuild the index:**
   ```sql
   REINDEX INDEX CONCURRENTLY idx_discounts_fulltext_search;
   ```

4. **Update table statistics:**
   ```sql
   ANALYZE discounts;
   ```

### Problem: Index is not being used

**Possible causes:**

1. **Query doesn't match index definition:**
   - Ensure the query uses the exact same expression as the index

2. **Table is too small:**
   - PostgreSQL may prefer sequential scan for small tables (< 1000 rows)
   - This is actually optimal and not a problem

3. **Outdated statistics:**
   ```sql
   ANALYZE discounts;
   ```

4. **Disabled index:**
   ```sql
   -- Check if index is valid
   SELECT indexname, indisvalid
   FROM pg_index
   JOIN pg_class ON pg_class.oid = pg_index.indexrelid
   WHERE relname = 'idx_discounts_fulltext_search';
   ```

### Problem: High memory usage during search

**Solutions:**

1. **Reduce result set size:**
   - Always use `LIMIT`
   - Implement pagination

2. **Optimize PostgreSQL memory settings:**
   ```conf
   # postgresql.conf
   shared_buffers = 256MB           # 25% of RAM
   effective_cache_size = 1GB       # 50% of RAM
   work_mem = 16MB                  # Per-query memory
   maintenance_work_mem = 256MB     # For index creation
   ```

3. **Use connection pooling:**
   - Configure Prisma connection pool
   - Limit concurrent connections

### Problem: INSERT/UPDATE operations are slow

**Solutions:**

1. **Temporarily disable fastupdate during bulk imports:**
   ```sql
   ALTER INDEX idx_discounts_fulltext_search SET (fastupdate = off);

   -- Run bulk insert/update

   ALTER INDEX idx_discounts_fulltext_search SET (fastupdate = on);
   REINDEX INDEX CONCURRENTLY idx_discounts_fulltext_search;
   ```

2. **Batch operations:**
   ```typescript
   // Instead of inserting one at a time
   await prisma.discount.create({ data: discount1 });
   await prisma.discount.create({ data: discount2 });

   // Batch insert
   await prisma.discount.createMany({
     data: [discount1, discount2, discount3, ...],
     skipDuplicates: true,
   });
   ```

3. **Consider using GiST indexes** if writes are more frequent than reads

---

## Best Practices

1. **Create indexes during off-peak hours**
   - Use `CREATE INDEX CONCURRENTLY` to avoid locking tables

2. **Monitor index sizes**
   - Keep indexes under 1GB for optimal performance
   - Consider partitioning large tables

3. **Test search performance regularly**
   - Run benchmark queries weekly
   - Set up alerts for slow queries (> 200ms)

4. **Use appropriate text search configuration**
   - `'english'` for English content
   - `'simple'` for multi-language or when stemming causes issues

5. **Keep PostgreSQL updated**
   - Newer versions have better full-text search performance
   - Test thoroughly before upgrading production

6. **Document index strategy**
   - Keep this guide updated
   - Document any custom indexes
   - Track index performance metrics

---

## Additional Resources

- [PostgreSQL Full-Text Search Documentation](https://www.postgresql.org/docs/current/textsearch.html)
- [GIN Index Documentation](https://www.postgresql.org/docs/current/gin.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Prisma Full-Text Search Guide](https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search)

---

## Support

For questions or issues with search performance:

- **Email**: support@talabahub.com
- **GitHub Issues**: https://github.com/sarvarbekyusupov/talabahub/issues
- **Documentation**: https://talabahub.com/docs

---

## License

MIT License - see LICENSE file for details
