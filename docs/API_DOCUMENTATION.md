# API Documentation Guide

Complete guide for TalabaHub API documentation using Swagger/OpenAPI.

## Table of Contents

- [Accessing API Documentation](#accessing-api-documentation)
- [Authentication](#authentication)
- [Using the API](#using-the-api)
- [Best Practices for Developers](#best-practices-for-developers)
- [Custom Decorators](#custom-decorators)
- [Examples](#examples)

---

## Accessing API Documentation

### Local Development

```
http://localhost:3000/api
```

### Staging

```
https://staging-api.talabahub.com/api
```

### Production

```
https://api.talabahub.com/api
```

---

## Features

### ✅ Enhanced Swagger UI

- **Custom Theme** - Professional dark blue theme
- **Search & Filter** - Find endpoints quickly
- **Syntax Highlighting** - Monokai theme for code
- **Request Duration** - See how long requests take
- **Persistent Auth** - Token persists across refreshes
- **Collapsed by Default** - Clean, organized view
- **Multiple Servers** - Switch between dev/staging/prod

### ✅ Comprehensive Documentation

- **Tag Descriptions** - Each section explained
- **Rich Examples** - Real-world request/response examples
- **Error Responses** - All possible error codes documented
- **Rate Limiting Info** - Understand request limits
- **Authentication Guide** - Step-by-step auth flow

---

## Authentication

### Step 1: Register an Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "universityId": "clp123abc456"
}
```

### Step 2: Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clp789xyz123",
    "email": "student@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Step 3: Authorize in Swagger

1. Click the **🔓 Authorize** button at the top
2. Enter your access token (without "Bearer" prefix)
3. Click **Authorize**
4. You can now test protected endpoints!

---

## Using the API

### Making Requests

#### 1. Find Your Endpoint

Use the search bar or browse by tags:
- **Authentication** - Login, register, tokens
- **Users** - Profile management
- **Discounts** - Student offers
- **Jobs** - Job postings
- etc.

#### 2. Click "Try it out"

Click the "Try it out" button on any endpoint

#### 3. Fill in Parameters

- **Path parameters** - ID in URL (e.g., `/users/{id}`)
- **Query parameters** - Filters, pagination (e.g., `?page=1&limit=20`)
- **Request body** - JSON data

#### 4. Execute

Click **Execute** to send the request

#### 5. View Response

See the response:
- **Status code** - 200, 201, 400, etc.
- **Response body** - JSON data
- **Headers** - Response headers
- **Duration** - How long it took

### Pagination

Most list endpoints support pagination:

```http
GET /api/discounts?page=1&limit=20
```

**Response:**
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

### Filtering

Many endpoints support filtering:

```http
GET /api/jobs?categoryId=clp123&isActive=true
```

### Sorting

Use query parameters for sorting:

```http
GET /api/events?sortBy=startDate&order=asc
```

---

## Best Practices for Developers

### Adding Swagger Documentation to Controllers

#### Basic Endpoint Documentation

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users') // Group endpoints by tag
@Controller('users')
export class UsersController {

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information'
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data'
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists'
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

#### Using Custom Decorators

We've created custom decorators to make documentation easier:

```typescript
import {
  ApiCrudOperation,
  ApiResponseSuccess,
  ApiResponseNotFound
} from './common/decorators/swagger.decorator';

@Controller('discounts')
@ApiTags('Discounts')
export class DiscountsController {

  @Get()
  @ApiCrudOperation({
    operation: 'readAll',
    resourceName: 'Discount',
    responseType: DiscountDto,
    isPaginated: true,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.discountsService.findAll(pagination);
  }

  @Get(':id')
  @ApiCrudOperation({
    operation: 'read',
    resourceName: 'Discount',
    responseType: DiscountDto,
  })
  findOne(@Param('id') id: string) {
    return this.discountsService.findOne(id);
  }

  @Post()
  @ApiCrudOperation({
    operation: 'create',
    resourceName: 'Discount',
    bodyType: CreateDiscountDto,
    responseType: DiscountDto,
  })
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.create(createDiscountDto);
  }
}
```

### Adding Examples to DTOs

#### Basic DTO with Examples

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'student@university.uz',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'Sardor',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Yusupov',
  })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+998901234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

#### Enum Properties

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  PARTNER = 'partner',
}

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.STUDENT,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole)
  role: UserRole;
}
```

#### Nested Objects

```typescript
export class AddressDto {
  @ApiProperty({ example: 'Tashkent' })
  city: string;

  @ApiProperty({ example: 'Yunusabad' })
  district: string;

  @ApiProperty({ example: 'Amir Temur 123' })
  street: string;
}

export class CreateCompanyDto {
  @ApiProperty({ example: 'TechCorp' })
  name: string;

  @ApiProperty({
    description: 'Company address',
    type: AddressDto,
  })
  address: AddressDto;
}
```

#### Arrays

```typescript
export class CreateEventDto {
  @ApiProperty({ example: 'Tech Conference 2025' })
  title: string;

  @ApiProperty({
    description: 'List of speaker names',
    type: [String],
    example: ['John Doe', 'Jane Smith'],
  })
  speakers: string[];

  @ApiProperty({
    description: 'List of tag IDs',
    type: [String],
    example: ['clp123', 'clp456'],
  })
  tagIds: string[];
}
```

### File Upload Documentation

```typescript
import { ApiFileUpload } from './common/decorators/swagger.decorator';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Post('upload')
@ApiFileUpload({
  fieldName: 'image',
  description: 'Upload user avatar',
  maxSize: 5,
  fileTypes: ['image/jpeg', 'image/png', 'image/webp'],
})
@UseInterceptors(FileInterceptor('image'))
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  return this.uploadService.uploadAvatar(file, userId);
}
```

---

## Custom Decorators

We provide several custom decorators to simplify documentation:

### Response Decorators

```typescript
import {
  ApiResponseSuccess,
  ApiResponseCreated,
  ApiResponseNoContent,
  ApiResponseBadRequest,
  ApiResponseUnauthorized,
  ApiResponseForbidden,
  ApiResponseNotFound,
  ApiResponseConflict,
  ApiResponseTooManyRequests,
} from './common/decorators/swagger.decorator';

@Get()
@ApiResponseSuccess({
  description: 'List retrieved successfully',
  type: User,
  isArray: true,
})
findAll() {}

@Post()
@ApiResponseCreated({
  description: 'Resource created',
  type: User,
})
@ApiResponseBadRequest('Invalid input')
@ApiResponseConflict('Already exists')
create() {}

@Delete(':id')
@ApiResponseNoContent('Deleted successfully')
@ApiResponseNotFound('Resource not found')
remove() {}
```

### Paginated Response

```typescript
import { ApiPaginatedResponse } from './common/decorators/swagger.decorator';

@Get()
@ApiPaginatedResponse(
  UserDto,
  'Users retrieved successfully'
)
findAll(@Query() pagination: PaginationDto) {}
```

### CRUD Operations

```typescript
import { ApiCrudOperation } from './common/decorators/swagger.decorator';

// Auto-generates all standard documentation
@Get(':id')
@ApiCrudOperation({
  operation: 'read',
  resourceName: 'User',
  responseType: UserDto,
})
findOne(@Param('id') id: string) {}
```

---

## Examples

### Complete Controller Example

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiCrudOperation, ApiPaginatedResponse } from './common/decorators/swagger.decorator';
import { PaginationDto } from './common/dto/pagination.dto';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, UpdateDiscountDto, DiscountDto } from './dto';

@ApiTags('Discounts')
@ApiBearerAuth('JWT-auth')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @ApiCrudOperation({
    operation: 'readAll',
    resourceName: 'Discount',
    responseType: DiscountDto,
    isPaginated: true,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.discountsService.findAll(pagination);
  }

  @Get(':id')
  @ApiCrudOperation({
    operation: 'read',
    resourceName: 'Discount',
    responseType: DiscountDto,
  })
  findOne(@Param('id') id: string) {
    return this.discountsService.findOne(id);
  }

  @Post()
  @ApiCrudOperation({
    operation: 'create',
    resourceName: 'Discount',
    bodyType: CreateDiscountDto,
    responseType: DiscountDto,
  })
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.create(createDiscountDto);
  }

  @Put(':id')
  @ApiCrudOperation({
    operation: 'update',
    resourceName: 'Discount',
    bodyType: UpdateDiscountDto,
    responseType: DiscountDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @ApiCrudOperation({
    operation: 'delete',
    resourceName: 'Discount',
  })
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }
}
```

---

## Error Responses

All endpoints return standard error responses:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password is too short"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

### 429 Too Many Requests

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Rate Limiting

**Default Limits:**
- **10 requests per minute** per IP address
- Applies to all endpoints

**Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1699564800
```

**Exceeding Limits:**
- Returns **429 Too Many Requests**
- Wait until reset time or contact support for higher limits

---

## OpenAPI Specification

### Download OpenAPI JSON

```
http://localhost:3000/api-json
```

### Use in Postman

1. Import → Link
2. Enter: `http://localhost:3000/api-json`
3. Click Import

### Use in Insomnia

1. Create → Import URL
2. Enter: `http://localhost:3000/api-json`
3. Click Fetch and Import

---

## Tips & Tricks

### 1. Use the Filter

Type in the filter box to find endpoints quickly

### 2. Expand/Collapse All

- Click tag names to expand/collapse sections
- Use browser Find (Ctrl+F) to search

### 3. Copy as cURL

Click "Copy cURL" to get ready-to-use commands

### 4. Test in Different Environments

Use the server dropdown to switch between:
- Local Development
- Staging
- Production

### 5. Save Example Responses

Click "Download" to save example responses

---

## Support

For API documentation issues:

- **Email**: support@talabahub.com
- **GitHub Issues**: https://github.com/sarvarbekyusupov/talabahub/issues
- **Swagger Docs**: http://localhost:3000/api

---

**Last Updated**: November 15, 2025
**API Version**: 2.0.0
