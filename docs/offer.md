# Offer API Documentation

Base Path: `/api/v1/homepage`

---

## Table of Contents

1. [Create Offer](#1-create-offer)
2. [Update Offer](#2-update-offer)
3. [Delete Offer](#3-delete-offer)
4. [Get Offer by Category](#4-get-offer-by-category)
5. [Get Offer by ID](#5-get-offer-by-id)
6. [Get All Offers](#6-get-all-offers)

---

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true | false,
  "statusCode": 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500,
  "message": "Human-readable message",
  "data": { ... } | null
}
```

**Validation error response includes an `errors` array:**

```json
{
  "errors": [
    { "msg": "Slug is required", "path": "slug" }
  ]
}
```

---

## Auth & Roles

Endpoints (except for public GET by category) require authentication.

| Header          | Value                  | Required |
|-----------------|------------------------|----------|
| `Authorization` | `Bearer <accessToken>` | Yes      |

Role access per endpoint is listed in each section.

---

## 1. Create Offer

Create a new offer with its benefits.

**Endpoint:** `POST /offer`

**Allowed Roles:** `admin`, `ops`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `slug` | string | Yes | Unique string identifier (e.g. `founding-member-2026`). |
| `isActive` | boolean | No | Whether the offer is active. On creation, this is always saved as `true` in the database. |
| `startDate` | date | No | Start date of the offer in ISO8601 format. |
| `endDate` | date | Yes | Expiration date of the offer in ISO8601 format. |
| `category` | string | Yes | Offer category (e.g. `premium`). |
| `alertText` | string | No | Custom banner alert text (e.g. `Access Closes {date} — 11:59 PM IST`). |
| `eyebrow` | string | No | Small text preceding the title. |
| `title` | string | Yes | Main heading title. |
| `titleAccent` | string | No | Highlighted portion of the title. |
| `description` | string | No | Short description of the offer. |
| `countdownLabel` | string | No | Label for the countdown timer. |
| `pricingLabel` | string | No | Label for pricing rates. |
| `benefitsHeading` | string | No | Heading for the benefits section. |
| `deadlineNoteStrong` | string | No | Bold text in the deadline description. |
| `deadlineNoteBody` | string | No | Body text in the deadline description. |
| `ctaPrimaryText` | string | No | Primary action button text. |
| `ctaPrimaryHref` | string | No | Primary action URL redirect link. |
| `featuredPackageId` | integer | No | ID of the linked featured Package. |
| `ctaSecondaryText` | string | No | Secondary action button text. |
| `footerNote` | string | No | Note displayed in the footer. |
| `benefits` | array | No | Array of benefits linked to the offer. |
| `benefits.*.icon` | string | Yes | Benefit icon string (e.g. `Tag`, `Star`, `CheckCircle`). |
| `benefits.*.title` | string | Yes | Benefit header title. |
| `benefits.*.description` | string | Yes | Detailed benefit description text. |
| `benefits.*.order` | integer | No | Display sorting order (default is `0`). |

**Example Input:**
```json
{
  "slug": "founding-member-2026",
  "isActive": true,
  "startDate": "2026-07-01T00:00:00.000Z",
  "endDate": "2026-07-31T23:59:59.000Z",
  "category": "premium",
  "alertText": "Access Closes {date} — 11:59 PM IST",
  "eyebrow": "Financial Year Founding Member Access",
  "title": "Lock In Founding Rates.",
  "titleAccent": "Before the FY Window Closes.",
  "description": "After {date}, all new members pay the updated price...",
  "countdownLabel": "Time remaining to claim founding rates",
  "pricingLabel": "Current founding rates — valid till {date}",
  "benefitsHeading": "What you get as a founding member",
  "deadlineNoteStrong": "After {date}:",
  "deadlineNoteBody": "New memberships will be onboarded at the updated pricing...",
  "ctaPrimaryText": "Claim Founding Rate — {packageName}",
  "ctaPrimaryHref": "/booking/premium",
  "featuredPackageId": 1,
  "ctaSecondaryText": "Ask Concierge →",
  "footerNote": "wensforce.com · +91-73046 07954 · Founding access closes {date}",
  "benefits": [
    {
      "icon": "Tag",
      "title": "Current FY Pricing",
      "description": "You pay today's rate for this membership year.",
      "order": 1
    },
    {
      "icon": "Star",
      "title": "VIP Treatment",
      "description": "Guaranteed VIP perks on all trips.",
      "order": 2
    }
  ]
}
```

### Response

#### Success `201 Created`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Offer created successfully",
  "data": {
    "id": 1,
    "slug": "founding-member-2026",
    "isActive": true,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "category": "premium",
    "alertText": "Access Closes {date} — 11:59 PM IST",
    "eyebrow": "Financial Year Founding Member Access",
    "title": "Lock In Founding Rates.",
    "titleAccent": "Before the FY Window Closes.",
    "description": "After {date}, all new members pay the updated price...",
    "countdownLabel": "Time remaining to claim founding rates",
    "pricingLabel": "Current founding rates — valid till {date}",
    "benefitsHeading": "What you get as a founding member",
    "deadlineNoteStrong": "After {date}:",
    "deadlineNoteBody": "New memberships will be onboarded at the updated pricing...",
    "ctaPrimaryText": "Claim Founding Rate — {packageName}",
    "ctaPrimaryHref": "/booking/premium",
    "featuredPackageId": 1,
    "ctaSecondaryText": "Ask Concierge →",
    "footerNote": "wensforce.com · +91-73046 07954 · Founding access closes {date}",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:00:00.000Z",
    "benefits": [
      {
        "id": 1,
        "offerId": 1,
        "icon": "Tag",
        "title": "Current FY Pricing",
        "description": "You pay today's rate for this membership year.",
        "order": 1
      },
      {
        "id": 2,
        "offerId": 1,
        "icon": "Star",
        "title": "VIP Treatment",
        "description": "Guaranteed VIP perks on all trips.",
        "order": 2
      }
    ]
  }
}
```

---

## 2. Update Offer

Update details of an existing offer, including modifying its benefits list.

**Endpoint:** `PUT /offer/:id`

**Allowed Roles:** `admin`, `ops`

### Request Body

Supports partial updates. Same schema as `Create Offer`. If `benefits` is sent, it replaces all existing benefits associated with the offer.

**Example Input:**
```json
{
  "title": "Updated Founding Rates Title",
  "isActive": false
}
```

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Offer updated successfully",
  "data": {
    "id": 1,
    "slug": "founding-member-2026",
    "isActive": false,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "category": "premium",
    "alertText": "Access Closes {date} — 11:59 PM IST",
    "eyebrow": "Financial Year Founding Member Access",
    "title": "Updated Founding Rates Title",
    "titleAccent": "Before the FY Window Closes.",
    "description": "After {date}, all new members pay the updated price...",
    "countdownLabel": "Time remaining to claim founding rates",
    "pricingLabel": "Current founding rates — valid till {date}",
    "benefitsHeading": "What you get as a founding member",
    "deadlineNoteStrong": "After {date}:",
    "deadlineNoteBody": "New memberships will be onboarded at the updated pricing...",
    "ctaPrimaryText": "Claim Founding Rate — {packageName}",
    "ctaPrimaryHref": "/booking/premium",
    "featuredPackageId": 1,
    "ctaSecondaryText": "Ask Concierge →",
    "footerNote": "wensforce.com · +91-73046 07954 · Founding access closes {date}",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:05:00.000Z",
    "benefits": [
      {
        "id": 1,
        "offerId": 1,
        "icon": "Tag",
        "title": "Current FY Pricing",
        "description": "You pay today's rate for this membership year.",
        "order": 1
      },
      {
        "id": 2,
        "offerId": 1,
        "icon": "Star",
        "title": "VIP Treatment",
        "description": "Guaranteed VIP perks on all trips.",
        "order": 2
      }
    ]
  }
}
```

---

## 3. Delete Offer

Delete an offer and all associated benefits from the system.

**Endpoint:** `DELETE /offer/:id`

**Allowed Roles:** `admin`, `ops`

### Response

#### Success `204 No Content`
*(Empty response body)*

---

## 4. Get Offer by Category

Retrieve the active offer matching the requested category name.

**Endpoint:** `GET /offer/category/:category`

**Allowed Roles:** `Public` (all users, no authentication required)

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Offer fetched successfully",
  "data": {
    "id": 1,
    "slug": "founding-member-2026",
    "isActive": true,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "category": "premium",
    "alertText": "Access Closes {date} — 11:59 PM IST",
    "eyebrow": "Financial Year Founding Member Access",
    "title": "Lock In Founding Rates.",
    "titleAccent": "Before the FY Window Closes.",
    "description": "After {date}, all new members pay the updated price...",
    "countdownLabel": "Time remaining to claim founding rates",
    "pricingLabel": "Current founding rates — valid till {date}",
    "benefitsHeading": "What you get as a founding member",
    "deadlineNoteStrong": "After {date}:",
    "deadlineNoteBody": "New memberships will be onboarded at the updated pricing...",
    "ctaPrimaryText": "Claim Founding Rate — {packageName}",
    "ctaPrimaryHref": "/booking/premium",
    "featuredPackageId": 1,
    "ctaSecondaryText": "Ask Concierge →",
    "footerNote": "wensforce.com · +91-73046 07954 · Founding access closes {date}",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:00:00.000Z",
    "benefits": [
      {
        "id": 1,
        "offerId": 1,
        "icon": "Tag",
        "title": "Current FY Pricing",
        "description": "You pay today's rate for this membership year.",
        "order": 1
      },
      {
        "id": 2,
        "offerId": 1,
        "icon": "Star",
        "title": "VIP Treatment",
        "description": "Guaranteed VIP perks on all trips.",
        "order": 2
      }
    ],
    "featuredPackage": {
      "id": 1,
      "name": "Founding Package",
      "regularPrice": 1000,
      "discountedPrice": 800,
      "isActive": true
    }
  }
}
```

## 5. Get Offer by ID

Retrieve a specific offer by its unique numeric ID.

**Endpoint:** `GET /offer/:id`

**Allowed Roles:** `Public` (all users, no authentication required)

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Offer fetched successfully",
  "data": {
    "id": 1,
    "slug": "founding-member-2026",
    "isActive": true,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-31T23:59:59.000Z",
    "category": "premium",
    "alertText": "Access Closes {date} — 11:59 PM IST",
    "eyebrow": "Financial Year Founding Member Access",
    "title": "Lock In Founding Rates.",
    "titleAccent": "Before the FY Window Closes.",
    "description": "After {date}, all new members pay the updated price...",
    "countdownLabel": "Time remaining to claim founding rates",
    "pricingLabel": "Current founding rates — valid till {date}",
    "benefitsHeading": "What you get as a founding member",
    "deadlineNoteStrong": "After {date}:",
    "deadlineNoteBody": "New memberships will be onboarded at the updated pricing...",
    "ctaPrimaryText": "Claim Founding Rate — {packageName}",
    "ctaPrimaryHref": "/booking/premium",
    "featuredPackageId": 1,
    "ctaSecondaryText": "Ask Concierge →",
    "footerNote": "wensforce.com · +91-73046 07954 · Founding access closes {date}",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:00:00.000Z",
    "benefits": [
      {
        "id": 1,
        "offerId": 1,
        "icon": "Tag",
        "title": "Current FY Pricing",
        "description": "You pay today's rate for this membership year.",
        "order": 1
      }
    ],
    "featuredPackage": {
      "id": 1,
      "name": "Founding Package",
      "regularPrice": 1000,
      "discountedPrice": 800,
      "isActive": true
    }
  }
}
```

---

## 6. Get All Offers

Retrieve a list of all offers in the system (useful for administration).

**Endpoint:** `GET /offer`

**Allowed Roles:** `admin`, `ops`

### Response

#### Success `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All offers fetched successfully",
  "data": [
    {
      "id": 1,
      "slug": "founding-member-2026",
      "isActive": true,
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2026-07-31T23:59:59.000Z",
      "category": "premium",
      "alertText": "Access Closes {date} — 11:59 PM IST",
      "title": "Lock In Founding Rates.",
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ]
}
```
