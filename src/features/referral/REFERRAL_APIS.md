# Referral System API Documentation

This document lists all available referral-related endpoints, their authorization requirements, request formats, and sample payloads.

All relative paths are prefixed by `/api/v1`.

---

## 1. User Endpoints

### 1.1 GET `/referral/summary`
Retrieve a summary of the authenticated user's referral details, including their code, list of referred users, and referral rewards list.
* **Authentication**: `admin`, `ops`, or `user` token required.
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "referralCode": "RAHUL4X2",
    "referredUsers": [
      {
        "id": 12,
        "name": "Aman",
        "mobileNumber": "98xxxxxx",
        "createdAt": "2026-07-23T12:00:00.000Z"
      }
    ],
    "rewards": [
      {
        "id": 5,
        "rewardAmountINR": 200,
        "eligiblePackageIds": [],
        "isRedeemed": false
      }
    ]
  }
}
```

### 1.2 POST `/referral/apply`
Apply a referral code to assign a referrer to the current user. Validates limits, registration dates, and triggers signup rewards if active.
* **Authentication**: `admin`, `ops`, or `user` token required.
* **Request Body**:
```json
{
  "referralCode": "RAHUL4X2"
}
```
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral code applied successfully",
  "data": null
}
```
* **Sample Error Responses**:
  * **Already Applied (400 Bad Request)**:
    ```json
    {
      "success": false,
      "statusCode": 400,
      "message": "Referral code has already been applied",
      "errors": null
    }
    ```
  * **Registration Expired (> 2 days old) (400 Bad Request)**:
    ```json
    {
      "success": false,
      "statusCode": 400,
      "message": "Referral code can only be applied within 2 days of registration",
      "errors": null
    }
    ```
  * **Self-Referral (400 Bad Request)**:
    ```json
    {
      "success": false,
      "statusCode": 400,
      "message": "Invalid referral code, or you cannot refer yourself",
      "errors": null
    }
    ```

---

## 2. Admin & Operations Endpoints

### 2.1 POST `/admin/referral-programs`
Create a new referral program configuration specifying limits, categories, and reward structures.
* **Authentication**: `admin` or `ops` token required.
* **Request Body**:
```json
{
  "name": "Summer Referral Drive 2026",
  "packageCategory": "premium",
  "startDate": "2026-08-01T00:00:00.000Z",
  "endDate": "2026-08-31T23:59:59.000Z",
  "programStatus": "active",
  "maxTotalRedemptions": 1000,
  "maxRedemptionsPerUser": 5,
  "rewardOnSignup": true,
  "referrerRewardType": "discount",
  "referrerRewardCalcType": "fixed",
  "referrerRewardValue": 250,
  "referrerPackageScope": "custom",
  "referrerTriggerPackageIds": [1, 2],
  "referrerAllowedPackageIds": [3, 4],
  "refereeRewardType": "discount",
  "refereeRewardCalcType": "fixed",
  "refereeRewardValue": 150,
  "refereePackageScope": "any",
  "refereeAllowedPackageIds": []
}
```
* **Sample Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Referral program created successfully",
  "data": {
    "id": 1,
    "name": "Summer Referral Drive 2026",
    "packageCategory": "premium",
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-08-31T23:59:59.000Z",
    "programStatus": "active",
    "maxTotalRedemptions": 1000,
    "totalRedemptionCount": 0,
    "maxRedemptionsPerUser": 5,
    "rewardOnSignup": true,
    "referrerRewardType": "discount",
    "referrerRewardCalcType": "fixed",
    "referrerRewardValue": 250,
    "referrerPackageScope": "custom",
    "refereeRewardType": "discount",
    "refereeRewardCalcType": "fixed",
    "refereeRewardValue": 150,
    "refereePackageScope": "any",
    "createdAt": "2026-07-23T13:40:00.000Z",
    "updatedAt": "2026-07-23T13:40:00.000Z",
    "referrerTriggerPackages": [
      { "id": 1, "referralProgramId": 1, "packageId": 1 },
      { "id": 2, "referralProgramId": 1, "packageId": 2 }
    ],
    "referrerAllowedPackages": [
      { "id": 1, "referralProgramId": 1, "packageId": 3 },
      { "id": 2, "referralProgramId": 1, "packageId": 4 }
    ],
    "refereeAllowedPackages": []
  }
}
```

### 2.2 GET `/admin/referral-programs`
Retrieve a list of all referral program configurations.
* **Authentication**: `admin` or `ops` token required.
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral programs retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Summer Referral Drive 2026",
      "packageCategory": "premium",
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2026-08-31T23:59:59.000Z",
      "programStatus": "active",
      "maxTotalRedemptions": 1000,
      "totalRedemptionCount": 0,
      "maxRedemptionsPerUser": 5,
      "rewardOnSignup": true,
      "referrerRewardType": "discount",
      "referrerRewardCalcType": "fixed",
      "referrerRewardValue": 250,
      "referrerPackageScope": "custom",
      "refereeRewardType": "discount",
      "refereeRewardCalcType": "fixed",
      "refereeRewardValue": 150,
      "refereePackageScope": "any",
      "createdAt": "2026-07-23T13:40:00.000Z",
      "updatedAt": "2026-07-23T13:40:00.000Z",
      "referrerTriggerPackages": [...],
      "referrerAllowedPackages": [...],
      "refereeAllowedPackages": [...]
    }
  ]
}
```

