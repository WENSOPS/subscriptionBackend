# Trip API Documentation

Base Path: `/api/v1/trip`

---

## Table of Contents

1. [Request Trip](#1-request-trip)
2. [Create Trip (Admin/Ops)](#2-create-trip-adminops)
3. [Get My Trips](#3-get-my-trips)
4. [Approve Trip](#4-approve-trip)
5. [Get All Trips](#5-get-all-trips)
6. [Update Trip](#6-update-trip)
7. [Delete Trip](#7-delete-trip)
8. [Get Trip by ID](#8-get-trip-by-id)

---

## Response Format

Success responses generally follow:

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
  "errors": [{ "msg": "Trip ID must be an integer", "path": "id" }]
}
```

---

## Auth & Roles

All endpoints require a Bearer token in the `Authorization` header.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes      |

Role access per endpoint:

- `POST /request` -> `user`, `admin`, `ops`
- `POST /create` -> `admin`, `ops`
- `GET /mine` -> `user`, `admin`, `ops`
- `POST /approve/:id` -> `admin`, `ops`
- `GET /get-all` -> `admin`, `ops`
- `PUT /update/:id` -> `admin`, `ops`
- `DELETE /delete/:id` -> `admin`, `ops`
- `GET /:id` -> `admin`, `ops`

---

## 1. Request Trip

User-facing trip request creation.

**Endpoint:** `POST /request`

**Allowed Roles:** `user`, `admin`, `ops`

### Request Body

| Field            | Type            | Required | Description |
|------------------|-----------------|----------|-------------|
| `subscriptionId` | integer         | Yes (used by controller) | Subscription ID. |
| `pickupLocation` | string          | Yes      | Pickup location. |
| `dropLocation`   | string          | Yes      | Drop location. |
| `tripDate`       | ISO date string | Yes      | Trip date/time. |
| `tripType`       | string          | Yes      | One of `airport-transfer`, `8Hr/80Km`. |
| `services`       | array           | Yes      | Array of selected services. |
| `services[].name`| string          | Yes      | Service name. |
| `services[].price`| number         | Yes      | Positive service price. |

### Example Request

```json
{
  "subscriptionId": 5,
  "pickupLocation": "Airport Terminal 3",
  "dropLocation": "Gurgaon Sector 45",
  "tripDate": "2026-07-01T10:30:00.000Z",
  "tripType": "airport-transfer",
  "services": [
    { "name": "Bodyguard", "price": 1200 },
    { "name": "SUV", "price": 2500 }
  ]
}
```

### Success Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Resource created successfully",
  "data": {
    "id": 101,
    "subscriptionId": 5,
    "pickupLocation": "Airport Terminal 3",
    "dropLocation": "Gurgaon Sector 45",
    "tripType": "airport-transfer",
    "status": "requested"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `500`  | `Failed to request trip` |

---

## 2. Create Trip (Admin/Ops)

Admin/Ops creates a trip directly (auto-confirmed).

**Endpoint:** `POST /create`

**Allowed Roles:** `admin`, `ops`

### Request Body

| Field             | Type            | Required | Description |
|-------------------|-----------------|----------|-------------|
| `assignmentId`    | string          | Yes      | Assignment reference. |
| `subscriptionId`  | integer         | Yes      | Subscription ID. |
| `pickupLocation`  | string          | Yes      | Pickup location. |
| `dropLocation`    | string          | Yes      | Drop location. |
| `tripDate`        | ISO date string | Yes      | Trip date/time. |
| `tripType`        | string          | Yes      | One of `airport-transfer`, `8Hr/80Km`. |
| `userId`          | integer         | Yes (used by controller) | Target user ID. |
| `services`        | array           | Yes      | Array of selected services. |
| `services[].name` | string          | Yes      | Service name. |
| `services[].price`| number          | Yes      | Positive service price. |

### Success Response `201 Created`

Returns created trip with `status: confirmed`.

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `500`  | `Failed to create trip` |

---

## 3. Get My Trips

Get all trips for authenticated user.

**Endpoint:** `GET /mine`

**Allowed Roles:** `user`, `admin`, `ops`

### Success Response `200 OK`

Returns an array of trip records for `req.user.userId`.

### Error Responses

| Status | Message |
|--------|---------|
| `500`  | `Failed to fetch trips` |

---

## 4. Approve Trip

Approve a requested trip and assign assignment ID.

**Endpoint:** `POST /approve/:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Trip ID. |

### Request Body

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `assignmentId` | string | Yes      | Assignment reference. |

### Success Response `200 OK`

Returns updated trip with:
- `status: confirmed`
- `confirmedBy` set to current admin/ops user ID

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `404`  | `Trip not found` |
| `500`  | `Failed to approve trip` |

---

## 5. Get All Trips

Get paginated trips with optional search and date filtering.

**Endpoint:** `GET /get-all`

**Allowed Roles:** `admin`, `ops`

### Query Parameters

| Parameter  | Type    | Default | Description |
|------------|---------|---------|-------------|
| `page`     | integer | 1       | Page number. |
| `limit`    | integer | 10      | Records per page. |
| `search`   | string  | `""`    | Search in pickup/drop/assignment/tripType/user name. |
| `tripDate` | date    | -       | Filter trips by date (same-day range). |

### Success Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "trips": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `500`  | `Failed to fetch trips` |

---

## 6. Update Trip

Update trip details by ID.

**Endpoint:** `PUT /update/:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Trip ID. |

### Request Body

Any updatable trip fields may be provided.

| Field             | Type            | Required | Description |
|-------------------|-----------------|----------|-------------|
| `assignmentId`    | string          | No       | Assignment reference. |
| `subscriptionId`  | integer         | Controller expects value when provided | Subscription ID. |
| `pickupLocation`  | string          | No       | Pickup location. |
| `dropLocation`    | string          | No       | Drop location. |
| `tripDate`        | ISO date string | No       | Trip date/time. |
| `tripType`        | string          | No       | One of `airport-transfer`, `8Hr/80Km`. |
| `services`        | array           | No       | Service list payload. |

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `500`  | `Failed to update trip` |

---

## 7. Delete Trip

Delete trip by ID.

**Endpoint:** `DELETE /delete/:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Trip ID. |

### Success Response `204 No Content`

No response body.

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | Validation error |
| `404`  | `Trip not found` |
| `500`  | `Failed to delete trip` |

---

## 8. Get Trip by ID

Get trip details by ID.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`, `ops`

### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| `id`      | integer | Yes      | Trip ID. |

### Success Response `200 OK`

Returns single trip object.

### Error Responses

| Status | Message |
|--------|---------|
| `404`  | `Trip not found` |
| `500`  | `Failed to fetch trip` |

---

## Notes

- `POST /create` sets status to `confirmed` by default.
- `POST /request` creates trip with the requesting user ID from auth token.
- `GET /get-all` includes user details in each trip (`include: { user: true }`).
- Trip type is currently restricted to `airport-transfer` and `8Hr/80Km` in validation.
