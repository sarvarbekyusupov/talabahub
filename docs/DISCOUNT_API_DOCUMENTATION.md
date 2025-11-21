# Discount System API Documentation

## Overview

The TalabaHub Discount System provides a comprehensive API for managing student discounts. This documentation covers all endpoints, their business logic, authentication requirements, and usage examples for frontend integration.

## Base URL

```
/api/discounts
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### User Roles

| Role | Description |
|------|-------------|
| `student` | Regular users who can claim and use discounts |
| `partner` | Business owners who create and manage discounts |
| `admin` | Platform administrators with full access |

---

## Endpoints by Category

### 1. Public Endpoints (No Authentication Required)

#### GET `/discounts` - List All Discounts

**Business Logic:**
- Returns paginated list of active, approved discounts
- Supports filtering by brand, category, university, active status, and featured status
- Useful for browse/discovery pages

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `brandId` | number | - | Filter by brand |
| `categoryId` | number | - | Filter by category |
| `universityId` | number | - | Filter by university eligibility |
| `isActive` | boolean | - | Filter active/inactive |
| `isFeatured` | boolean | - | Show only featured |

**Frontend Usage:**
```typescript
// Fetch discounts for home page
const response = await fetch('/api/discounts?page=1&limit=10&isFeatured=true');
const { data, meta } = await response.json();

// Filter by university
const uniDiscounts = await fetch('/api/discounts?universityId=5');
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "20% off Pizza",
      "description": "Student discount at Dominos",
      "discountType": "percentage",
      "discountValue": 20,
      "brand": { "id": 1, "name": "Dominos", "logo": "..." },
      "category": { "id": 3, "name": "Food" },
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "isActive": true,
      "isFeatured": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

#### GET `/discounts/:id` - Get Discount Details

**Business Logic:**
- Returns full discount details including brand and category info
- Increments view count (for analytics)

**Frontend Usage:**
```typescript
const discount = await fetch(`/api/discounts/${discountId}`);
```

---

#### POST `/discounts/:id/view` - Record View

**Business Logic:**
- Increments view count for analytics
- Call when user opens discount detail page

**Frontend Usage:**
```typescript
// Track when user views discount detail
await fetch(`/api/discounts/${discountId}/view`, { method: 'POST' });
```

---

#### POST `/discounts/:id/click` - Record Click

**Business Logic:**
- Increments click count for analytics
- Call when user clicks external link or CTA

**Frontend Usage:**
```typescript
// Track when user clicks "Visit Store" or similar
await fetch(`/api/discounts/${discountId}/click`, { method: 'POST' });
```

---

### 2. Student Endpoints (Authenticated Users)

#### GET `/discounts/:id/can-use` - Check if User Can Use Discount

**Business Logic:**
- Checks if current user has remaining uses for this discount
- Returns `canUse: true/false`

**Frontend Usage:**
```typescript
const { canUse } = await authFetch(`/api/discounts/${discountId}/can-use`);
if (!canUse) {
  showMessage('You have already used this discount');
}
```

---

#### GET `/discounts/:id/eligibility` - Check Full Eligibility

**Business Logic:**
- Comprehensive eligibility check including:
  - Time restrictions (active hours, days of week)
  - Location restrictions (if GPS provided)
  - University restrictions
  - Course year requirements
  - Usage limits (daily, weekly, monthly)
  - Global usage cap
- Returns detailed reason if ineligible

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User's latitude |
| `lng` | number | User's longitude |

**Frontend Usage:**
```typescript
// Get user location first
navigator.geolocation.getCurrentPosition(async (pos) => {
  const result = await authFetch(
    `/api/discounts/${discountId}/eligibility?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
  );

  if (!result.canClaim) {
    showError(result.reason);
    // e.g., "You have reached daily limit", "Discount not available at your location"
  }
});
```

**Response:**
```json
{
  "canClaim": false,
  "reason": "Discount is only active between 12:00 and 14:00"
}
```

---

#### POST `/discounts/:id/claim` - Claim a Discount

**Business Logic:**
- Creates a claim record with unique claim code (e.g., `STU-A7F9-2024`)
- Performs fraud detection (multiple accounts, unusual patterns)
- Records IP and device ID for security
- Verifies location if required
- Sets claim expiry time

**Request Body:**
```json
{
  "deviceId": "optional-device-uuid",
  "latitude": 41.2995,
  "longitude": 69.2401
}
```

**Frontend Usage:**
```typescript
const claim = await authFetch(`/api/discounts/${discountId}/claim`, {
  method: 'POST',
  body: JSON.stringify({
    deviceId: getDeviceId(),
    latitude: userLocation.lat,
    longitude: userLocation.lng
  })
});

