# Auth API Documentation

Base Path: `/api/auth` (or wherever auth routes are mounted)

---

## Table of Contents

1. [Send OTP](#1-send-otp)
2. [Verify OTP](#2-verify-otp)
3. [Resend OTP](#3-resend-otp)
4. [Refresh Token](#4-refresh-token)
5. [Logout](#5-logout)
6. [Get Current User](#6-get-current-user)

---

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true | false,
  "statusCode": 200,
  "message": "Human-readable message",
  "data": { ... } | null
}
```

**Error response also includes optional `errors` array** (from validation failures):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error",
  "errors": [{ "msg": "Mobile number is required", "path": "mobileNumber" }]
}
```

---

## 1. Send OTP

Send a one-time password to the given mobile number.

**Endpoint:** `POST /send-otp`

**Auth Required:** No

### Request Body

| Field          | Type   | Required | Description                                        |
|----------------|--------|----------|----------------------------------------------------|
| `mobileNumber` | string | Yes      | Valid mobile number **with country code** (e.g. `+919876543210`). 10–15 digits. |

**Example:**
```json
{
  "mobileNumber": "+919876543210"
}
```

### Response

#### Success `201 Created`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "OTP sent successfully",
  "data": {
    "otp": "482910"
  }
}
```
> **Note:** `otp` is returned in the response only in development/testing. Remove in production.

#### Error Responses

| Status | Message                                                  | Cause                           |
|--------|----------------------------------------------------------|---------------------------------|
| `400`  | `"Mobile number is required"`                            | Missing field                   |
| `400`  | `"Invalid mobile number format - must include country code"` | Bad format               |
| `400`  | `"Mobile number must be between 10 and 15 digits"`       | Length violation                |
| `500`  | `"Failed to send OTP"`                                   | Server/Redis error              |

---

## 2. Verify OTP

Verify the OTP and authenticate the user. Creates a new user if one does not exist.

**Endpoint:** `POST /verify-otp`

**Auth Required:** No

### Request Body

| Field          | Type   | Required | Description                                                   |
|----------------|--------|----------|---------------------------------------------------------------|
| `mobileNumber` | string | Yes      | Mobile number with country code (10–15 digits).               |
| `otp`          | string | Yes      | 6-digit OTP received on the mobile number.                    |

**Example:**
```json
{
  "mobileNumber": "+919876543210",
  "otp": "482910"
}
```

### Response

#### Success `200 OK`

Sets a `refreshToken` **HttpOnly cookie** (expires in 30 days).

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully",
  "data": {
    "accessToken": "<JWT — expires in 1h>",
    "refreshToken": "<JWT — expires in 30d>",
    "user": {
      "id": "clxyz...",
      "mobileNumber": "+919876543210",
      "name": null,
      "role": "user",
      "createdAt": "2026-06-02T10:00:00.000Z",
      "updatedAt": "2026-06-02T10:00:00.000Z"
    }
  }
}
```

> `refreshTokens` array is stripped from the user object before sending.

#### Cookie Set

| Name           | HttpOnly | Secure (prod) | SameSite | Max-Age  |
|----------------|----------|---------------|----------|----------|
| `refreshToken` | Yes      | Yes           | Strict   | 30 days  |

#### JWT Payload

Both `accessToken` and `refreshToken` carry the same payload:

```json
{
  "userId": "clxyz...",
  "role": "user",
  "mobileNumber": "+919876543210"
}
```

#### Error Responses

| Status | Message                                                                    | Cause                                  |
|--------|----------------------------------------------------------------------------|----------------------------------------|
| `400`  | `"Mobile number is required"` / `"OTP is required"` (validation errors)   | Missing or invalid fields              |
| `400`  | `"Invalid or expired OTP"`                                                 | OTP not found in Redis or wrong OTP    |
| `403`  | `"Too many failed attempts. Please try again after X minutes."`            | User is blocked after max OTP attempts |
| `500`  | `"Failed to verify OTP"`                                                   | Server/Redis/DB error                  |

---

## 3. Resend OTP

Resend a fresh OTP to the mobile number (invalidates any previously sent OTP).

**Endpoint:** `POST /resend-otp`

**Auth Required:** No

### Request Body

| Field          | Type   | Required | Description                                     |
|----------------|--------|----------|-------------------------------------------------|
| `mobileNumber` | string | Yes      | Valid mobile number with country code (10–15 digits). |

**Example:**
```json
{
  "mobileNumber": "+919876543210"
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP resent successfully",
  "data": {
    "otp": "193847"
  }
}
```
> **Note:** `otp` in response body is for testing only.

#### Error Responses

| Status | Message                                                            | Cause               |
|--------|--------------------------------------------------------------------|---------------------|
| `400`  | Validation errors (same as Send OTP)                               | Invalid input       |
| `500`  | `"Failed to resend OTP"`                                           | Server/Redis error  |

---

## 4. Refresh Token

Exchange a valid refresh token for a new access token and refresh token (rotation).

**Endpoint:** `POST /refresh-token`

**Auth Required:** No (uses cookie)

### Cookie Required

| Name           | Description                              |
|----------------|------------------------------------------|
| `refreshToken` | HttpOnly cookie set during `verify-otp`. |

> No request body is needed.

### Response

#### Success `200 OK`

Rotates the refresh token — sets a **new** `refreshToken` cookie.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "<new JWT — expires in 1h>",
    "refreshToken": "<new JWT — expires in 30d>"
  }
}
```

#### Error Responses

| Status | Message                              | Cause                                          |
|--------|--------------------------------------|------------------------------------------------|
| `400`  | `"Refresh token is required"`        | Cookie missing (validation)                    |
| `401`  | `"Invalid refresh token"`            | Token is malformed or JWT verification failed  |
| `401`  | `"Invalid refresh token"`            | User not found in DB                           |
| `401`  | `"Invalid or expired refresh token"` | Token not in user's token array or expired     |
| `500`  | `"Failed to refresh token"`          | Server/DB error                                |

---

## 5. Logout

Invalidate the current session by removing the refresh token from the user's token list.

**Endpoint:** `POST /logout`

**Auth Required:** No (uses cookie)

### Cookie Required

| Name           | Description                                |
|----------------|--------------------------------------------|
| `refreshToken` | HttpOnly cookie set during `verify-otp`.   |

> No request body is needed.

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null
}
```

#### Error Responses

| Status | Message                                    | Cause                               |
|--------|--------------------------------------------|-------------------------------------|
| `400`  | `"Refresh token is required"`              | Cookie missing (validation)         |
| `401`  | `"Refresh token is required for logout"`   | Cookie not present in request       |
| `500`  | `"Failed to logout"`                       | Server/DB error                     |

---

## 6. Get Current User

Fetch the authenticated user's profile.

**Endpoint:** `GET /me`

**Auth Required:** Yes — Bearer token

**Allowed Roles:** `user`, `admin`, `ops`

### Headers

| Header          | Value                        | Required |
|-----------------|------------------------------|----------|
| `Authorization` | `Bearer <accessToken>`       | Yes      |

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "clxyz...",
    "mobileNumber": "+919876543210",
    "name": null,
    "role": "user",
    "createdAt": "2026-06-02T10:00:00.000Z",
    "updatedAt": "2026-06-02T10:00:00.000Z"
  }
}
```
> `refreshTokens` array is stripped before sending.

#### Error Responses

| Status | Message                        | Cause                                  |
|--------|--------------------------------|----------------------------------------|
| `401`  | `"Unauthorized access"`        | Missing or invalid access token        |
| `403`  | `"Access forbidden"`           | Role not permitted                     |
| `404`  | `"User not found"`             | User ID from token not in DB           |
| `500`  | `"Failed to fetch user profile"` | Server/DB error                      |

---

## OTP Rate Limiting (Redis)

| Constant         | Value       | Description                                  |
|------------------|-------------|----------------------------------------------|
| `OTP_EXPIRY`     | 10 minutes  | OTP is valid for 10 minutes after generation |
| `MAX_ATTEMPTS`   | Configurable | Max failed verify attempts before block     |
| `BLOCK_DURATION` | Configurable | Duration of block after exceeding attempts  |
| `RESEND_LIMIT`   | Configurable | Max OTP resend requests within window       |
| `RESEND_EXPIRY`  | Configurable | Resend rate-limit window duration           |

---

## Token Summary

| Token          | Stored In          | Expiry  | Secret Env Var           |
|----------------|--------------------|---------|--------------------------|
| `accessToken`  | Response body      | 1 hour  | `ACCESS_TOKEN_SECRET`    |
| `refreshToken` | HttpOnly cookie + DB | 30 days | `REFRESH_TOKEN_SECRET` |
