# Frontend Integration Guide - TalabaHub API

Complete guide for frontend developers to integrate with TalabaHub backend APIs.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Universities](#universities)
5. [Discounts](#discounts)
6. [Jobs & Applications](#jobs--applications)
7. [Events](#events)
8. [Courses](#courses)
9. [Reviews](#reviews)
10. [Search](#search)
11. [File Upload](#file-upload)
12. [Payments](#payments)
13. [Error Handling](#error-handling)

---

## Getting Started

### Base URL

```
Development: http://localhost:3000/api
Production: https://api.talabahub.com/api
```

### API Documentation

Interactive API documentation available at:
```
http://localhost:3000/api-docs
```

### Required Headers

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN' // For protected routes
};
```

### Response Format

All successful responses follow this format:

```typescript
{
  "data": any,           // The actual response data
  "meta"?: {             // Optional metadata (for pagination)
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}
```

### Error Response Format

```typescript
{
  "statusCode": number,
  "message": string | string[],
  "error": string,
  "timestamp": string,
  "path": string
}
```

---

## Authentication

### 1. Register New User

**Endpoint:** `POST /auth/register`

**Request Body:**
```typescript
interface RegisterDto {
  email: string;                    // Required, valid email
  password: string;                 // Required, min 8 chars, must be strong
  firstName: string;                // Required, Uzbek name format
  lastName: string;                 // Required, Uzbek name format
  middleName?: string;              // Optional, Uzbek name format
  phone?: string;                   // Optional, format: +998XXXXXXXXX
  dateOfBirth?: string;             // Optional, ISO date, must be past, age 16-100
  gender?: string;                  // Optional
  universityId?: number;            // Optional
  studentIdNumber?: string;         // Optional, format: SXXXXXXXX
  faculty?: string;                 // Optional
  courseYear?: number;              // Optional
  graduationYear?: number;          // Optional
  role?: 'student' | 'admin' | 'partner'; // Optional, default: 'student'
  referredByCode?: string;          // Optional, referral code
}
```

**Example:**
```javascript
const register = async (userData) => {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'ali.karimov@student.uz',
      password: 'SecurePass123!',
      firstName: 'Ali',
      lastName: 'Karimov',
      phone: '+998901234567',
      dateOfBirth: '2000-01-15',
      universityId: 1,
      studentIdNumber: 'S12345678'
    }),
  });

  const data = await response.json();
  return data;
};
```

**Success Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "ali.karimov@student.uz",
    "firstName": "Ali",
    "lastName": "Karimov",
    "role": "student"
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

### 2. Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```typescript
interface LoginDto {
  email: string;
  password: string;
}
```

**Example:**
```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
};
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "ali.karimov@student.uz",
    "firstName": "Ali",
    "lastName": "Karimov",
    "role": "student"
  }
}
```

### 3. Verify Email

**Endpoint:** `POST /auth/verify-email`

**Request Body:**
```typescript
interface VerifyEmailDto {
  token: string; // Token from email link
}
```

**Example:**
```javascript
// Extract token from URL query params
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const verifyEmail = async (token) => {
  const response = await fetch('http://localhost:3000/api/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  return await response.json();
};
```

### 4. Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```typescript
interface ForgotPasswordDto {
  email: string;
}
```

**Example:**
```javascript
const forgotPassword = async (email) => {
  const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return await response.json();
};
```

### 5. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```typescript
interface ResetPasswordDto {
  token: string;        // From email link
  newPassword: string;  // Must be strong password
}
```

### 6. Change Password (Authenticated)

**Endpoint:** `POST /auth/change-password`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;  // Must be strong password
}
```

**Example:**
```javascript
const changePassword = async (currentPassword, newPassword) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return await response.json();
};
```

### 7. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```typescript
interface RefreshDto {
  refreshToken: string;
}
```

**Example:**
```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  // Update access token
  localStorage.setItem('accessToken', data.accessToken);

  return data;
};
```

### 8. Logout

**Endpoint:** `POST /auth/logout`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Example:**
```javascript
const logout = async () => {
  const token = localStorage.getItem('accessToken');

  await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
```

---

## User Management

### 1. Get Current User Profile

**Endpoint:** `GET /users/profile`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Example:**
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/users/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

**Success Response (200):**
```json
{
  "id": "user_123",
  "email": "ali.karimov@student.uz",
  "firstName": "Ali",
  "lastName": "Karimov",
  "middleName": null,
  "phone": "+998901234567",
  "dateOfBirth": "2000-01-15",
  "gender": "male",
  "role": "student",
  "isEmailVerified": true,
  "university": {
    "id": 1,
    "nameUz": "Toshkent Davlat Universiteti"
  },
  "studentIdNumber": "S12345678",
  "faculty": "Computer Science",
  "courseYear": 3,
  "graduationYear": 2025,
  "avatarUrl": "https://res.cloudinary.com/...",
  "referralCode": "ALI_KAR_123",
  "createdAt": "2024-11-15T10:00:00Z"
}
```

### 2. Update Profile

**Endpoint:** `PATCH /users/profile`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface UpdateProfileDto {
  firstName?: string;      // Uzbek name format
  lastName?: string;       // Uzbek name format
  middleName?: string;     // Uzbek name format
  phone?: string;          // +998XXXXXXXXX format
  dateOfBirth?: string;    // ISO date
  gender?: string;
  faculty?: string;
  courseYear?: number;
  graduationYear?: number;
}
```

**Example:**
```javascript
const updateProfile = async (updates) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/users/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  return await response.json();
};

// Usage
await updateProfile({
  firstName: 'Aziz',
  phone: '+998991234567',
  courseYear: 4
});
```

### 3. Get All Users (Admin Only)

**Endpoint:** `GET /users?page=1&limit=20&role=student`

**Headers:** Requires `Authorization: Bearer {accessToken}` (admin role)

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20
- `role` (optional): Filter by role (student, admin, partner)

**Example:**
```javascript
const getAllUsers = async (page = 1, limit = 20, role = null) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (role) params.append('role', role);

  const response = await fetch(`http://localhost:3000/api/users?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "user_123",
      "email": "ali.karimov@student.uz",
      "firstName": "Ali",
      "lastName": "Karimov",
      "role": "student"
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

---

## Universities

### 1. Get All Universities

**Endpoint:** `GET /universities?page=1&limit=20`

**Public Endpoint** (no authentication required)

**Example:**
```javascript
const getUniversities = async (page = 1, limit = 20) => {
  const response = await fetch(
    `http://localhost:3000/api/universities?page=${page}&limit=${limit}`
  );

  return await response.json();
};
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "nameUz": "Toshkent Davlat Universiteti",
      "nameEn": "National University of Uzbekistan",
      "logoUrl": "https://...",
      "website": "https://nuu.uz",
      "city": "Tashkent",
      "region": "Tashkent Region"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 2. Get University by ID

**Endpoint:** `GET /universities/:id`

**Public Endpoint**

**Example:**
```javascript
const getUniversityById = async (id) => {
  const response = await fetch(`http://localhost:3000/api/universities/${id}`);
  return await response.json();
};
```

---

## Discounts

### 1. Get All Discounts

**Endpoint:** `GET /discounts?page=1&limit=20&categoryId=1&brandId=2&minDiscount=10`

**Public Endpoint**

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `categoryId` (optional): Filter by category
- `brandId` (optional): Filter by brand
- `minDiscount` (optional): Minimum discount percentage

**Example:**
```javascript
const getDiscounts = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
  });

  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.minDiscount) params.append('minDiscount', filters.minDiscount);

  const response = await fetch(
    `http://localhost:3000/api/discounts?${params}`
  );

  return await response.json();
};

