# Coupon API Documentation

Base Path: `/api/v1/coupon`

---

## Table of Contents

1. [Create Coupon](#1-create-coupon)
2. [List Coupons](#2-list-coupons)
3. [Get Coupon by ID](#3-get-coupon-by-id)
4. [Validate Coupon](#4-validate-coupon)
5. [Update Coupon](#5-update-coupon)
6. [Delete Coupon](#6-delete-coupon)

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

Validation error response includes an `errors` array:

```json
{
  "errors": [{ "msg": "Code is required", "path": "code" }]
}
```

---

## Auth & Roles

All endpoints require a Bearer token in the `Authorization` header.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes      |

Role access per endpoint:

- `GET /` -> `admin`, `ops`
- `GET /:id` -> `admin`, `ops`
- `GET /validate` -> `admin`, `user`, `ops`
- `POST /` -> `admin`
- `PUT /:id` -> `admin`
- `DELETE /:id` -> `admin`

---

## 1. Create Coupon

Create a new coupon and optionally link it to multiple packages.

**Endpoint:** `POST /`

**Allowed Roles:** `admin`

### Request Body

| Field           | Type            | Required | Description |
|----------------|-----------------|----------|-------------|
| `code`         | string          | Yes      | Unique coupon code. |
| `discountType` | string          | Yes      | `percentage` or `fixed`. |
| `discountValue`| number          | Yes      | Positive discount value. |
| `expiryDate`   | ISO date string | Yes      | Coupon expiry date. |
| `usageLimit`   | integer         | No       | Max number of uses. |
| `packageId`    | integer[]       | No       | Package IDs this coupon is applicable to. If omitted or empty, coupon is applicable to all packages. |

### Example Request

```json
{
  "code": "SUMMER20",
  "discountType": "percentage",
  "discountValue": 20,
  "expiryDate": "2026-12-31T23:59:59.000Z",
  "usageLimit": 100,
  "packageId": [1, 2, 5]
}
```

### Success Response `201 Created`

```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": 1,
    "code": "SUMMER20",
    "discountType": "percentage",
    "discountValue": 20,
    "usageLimit": 100,
    "usedCount": 0,
    "isActive": true,
    "validUntil": "2026-12-31T23:59:59.000Z",
    "packages": [
      { "id": 1 },
      { "id": 2 },
      { "id": 5 }
    ],
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:00:00.000Z"
  }
}
```

---

## 2. List Coupons

Get paginated coupons with optional code search.

**Endpoint:** `GET /`

**Allowed Roles:** `admin`, `ops`

### Query Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `page`    | integer | 1       | Page number. |
| `limit`   | integer | 10      | Number of records per page. |
| `search`  | string  | `""`    | Case-insensitive search on coupon `code`. |

### Example

`GET /api/v1/coupon?page=1&limit=10&search=SUMMER`

### Success Response `200 OK`

```json
{
  "success": true,
  "message": "Coupons fetched successfully",
  "data": {
    "coupons": [
      {
        "id": 1,
        "code": "SUMMER20",
        "discountType": "percentage",
        "discountValue": 20,
        "usageLimit": 100,
        "usedCount": 2,
        "isActive": true,
        "validUntil": "2026-12-31T23:59:59.000Z",
        "createdAt": "2026-06-27T10:00:00.000Z",
        "updatedAt": "2026-06-27T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

## 3. Get Coupon by ID

Get a single coupon by ID with linked package details.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Coupon ID. |

### Example

`GET /api/v1/coupon/1`

### Success Response `200 OK`

```json
{
  "success": true,
  "message": "Coupon fetched successfully",
  "data": {
    "id": 1,
    "code": "SUMMER20",
    "discountType": "percentage",
    "discountValue": 20,
    "usageLimit": 100,
    "usedCount": 2,
    "isActive": true,
    "validUntil": "2026-12-31T23:59:59.000Z",
    "packages": [
      {
        "id": 1,
        "name": "Premium Package",
        "description": "Premium city package",
        "regularPrice": 5000,
        "discountedPrice": 4000
      }
    ],
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:30:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`Coupon ID must be an integer`) |
| `404`  | `Coupon not found` |
| `500`  | `Failed to fetch coupon` |

---

## 4. Validate Coupon

Validate coupon applicability and calculate discount for a package.

**Endpoint:** `GET /validate`

**Allowed Roles:** `admin`, `user`, `ops`

### Query Parameters

| Parameter   | Type    | Required | Description |
|-------------|---------|----------|-------------|
| `code`      | string  | Yes      | Coupon code to validate. |
| `packageId` | integer | No       | Package ID. Required to enforce package-specific coupon applicability and compute discount amount for that package. |

### Example

`GET /api/v1/coupon/validate?code=SUMMER20&packageId=1`

### Success Response `200 OK`

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "discountType": "percentage",
    "discountValue": 20,
    "discountAmount": 800
  }
}
```

### Common Error Messages

| Status | Message |
|--------|---------|
| `400`  | `Invalid coupon code` |
| `400`  | `Coupon has expired` |
| `400`  | `Coupon usage limit reached` |
| `400`  | `Coupon not applicable for this package` |
| `400`  | `Package not found` |

---

## 5. Update Coupon

Update coupon details and optionally replace package links.

**Endpoint:** `PUT /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Coupon ID. |

### Request Body

All fields are optional.

| Field            | Type            | Description |
|-----------------|-----------------|-------------|
| `code`          | string          | Coupon code. |
| `discountType`  | string          | `percentage` or `fixed`. |
| `discountValue` | number          | Positive value. |
| `expiryDate`    | ISO date string | Valid-until date. |
| `usageLimit`    | integer         | Max number of uses. |
| `packageId`     | integer[]       | Replaces linked package IDs when provided. |

### Example Request

```json
{
  "discountValue": 25,
  "usageLimit": 150,
  "packageId": [2, 3]
}
```

### Success Response `200 OK`

```json
{
  "success": true,
  "message": "Coupon updated successfully",
  "data": {
    "id": 1,
    "code": "SUMMER20",
    "discountType": "percentage",
    "discountValue": 25,
    "usageLimit": 150,
    "packages": [
      { "id": 2 },
      { "id": 3 }
    ]
  }
}
```

---

## 6. Delete Coupon

Delete an existing coupon.

**Endpoint:** `DELETE /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Coupon ID. |

### Success Response `204 No Content`

No response body.

---

## Notes

- `discountType = percentage` computes discount as:
  `package.discountedPrice * discountValue / 100`
- `discountType = fixed` applies `discountValue` directly.
- If a coupon has no linked packages, it is treated as applicable to all packages.
- `usedCount` is checked against `usageLimit` during validation.
