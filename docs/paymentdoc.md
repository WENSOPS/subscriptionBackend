# Payment API Documentation

Base Path: `/api/v1/payment`

---

## Table of Contents

1. [Create Order](#1-create-order)
2. [Verify Payment](#2-verify-payment)
3. [Cashfree Webhook](#3-cashfree-webhook)
4. [List Payments](#4-list-payments)
5. [Get Payment by ID](#5-get-payment-by-id)

---

## Response Format

All success responses follow this envelope:

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
  "errors": [{ "msg": "packageId is required", "path": "packageId" }]
}
```

Other errors follow:

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

All non-webhook endpoints require a Bearer token in the `Authorization` header.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes (except webhook) |

Role access per endpoint:

- `POST /create-order` -> `user`, `admin`, `ops`
- `GET /verify-payment/:orderId` -> `user`, `admin`, `ops`
- `POST /webhook` -> Public (no auth, called by Cashfree)
- `GET /` -> `admin`, `ops`
- `GET /:id` -> `admin`, `ops`

---

## 1. Create Order

Create a payment order for a package and optionally apply a coupon.

**Endpoint:** `POST /create-order`

**Allowed Roles:** `user`, `admin`, `ops`

### Request Body

| Field        | Type    | Required | Description |
|--------------|---------|----------|-------------|
| `packageId`  | integer | Yes      | Package ID to purchase. Must be positive. |
| `couponCode` | string  | No       | Coupon code to apply discount. |

### Example Request

```json
{
  "packageId": 1,
  "couponCode": "SUMMER20"
}
```

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order created successfully",
  "data": {
    "orderId": 123,
    "amount": 4000,
    "discountAmount": 1000,
    "paymentSessionId": "cf_session_xxx"
  }
}
```

### Common Error Responses

| Status | Message |
|--------|---------|
| `400`  | `packageId is required` / `packageId must be a positive integer` |
| `400`  | `Invalid packageId` |
| `400`  | Coupon validation errors (`Invalid coupon code`, `Coupon not applicable for this package`, etc.) |
| `404`  | `Package not found` |
| `500`  | `Failed to create order` |

---

## 2. Verify Payment

Check payment status for a Cashfree order. If local status is pending, the API fetches order status from Cashfree as fallback.

**Endpoint:** `GET /verify-payment/:orderId`

**Allowed Roles:** `user`, `admin`, `ops`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `orderId` | string | Yes      | Cashfree order ID. |

### Example

`GET /api/v1/payment/verify-payment/WENS_1_1750000000000`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "orderId": 123,
    "status": "PAID",
    "amount": 4000
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`orderId is required`) |
| `404`  | `Order not found` |

---

## 3. Cashfree Webhook

Receive payment status webhooks from Cashfree.

**Endpoint:** `POST /webhook`

**Allowed Roles:** Public (no auth)

### Headers

| Header                | Required | Description |
|-----------------------|----------|-------------|
| `x-webhook-signature` | Yes      | Cashfree webhook signature. |
| `x-webhook-timestamp` | Yes      | Cashfree webhook timestamp. |

### Behavior

- Verifies webhook signature using Cashfree SDK.
- Handles `PAYMENT_SUCCESS_WEBHOOK`:
  - Marks order as `PAID`.
  - Creates subscription for the paid package.
- Handles `PAYMENT_FAILED_WEBHOOK`:
  - Marks order as `FAILED`.

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "success": true
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | `Invalid signature` |
| `404`  | `Order not found` |
| `500`  | `Failed to process webhook` |

---

## 4. List Payments

Retrieve paginated payment (order) records with optional search.

**Endpoint:** `GET /`

**Allowed Roles:** `admin`, `ops`

### Query Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `page`    | integer | 1       | Page number. |
| `limit`   | integer | 10      | Records per page. |
| `search`  | string  | `""`    | Search by user name, package name, cashfreeOrderId, or paymentId. |

### Example

`GET /api/v1/payment?page=1&limit=10&search=wens`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "payments": [
      {
        "id": 123,
        "userId": 10,
        "packageId": 1,
        "amount": 5000,
        "discountAmount": 1000,
        "finalAmount": 4000,
        "couponCode": "SUMMER20",
        "status": "PAID",
        "cashfreeOrderId": "WENS_1_1750000000000",
        "paymentId": "cf_pay_xxx",
        "user": {
          "id": 10,
          "name": "Rahul",
          "email": "rahul@example.com"
        },
        "package": {
          "id": 1,
          "name": "Premium Package",
          "description": "Premium city package",
          "regularPrice": 5000,
          "discountedPrice": 4000
        }
      }
    ],
    "totalCount": 1,
    "page": 1,
    "limit": 10
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `500`  | `Failed to fetch payments` |

---

## 5. Get Payment by ID

Get payment (order) details by internal order ID.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Internal order ID. |

### Example

`GET /api/v1/payment/123`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": 123,
    "userId": 10,
    "packageId": 1,
    "amount": 5000,
    "discountAmount": 1000,
    "finalAmount": 4000,
    "couponCode": "SUMMER20",
    "status": "PAID",
    "cashfreeOrderId": "WENS_1_1750000000000",
    "paymentId": "cf_pay_xxx",
    "user": {
      "id": 10,
      "name": "Rahul",
      "email": "rahul@example.com",
      "mobileNumber": "9999999999"
    },
    "package": {
      "id": 1,
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
| `400`  | Validation error (`id is required`) |
| `404`  | `Payment not found` |
| `500`  | `Failed to fetch payment` |

---

## Notes

- Payment records are stored in the `Order` table.
- `status` values currently used in payment flow: `PENDING`, `PAID`, `FAILED`.
- On successful webhook, subscription creation is triggered automatically.
- The webhook endpoint expects raw request body for signature verification.
