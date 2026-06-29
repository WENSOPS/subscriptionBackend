# Subscription API Documentation

Base Path: `/api/v1/subscription`

---

## Table of Contents

1. [Get My Subscription](#1-get-my-subscription)
2. [Create Subscription](#2-create-subscription)
3. [Get Subscription by ID](#3-get-subscription-by-id)
4. [List Subscriptions](#4-list-subscriptions)
5. [Verify Subscription](#5-verify-subscription)
6. [Cancel Subscription](#6-cancel-subscription)

---

## Response Format

Success responses follow:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

Validation errors from `express-validator` return:

```json
{
  "errors": [{ "msg": "ID must be an integer", "path": "id" }]
}
```

Error responses follow:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Bad request",
  "errors": null
}
```

---

## Auth & Roles

All endpoints require a Bearer token in the `Authorization` header.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes      |

Role access per endpoint:

- `GET /my` -> `user`, `admin`, `ops`
- `POST /` -> `admin`, `ops`
- `GET /:id` -> `admin`, `ops`
- `GET /` -> `admin`, `ops`
- `PUT /:id/verify` -> `admin`, `ops`
- `PUT /:id/cancel` -> `admin`, `ops`

---

## 1. Get My Subscription

Get the current authenticated user's subscription.

**Endpoint:** `GET /my`

**Allowed Roles:** `user`, `admin`, `ops`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "userId": 10,
    "packageId": 2,
    "status": "active",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-07-01T00:00:00.000Z",
    "package": {
      "id": 2,
      "name": "Premium Package"
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `404`  | `No active subscription found` |
| `500`  | `Failed to fetch subscription` |

---

## 2. Create Subscription

Create a new subscription record.

**Endpoint:** `POST /`

**Allowed Roles:** `admin`, `ops`

### Request Body

| Field       | Type            | Required | Description |
|-------------|-----------------|----------|-------------|
| `userId`    | integer         | Yes      | User ID. |
| `packageId` | integer         | Yes      | Package ID. |
| `startDate` | ISO date string | Yes      | Subscription start date. |
| `paymentId` | string          | Yes      | Payment reference. |

### Example Request

```json
{
  "userId": 10,
  "packageId": 2,
  "startDate": "2026-06-01T00:00:00.000Z",
  "paymentId": "cf_pay_xxx"
}
```

### Success Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Resource created successfully",
  "data": {
    "id": 1,
    "userId": 10,
    "packageId": 2,
    "status": "pending",
    "paymentId": "cf_pay_xxx",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-07-01T00:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (invalid/missing fields) |
| `500`  | `Failed to create subscription` |

---

## 3. Get Subscription by ID

Get subscription details by ID.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Subscription ID. |

### Example

`GET /api/v1/subscription/1`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "userId": 10,
    "packageId": 2,
    "status": "pending",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-07-01T00:00:00.000Z",
    "user": {
      "id": 10,
      "name": "Rahul",
      "email": "rahul@example.com",
      "mobileNumber": "9999999999"
    },
    "package": {
      "id": 2,
      "name": "Premium Package",
      "description": "Premium city package",
      "regularPrice": 5000,
      "discountedPrice": 4000
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`ID must be an integer`) |
| `404`  | `Subscription not found` |
| `500`  | `Failed to fetch subscription` |

---

## 4. List Subscriptions

Get subscriptions with pagination and search.

**Endpoint:** `GET /`

**Allowed Roles:** `admin`, `ops`

### Query Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `page`    | integer | 1       | Page number. |
| `limit`   | integer | 10      | Records per page. |
| `search`  | string  | `""`    | Search by user name or package name. |

### Example

`GET /api/v1/subscription?page=1&limit=10&search=premium`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscriptions fetched successfully",
  "data": {
    "subscriptions": [
      {
        "id": 1,
        "userId": 10,
        "packageId": 2,
        "startDate": "2026-06-01T00:00:00.000Z",
        "endDate": "2026-07-01T00:00:00.000Z",
        "status": "pending",
        "tripsTotal": 10,
        "tripsUsed": 0,
        "vehicleType": "SUV",
        "bodyguardType": "armed",
        "package": {
          "id": 2,
          "name": "Premium Package"
        },
        "user": {
          "id": 10,
          "mobileNumber": "9999999999"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `500`  | `Failed to fetch subscriptions` |

---

## 5. Verify Subscription

Mark a subscription as active after admin/ops verification.

**Endpoint:** `PUT /:id/verify`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Subscription ID. |

### Request Body

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `adminRemarks`| string | No       | Optional verification remarks. |

### Example Request

```json
{
  "adminRemarks": "Verified after payment confirmation"
}
```

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Subscription verified successfully"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`ID must be an integer`) |
| `404`  | `Subscription not found` |
| `409`  | `Subscription is already active` |
| `500`  | `Failed to verify subscription` |

---

## 6. Cancel Subscription

Cancel a subscription by setting status to `cancelled`.

**Endpoint:** `PUT /:id/cancel`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Subscription ID. |

### Request Body

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `adminRemarks` | string | No       | Optional cancellation remarks. |

### Example Request

```json
{
  "adminRemarks": "Cancelled by ops team"
}
```

### Success Response `202 Accepted`

```json
{
  "success": true,
  "statusCode": 202,
  "message": "Request accepted",
  "data": {
    "message": "Subscription cancelled successfully"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`ID must be an integer`) |
| `404`  | `Subscription not found` |
| `500`  | `Failed to cancel subscription` |

---

## Notes

- New subscriptions are created with `status: pending`.
- Verification sets `status: active`, stores `verifiedBy`, `verifiedAt`, and optional `adminRemarks`.
- Cancellation currently updates status to `cancelled` (soft-cancel behavior).
- Subscription `services` are copied from package services into JSON at creation time.