// Usage
const discounts = await getDiscounts({
  page: 1,
  limit: 10,
  categoryId: 1,
  minDiscount: 20
});
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "disc_123",
      "title": "50% Off for Students",
      "description": "Get 50% off on all items",
      "discount": 50,
      "discountType": "percentage",
      "promoCode": "STUDENT50",
      "validFrom": "2024-11-01T00:00:00Z",
      "validUntil": "2024-12-31T23:59:59Z",
      "usageLimit": 100,
      "usageCount": 45,
      "imageUrl": "https://...",
      "brand": {
        "id": 1,
        "name": "TechStore",
        "logoUrl": "https://..."
      },
      "category": {
        "id": 1,
        "nameUz": "Elektronika"
      },
      "isActive": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### 2. Get Discount by ID

**Endpoint:** `GET /discounts/:id`

**Public Endpoint**

**Example:**
```javascript
const getDiscountById = async (id) => {
  const response = await fetch(`http://localhost:3000/api/discounts/${id}`);
  return await response.json();
};
```

### 3. Increment Discount View Count

**Endpoint:** `POST /discounts/:id/view`

**Public Endpoint**

**Example:**
```javascript
const incrementDiscountView = async (discountId) => {
  await fetch(`http://localhost:3000/api/discounts/${discountId}/view`, {
    method: 'POST',
  });
};
```

---

## Jobs & Applications

### 1. Get All Jobs

**Endpoint:** `GET /jobs?page=1&limit=20&companyId=1&jobType=full_time`

**Public Endpoint**

**Query Parameters:**
- `page`, `limit`: Pagination
- `companyId` (optional): Filter by company
- `jobType` (optional): full_time, part_time, internship, contract

**Example:**
```javascript
const getJobs = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
  });

  if (filters.companyId) params.append('companyId', filters.companyId);
  if (filters.jobType) params.append('jobType', filters.jobType);

  const response = await fetch(`http://localhost:3000/api/jobs?${params}`);
  return await response.json();
};
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "job_123",
      "title": "Junior Frontend Developer",
      "description": "We are looking for...",
      "requirements": "- 1+ years experience\n- React knowledge",
      "responsibilities": "- Build web applications",
      "jobType": "full_time",
      "salary": "5000000-8000000",
      "location": "Tashkent",
      "applicationDeadline": "2024-12-31T23:59:59Z",
      "company": {
        "id": 1,
        "name": "Tech Solutions",
        "logoUrl": "https://..."
      },
      "isActive": true,
      "createdAt": "2024-11-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 2. Apply for Job