// Show claim code to user
showModal({
  title: 'Discount Claimed!',
  code: claim.claimCode, // "STU-A7F9-2024"
  expiresAt: claim.expiresAt,
  qrCode: generateQR(claim.claimCode)
});
```

**Response:**
```json
{
  "id": "claim-uuid",
  "claimCode": "STU-A7F9-2024",
  "status": "claimed",
  "expiresAt": "2024-06-15T14:00:00Z",
  "discount": {
    "id": "discount-uuid",
    "title": "20% off Pizza",
    "brand": { "name": "Dominos" }
  }
}
```

---

#### GET `/discounts/my-claims` - Get User's Claims

**Business Logic:**
- Returns paginated list of user's discount claims
- Can filter by status: `claimed`, `redeemed`, `expired`, `cancelled`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by claim status |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Frontend Usage:**
```typescript
// Show active claims
const activeClaims = await authFetch('/api/discounts/my-claims?status=claimed');

// Show all claims
const allClaims = await authFetch('/api/discounts/my-claims?page=1&limit=20');
```

---

#### POST `/discounts/:id/use` - Record Direct Usage

**Business Logic:**
- Records discount usage without claim process
- Updates usage count and analytics
- Calculates actual savings

**Request Body:**
```json
{
  "transactionAmount": 150000
}
```

**Frontend Usage:**
```typescript
// For discounts that don't require claiming
const result = await authFetch(`/api/discounts/${discountId}/use`, {
  method: 'POST',
  body: JSON.stringify({ transactionAmount: 150000 })
});
```

---

#### GET `/discounts/recommended` - Get Personalized Recommendations

**Business Logic:**
- Uses scoring algorithm based on:
  - User's university match (30 points)
  - Location proximity (up to 25 points)
  - Featured status (15 points)
  - Urgency (ending soon: 10 points)
  - Recent activity (10 points)
  - Popularity (up to 10 points)
- Returns top discounts sorted by score

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User's latitude |
| `lng` | number | User's longitude |
| `limit` | number | Number of recommendations (default 10) |

**Frontend Usage:**
```typescript
// Get recommendations for home page
const recommendations = await authFetch(
  `/api/discounts/recommended?lat=${lat}&lng=${lng}&limit=5`
);
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Free Coffee",
    "score": 85,
    "reasons": ["Near you", "Popular", "Ends soon"]
  }
]
```

---

#### GET `/discounts/analytics/my-savings` - Get User Savings

**Business Logic:**
- Calculates total savings from all redeemed discounts
- Shows breakdown by category/brand
- Tracks savings over time

**Frontend Usage:**
```typescript
const savings = await authFetch('/api/discounts/analytics/my-savings');

// Display in profile
showSavings({
  total: savings.totalSaved,
  thisMonth: savings.thisMonth,
  discountsUsed: savings.claimCount
});
```

**Response:**
```json
{
  "totalSaved": 450000,
  "thisMonth": 75000,
  "claimCount": 12,
  "topCategories": [
    { "name": "Food", "saved": 200000 },
    { "name": "Entertainment", "saved": 150000 }
  ]
}
```

---

### 3. Partner Endpoints (Partner Role Required)

#### GET `/discounts/partner/my-discounts` - Get Partner's Discounts

**Business Logic:**
- Returns all discounts created by partner's brand
- Shows approval status, usage stats

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | number | Yes | Partner's brand ID |
| `page` | number | No | Page number |
| `limit` | number | No | Items per page |

**Frontend Usage:**
```typescript
const myDiscounts = await partnerFetch(
  `/api/discounts/partner/my-discounts?brandId=${brandId}`
);
```

---

#### GET `/discounts/partner/pending-verifications` - Get Claims to Verify

**Business Logic:**
- Returns claims waiting for partner verification
- Partner must verify before student gets discount

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | number | Yes | Partner's brand ID |
| `page` | number | No | Page number |
| `limit` | number | No | Items per page |

**Frontend Usage:**
```typescript
// Poll for new verifications
const pending = await partnerFetch(
  `/api/discounts/partner/pending-verifications?brandId=${brandId}`
);

// Display list for scanning/verifying
pending.data.forEach(claim => {
  addToVerificationQueue(claim.claimCode, claim.user.name);
});
```

---

#### POST `/discounts/claims/:code/redeem` - Redeem a Claim

**Business Logic:**
- Partner scans/enters claim code to redeem
- Validates claim is valid and not expired
- Records transaction amount and calculates actual discount
- Updates analytics

**Request Body:**
```json
{
  "transactionAmount": 150000,
  "discountAmount": 30000,
  "verificationNotes": "Valid student ID presented",
  "redeemLat": 41.2995,
  "redeemLng": 69.2401
}
```

**Frontend Usage:**
```typescript
// After scanning QR code or entering claim code
const result = await partnerFetch(`/api/discounts/claims/${claimCode}/redeem`, {
  method: 'POST',
  body: JSON.stringify({
    transactionAmount: orderTotal,
    discountAmount: calculatedDiscount,
    verificationNotes: 'Student showed university ID'
  })
});

