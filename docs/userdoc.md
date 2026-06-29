# User API Documentation

Base Path: `/api/v1/user`

---

## Table of Contents

1. [Create User](#1-create-user)
2. [List Users](#2-list-users)
3. [Get User by ID](#3-get-user-by-id)
4. [Update User](#4-update-user)

---

## Response Format

Most success responses follow:

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

Other errors may return:

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Failed to fetch user",
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

- `POST /` -> `admin`
- `GET /` -> `admin`
- `GET /:id` -> `admin`
- `PUT /:id` -> `admin`

---

## 1. Create User

Create a new user.

**Endpoint:** `POST /`

**Allowed Roles:** `admin`

### Request Body

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `name`         | string | Yes      | User name. |
| `email`        | string | Yes      | Valid email address. |
| `mobileNumber` | string | Yes      | Mobile number. |
| `role`         | string | Yes      | User role (`user`, `admin`, `ops`). |
| `city`         | string | Yes      | City name. |

### Example Request

```json
{
  "name": "Rahul",
  "email": "rahul@example.com",
  "mobileNumber": "9999999999",
  "role": "user",
  "city": "Delhi"
}
```

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": 201,
  "data": {
    "id": 1,
    "name": "Rahul",
    "email": "rahul@example.com",
    "mobileNumber": "9999999999",
    "role": "user",
    "city": "Delhi",
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (required fields / invalid email) |
| `500`  | `Failed to create user` |

---

## 2. List Users

Retrieve paginated users with optional search.

**Endpoint:** `GET /`

**Allowed Roles:** `admin`

### Query Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `search`  | string  | -       | Search in `name`, `email`, `mobileNumber`, `city`. |
| `limit`   | integer | 10      | Number of users per page. |
| `page`    | integer | 1       | Page number. |

### Example

`GET /api/v1/user?search=rahul&limit=10&page=1`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": 200,
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Rahul",
        "mobileNumber": "9999999999",
        "role": "user",
        "city": "Delhi",
        "createdAt": "2026-06-27T10:00:00.000Z",
        "updatedAt": "2026-06-27T10:00:00.000Z"
      }
    ],
    "meta": {
      "totalUsers": 1,
      "currentPage": 1,
      "totalPages": 1,
      "pageSize": 10
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `500`  | `Failed to fetch users` |

---

## 3. Get User by ID

Retrieve single user details by ID, including orders and subscriptions.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | User ID. |

### Example

`GET /api/v1/user/1`

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": 200,
  "data": {
    "id": 1,
    "name": "Rahul",
    "email": "rahul@example.com",
    "mobileNumber": "9999999999",
    "role": "user",
    "city": "Delhi",
    "orders": [],
    "subscriptions": []
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error (`ID must be an integer`) |
| `404`  | `User not found` |
| `500`  | `Failed to fetch user` |

---

## 4. Update User

Update user fields by ID.

**Endpoint:** `PUT /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | User ID. |

### Request Body

All fields are optional.

| Field          | Type   | Description |
|----------------|--------|-------------|
| `name`         | string | User name (non-empty). |
| `email`        | string | Valid email. |
| `mobileNumber` | string | Mobile number (non-empty). |
| `role`         | string | Role (non-empty). |
| `city`         | string | City (non-empty). |

### Example Request

```json
{
  "name": "Rahul Sharma",
  "city": "Noida"
}
```

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "id": 1,
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "mobileNumber": "9999999999",
    "role": "user",
    "city": "Noida"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `500`  | `Failed to update user` |

---

## Notes

- User routes are currently admin-only.
- `GET /:id` includes related `orders` and `subscriptions`.
- `GET /` returns a compact user list (does not include email).