### 2.3 GET `/admin/referral-programs/:id`
Get full configuration details of a specific referral program.
* **Authentication**: `admin` or `ops` token required.
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral program retrieved successfully",
  "data": {
    "id": 1,
    "name": "Summer Referral Drive 2026",
    "packageCategory": "premium",
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-08-31T23:59:59.000Z",
    "programStatus": "active",
    "maxTotalRedemptions": 1000,
    "totalRedemptionCount": 0,
    "maxRedemptionsPerUser": 5,
    "rewardOnSignup": true,
    ...
  }
}
```

### 2.4 PATCH `/admin/referral-programs/:id`
Partially update a referral program's configuration (reward rules, dates, limits, status, allowed packages, etc.).
* **Authentication**: `admin` or `ops` token required.
* **Request Body** (All fields optional):
```json
{
  "programStatus": "paused",
  "referrerRewardValue": 300,
  "referrerAllowedPackageIds": [3, 4, 5]
}
```
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral program updated successfully",
  "data": {
    "id": 1,
    "name": "Summer Referral Drive 2026",
    "packageCategory": "premium",
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-08-31T23:59:59.000Z",
    "programStatus": "paused",
    "maxTotalRedemptions": 1000,
    "totalRedemptionCount": 0,
    "maxRedemptionsPerUser": 5,
    "rewardOnSignup": true,
    "referrerRewardType": "discount",
    "referrerRewardCalcType": "fixed",
    "referrerRewardValue": 300,
    "referrerPackageScope": "custom",
    "refereeRewardType": "discount",
    "refereeRewardCalcType": "fixed",
    "refereeRewardValue": 150,
    "refereePackageScope": "any",
    "createdAt": "2026-07-23T13:40:00.000Z",
    "updatedAt": "2026-07-23T13:43:00.000Z",
    "referrerTriggerPackages": [...],
    "referrerAllowedPackages": [
      { "id": 1, "referralProgramId": 1, "packageId": 3 },
      { "id": 2, "referralProgramId": 1, "packageId": 4 },
      { "id": 3, "referralProgramId": 1, "packageId": 5 }
    ],
    "refereeAllowedPackages": []
  }
}
```