if (result.success) {
  showSuccess(`Discount applied! Customer pays: ${result.finalAmount}`);
}
```

---

#### GET `/discounts/partner/analytics` - Get Partner Analytics

**Business Logic:**
- Returns comprehensive analytics for partner's brand
- Includes claim counts, redemption rates, revenue impact
- Supports date range filtering

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brandId` | number | Yes | Partner's brand ID |
| `startDate` | string | No | Start date (ISO format) |
| `endDate` | string | No | End date (ISO format) |

**Frontend Usage:**
```typescript
const analytics = await partnerFetch(
  `/api/discounts/partner/analytics?brandId=${brandId}&startDate=2024-01-01&endDate=2024-01-31`
);

// Display dashboard
renderChart({
  totalClaims: analytics.totalClaims,
  redemptionRate: analytics.redemptionRate,
  totalRevenue: analytics.totalTransactionValue,
  avgDiscount: analytics.avgDiscountAmount
});
```

**Response:**
```json
{
  "totalClaims": 500,
  "totalRedemptions": 420,
  "redemptionRate": 0.84,
  "totalTransactionValue": 63000000,
  "totalDiscountGiven": 12600000,
  "avgTransactionValue": 150000,
  "avgDiscountAmount": 30000,
  "topDiscounts": [
    { "id": "uuid", "title": "20% off", "claims": 200 }
  ]
}
```

---

### 4. Admin Endpoints (Admin Role Required)

#### POST `/discounts` - Create Discount

**Business Logic:**
- Creates new discount (pending approval by default)
- Validates brand and category exist
- Checks promo code uniqueness
- Stores all configuration including time/location restrictions

**Request Body:** See `CreateDiscountDto` for all fields.

**Key Fields:**
```json
{
  "brandId": 1,
  "title": "20% off All Items",
  "discountType": "percentage",
  "discountValue": 20,
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-08-31T23:59:59Z",
  "usageLimitType": "daily",
  "dailyClaimLimit": 2,
  "universityIds": [1, 2, 3],
  "activeTimeStart": "12:00",
  "activeTimeEnd": "14:00",
  "activeDaysOfWeek": [1, 2, 3, 4, 5],
  "requiresLocation": true,
  "locationLat": 41.2995,
  "locationLng": 69.2401,
  "locationRadius": 500
}
```

---

#### GET `/discounts/admin/pending-approvals` - Get Pending Approvals

**Business Logic:**
- Returns discounts waiting for admin approval
- Sorted by creation date

**Frontend Usage:**
```typescript
const pending = await adminFetch('/api/discounts/admin/pending-approvals');
```

---

#### POST `/discounts/:id/approve` - Approve Discount

**Business Logic:**
- Sets discount status to approved
- Records approver and timestamp
- Discount becomes visible to users

**Request Body:**
```json
{
  "notes": "Verified with brand. All terms acceptable."
}
```

**Frontend Usage:**
```typescript
await adminFetch(`/api/discounts/${discountId}/approve`, {
  method: 'POST',
  body: JSON.stringify({ notes: 'Approved after brand verification' })
});
```

---

#### POST `/discounts/:id/reject` - Reject Discount

**Business Logic:**
- Sets discount status to rejected
- Records reason for partner to see

**Request Body:**
```json
{
  "reason": "Discount value exceeds maximum allowed for this category"
}
```

---

#### GET `/discounts/admin/fraud-alerts` - Get Fraud Alerts

**Business Logic:**
- Returns suspicious activity alerts
- Types: multiple_accounts, unusual_pattern, location_mismatch, device_sharing
- Each alert has severity level (1-5)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (pending, investigating, confirmed, dismissed) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Frontend Usage:**
```typescript
const alerts = await adminFetch('/api/discounts/admin/fraud-alerts?status=pending');

alerts.data.forEach(alert => {
  showAlert({
    type: alert.alertType,
    severity: alert.severity,
    user: alert.user,
    details: alert.details
  });
});
```

---

#### POST `/discounts/admin/expire-claims` - Expire Old Claims

**Business Logic:**
- Marks all expired claims as `expired` status
- Run as scheduled job or manually

**Frontend Usage:**
```typescript
// Admin maintenance action
const result = await adminFetch('/api/discounts/admin/expire-claims', {
  method: 'POST'
});
console.log(`Expired ${result.count} claims`);
```

---

#### POST `/discounts/admin/deactivate-expired` - Deactivate Expired Discounts

