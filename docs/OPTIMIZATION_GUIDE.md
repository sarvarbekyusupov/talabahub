# Performance & Security Optimization Guide

Complete guide for all optimizations implemented in TalabaHub backend.

## Table of Contents

- [Performance Optimizations](#performance-optimizations)
- [Security Improvements](#security-improvements)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Performance Optimizations

### 1. Database Indexing ✅

**Location**: `prisma/schema.prisma`

Database indexes are already configured for frequently queried fields:

```prisma
model User {
  // ... fields ...

  @@index([email])           // Fast email lookup
  @@index([phone])           // Fast phone lookup
  @@index([universityId])    // Fast university filtering
  @@index([verificationStatus])  // Fast status filtering
  @@index([referralCode])    // Fast referral lookup
}

model Category {
  @@index([slug])      // Fast URL lookup
  @@index([parentId])  // Fast hierarchy queries
}

model Brand {
  @@index([slug])       // Fast URL lookup
  @@index([categoryId]) // Fast category filtering
}
```

**Benefits**:
- Faster query execution
- Reduced database load
- Better scalability

---

### 2. Pagination ✅

**Location**: `src/common/dto/pagination.dto.ts`, `src/common/utils/pagination.helper.ts`

#### Pagination DTO

```typescript
import { PaginationDto } from './common/dto/pagination.dto';

@Get()
async findAll(@Query() pagination: PaginationDto) {
  return this.service.findAll(pagination);
}
```

#### Using Pagination Helper

```typescript
import { paginate } from './common/utils/pagination.helper';

async findAll(pagination: PaginationDto) {
  return paginate(
    this.prisma.user,
    pagination,
    {
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }
  );
}
```

#### Response Format

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Benefits**:
- Reduced response payload
- Faster response times
- Better user experience

---

### 3. Caching ✅

**Location**: `src/cache/cache.module.ts`

#### In-Memory Cache (Default)

```typescript
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async findAll() {
    const cacheKey = 'discounts:all';

    // Try to get from cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // If not in cache, fetch from database
    const discounts = await this.prisma.discount.findMany({
      where: { isActive: true }
    });

    // Store in cache for 10 minutes
    await this.cacheManager.set(cacheKey, discounts, 600);

    return discounts;
  }

  async update(id: string, data: any) {
    // Update database
    const result = await this.prisma.discount.update({...});

    // Clear cache
    await this.cacheManager.del('discounts:all');

    return result;
  }
}
```

#### Using Cache Decorators

```typescript
import { CacheKey, CacheTTL } from './common/decorators/cache-key.decorator';

@CacheKey('discounts:all')
@CacheTTL(600) // 10 minutes
@Get()
async findAll() {
  return this.service.findAll();
}
```

**Benefits**:
- Reduced database queries
- Faster response times
- Lower server load

---

### 4. N+1 Problem Prevention ✅

**Already Implemented** with Prisma `include`:

```typescript
// ❌ Bad - N+1 Problem
const users = await prisma.user.findMany();
for (const user of users) {
  const university = await prisma.university.findUnique({
    where: { id: user.universityId }
  });
}

// ✅ Good - Include relation
const users = await prisma.user.findMany({
  include: {
    university: true,
    enrolledCourses: {
      include: { course: true }
    }
  }
});
```

**Benefits**:
- Single query instead of N+1
- Dramatically faster execution
- Lower database load

---

## Security Improvements

### 1. Rate Limiting ✅

**Location**: `src/app.module.ts`

Global rate limiting configured via ThrottlerGuard:

```typescript
// Configuration in app.module.ts
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => [{
    ttl: config.get('THROTTLE_TTL') || 60000, // 60 seconds
    limit: config.get('THROTTLE_LIMIT') || 10, // 10 requests
  }],
}),
```

#### Override for Specific Routes

```typescript
import { SkipThrottle, Throttle } from '@nestjs/throttler';

// Skip rate limiting
@SkipThrottle()
@Get('public')
async publicRoute() {}

// Custom rate limit
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
@Post('login')
async login() {}
```

**Configuration** (`.env`):
```bash
THROTTLE_TTL=60000  # 60 seconds
THROTTLE_LIMIT=10   # 10 requests
```

**Benefits**:
- Prevents brute force attacks
- Protects against DDoS
- Ensures fair resource usage

---

### 2. Helmet Security Headers ✅

**Location**: `src/main.ts`

Helmet adds various HTTP headers for security:

```typescript
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy:
      NODE_ENV === "production"
        ? undefined
        : false, // Disable in dev for Swagger
  })
);
```

**Headers Added**:
- `X-DNS-Prefetch-Control`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `X-Download-Options`
- `X-Permitted-Cross-Domain-Policies`
- `Referrer-Policy`
- `Content-Security-Policy`

**Benefits**:
- Prevents XSS attacks
- Prevents clickjacking
- Prevents MIME sniffing
- Enforces HTTPS

---

### 3. Input Sanitization ✅

**Location**: `src/common/pipes/sanitize.pipe.ts`

Prevents XSS attacks by sanitizing user input:

```typescript
import { SanitizePipe } from './common/pipes/sanitize.pipe';

// Apply to specific route
@Post()
@UsePipes(new SanitizePipe())
async create(@Body() createDto: CreateDto) {}

// Or apply globally in main.ts
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true }),
  new SanitizePipe()
);
```

**What it does**:
- Removes all HTML tags
- Prevents script injection
- Sanitizes nested objects and arrays

**Example**:
```typescript
// Input
{
  "name": "<script>alert('XSS')</script>John",
  "bio": "Hello <b>World</b>"
}

// After sanitization
{
  "name": "John",
  "bio": "Hello World"
}
```

**Benefits**:
- Prevents XSS attacks
- Data integrity
- Secure user inputs

---

### 4. CORS Configuration ✅

**Location**: `src/main.ts`

Already configured with strict origin control:

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://talabahub.uz", // Add production domain
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new BadRequestException("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
});
```

**Benefits**:
- Prevents unauthorized cross-origin requests
- Protects against CSRF
- Controlled resource sharing

---

## Best Practices

### 1. Always Use Pagination

```typescript
// ❌ Bad - Returns all records
@Get()
async findAll() {
  return this.prisma.user.findMany();
}

// ✅ Good - Paginated results
@Get()
async findAll(@Query() pagination: PaginationDto) {
  return paginate(this.prisma.user, pagination);
}
```

### 2. Cache Frequently Accessed Data

```typescript
// Cache static data (categories, universities)
// Cache list endpoints with filters
// Clear cache on updates

async update(id: string, data: any) {
  const result = await this.prisma.update({...});
  await this.cacheManager.del(`entity:${id}`);
  await this.cacheManager.del('entity:all');
  return result;
}
```

### 3. Use Indexes for Filtered Queries

```prisma
model Product {
  categoryId Int
  isActive   Boolean
  createdAt  DateTime

  @@index([categoryId, isActive])  // Composite index
  @@index([createdAt])              // Sort index
}
```

### 4. Limit Response Payload

```typescript
// ❌ Bad - Returns everything
select: {
  *
}

// ✅ Good - Only needed fields
select: {
  id: true,
  name: true,
  email: true,
  // Exclude: passwordHash, tokens, etc.
}
```

### 5. Validate and Sanitize All Input

```typescript
@Post()
@UsePipes(new ValidationPipe(), new SanitizePipe())
async create(@Body() createDto: CreateDto) {
  // DTO is validated and sanitized
}
```

---

## Examples

### Complete Example: Discounts Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate } from '../common/utils/pagination.helper';

@Injectable()
export class DiscountsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // Paginated with caching
  async findAll(pagination: PaginationDto) {
    const cacheKey = `discounts:page:${pagination.page}:${pagination.limit}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Query with pagination and optimization
    const result = await paginate(
      this.prisma.discount,
      pagination,
      {
        where: { isActive: true, expiresAt: { gte: new Date() } },
        include: { brand: { select: { id: true, name: true, logoUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }
    );

    // Cache for 5 minutes
    await this.cache.set(cacheKey, result, 300);

    return result;
  }

  async update(id: string, data: any) {
    const result = await this.prisma.discount.update({
      where: { id },
      data,
    });

    // Clear all discount caches
    await this.cache.reset();

    return result;
  }
}
```

### Complete Example: Controller with All Optimizations

```typescript
import { Controller, Get, Post, Body, Query, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SanitizePipe } from '../common/pipes/sanitize.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CacheKey, CacheTTL } from '../common/decorators/cache-key.decorator';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  // Public endpoint - no auth, higher rate limit, cached
  @SkipThrottle()
  @CacheKey('discounts:public')
  @CacheTTL(600)
  @Get('public')
  @ApiOperation({ summary: 'Get public discounts' })
  async getPublicDiscounts(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  // Protected endpoint - requires auth, rate limited, sanitized input
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UsePipes(new SanitizePipe())
  @Post()
  @ApiOperation({ summary: 'Create discount' })
  async create(@Body() createDto: CreateDiscountDto) {
    return this.service.create(createDto);
  }
}
```

---

## Environment Variables

Update your `.env`:

```bash
# Rate Limiting
THROTTLE_TTL=60000     # 60 seconds
THROTTLE_LIMIT=10      # 10 requests per TTL

# Caching (optional Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=600          # 10 minutes default
```

---

## Performance Checklist

Before deploying to production:

- [ ] All list endpoints use pagination
- [ ] Frequently accessed data is cached
- [ ] Database indexes are in place
- [ ] N+1 queries are eliminated (use `include`)
- [ ] Response payloads are limited (use `select`)
- [ ] Rate limiting is configured
- [ ] Helmet security headers are enabled
- [ ] Input sanitization is applied
- [ ] CORS is properly configured
- [ ] Logging doesn't include sensitive data

---

## Monitoring

Use the health and metrics endpoints to monitor performance:

```bash
# Check system metrics
GET /api/health/metrics

# Example response
{
  "memory": {
    "rss": "75MB",
    "heapUsed": "35MB"
  },
  "uptime": 3600
}
```

Monitor performance metrics in logs:

```
📊 Performance Metrics Report
🐌 Top 10 Slowest Endpoints:
  1. POST /api/discounts - Avg: 234ms | Count: 45
```

---

## Summary

**TalabaHub now has**:

✅ **Performance**:
- Database indexing
- Pagination (20 items/page default)
- In-memory caching
- N+1 prevention

✅ **Security**:
- Rate limiting (10 req/60s)
- Helmet security headers
- Input sanitization (XSS prevention)
- CORS protection

**Result**: Faster, more secure, production-ready backend! 🚀

---

**Last Updated**: November 15, 2025
**Version**: 1.0.0