**Endpoint:** `POST /jobs/:id/apply`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface CreateJobApplicationDto {
  cvUrl: string;          // URL to uploaded CV
  coverLetter?: string;   // Optional cover letter
}
```

**Example:**
```javascript
const applyForJob = async (jobId, applicationData) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(applicationData),
  });

  return await response.json();
};

// Usage
await applyForJob('job_123', {
  cvUrl: 'https://cloudinary.com/my-cv.pdf',
  coverLetter: 'I am very interested in this position...'
});
```

### 3. Get My Applications

**Endpoint:** `GET /jobs/applications/my?page=1&limit=20&status=pending`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Query Parameters:**
- `status` (optional): pending, reviewing, shortlisted, rejected, accepted

**Example:**
```javascript
const getMyApplications = async (status = null) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams({ page: '1', limit: '20' });

  if (status) params.append('status', status);

  const response = await fetch(
    `http://localhost:3000/api/jobs/applications/my?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return await response.json();
};
```

---

## Events

### 1. Get All Events

**Endpoint:** `GET /events?page=1&limit=20&eventType=workshop&upcoming=true`

**Public Endpoint**

**Query Parameters:**
- `eventType` (optional): workshop, conference, seminar, webinar
- `upcoming` (optional): true/false - filter upcoming events

**Example:**
```javascript
const getEvents = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
  });

  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.upcoming !== undefined) params.append('upcoming', filters.upcoming);

  const response = await fetch(`http://localhost:3000/api/events?${params}`);
  return await response.json();
};
```

### 2. Register for Event

**Endpoint:** `POST /events/:id/register`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Example:**
```javascript
const registerForEvent = async (eventId) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/events/${eventId}/register`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return await response.json();
};
```

### 3. Get My Event Registrations