**Business Logic:**
- Sets `isActive: false` for discounts past end date
- Run as scheduled job or manually

---

## Discount Types & Business Logic

### 1. Percentage Discount
- `discountType: "percentage"`
- `discountValue`: Percentage off (e.g., 20 for 20%)
- `maxDiscountAmount`: Cap on discount (e.g., max 50,000 UZS off)

**Calculation:**
```
discount = min(orderTotal * (discountValue / 100), maxDiscountAmount)
```

### 2. Fixed Amount
- `discountType: "fixed_amount"`
- `discountValue`: Amount off in UZS (e.g., 10000)

### 3. Buy One Get One (BOGO)
- `discountType: "buy_one_get_one"`
- `bogoProductName`: Product that triggers BOGO

### 4. Free Item
- `discountType: "free_item"`
- `freeItemName`: Name of free item
- `freeItemValue`: Value of free item

### 5. Cashback
- `discountType: "cashback"`
- `cashbackPercentage`: Percentage returned as cashback
- `maxCashbackAmount`: Maximum cashback amount
- `cashbackDelayDays`: Days before cashback is credited

---

## Usage Limit Types

| Type | Description | Example |
|------|-------------|---------|
| `one_time` | User can claim once ever | Welcome bonus |
| `daily` | Reset each day | Lunch special |
| `weekly` | Reset each week | Weekend offer |
| `monthly` | Reset each month | Monthly reward |
| `unlimited` | No per-user limit | General discount |

---

## Claim Flow

```
1. User checks eligibility
   GET /discounts/:id/eligibility

2. User claims discount
   POST /discounts/:id/claim
   → Returns claim code (e.g., STU-A7F9-2024)

3. User shows claim code at store
   → QR code or manual entry

4. Partner verifies and redeems
   POST /discounts/claims/:code/redeem
   → Updates claim status to 'redeemed'

5. Analytics updated
   → User savings, partner revenue, platform fees
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "statusCode": 400,
  "message": "Cannot claim discount",
  "error": "Bad Request"
}
```

Common error codes:
- `400` - Bad request (validation error, business rule violation)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient role)
- `404` - Not found
- `409` - Conflict (e.g., promo code already exists)

---

## Frontend Integration Examples

### Complete Claim Flow
```typescript
async function claimDiscount(discountId: string) {
  // 1. Check eligibility first
  const { canClaim, reason } = await authFetch(
    `/api/discounts/${discountId}/eligibility`
  );

  if (!canClaim) {
    toast.error(reason);
    return;
  }

  // 2. Get user location if needed
  let location = {};
  if (discount.requiresLocation) {
    location = await getUserLocation();
  }

  // 3. Claim the discount
  try {
    const claim = await authFetch(`/api/discounts/${discountId}/claim`, {
      method: 'POST',
      body: JSON.stringify({
        deviceId: getDeviceId(),
        ...location
      })
    });

    // 4. Show success with claim code
    showClaimModal({
      code: claim.claimCode,
      expiresAt: claim.expiresAt,
      instructions: discount.howToUse
    });

  } catch (error) {
    if (error.statusCode === 400) {
      toast.error(error.message);
    }
  }
}
```

### Partner Redemption Scanner
```typescript
async function redeemClaimCode(code: string, orderTotal: number) {
  // Calculate discount based on type
  const discount = calculateDiscount(orderTotal);

  try {
    const result = await partnerFetch(`/api/discounts/claims/${code}/redeem`, {
      method: 'POST',
      body: JSON.stringify({
        transactionAmount: orderTotal,
        discountAmount: discount
      })
    });

    playSuccessSound();
    showReceipt({
      original: orderTotal,
      discount: discount,
      final: orderTotal - discount
    });

  } catch (error) {
    if (error.statusCode === 404) {
      showError('Invalid claim code');
    } else if (error.statusCode === 400) {
      showError(error.message); // e.g., "Claim already redeemed"
    }
  }
}
```

### Analytics Dashboard
```typescript
async function loadDashboard(brandId: number) {
  const [discounts, pending, analytics] = await Promise.all([
    partnerFetch(`/api/discounts/partner/my-discounts?brandId=${brandId}`),
    partnerFetch(`/api/discounts/partner/pending-verifications?brandId=${brandId}`),
    partnerFetch(`/api/discounts/partner/analytics?brandId=${brandId}`)
  ]);

  setDashboardState({
    activeDiscounts: discounts.data.filter(d => d.isActive).length,
    pendingVerifications: pending.meta.total,
    monthlyRedemptions: analytics.totalRedemptions,
    revenue: analytics.totalTransactionValue
  });
}
```

---

## Swagger/OpenAPI

Full API documentation is available at:
```
/api/docs
```

This includes all endpoints with request/response schemas and try-it-out functionality.
