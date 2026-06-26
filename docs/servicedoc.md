# Service API Documentation

Base Path: `/api/v1/service`

---

## Table of Contents

1. [Create Service](#1-create-service)
2. [List Services](#2-list-services)
3. [Get Service by ID](#3-get-service-by-id)
4. [Update Service](#4-update-service)
5. [Delete Service](#5-delete-service)

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
  "errors": [{ "msg": "Service title is required", "path": "title" }]
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

## 1. Create Service

Create a new service.

**Endpoint:** `POST /create`

**Allowed Roles:** `admin`

### Request Body

| Field               | Type    | Required | Description                                |
|---------------------|---------|----------|--------------------------------------------|
| `title`             | string  | Yes      | Title of the service.                      |
| `description`       | string  | Yes      | Description of the service.                |
| `thumbnailUrlKey`   | string  | No       | S3 bucket key for the service thumbnail.   |
| `isActive`          | boolean | No       | Whether the service is active.             |

**Example:**
```json
{
  "title": "Home Cleaning",
  "description": "Professional home cleaning service.",
  "thumbnailUrlKey": "services/cleaning.jpg",
  "isActive": true
}
```

### Response

#### Success `201 Created`
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": 1,
    "title": "Home Cleaning",
    "description": "Professional home cleaning service.",
    "thumbnailUrlKey": "services/cleaning.jpg",
    "isActive": true,
    "createdAt": "2026-06-03T10:00:00.000Z",
    "updatedAt": "2026-06-03T10:00:00.000Z"
  }
}
```

**Note:** The response contains `thumbnailUrlKey`. To get the actual thumbnail URL (presigned S3 URL with 1-hour expiration), use the [Get Service by ID](#3-get-service-by-id) endpoint.

#### Error Responses

| Status | Message                          | Cause                    |
|--------|----------------------------------|--------------------------|
| `400`  | `"Service title is required"`    | Missing `title` field    |
| `400`  | `"Service description is required"` | Missing `description` field |
| `401`  | `"Unauthorized access"`          | Missing or invalid token |
| `403`  | `"Access forbidden"`             | Role not permitted       |
| `500`  | `"Failed to create service"`     | Server/DB error          |

---

## 2. List Services

Retrieve all services.

**Endpoint:** `GET /list`

**Allowed Roles:** `admin`

> No request body or query parameters required.

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "services": [
      {
        "id": 1,
        "title": "Home Cleaning",
        "description": "Professional home cleaning service.",
        "thumbnailUrlKey": "services/cleaning.jpg",
        "thumbnailUrl": "https://s3-bucket.amazonaws.com/services/cleaning.jpg?X-Amz-Algorithm=...",
        "isActive": true,
        "createdAt": "2026-06-03T10:00:00.000Z",
        "updatedAt": "2026-06-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
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
| `500`  | `"Failed to retrieve services"`  | Server/DB error          |

---

## 3. Get Service by ID

Retrieve a single service by its ID.

**Endpoint:** `GET /:id`

**Allowed Roles:** `admin`, `user`

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the service.  |

**Example:** `GET /api/v1/service/1`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Service retrieved successfully",
  "data": {
    "id": 1,
    "title": "Home Cleaning",
    "description": "Professional home cleaning service.",
    "thumbnailUrlKey": "services/cleaning.jpg",
    "thumbnailUrl": "https://s3-bucket.amazonaws.com/services/cleaning.jpg?X-Amz-Algorithm=...",
    "isActive": true,
    "createdAt": "2026-06-03T10:00:00.000Z",
    "updatedAt": "2026-06-03T10:00:00.000Z"
  }
}
```

**Note:** `thumbnailUrl` is a presigned S3 URL with 1-hour expiration. Use this URL directly in your frontend.

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"Service ID is required"`       | Missing `id` path param       |
| `401`  | `"Unauthorized access"`          | Missing or invalid token      |
| `403`  | `"Access forbidden"`             | Role not permitted            |
| `404`  | `"Service not found"`            | No service with the given ID  |
| `500`  | `"Failed to retrieve service"`   | Server/DB error               |

---

## 4. Update Service

Update an existing service by its ID.

**Endpoint:** `PUT /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the service.  |

### Request Body

| Field               | Type    | Required | Description                          |
|---------------------|---------|----------|--------------------------------------|
| `title`             | string  | No       | Updated title of the service.        |
| `description`       | string  | No       | Updated description.                 |
| `thumbnailUrlKey`   | string  | No       | Updated S3 key for thumbnail image.  |
| `isActive`          | boolean | No       | Updated active status.               |

**Example:** `PUT /api/v1/service/1`
```json
{
  "title": "Premium Home Cleaning",
  "isActive": false
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "id": 1,
    "title": "Premium Home Cleaning",
    "description": "Professional home cleaning service.",
    "thumbnailUrlKey": "services/cleaning.jpg",
    "isActive": false,
    "createdAt": "2026-06-03T10:00:00.000Z",
    "updatedAt": "2026-06-03T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"Service ID is required"`       | Missing `id` path param       |
| `401`  | `"Unauthorized access"`          | Missing or invalid token      |
| `403`  | `"Access forbidden"`             | Role not permitted            |
| `500`  | `"Failed to update service"`     | Server/DB error               |

---

## 5. Delete Service

Delete a service by its ID.

**Endpoint:** `DELETE /:id`

**Allowed Roles:** `admin`

### Path Parameters

| Parameter | Type    | Required | Description         |
|-----------|---------|----------|---------------------|
| `id`      | integer | Yes      | ID of the service.  |

**Example:** `DELETE /api/v1/service/1`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

#### Error Responses

| Status | Message                          | Cause                         |
|--------|----------------------------------|-------------------------------|
| `400`  | `"Service ID is required"`       | Missing `id` path param       |
| `401`  | `"Unauthorized access"`          | Missing or invalid token      |
| `403`  | `"Access forbidden"`             | Role not permitted            |
| `500`  | `"Failed to delete service"`     | Server/DB error               |