**Endpoint:** `GET /events/registrations/my`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Example:**
```javascript
const getMyEventRegistrations = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    'http://localhost:3000/api/events/registrations/my',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return await response.json();
};
```

---

## Courses

### 1. Get All Courses

**Endpoint:** `GET /courses?page=1&limit=20&partnerId=1&minPrice=0&maxPrice=1000000`

**Public Endpoint**

**Example:**
```javascript
const getCourses = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
  });

  if (filters.partnerId) params.append('partnerId', filters.partnerId);
  if (filters.minPrice) params.append('minPrice', filters.minPrice);
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

  const response = await fetch(`http://localhost:3000/api/courses?${params}`);
  return await response.json();
};
```

### 2. Enroll in Course

**Endpoint:** `POST /courses/:id/enroll`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Example:**
```javascript
const enrollInCourse = async (courseId) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/courses/${courseId}/enroll`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return await response.json();
};
```

### 3. Update Course Progress

**Endpoint:** `PATCH /courses/enrollments/:id/progress`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface UpdateProgressDto {
  progress: number; // 0-100
}
```

**Example:**
```javascript
const updateCourseProgress = async (enrollmentId, progress) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/courses/enrollments/${enrollmentId}/progress`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ progress }),
    }
  );

  return await response.json();
};
```

---

## Reviews

### 1. Create Review

**Endpoint:** `POST /reviews`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface CreateReviewDto {
  entityType: 'course' | 'company' | 'event';
  entityId: string;
  rating: number;        // 1-5
  comment?: string;
}
```

**Example:**
```javascript
const createReview = async (reviewData) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(reviewData),
  });

  return await response.json();
};

// Usage
await createReview({
  entityType: 'course',
  entityId: 'course_123',
  rating: 5,
  comment: 'Excellent course!'
});
```

### 2. Get Reviews for Entity

**Endpoint:** `GET /reviews?entityType=course&entityId=course_123&page=1&limit=20`

**Public Endpoint**

**Example:**
```javascript
const getReviews = async (entityType, entityId, page = 1) => {
  const params = new URLSearchParams({
    entityType,
    entityId,
    page: page.toString(),
    limit: '20',
  });

  const response = await fetch(`http://localhost:3000/api/reviews?${params}`);
  return await response.json();
};
```

---

## Search

### 1. Global Search

**Endpoint:** `GET /search?query=student&limit=20`

**Public Endpoint**

**Query Parameters:**
- `query` (required): Search keywords
- `limit` (optional): Results per entity type

**Example:**
```javascript
const globalSearch = async (query, limit = 20) => {
  const params = new URLSearchParams({ query, limit: limit.toString() });

  const response = await fetch(`http://localhost:3000/api/search?${params}`);
  return await response.json();
};
```

**Success Response (200):**
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

### 2. Search Specific Entity

**Endpoint:** `GET /search/discounts?query=food&categoryId=1&page=1&limit=20`

**Public Endpoint**

Available entity endpoints:
- `/search/discounts`
- `/search/jobs`
- `/search/events`
- `/search/brands`
- `/search/companies`
- `/search/courses`

**Example:**
```javascript
const searchDiscounts = async (query, filters = {}) => {
  const params = new URLSearchParams({
    query,
    page: filters.page || 1,
    limit: filters.limit || 20,
  });

  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.minDiscount) params.append('minDiscount', filters.minDiscount);

  const response = await fetch(
    `http://localhost:3000/api/search/discounts?${params}`
  );

  return await response.json();
};
```

### 3. Search Suggestions (Autocomplete)

**Endpoint:** `GET /search/suggestions?query=prog&limit=5`

**Public Endpoint**

**Example:**
```javascript
const getSearchSuggestions = async (query, limit = 5) => {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
  });

  const response = await fetch(
    `http://localhost:3000/api/search/suggestions?${params}`
  );

  return await response.json();
};

// Usage with debounce for autocomplete
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  if (query.length < 2) return;

  const suggestions = await getSearchSuggestions(query);
  displaySuggestions(suggestions);
}, 300);

// On input change
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

---

