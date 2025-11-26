

# TalabaHub Features Guide

This guide provides detailed documentation for the advanced features implemented in the TalabaHub backend.

## Table of Contents

1. [Database Seeding](#database-seeding)
2. [Custom Validation](#custom-validation)
3. [Audit Logging](#audit-logging)
4. [Full-Text Search](#full-text-search)

---

## Database Seeding

Database seeding allows you to populate your database with realistic test data for development and testing purposes.

### Overview

The seeding system uses factory functions to generate realistic Uzbek data including:
- Universities (5 institutions)
- Users (30 students + 1 admin)
- Categories (7 categories)
- Brands (15 brands)
- Discounts (25 discounts)
- Companies (10 companies)
- Jobs (20 job postings)
- Events (15 events)

### Usage

#### Seed the database

```bash
npm run db:seed
```

or

```bash
npm run prisma:seed
```

#### Reset and reseed the database

```bash
npm run db:reset
```

This command will:
1. Drop all data
2. Run all migrations
3. Execute the seed script

### Seed Data Details

#### Admin Account

```
Email: admin@talabahub.com
Password: Admin123!
Role: admin
```

#### Student Accounts

All student accounts use the password: `Password123!`

Email format: `{firstname}.{lastname}@student.uz`

Examples:
- ali.karimov@student.uz
- aziza.nurmatova@student.uz
- bobur.sharipov@student.uz

### Custom Factory Functions

The seeding system includes factory functions located in `prisma/seeds/factories.ts`:

```typescript
import { createUniversity, createUser, createBrand } from './seeds/factories';

// Create custom university
const university = await createUniversity({
  name: 'My University',
  city: 'Tashkent'
});

// Create custom user
const user = await createUser({
  firstName: 'John',
  lastName: 'Doe',
  universityId: university.id
});
```

### Uzbek Data Constants

The factory functions use authentic Uzbek data:

**Cities**: Tashkent, Samarkand, Bukhara, Khiva, Fergana, Andijan, Namangan, Nukus, Urgench, Termez, Karshi, Jizzakh

**First Names**: Ali, Aziz, Bobur, Davron, Eldor, Farrukh, Gulnora, Hilola, Iroda, Jamila

**Last Names**: Karimov, Alimov, Sharipov, Yusupov, Nurmatov, Rahimov, Azizova, Nurmatova

**Phone Format**: +998901234567 (randomly generated)

---

## Custom Validation

Custom validation decorators provide Uzbekistan-specific validation rules for your DTOs.

### Available Validators

#### 1. IsUzbekPhone

Validates Uzbek phone numbers in the format `+998XXXXXXXXX`.

```typescript
import { IsUzbekPhone } from './common/validators/custom-validators';

export class CreateUserDto {
  @IsUzbekPhone({ message: 'Please provide a valid Uzbek phone number' })
  phone: string;
}
```

**Valid formats**:
- `+998901234567`
- `+998991234567`

**Invalid formats**:
- `998901234567` (missing +)
- `+99890123456` (too short)
- `+9989012345678` (too long)

#### 2. IsStrongPassword

Validates password strength with the following requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

```typescript
import { IsStrongPassword } from './common/validators/custom-validators';

export class RegisterDto {
  @IsStrongPassword({
    message: 'Password must contain uppercase, lowercase, number, and special character'
  })
  password: string;
}
```

**Valid examples**:
- `Password123!`
- `MyStr0ng@Pass`
- `SecureP@ss1`

#### 3. IsStudentId

Validates student ID format (SXXXXXXXX - S followed by 8 digits).

```typescript
import { IsStudentId } from './common/validators/custom-validators';

export class VerifyStudentDto {
  @IsStudentId({ message: 'Invalid student ID format' })
  studentId: string;
}
```

**Valid examples**:
- `S12345678`
- `S98765432`

**Invalid examples**:
- `12345678` (missing S)
- `S1234567` (too short)
- `s12345678` (lowercase s)

#### 4. IsFutureDate

Validates that a date is in the future.

```typescript
import { IsFutureDate } from './common/validators/custom-validators';

export class CreateEventDto {
  @IsFutureDate({ message: 'Event date must be in the future' })
  eventDate: Date;
}
```

#### 5. IsPastDate

Validates that a date is in the past.

```typescript
import { IsPastDate } from './common/validators/custom-validators';

export class CreateUserDto {
  @IsPastDate({ message: 'Birth date must be in the past' })
  dateOfBirth: Date;
}
```

#### 6. IsAgeInRange

Validates that age (calculated from date of birth) is within a specified range.

```typescript
import { IsAgeInRange } from './common/validators/custom-validators';

export class RegisterStudentDto {
  @IsAgeInRange(16, 35, { message: 'Student must be between 16 and 35 years old' })
  dateOfBirth: Date;
}
```

#### 7. IsUzbekPostalCode

Validates Uzbek postal codes (6 digits starting with 1-9).

```typescript
import { IsUzbekPostalCode } from './common/validators/custom-validators';

export class CreateAddressDto {
  @IsUzbekPostalCode({ message: 'Invalid Uzbek postal code' })
  postalCode: string;
}
```

**Valid examples**:
- `100000` (Tashkent)
- `140100` (Samarkand)
- `200100` (Fergana)

#### 8. IsValidUrl

Validates URLs with HTTP/HTTPS protocol.

```typescript
import { IsValidUrl } from './common/validators/custom-validators';

export class CreateBrandDto {
  @IsValidUrl({ message: 'Please provide a valid URL' })
  website: string;
}
```

**Valid examples**:
- `https://example.com`
- `http://subdomain.example.com/path`

**Invalid examples**:
- `example.com` (missing protocol)
- `ftp://example.com` (wrong protocol)

#### 9. IsFileSize

Validates file size (in bytes).

```typescript
import { IsFileSize } from './common/validators/custom-validators';

export class UploadDto {
  @IsFileSize(5 * 1024 * 1024, { message: 'File must be less than 5MB' })
  fileSize: number;
}
```

#### 10. IsUzbekName

Validates Uzbek names (letters, spaces, hyphens, apostrophes only).

```typescript
import { IsUzbekName } from './common/validators/custom-validators';

export class CreateUserDto {
  @IsUzbekName({ message: 'Name contains invalid characters' })
  firstName: string;

  @IsUzbekName({ message: 'Name contains invalid characters' })
  lastName: string;
}
```

**Valid examples**:
- `Ali`
- `Aziza-Begim`
- `O'ktam`
- `Muhammad Ali`

### Using Multiple Validators

You can combine custom validators with built-in class-validator decorators:

```typescript
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { IsUzbekPhone, IsStrongPassword } from './common/validators/custom-validators';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @IsStrongPassword()
  password: string;

  @IsNotEmpty()
  @IsUzbekPhone()
  phone: string;
}
```

---

## Audit Logging

The audit logging system automatically tracks all CRUD operations and user actions throughout the application.

### Overview

Audit logs capture:
- What action was performed (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, READ)
- Who performed it (user ID, email, role)
- When it happened (timestamp)
- What changed (before/after data for updates)
- Request context (IP address, user agent)

### Audit Log Schema

```typescript
{
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'READ';
  entity_type: string;  // e.g., 'Discount', 'User', 'Job'
  entity_id: string;    // ID of the affected entity
  user_id: string;
  user_email: string;
  user_role: string;
  ip_address: string;
  user_agent: string;
  changes: object;      // Before/after data for updates
  metadata: object;     // Additional context
  created_at: Date;
}
```

### Using the Audit Service

#### Manual Logging

```typescript
import { AuditService, AuditAction } from './audit/audit.service';

@Injectable()
export class DiscountsService {
  constructor(private auditService: AuditService) {}

  async create(dto: CreateDiscountDto, userId: string, userEmail: string) {
    const discount = await this.prisma.discount.create({ data: dto });

    // Log creation
    await this.auditService.logCreate(
      'Discount',
      discount.id,
      discount,
      userId,
      userEmail
    );

    return discount;
  }

  async update(id: string, dto: UpdateDiscountDto, userId: string, userEmail: string) {
    const oldDiscount = await this.prisma.discount.findUnique({ where: { id } });
    const updatedDiscount = await this.prisma.discount.update({
      where: { id },
      data: dto
    });

    // Log update with before/after data
    await this.auditService.logUpdate(
      'Discount',
      id,
      oldDiscount,
      updatedDiscount,
      userId,
      userEmail
    );

    return updatedDiscount;
  }

  async delete(id: string, userId: string, userEmail: string) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    await this.prisma.discount.delete({ where: { id } });

    // Log deletion
    await this.auditService.logDelete(
      'Discount',
      id,
      discount,
      userId,
      userEmail
    );
  }
}
```

#### Automatic Logging with Decorator

```typescript
import { AuditLog } from './common/decorators/audit.decorator';
import { AuditAction } from './audit/audit.service';

@Controller('discounts')
export class DiscountsController {
  @Post()
  @AuditLog(AuditAction.CREATE, 'Discount')
  async create(@Body() dto: CreateDiscountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Discount')
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Discount')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

### Audit API Endpoints

All audit endpoints require admin role.

#### Get All Audit Logs (Paginated)

```http
GET /api/audit?page=1&limit=20&action=CREATE&entityType=Discount&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "data": [
    {
      "id": "log_123",
      "action": "CREATE",
      "entity_type": "Discount",
      "entity_id": "discount_456",
      "user_id": "user_789",
      "user_email": "admin@talabahub.com",
      "user_role": "admin",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "changes": {
        "created": {
          "title": "50% Off for Students",
          "discount": 50
        }
      },
      "created_at": "2024-11-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

#### Get Audit Logs for Specific Entity

```http
GET /api/audit/entity?entityType=Discount&entityId=discount_456
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "data": [
    {
      "id": "log_001",
      "action": "CREATE",
      "created_at": "2024-11-15T10:00:00Z",
      "changes": { "created": {...} }
    },
    {
      "id": "log_002",
      "action": "UPDATE",
      "created_at": "2024-11-15T11:00:00Z",
      "changes": {
        "before": { "discount": 30 },
        "after": { "discount": 50 }
      }
    },
    {
      "id": "log_003",
      "action": "DELETE",
      "created_at": "2024-11-15T12:00:00Z",
      "changes": { "deleted": {...} }
    }
  ]
}
```

#### Get Audit Logs for Specific User

```http
GET /api/audit/user?userId=user_789&limit=50
Authorization: Bearer {admin_token}
```

#### Get Audit Logs by Action

```http
GET /api/audit/action?action=DELETE&limit=100
Authorization: Bearer {admin_token}
```

### Common Use Cases

#### 1. Track Discount Changes

```typescript
// Service method
async updateDiscount(id: string, dto: UpdateDiscountDto, user: any) {
  const oldDiscount = await this.findOne(id);
  const newDiscount = await this.prisma.discount.update({
    where: { id },
    data: dto
  });

  await this.auditService.logUpdate(
    'Discount',
    id,
    oldDiscount,
    newDiscount,
    user.sub,
    user.email
  );

  return newDiscount;
}
```

The audit log will show:
```json
{
  "changes": {
    "before": {
      "discount": 30,
      "validUntil": "2024-12-01"
    },
    "after": {
      "discount": 50,
      "validUntil": "2024-12-31"
    }
  }
}
```

#### 2. Track User Authentication

```typescript
// In auth service
async login(dto: LoginDto, ip: string, userAgent: string) {
  const user = await this.validateUser(dto.email, dto.password);
  const token = await this.generateToken(user);

  await this.auditService.log({
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    ipAddress: ip,
    userAgent: userAgent,
    metadata: { success: true }
  });

  return token;
}
```

#### 3. Review Security Events

```typescript
// Get all failed login attempts
const failedLogins = await this.auditService.getAuditLogs({
  action: AuditAction.LOGIN,
  metadata: { success: false },
  limit: 100
});

// Get all deletions in the last 24 hours
const recentDeletions = await this.auditService.getAuditLogs({
  action: AuditAction.DELETE,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
});
```

---

## Full-Text Search

The full-text search system provides fast, relevant search results across all major entities in the platform.

### Overview

Search features:
- **PostgreSQL full-text search** with ranking
- **Multi-entity search** (discounts, jobs, events, brands, companies, courses)
- **Relevance ranking** using ts_rank
- **Search suggestions** for autocomplete
- **Filter by category** and other criteria
- **Pagination** support

### Search Endpoints

#### 1. Global Search (All Entities)

Search across all entities in one request.

```http
GET /api/search?query=student&limit=20
```

**Response**:
```json
{
  "discounts": {
    "results": [...],
    "total": 5
  },
  "jobs": {
    "results": [...],
    "total": 3
  },
  "events": {
    "results": [...],
    "total": 2
  },
  "brands": {
    "results": [...],
    "total": 4
  },
  "companies": {
    "results": [...],
    "total": 1
  },
  "courses": {
    "results": [...],
    "total": 6
  },
  "query": "student"
}
```

#### 2. Search Discounts

```http
GET /api/search/discounts?query=food&categoryId=cat_123&minDiscount=20&page=1&limit=10
```

**Parameters**:
- `query` (required) - Search keywords
- `categoryId` (optional) - Filter by category
- `minDiscount` (optional) - Minimum discount percentage
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Response**:
```json
{
  "results": [
    {
      "id": "discount_1",
      "title": "50% Off Student Meals",
      "description": "Special discount for university students on all food items",
      "discount": 50,
      "brand_name": "Campus Cafeteria",
      "category_name": "Food & Dining",
      "rank": 0.897
    }
  ],
  "total": 15,
  "query": "food"
}
```

#### 3. Search Jobs

```http
GET /api/search/jobs?query=developer&companyId=comp_123&jobType=full_time&page=1&limit=10
```

**Parameters**:
- `query` (required) - Search keywords
- `companyId` (optional) - Filter by company
- `jobType` (optional) - Filter by type (full_time, part_time, internship, contract)
- `page`, `limit` - Pagination

**Response**:
```json
{
  "results": [
    {
      "id": "job_1",
      "title": "Junior Frontend Developer",
      "description": "Looking for a passionate frontend developer...",
      "jobType": "full_time",
      "salary": "5000000-8000000",
      "company_name": "Tech Solutions",
      "rank": 0.856
    }
  ],
  "total": 8,
  "query": "developer"
}
```

#### 4. Search Events

```http
GET /api/search/events?query=hackathon&eventType=competition&startDate=2024-11-01&page=1&limit=10
```

**Parameters**:
- `query` (required) - Search keywords
- `eventType` (optional) - Filter by type (conference, workshop, competition, networking, cultural)
- `startDate` (optional) - Minimum event date
- `page`, `limit` - Pagination

**Response**:
```json
{
  "results": [
    {
      "id": "event_1",
      "title": "TashTech Hackathon 2024",
      "description": "48-hour coding competition...",
      "eventType": "competition",
      "eventDate": "2024-12-15T09:00:00Z",
      "location": "Tashkent IT Park",
      "rank": 0.923
    }
  ],
  "total": 3,
  "query": "hackathon"
}
```

#### 5. Search Brands

```http
GET /api/search/brands?query=tech&categoryId=cat_123&page=1&limit=10
```

**Response**:
```json
{
  "results": [
    {
      "id": "brand_1",
      "name": "TechStore",
      "description": "Electronics and gadgets for students",
      "category_name": "Electronics",
      "rank": 0.789
    }
  ],
  "total": 5,
  "query": "tech"
}
```

#### 6. Search Companies

```http
GET /api/search/companies?query=software&page=1&limit=10
```

**Response**:
```json
{
  "results": [
    {
      "id": "company_1",
      "name": "Uzbekistan Software Solutions",
      "description": "Leading software development company...",
      "industry": "Information Technology",
      "rank": 0.845
    }
  ],
  "total": 4,
  "query": "software"
}
```

#### 7. Search Courses

```http
GET /api/search/courses?query=programming&partnerId=partner_123&minPrice=0&maxPrice=1000000&page=1&limit=10
```

**Parameters**:
- `query` (required) - Search keywords
- `partnerId` (optional) - Filter by education partner
- `minPrice`, `maxPrice` (optional) - Price range
- `page`, `limit` - Pagination

**Response**:
```json
{
  "results": [
    {
      "id": "course_1",
      "title": "Web Programming Fundamentals",
      "description": "Learn HTML, CSS, JavaScript...",
      "price": 500000,
      "duration": "3 months",
      "partner_name": "Code Academy",
      "rank": 0.912
    }
  ],
  "total": 12,
  "query": "programming"
}
```

#### 8. Search Suggestions (Autocomplete)

```http
GET /api/search/suggestions?query=prog&limit=5
```

**Response**:
```json
{
  "suggestions": [
    "Web Programming Fundamentals",
    "Python Programming",
    "Mobile Programming",
    "Programming Job Opening",
    "Programming Workshop"
  ]
}
```

### Usage Examples

#### Frontend Integration (React/Vue)

```typescript
// Debounced search function
import { debounce } from 'lodash';

const searchAPI = async (query: string) => {
  const response = await fetch(
    `http://localhost:3000/api/search?query=${encodeURIComponent(query)}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};

// Autocomplete suggestions
const getSuggestions = async (query: string) => {
  if (query.length < 2) return [];

  const response = await fetch(
    `http://localhost:3000/api/search/suggestions?query=${encodeURIComponent(query)}&limit=5`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.suggestions;
};

// Use debounce for better performance
const debouncedSearch = debounce(searchAPI, 300);
const debouncedSuggestions = debounce(getSuggestions, 200);
```

#### Advanced Search with Filters

```typescript
// Search jobs with filters
const searchJobs = async (filters: {
  query: string;
  jobType?: string;
  companyId?: string;
  page?: number;
}) => {
  const params = new URLSearchParams();
  params.append('query', filters.query);
  if (filters.jobType) params.append('jobType', filters.jobType);
  if (filters.companyId) params.append('companyId', filters.companyId);
  if (filters.page) params.append('page', filters.page.toString());

  const response = await fetch(
    `http://localhost:3000/api/search/jobs?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};

// Example usage
const results = await searchJobs({
  query: 'developer',
  jobType: 'full_time',
  page: 1
});
```

### Search Ranking

Results are ranked by relevance using PostgreSQL's `ts_rank` function, which considers:
- **Term frequency**: How often search terms appear
- **Document length**: Shorter, focused documents rank higher
- **Term position**: Terms in titles rank higher than in descriptions

Results are ordered by rank (highest first) to show the most relevant items first.

### Performance Optimization

The search system includes several optimizations:

1. **Indexed search**: Uses PostgreSQL's GIN indexes for fast full-text search
2. **Query sanitization**: Prevents SQL injection with proper escaping
3. **Result limiting**: Default limit of 20 items per query
4. **Efficient queries**: Uses LEFT JOIN for related data in single query
5. **Pagination**: Supports offset-based pagination for large result sets

### Search Best Practices

1. **Use specific keywords**: More specific queries return more relevant results
   - ✅ "frontend developer internship"
   - ❌ "job"

2. **Combine with filters**: Use category, type, and date filters to narrow results
   ```http
   GET /api/search/discounts?query=food&categoryId=cat_food&minDiscount=30
   ```

3. **Implement autocomplete**: Use suggestions endpoint for better UX
   ```typescript
   // Show suggestions as user types
   onInput: debounce(async (e) => {
     const suggestions = await getSuggestions(e.target.value);
     showSuggestions(suggestions);
   }, 200)
   ```

4. **Handle no results**: Provide helpful feedback when searches return nothing
   ```typescript
   if (results.total === 0) {
     showMessage("No results found. Try different keywords or check filters.");
   }
   ```

---

## Support

For questions or issues with these features:

- **Email**: support@talabahub.com
- **GitHub Issues**: https://github.com/sarvarbekyusupov/talabahub/issues
- **Documentation**: https://talabahub.com/docs

---

## License

MIT License - see LICENSE file for details