### 2.5 DELETE `/admin/referral-programs/:id`
Delete or soft-cancel a referral program.
* If a program has **active history** (associated `TrackReferral` events), it is soft-cancelled and marked `programStatus: "cancelled"`.
* If it has **no history**, it is physically deleted from the database.
* **Authentication**: `admin` or `ops` token required.
* **Sample Response (200 OK - Soft-Cancelled)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral program has active history and has been marked as cancelled.",
  "data": {
    "id": 1,
    "programStatus": "cancelled",
    ...
  }
}
```
* **Sample Response (200 OK - Physically Deleted)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral program deleted successfully",
  "data": null
}
```

### 2.6 GET `/admin/referral-programs/:id/track`
Retrieve a paginated audit trail of referral track logs (`TrackReferral` events) for a specific program. Includes details about the referrer and referee.
* **Authentication**: `admin` or `ops` token required.
* **Query Parameters**:
  * `page` (optional, default: `1`)
  * `limit` (optional, default: `10`)
* **Sample Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral program audit tracks retrieved successfully",
  "data": {
    "tracks": [
      {
        "id": 10,
        "referralProgramId": 1,
        "referralProgramNameSnapshot": "Summer Referral Drive 2026",
        "referrerUserId": 2,
        "refereeUserId": 12,
        "triggeredBySignup": true,
        "referrerRewardTypeSnapshot": "discount",
        "referrerRewardSnapshot": {
          "id": 20,
          "rewardCalcType": "fixed",
          "rewardValue": 250,
          "rewardAmountINR": 250,
          "eligiblePackageIds": [3, 4]
        },
        "refereeRewardTypeSnapshot": "discount",
        "refereeRewardSnapshot": {
          "id": 21,
          "rewardCalcType": "fixed",
          "rewardValue": 150,
          "rewardAmountINR": 150,
          "eligiblePackageIds": []
        },
        "referrerReferralRewardId": 20,
        "triggeringOrderId": null,
        "createdAt": "2026-07-23T13:42:00.000Z",
        "updatedAt": "2026-07-23T13:42:00.000Z",
        "referrer": {
          "id": 2,
          "name": "Rahul",
          "email": "referrer@example.com",
          "mobileNumber": "9876543210"
        },
        "referee": {
          "id": 12,
          "name": "Aman",
          "email": "referee@example.com",
          "mobileNumber": "9812345678"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

## 3. Database Schema

The database model structure defined in `schema.prisma` mapping the referral system relations and state:

### 3.1 `Order` (Modified)
Added fields for tracking applied referral benefits:
* `appliedReferralRewardId`: Identifies the `ReferralReward` applied to this purchase order.
* `referralDiscountAmount`: The discount amount subtracted from the order total.

### 3.2 `User` (Modified)
Updated with relationships:
* `referralRewards`: Relation listing reward coupons owned by the user.
* `referralCode`: String storage identifying the user's link.

### 3.3 `ReferralProgram` (New)
Contains the rules configuration for referral drives:
* `name`: Program title.
* `packageCategory`: Package category target (e.g. `membership`, `welcome india`).
* `startDate` / `endDate`: Period boundaries.
* `programStatus`: Campaign status (`active`, `paused`, `cancelled`).
* `maxTotalRedemptions`: Total limit caps.
* `maxRedemptionsPerUser`: Per-user limit caps.
* `rewardOnSignup`: Triggers payouts immediately on code apply.

### 3.4 `TrackReferral` (New)
Functions as an audit log representing successful referral actions:
* `referralProgramId`: Linked program.
* `referralProgramNameSnapshot`: Program name at the time of track.
* `referrerUserId` / `refereeUserId`: Users involved.
* `triggeredBySignup`: Boolean indicating if signup-triggered.
* `referrerRewardSnapshot` / `refereeRewardSnapshot`: Details of issued rewards.

### 3.5 `ReferralReward` (New)
Represents discount coupons issued to referrers/referees:
* `userId`: Coupon owner.
* `rewardCalcType`: Formula (`fixed` or `percentage`).
* `rewardValue`: Coupon face value.
* `rewardAmountINR`: Calculated fixed value.
* `eligiblePackageIds`: Restricts usage to specific package IDs.
* `isRedeemed`: Usage state flag.

