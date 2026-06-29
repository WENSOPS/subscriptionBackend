# API Documentation Index

This directory contains comprehensive API documentation for the WENS Products Backend service.

## Overview

All API endpoints use Bearer token authentication. Base URL: `/api/v1`

---

## Documentation Files

### 1. [Service API Documentation](./servicedoc.md)

**Base Path:** `/api/v1/service`

Manage services that can be bundled into packages. Services include bodyguard services, vehicle services, and other offerings.

**Key Endpoints:**
- `POST /create` - Create a new service
- `GET /list` - List all services with pagination
- `GET /:id` - Get service details
- `PUT /:id` - Update a service
- `DELETE /:id` - Delete a service

**Key Fields:**
- `title` - Service name
- `description` - Service details
- `thumbnailUrlKey` - S3 key for thumbnail image
- `isActive` - Service availability status

---

### 2. [Package API Documentation](./packagedoc.md)

**Base Path:** `/api/v1/package`

Manage packages that bundle multiple services with pricing, validity, and vehicle/bodyguard types.

**Key Endpoints:**
- `POST /create` - Create a new package
- `GET /list` - List all packages with pagination
- `GET /:id` - Get package details with associated services
- `PUT /:id` - Update a package
- `DELETE /:id` - Delete a package
- `GET /service/:serviceId` - Get packages by service

**Key Fields:**
- `name` - Package name (unique)
- `regularPrice` / `discountedPrice` - Pricing
- `vehicleType` / `vehicleModel` - Vehicle information
- `bodyguardType` - Type of bodyguard service
- `trips` - Number of trips included
- `validity` - Validity period in months
- `thumbnailUrlKey` - S3 key for thumbnail image
- `isActive` - Package availability
- `serviceIds` - Associated services

---

### 3. [Storage API Documentation](./storagedoc.md)

**Base Path:** `/api/v1/storage`

Handle file uploads to S3 bucket and manage storage keys.

---

### 4. [Authentication API Documentation](./authdoc.md)

**Base Path:** `/api/v1/auth`

Handle user authentication, token management, and authorization.

---

### 5. [Coupon API Documentation](./coupondoc.md)

**Base Path:** `/api/v1/coupon`

Manage coupon creation, validation, updates, and deletion with package-wise applicability.

**Key Endpoints:**
- `GET /` - List coupons with pagination and search
- `GET /:id` - Get single coupon with package details
- `GET /validate` - Validate coupon and calculate discount
- `POST /` - Create a coupon and link packages
- `PUT /:id` - Update coupon details and package links
- `DELETE /:id` - Delete coupon

**Key Fields:**
- `code` - Coupon code (unique)
- `discountType` / `discountValue` - Discount definition
- `usageLimit` / `usedCount` - Usage controls
- `validUntil` - Expiry date
- `packageId` - Array of applicable package IDs in create/update requests

---

### 6. [Payment API Documentation](./paymentdoc.md)

**Base Path:** `/api/v1/payment`

Handle order creation, payment verification, webhook processing, and payment listing.

**Key Endpoints:**
- `POST /create-order` - Create payment order for a package
- `GET /verify-payment/:orderId` - Verify payment status for a Cashfree order
- `POST /webhook` - Process Cashfree webhook events
- `GET /` - List all payments with pagination and search
- `GET /:id` - Get payment details by internal order ID

**Key Fields:**
- `packageId` - Package to purchase
- `couponCode` - Optional coupon code
- `cashfreeOrderId` - Payment gateway order identifier
- `paymentId` - Gateway payment/session reference
- `status` - Payment state (`PENDING`, `PAID`, `FAILED`)

---

### 7. [Subscription API Documentation](./subscriptiondoc.md)

**Base Path:** `/api/v1/subscription`

Manage subscription lifecycle including creation, listing, verification, and cancellation.

**Key Endpoints:**
- `GET /my` - Get current user's subscription
- `POST /` - Create subscription
- `GET /:id` - Get subscription details by ID
- `GET /` - List subscriptions with pagination and search
- `PUT /:id/verify` - Verify and activate a subscription
- `PUT /:id/cancel` - Cancel a subscription

