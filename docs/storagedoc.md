# Storage API Documentation

Base Path: `/api/v1/upload`

---

## Table of Contents

1. [Get Presigned Upload URL](#1-get-presigned-upload-url)
2. [Delete Image](#2-delete-image)
3. [Upload Flow](#3-upload-flow)

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

**Error responses** also include an optional `errors` array (from validation failures):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Bad request",
  "errors": [{ "msg": "contentType is required", "path": "contentType" }]
}
```

---

## Auth & Roles

These endpoints currently do **not** require authentication.

---

## 1. Get Presigned Upload URL

Generate a short-lived presigned `PUT` URL to upload an image directly to S3 from the client.

**Endpoint:** `POST /presign`

### Request Body

| Field         | Type   | Required | Description                                                                 |
|---------------|--------|----------|-----------------------------------------------------------------------------|
| `filename`    | string | Yes      | Original filename (e.g. `photo.jpg`). Used for reference only.              |
| `contentType` | string | Yes      | MIME type of the image. Must be one of the [allowed types](#allowed-image-types). |
| `sizeMB`      | number | No       | File size in MB. Must not exceed `10 MB` if provided.                       |
| `folder`      | string | No       | S3 folder to upload into. Defaults to `services`. See [folders](#s3-folders). |

**Example:**
```json
{
  "filename": "profile.jpg",
  "contentType": "image/jpeg",
  "sizeMB": 2.5,
  "folder": "packages"
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/packages/2026-06-04/uuid.jpg?X-Amz-...",
    "publicUrl": "https://bucket.s3.ap-south-1.amazonaws.com/packages/2026-06-04/uuid.jpg",
    "key": "packages/2026-06-04/3f2a1b-uuid.jpg"
  }
}
```

| Field            | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `data.uploadUrl` | Presigned S3 `PUT` URL. Valid for **5 minutes**. Use this to upload the file. |
| `data.publicUrl` | Permanent public URL of the image once uploaded. **Save this in your DB.**  |
| `data.key`       | S3 object key. **Save this** to delete the image later if needed.           |

#### Error Responses

| Status | Message                                                               | Cause                         |
|--------|-----------------------------------------------------------------------|-------------------------------|
| `400`  | `"filename is required"`                                 | Missing `filename`                         |
| `400`  | `"contentType is required"`                              | Missing `contentType`                      |
| `400`  | `"File type not allowed. Allowed: image/jpeg, image/png, image/webp"` | Unsupported MIME type        |
| `400`  | `"File too large. Max allowed: 10MB"`                    | `sizeMB` exceeds limit                     |
| `400`  | `"Invalid folder. Allowed: services, packages"`          | Unknown `folder` value                     |
| `500`  | `"Failed to generate presigned URL"`                     | Server/AWS error                           |

---

## 2. Delete Image

Delete an image from S3 by its key. Call this when a resource creation fails after upload to avoid orphaned files.

**Endpoint:** `DELETE /delete`

### Request Body

| Field | Type   | Required | Description                                   |
|-------|--------|----------|-----------------------------------------------|
| `key` | string | Yes      | The S3 object key returned from `/presign`.   |

**Example:**
```json
{
  "key": "packages/2026-06-04/3f2a1b-uuid.jpg"
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Image deleted successfully"
  }
}
```

#### Error Responses

| Status | Message                    | Cause                |
|--------|----------------------------|----------------------|
| `400`  | `"Bad request"`            | Missing `key` field  |
| `500`  | `"Failed to delete image"` | Server/AWS error     |

---

## 3. Upload Flow

The recommended two-step flow for uploading an image:

### Step 1 — Get presigned URL

Call `POST /presign` to receive `uploadUrl`, `publicUrl`, and `key`.

### Step 2 — Upload directly to S3

Make a `PUT` request to the `uploadUrl` with the file as the raw binary body.

> **Required Headers for the S3 PUT request:**

| Header               | Value                        | Required | Description                                    |
|----------------------|------------------------------|----------|------------------------------------------------|
| `Content-Type`       | e.g. `image/jpeg`            | Yes      | Must match the `contentType` sent in Step 1.   |
| `Content-Disposition`| `inline`                     | Yes      | Ensures the image renders in browser directly. |

**Example (fetch):**
```js
await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": "image/jpeg",
    "Content-Disposition": "inline",
  },
  body: file, // raw File / Blob object
});
```

**Example (axios):**
```js
await axios.put(uploadUrl, file, {
  headers: {
    "Content-Type": "image/jpeg",
    "Content-Disposition": "inline",
  },
});
```

### Step 3 — Save `publicUrl` to your database

Once the upload succeeds (HTTP `200`), persist the `publicUrl` returned in Step 1 as the image URL in your resource.

### Step 4 — Cleanup on failure

If the resource creation fails after a successful upload, call `DELETE /delete` with the `key` to remove the orphaned image from S3.

---

## Reference

### Allowed Image Types

| MIME Type     | Extension |
|---------------|-----------|
| `image/jpeg`  | `.jpg`    |
| `image/png`   | `.png`    |
| `image/webp`  | `.webp`   |

### S3 Folders

| Folder value | Used for                        |
|--------------|---------------------------------|
| `services`   | Service thumbnail images (default) |
| `packages`   | Package thumbnail images        |

### Presigned URL Expiry

| Constant                 | Value      |
|--------------------------|------------|
| Presigned URL valid for  | 5 minutes  |
| Max file size            | 10 MB      |
