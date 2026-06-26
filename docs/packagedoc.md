# Package API Documentation

Base Path: `/api/v1/package`

---

## Table of Contents

1. [Create Package](#1-create-package)
2. [List Packages](#2-list-packages)
3. [Get Packages for Users](#3-get-packages-for-users)
4. [Get Package by ID](#4-get-package-by-id)
5. [Update Package](#5-update-package)
6. [Delete Package](#6-delete-package)

---

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... } | null
}
```

**Validation error response includes an `errors` array:**

```json
{
  "errors": [{ "msg": "Package name is required", "path": "name" }]
}
```

---

## Auth & Roles

All endpoints require a Bearer token in the `Authorization` header.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes      |

Role access per endpoint is listed in each section.

---

## 1. Create Package

Create a new package with optional services.

**Endpoint:** `POST /`

**Allowed Roles:** `admin`

### Request Body

| Field                | Type             | Required | Description                                    |
|----------------------|------------------|----------|------------------------------------------------|
| `name`               | string           | Yes      | Unique name of the package.                    |
| `regularPrice`       | number           | Yes      | Regular price of the package.                  |
| `discountedPrice`    | number           | Yes      | Discounted price of the package.               |
| `description`        | string           | No       | Description of the package.                    |
| `tags`               | string           | No       | Comma-separated tags for categorization.       |
| `vehicleType`        | string           | No       | Type of vehicle (e.g., sedan, SUV).            |
| `vehicleModel`       | array            | No       | Array of vehicle models supported.             |
| `bodyguardType`      | string           | No       | Type of bodyguard service (if applicable).     |
| `trips`              | integer          | No       | Number of trips included in the package.       |
| `validity`           | integer          | No       | Validity of the package in months.             |
| `thumbnailUrlKey`    | string           | No       | S3 bucket key for the package thumbnail.       |
| `isActive`           | boolean          | No       | Whether the package is active (default: true). |
| `services`           | array (objects)  | No       | Array of services with count. Each object has `id` (service ID) and optional `count` (default: 1). |

**Example:**
```json
{
  "name": "Premium Bodyguard Package",
  "regularPrice": 5000,
  "discountedPrice": 4000,
  "description": "Premium bodyguard service for VIPs",
  "tags": "premium,vip,security",
  "vehicleType": "sedan",
  "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
  "bodyguardType": "armed",
  "trips": 10,
  "validity": 12,
  "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
  "isActive": true,
  "services": [
    { "id": 1, "count": 2 },
    { "id": 2, "count": 5 },
    { "id": 3 }
  ]
}
```

### Response

#### Success `201 Created`
```json
{
  "success": true,
  "message": "Package created successfully",
  "data": {
    "id": 1,
    "name": "Premium Bodyguard Package",
    "regularPrice": 5000,
    "discountedPrice": 4000,
    "description": "Premium bodyguard service for VIPs",
    "tags": "premium,vip,security",
    "vehicleType": "sedan",
    "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
    "bodyguardType": "armed",
    "trips": 10,
    "validity": 12,
    "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
    "isActive": true,
    "packageServices": [
      {
        "id": 1,
        "packageId": 1,
        "serviceId": 1,
        "count": 2,
        "service": {
          "id": 1,
          "title": "Bodyguard Service",
          "description": "Professional bodyguard",
          "thumbnailUrlKey": "services/bodyguard.jpg",
          "isActive": true
        }
      },
      {
        "id": 2,
        "packageId": 1,
        "serviceId": 2,
        "count": 5,
        "service": {
          "id": 2,
          "title": "Premium Vehicle",
          "description": "High-end vehicle service",
          "thumbnailUrlKey": "services/vehicle.jpg",
          "isActive": true
        }
      }
    ],
    "createdAt": "2026-06-24T10:00:00.000Z",
    "updatedAt": "2026-06-24T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Message                          | Cause                        |
|--------|----------------------------------|------------------------------|
| `400`  | `"Package name is required"`     | Missing `name` field         |
| `400`  | `"Package already exists"`       | Duplicate `name`             |
| `400`  | `"Regular price is required"`    | Missing `regularPrice` field |
| `400`  | `"Discounted price is required"` | Missing `discountedPrice` field |
| `401`  | `"Unauthorized access"`          | Missing or invalid token     |
| `403`  | `"Access forbidden"`             | Role not permitted           |
| `500`  | `"Failed to create package"`     | Server/DB error              |

---

## 2. List Packages

Retrieve all packages with pagination and search.

**Endpoint:** `GET /`

**Allowed Roles:** `admin`, `user`

### Query Parameters

| Parameter | Type    | Default | Description                              |
|-----------|---------|---------|------------------------------------------|
| `page`    | integer | 1       | Page number for pagination.              |
| `limit`   | integer | 10      | Number of packages per page.             |
| `category` | string  | -       | Filter by category.                      |
| `search`  | string  | -       | Search by name.                          |

**Example:** `GET /api/v1/package?page=1&limit=20&search=premium`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Packages retrieved successfully",
  "data": {
    "packages": [
      {
        "id": 1,
        "name": "Premium Bodyguard Package",
        "regularPrice": 5000,
        "discountedPrice": 4000,
        "description": "Premium bodyguard service for VIPs",
        "tags": "premium,vip,security",
        "vehicleType": "sedan",
        "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
        "bodyguardType": "armed",
        "trips": 10,
        "validity": 12,
        "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
        "thumbnailUrl": "https://s3-bucket.amazonaws.com/packages/premium-bodyguard.jpg?X-Amz-Algorithm=...",
        "isActive": true,
        "packageServices": [
          {
            "id": 1,
            "packageId": 1,
            "serviceId": 1,
            "count": 2,
            "service": {
              "id": 1,
              "title": "Bodyguard Service",
              "description": "Professional bodyguard"
            }
          }
        ],
        "createdAt": "2026-06-24T10:00:00.000Z",
        "updatedAt": "2026-06-24T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

**Note:** `thumbnailUrl` is a presigned S3 URL with 1-hour expiration. `thumbnailUrlKey` is the S3 key stored in the database.

#### Error Responses

| Status | Message                          | Cause                    |
|--------|----------------------------------|--------------------------|
| `401`  | `"Unauthorized access"`          | Missing or invalid token |
| `403`  | `"Access forbidden"`             | Role not permitted       |
| `500`  | `"Failed to fetch packages"`     | Server/DB error          |

---

## 3. Get Packages for Users

Retrieve active packages for end users with optional category filter.

**Endpoint:** `GET /user`

**Allowed Roles:** `public` (no authentication required)

### Query Parameters

| Parameter | Type    | Default | Description                              |
|-----------|---------|---------|------------------------------------------|
| `category` | string  | -       | Filter by category.                      |

**Example:** `GET /api/v1/package/user?category=premium`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Packages fetched successfully for users",
  "data": [
    {
      "id": 1,
      "name": "Premium Bodyguard Package",
      "regularPrice": 5000,
      "discountedPrice": 4000,
      "description": "Premium bodyguard service for VIPs",
      "tags": "premium,vip,security",
      "vehicleType": "sedan",
      "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
      "bodyguardType": "armed",
      "trips": 10,
      "validity": 12,
      "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
      "thumbnailUrl": "https://s3.amazonaws.com/...",
      "isActive": true,
      "packageServices": [
        {
          "count": 2,
          "service": {
            "id": 1,
            "name": "Security Service"
          }
        }
      ],
      "createdAt": "2026-06-24T10:00:00.000Z",
      "updatedAt": "2026-06-24T10:00:00.000Z"
    }
  ]
}
```

**Note:** Only packages with `isActive: true` are returned. `thumbnailUrl` is a presigned S3 URL with 1-hour expiration.

#### Error Responses

| Status | Message                                | Cause                    |
|--------|----------------------------------------|--------------------------|
| `500`  | `"Failed to fetch packages for users"` | Server/DB error          |

---

## 4. Get Package by ID

Retrieve a single package with detailed information.

**Endpoint:** `GET /:id`

**Allowed Roles:** `public` (no authentication required)

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the package.  |

**Example:** `GET /api/v1/package/1`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Package retrieved successfully",
  "data": {
    "id": 1,
    "name": "Premium Bodyguard Package",
    "regularPrice": 5000,
    "discountedPrice": 4000,
    "description": "Premium bodyguard service for VIPs",
    "tags": "premium,vip,security",
    "vehicleType": "sedan",
    "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
    "bodyguardType": "armed",
    "trips": 10,
    "validity": 12,
    "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
    "thumbnailUrl": "https://s3-bucket.amazonaws.com/packages/premium-bodyguard.jpg?X-Amz-Algorithm=...",
    "isActive": true,
    "packageServices": [
      {
        "id": 1,
        "packageId": 1,
        "serviceId": 1,
        "count": 2,
        "service": {
          "id": 1,
          "title": "Bodyguard Service",
          "description": "Professional bodyguard",
          "isActive": true
        }
      },
      {
        "id": 2,
        "packageId": 1,
        "serviceId": 2,
        "count": 5,
        "service": {
          "id": 2,
          "title": "Premium Vehicle",
          "description": "High-end vehicle service",
          "isActive": true
        }
      }
    ],
    "createdAt": "2026-06-24T10:00:00.000Z",
    "updatedAt": "2026-06-24T10:00:00.000Z"
  }
}
```

**Note:** `thumbnailUrl` is a presigned S3 URL with 1-hour expiration. Use this URL directly in your frontend.

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"ID must be a positive integer"`| Invalid `id` path param       |
| `404`  | `"Package not found"`            | No package with the given ID  |
| `500`  | `"Failed to fetch package"`      | Server/DB error               |

---

## 5. Update Package

Update an existing package by its ID.

**Endpoint:** `PUT /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the package.  |

### Request Body

| Field                | Type             | Required | Description                               |
|----------------------|------------------|----------|-------------------------------------------|
| `name`               | string           | No       | Updated name of the package.              |
| `regularPrice`       | number           | No       | Updated regular price.                    |
| `discountedPrice`    | number           | No       | Updated discounted price.                 |
| `description`        | string           | No       | Updated description.                      |
| `tags`               | string           | No       | Updated tags.                             |
| `vehicleType`        | string           | No       | Updated vehicle type.                     |
| `vehicleModel`       | array            | No       | Updated vehicle models.                   |
| `bodyguardType`      | string           | No       | Updated bodyguard type.                   |
| `trips`              | integer          | No       | Updated number of trips.                  |
| `validity`           | integer          | No       | Updated validity in months.               |
| `thumbnailUrlKey`    | string           | No       | Updated S3 key for thumbnail.             |
| `isActive`           | boolean          | No       | Updated active status.                    |
| `services`           | array (objects)  | No       | Updated array of services with count.     |

**Example:** `PUT /api/v1/package/1`
```json
{
  "discountedPrice": 3500,
  "isActive": false,
  "services": [
    { "id": 1, "count": 3 },
    { "id": 2, "count": 2 }
  ]
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Package updated successfully",
  "data": {
    "id": 1,
    "name": "Premium Bodyguard Package",
    "regularPrice": 5000,
    "discountedPrice": 3500,
    "description": "Premium bodyguard service for VIPs",
    "tags": "premium,vip,security",
    "vehicleType": "sedan",
    "vehicleModel": ["BMW 7-Series", "Mercedes S-Class"],
    "bodyguardType": "armed",
    "trips": 10,
    "validity": 12,
    "thumbnailUrlKey": "packages/premium-bodyguard.jpg",
    "isActive": false,
    "packageServices": [
      {
        "id": 1,
        "packageId": 1,
        "serviceId": 1,
        "count": 3,
        "service": {
          "id": 1,
          "title": "Bodyguard Service",
          "description": "Professional bodyguard"
        }
      },
      {
        "id": 2,
        "packageId": 1,
        "serviceId": 2,
        "count": 2,
        "service": {
          "id": 2,
          "title": "Premium Vehicle",
          "description": "High-end vehicle service"
        }
      }
    ],
    "createdAt": "2026-06-24T10:00:00.000Z",
    "updatedAt": "2026-06-24T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"ID must be a positive integer"`| Invalid `id` path param       |
| `401`  | `"Unauthorized access"`          | Missing or invalid token      |
| `403`  | `"Access forbidden"`             | Role not permitted            |
| `404`  | `"Package not found"`            | No package with the given ID  |
| `500`  | `"Failed to update package"`     | Server/DB error               |

---

## 6. Delete Package

Delete a package by its ID.

**Endpoint:** `DELETE /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the package.  |

**Example:** `DELETE /api/v1/package/1`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Package deleted successfully"
}
```

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"ID must be a positive integer"`| Invalid `id` path param       |
| `401`  | `"Unauthorized access"`          | Missing or invalid token      |
| `403`  | `"Access forbidden"`             | Role not permitted            |
| `404`  | `"Package not found"`            | No package with the given ID  |
| `500`  | `"Failed to delete package"`     | Server/DB error               |

---

## Field Type Reference

### Data Types

- **string:** Text value
- **number:** Numeric value (including decimals)
- **integer:** Whole number
- **boolean:** `true` or `false`
- **array:** List of values enclosed in `[]`
- **JSON:** `vehicleModel` is stored as JSON array in database

### Service Count Mapping

The `services` field uses a junction table (`PackageService`) to track each service and its count:

**Request Format:**
```json
{
  "services": [
    { "id": 1, "count": 2 },
    { "id": 3, "count": 5 }
  ]
}
```

**Response Format (via `packageServices`):**
```json
{
  "packageServices": [
    {
      "id": 1,
      "packageId": 1,
      "serviceId": 1,
      "count": 2,
      "service": { ... }
    }
  ]
}
```

Each package can have multiple services with different counts. The `count` field represents the quantity/allocation of that service in the package.

### Notes on thumbnailUrl and thumbnailUrlKey

- `thumbnailUrlKey`: The S3 object key stored in the database (provided on create/update)
- `thumbnailUrl`: A presigned S3 URL generated on-the-fly in GET endpoints (read-only, 1-hour expiration)
- Create/Update endpoints only accept and return `thumbnailUrlKey`
- List and Get endpoints return both `thumbnailUrlKey` and `thumbnailUrl`
