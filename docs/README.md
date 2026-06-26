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