## File Upload

### 1. Upload Image

**Endpoint:** `POST /upload/image`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request:** `multipart/form-data`

**Example:**
```javascript
const uploadImage = async (file) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.url; // Returns Cloudinary URL
};

// Usage with file input
const fileInput = document.getElementById('imageUpload');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];

  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  const imageUrl = await uploadImage(file);
  console.log('Uploaded image URL:', imageUrl);
});
```

### 2. Upload Document

**Endpoint:** `POST /upload/document`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Accepts:** PDF, DOC, DOCX (max 10MB)

**Example:**
```javascript
const uploadDocument = async (file) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/upload/document', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.url;
};
```

### 3. Upload Avatar

**Endpoint:** `POST /upload/avatar`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Auto-processing:** Resized to 400x400, face detection enabled

**Example:**
```javascript
const uploadAvatar = async (file) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/upload/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.url;
};
```

---

## Payments

### 1. Create Payment (Click.uz)

**Endpoint:** `POST /payment/click/prepare`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
interface CreatePaymentDto {
  amount: number;        // Amount in sum
  type: 'course' | 'event' | 'subscription';
  entityId: string;      // ID of course/event/subscription
}
```

**Example:**
```javascript
const createClickPayment = async (paymentData) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/payment/click/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(paymentData),
  });

  const data = await response.json();

  // Redirect to payment URL
  window.location.href = data.paymentUrl;
};

// Usage
await createClickPayment({
  amount: 500000,
  type: 'course',
  entityId: 'course_123'
});
```

### 2. Create Payment (Payme)

**Endpoint:** `POST /payment/payme/create`

**Headers:** Requires `Authorization: Bearer {accessToken}`

**Same request body as Click.uz**

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Data retrieved successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Error Response Handling

```javascript
const handleApiError = (error) => {
  if (error.statusCode === 401) {
    // Token expired, try to refresh
    return refreshAccessToken();
  } else if (error.statusCode === 403) {
    // Insufficient permissions
    alert('You do not have permission to perform this action');
  } else if (error.statusCode === 400) {
    // Validation error
    if (Array.isArray(error.message)) {
      error.message.forEach(msg => console.error(msg));
    } else {
      console.error(error.message);
    }
  } else if (error.statusCode === 429) {
    // Rate limit
    alert('Too many requests. Please try again later.');
  }
};

// Usage
try {
  const response = await fetch('http://localhost:3000/api/users/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    handleApiError(error);
    throw error;
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
}
```

### Validation Error Format

```json
{
  "statusCode": 400,
  "message": [
    "password must be stronger (min 8 chars, uppercase, lowercase, number, special char)",
    "phone must match Uzbek phone format (+998XXXXXXXXX)"
  ],
  "error": "Bad Request"
}
```

---

## Best Practices

### 1. Token Management

```javascript
// Axios interceptor for auto token refresh
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          'http://localhost:3000/api/auth/refresh',
          { refreshToken }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 2. Rate Limiting

The API has rate limiting enabled (10 requests per 60 seconds by default). Implement retry logic:

```javascript
const fetchWithRetry = async (url, options, retries = 3) => {
  try {
    const response = await fetch(url, options);

    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};
```

### 3. Pagination Helper

```javascript
const usePagination = (fetchFunction) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (page >= totalPages || loading) return;

    setLoading(true);
    try {
      const response = await fetchFunction(page + 1);
      setData([...data, ...response.data]);
      setPage(response.meta.page);
      setTotalPages(response.meta.totalPages);
    } finally {
      setLoading(false);
    }
  };

  return { data, loadMore, hasMore: page < totalPages, loading };
};

// Usage
const { data: discounts, loadMore, hasMore } = usePagination(
  (page) => getDiscounts({ page, limit: 20 })
);
```

---

## Support

For questions or issues:
- **API Documentation**: http://localhost:3000/api-docs
- **Email**: support@talabahub.com
- **GitHub Issues**: https://github.com/sarvarbekyusupov/talabahub/issues

---

## License

MIT License - see LICENSE file for details
