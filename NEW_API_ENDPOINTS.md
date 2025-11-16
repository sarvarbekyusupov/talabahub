# New API Endpoints Documentation

## Overview
This document describes all the new backend API endpoints added to support partner edit forms, advanced filtering, saved searches, notifications, and analytics.

---

## 1. Jobs - Advanced Filtering

### Enhanced Endpoint
**GET** `/api/jobs`

**New Query Parameters:**
- `minSalary` (number) - Filter jobs by minimum salary
- `maxSalary` (number) - Filter jobs by maximum salary

**Example:**
```
GET /api/jobs?minSalary=5000000&maxSalary=10000000&location=Tashkent&isRemote=true
```

**Existing Parameters:**
- `page`, `limit`, `companyId`, `jobType`, `location`, `isRemote`, `minCourseYear`, `isFeatured`

---

## 2. Saved Searches

Save and manage user filter preferences for quick access to frequently used searches.

### Create Saved Search
**POST** `/api/saved-searches`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Request Body:**
```json
{
  "name": "High Paying Tech Jobs",
  "type": "job",
  "filters": {
    "minSalary": 5000000,
    "maxSalary": 10000000,
    "location": "Tashkent",
    "jobType": "full_time",
    "isRemote": true
  }
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "High Paying Tech Jobs",
  "type": "job",
  "filters": {...},
  "isActive": true,
  "lastUsedAt": null,
  "createdAt": "2024-11-16T...",
  "updatedAt": "2024-11-16T..."
}
```

---

### Get User's Saved Searches
**GET** `/api/saved-searches`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Query Parameters:**
- `type` (optional) - Filter by search type: job, event, course, discount

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "name": "High Paying Tech Jobs",
    "type": "job",
    "filters": {...},
    "lastUsedAt": "2024-11-16T...",
    "createdAt": "2024-11-16T..."
  }
]
```

---

### Get Saved Search by ID
**GET** `/api/saved-searches/:id`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK
- Returns saved search details
- Updates `lastUsedAt` timestamp

---

### Update Saved Search
**PATCH** `/api/saved-searches/:id`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Request Body:**
```json
{
  "name": "Updated Search Name",
  "filters": {...}
}
```

**Response:** 200 OK

---

### Delete Saved Search
**DELETE** `/api/saved-searches/:id`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK

---

## 3. Notifications

Manage in-app notifications with email delivery support.

### Get All Notifications
**GET** `/api/notifications`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "in_app",
      "title": "New Job Matching Your Criteria",
      "message": "A new job 'Senior Developer' has been posted...",
      "data": {
        "jobId": "uuid",
        "category": "job_alert"
      },
      "status": "sent",
      "sentAt": "2024-11-16T...",
      "readAt": null,
      "actionUrl": "/jobs/uuid",
      "actionLabel": "View Job",
      "createdAt": "2024-11-16T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

### Get Unread Notifications
**GET** `/api/notifications/unread`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "title": "Application Status Update",
    "message": "Your application has been reviewed",
    "readAt": null,
    ...
  }
]
```

---

### Mark Notification as Read
**PATCH** `/api/notifications/:id/read`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK

---

### Mark All Notifications as Read
**POST** `/api/notifications/mark-all-read`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK
```json
{
  "message": "All notifications marked as read"
}
```

---

### Delete Notification
**DELETE** `/api/notifications/:id`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:** 200 OK

---

## 4. Analytics

Comprehensive analytics endpoints for partners and administrators.

### Partner Dashboard
**GET** `/api/analytics/partner/dashboard`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- Role: `partner`

**Response:** 200 OK
```json
{
  "jobs": {
    "total": 15,
    "active": 12,
    "totalViews": 5420,
    "totalApplications": 234
  },
  "courses": {
    "total": 8,
    "active": 6,
    "totalEnrollments": 156
  },
  "recentApplications": [...],
  "recentEnrollments": [...]
}
```

---

### Admin Dashboard
**GET** `/api/analytics/admin/dashboard`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- Role: `admin`

**Response:** 200 OK
```json
{
  "overview": {
    "totalUsers": 15420,
    "totalJobs": 1234,
    "totalCourses": 567,
    "totalEvents": 89,
    "totalDiscounts": 234,
    "activeUsers": 12340,
    "verifiedUsers": 9876,
    "pendingVerifications": 123
  },
  "growth": {
    "newUsersLast30Days": 456,
    "newJobsLast30Days": 78
  },
  "recentActivity": {
    "users": [...],
    "jobs": [...]
  }
}
```

---

### System Health Metrics
**GET** `/api/analytics/system/health`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- Role: `admin`

**Response:** 200 OK
```json
{
  "notifications": {
    "total": 45678,
    "pending": 23,
    "failed": 5
  },
  "transactions": {
    "total": 12345,
    "pending": 12,
    "completed": 12300
  },
  "database": {
    "recordCounts": {
      "users": 15420,
      "jobs": 1234,
      "courses": 567,
      "events": 89,
      "discounts": 234,
      "applications": 5678,
      "enrollments": 2345,
      "eventRegistrations": 1234
    }
  }
}
```

---

### Job Analytics
**GET** `/api/analytics/jobs`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- Role: `admin` or `partner`

**Query Parameters:**
- `startDate` (ISO 8601, optional)
- `endDate` (ISO 8601, optional)

**Example:**
```
GET /api/analytics/jobs?startDate=2024-01-01&endDate=2024-12-31
```

**Response:** 200 OK
```json
{
  "total": 1234,
  "active": 456,
  "byType": [
    {
      "jobType": "full_time",
      "_count": 789
    },
    {
      "jobType": "internship",
      "_count": 234
    }
  ],
  "topCompanies": [...]
}
```

---

### Event Analytics
**GET** `/api/analytics/events`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- Role: `admin` or `partner`

**Query Parameters:**
- `startDate` (ISO 8601, optional)
- `endDate` (ISO 8601, optional)

**Response:** 200 OK
```json
{
  "total": 89,
  "upcoming": 34,
  "past": 55,
  "byType": [
    {
      "eventType": "workshop",
      "_count": 45,
      "_sum": {
        "currentParticipants": 890
      }
    }
  ]
}
```

---

## Already Existing Endpoints

These endpoints were already implemented and are working:

### Partner Edit Forms
- **PATCH** `/api/discounts/:id` - Update discount (Admin only)
- **PATCH** `/api/jobs/:id` - Update job (Admin/Partner)
- **PATCH** `/api/courses/:id` - Update course (Admin/Partner)

### Image Upload
- **POST** `/api/upload/image` - Upload image file
- **POST** `/api/upload/avatar` - Upload user avatar
- **POST** `/api/upload/document` - Upload document (CV, etc.)
- **POST** `/api/upload/logo` - Upload logo
- **POST** `/api/upload/banner` - Upload banner image

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {your-jwt-token}
```

Get a token by logging in:
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Error Responses

All endpoints follow standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Database Migration

Before using the saved searches feature, run the migration:

```bash
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

---

## Notes

1. **Notification Types**: The system supports 4 notification types from Prisma schema:
   - `email` - Email notifications
   - `sms` - SMS notifications
   - `push` - Push notifications
   - `in_app` - In-app notifications

   The `data` field contains additional context like `category` (job_alert, job_application_status, etc.)

2. **Saved Search Types**: Supports saving filters for:
   - `job` - Job searches
   - `event` - Event searches
   - `course` - Course searches
   - `discount` - Discount searches

3. **Email Integration**: Notifications automatically send emails if the user has email notifications enabled in their preferences.

4. **Analytics Access**:
   - Partners can only see their own analytics
   - Admins can see system-wide analytics