**Key Fields:**
- `userId` - Subscriber user ID
- `packageId` - Linked package ID
- `startDate` / `endDate` - Subscription period
- `status` - Subscription state (`pending`, `active`, `cancelled`, `expired`)
- `tripsTotal` / `tripsUsed` - Trip usage tracking

---

### 8. [User API Documentation](./userdoc.md)

**Base Path:** `/api/v1/user`

Manage users with create, list, detail, and update operations.

**Key Endpoints:**
- `POST /` - Create user
- `GET /` - List users with pagination and search
- `GET /:id` - Get user details by ID
- `PUT /:id` - Update user

**Key Fields:**
- `name` - User name
- `email` - User email (unique)
- `mobileNumber` - User mobile number (unique)
- `role` - User role (`user`, `admin`, `ops`)
- `city` - User city

---

### 9. [Trip API Documentation](./tripdoc.md)

**Base Path:** `/api/v1/trip`

Manage trip lifecycle including request, approval, listing, update, and deletion.

**Key Endpoints:**
- `POST /request` - Request a trip
- `POST /create` - Create and confirm trip (admin/ops)
- `GET /mine` - Get current user's trips
- `POST /approve/:id` - Approve trip and assign assignment ID
- `GET /get-all` - List all trips with filters
- `PUT /update/:id` - Update trip
- `DELETE /delete/:id` - Delete trip
- `GET /:id` - Get trip details by ID

**Key Fields:**
- `subscriptionId` - Linked subscription ID
- `assignmentId` - Internal assignment identifier
- `pickupLocation` / `dropLocation` - Trip route points
- `tripDate` - Scheduled trip date and time
- `tripType` - Trip category (`airport-transfer`, `8Hr/80Km`)
- `services` - Selected service list for the trip

---

## Important Notes

### Thumbnail URL Mapping

Both Service and Package APIs use the same thumbnail URL strategy:

- **Request:** Send `thumbnailUrlKey` (S3 object key, e.g., `"packages/premium.jpg"`)
- **Response:** 
  - Create/Update endpoints return only `thumbnailUrlKey`
  - List/Get endpoints return both `thumbnailUrlKey` (database key) and `thumbnailUrl` (presigned S3 URL)
  - `thumbnailUrl` is a presigned S3 URL with 1-hour expiration

```json
{
  "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
  "thumbnailUrl": "https://s3-bucket.amazonaws.com/packages/premium-bodyguard.jpg?X-Amz-Algorithm=..."
}
```

### Authentication

All endpoints require the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

### Role-Based Access

- **admin** - Full access to create, update, delete operations
- **user** - Read-only access to list and get operations
- **ops** - Operations team access (varies by endpoint)

### Response Format

All responses follow a consistent envelope:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... } | null
}
```

Validation errors include an `errors` array:

```json
{
  "errors": [
    { "msg": "Field is required", "path": "fieldName" }
  ]
}
```

### Pagination

List endpoints support pagination:

```
GET /api/v1/package/list?page=1&limit=20
```

Response includes pagination metadata:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### Error Handling

Common HTTP Status Codes:

| Status | Meaning                    |
|--------|----------------------------|
| 200    | Success                    |
| 201    | Created                    |
| 400    | Bad Request / Validation Error |
| 401    | Unauthorized (Invalid token) |
| 403    | Forbidden (Insufficient permissions) |
| 404    | Not Found                  |
| 500    | Internal Server Error      |

---

## Getting Started

1. **Authentication First**: Obtain an access token from the [Authentication API](./authdoc.md)
2. **Create Services**: Set up available services via [Service API](./servicedoc.md)
3. **Create Packages**: Bundle services into packages via [Package API](./packagedoc.md)
4. **Handle Storage**: Use [Storage API](./storagedoc.md) for file uploads

---

## Development Notes

- All timestamps are in ISO 8601 format (UTC)
- Prices are stored as floating-point numbers
- Complex fields like `vehicleModel` are stored as JSON
- Pagination defaults to page 1 and limit 10 if not specified
