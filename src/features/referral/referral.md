# Referral System Verification & Testing Guide

This guide describes how to test the referral system end-to-end. Follow the scenarios and sample payloads sequentially.

---

## Pre-requisites & Actors
Create three test users in your database (e.g. by logging in via OTP or admin create):
* **Referrer User (User A)**: E.g., `id: 1`
* **Referee User (User B)**: E.g., `id: 2` (created within the last 2 days)
* **Test Package (Package 1)**: E.g., `id: 1` with category `membership`

---

## Test Scenarios

### Scenario 1: Uniqueness of Active Program per Category
Verify that the system blocks creation or updates that would lead to two active referral programs under the same category.

#### Test 1.1: Create Active "membership" Program (Expect: Success)
* **Method & Endpoint**: `POST /admin/referral-programs`
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
* **Payload**:
```json
{
  "name": "Primary Membership Drive 2026",
  "packageCategory": "membership",
  "startDate": "2026-07-23T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "programStatus": "active",
  "maxTotalRedemptions": 100,
  "maxRedemptionsPerUser": 3,
  "rewardOnSignup": true,
  "referrerRewardType": "discount",
  "referrerRewardCalcType": "fixed",
  "referrerRewardValue": 200,
  "referrerPackageScope": "any",
  "referrerTriggerPackageIds": [1],
  "referrerAllowedPackageIds": [],
  "refereeRewardType": "discount",
  "refereeRewardCalcType": "fixed",
  "refereeRewardValue": 100,
  "refereePackageScope": "any",
  "refereeAllowedPackageIds": []
}
```
* **Expected Response (200 OK or 201 Created)**: Returns `"success": true` and program details.

#### Test 1.2: Create a Second Active "membership" Program (Expect: Conflict Block)
* **Method & Endpoint**: `POST /admin/referral-programs`
* **Payload**: Same payload as above or different name.
* **Expected Response (200 OK)**:
```json
{
  "success": false,
  "statusCode": 200,
  "message": "An active referral program already exists for category \"membership\"",
  "errors": null
}
```

#### Test 1.3: Update status of a different program to "active" (Expect: Conflict Block)
* **Method & Endpoint**: `PATCH /admin/referral-programs/:id` (where `:id` is a paused or cancelled program under category `membership`)
* **Payload**:
```json
{
  "programStatus": "active"
}
```
* **Expected Response (200 OK)**:
```json
{
  "success": false,
  "statusCode": 200,
  "message": "An active referral program already exists for category \"membership\"",
  "errors": null
}
```

---

### Scenario 2: Category-Specific Referral Code Generation On-Demand
Verify that referral codes are generated on-demand per category and stored inside a JSON object, not during signup/registration.

#### Test 2.1: Verify No Referral Code is Generated on Signup/Registration
* **Method & Endpoint**: `POST /auth/verify-otp` (using a new phone number)
* **Expected Result**: The user is created. Inspecting the database should show that the `referralCode` field is `null` or an empty JSON object.

#### Test 2.2: Fetch Summary with Category parameter (On-Demand Code Generation)
* **Method & Endpoint**: `GET /referral/summary?category=membership`
* **Headers**: `Authorization: Bearer <USER_TOKEN>`
* **Expected Result**: The server dynamically generates a referral code prefixed with `MEMB_` (e.g., `MEMB_USER1234`), stores it inside the user's `referralCode` JSON object under the key `membership`, and returns it.
* **Response Payload (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "referralCode": "MEMB_USER1234",
    "referredUsers": [],
    "rewards": []
  }
}
```

#### Test 2.3: Fetch Summary for a Different Category
* **Method & Endpoint**: `GET /referral/summary?category=welcome%20india`
* **Headers**: `Authorization: Bearer <USER_TOKEN>`
* **Expected Result**: The server dynamically generates a second referral code prefixed with `WELC_` (e.g., `WELC_USER4567`), stores it inside the user's `referralCode` JSON object under key `welcome_india` (leaving the `membership` code intact), and returns it.

---

### Scenario 3: Applying Referral Code
Verify code application logic, signup reward issuance, and restrictions.

#### Test 3.1: Self-Referral Validation (Expect: Block)
* Logged in as User A (`referralCode: USERA1B2`).
* **Method & Endpoint**: `POST /referral/apply`
* **Payload**:
```json
{
  "referralCode": "USERA1B2"
}
```
* **Expected Response (200 OK)**:
```json
{
  "success": false,
  "statusCode": 200,
  "message": "You cannot refer yourself",
  "errors": null
}
```

#### Test 3.2: Apply Code Successfully (Expect: Success)
* Logged in as User B (`referralCode: USERB567`).
* **Method & Endpoint**: `POST /referral/apply`
* **Payload**:
```json
{
  "referralCode": "USERA1B2" // User A's code
}
```
* **Expected Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Referral code applied successfully",
  "data": null
}
```
* **Verification (Database Checks)**:
  1. User B's record in table `User` should have `referredByUserId` set to User A's ID.
  2. Table `ReferralReward` should have:
     * One row for User A (Referrer): `rewardAmountINR: 200`.
     * One row for User B (Referee): `rewardAmountINR: 100`.
  3. Table `TrackReferral` should have an audit row with `triggeredBySignup: true` and snapshots of rewards.

#### Test 3.3: Apply Code a Second Time (Expect: Blocked)
* Logged in as User B again.
* **Method & Endpoint**: `POST /referral/apply`
* **Payload**: Same payload.
* **Expected Response (200 OK)**:
```json
{
  "success": false,
  "statusCode": 200,
  "message": "Referral code has already been applied",
  "errors": null
}
```

---

### Scenario 4: Creating Orders with Referral Rewards
Verify that discounts are applied during checkout.

#### Test 4.1: Apply Referral Reward to Order (Expect: Success)
Assume User B has `ReferralReward` with `id: 5` worth ₹100.
* **Method & Endpoint**: `POST /payment/create-order`
* **Payload**:
```json
{
  "packageId": 1,
  "referralRewardId": 5
}
```
* **Expected Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order created successfully",
  "data": {
    "orderId": 12,
    "amount": 900, // Reduced from base pricing (e.g. ₹1000 base - ₹100 reward)
    "discountAmount": 0,
    "referralDiscountAmount": 100,
    "paymentSessionId": "session_xxx"
  }
}
```
* **Verification (Database Check)**: Query `Order` table. The created order should have `appliedReferralRewardId: 5` and `referralDiscountAmount: 100`.

---

### Scenario 5: Payment Processing & Payout trigger
Verify reward redemption and referrer payout upon payment confirmation.

#### Test 5.1: Verify Payment Callback
Mock Cashfree payment completion for the above order.
* **Method & Endpoint**: `GET /payment/verify-payment/:cashfreeOrderId`
* **Expected Result**: Response status `PAID`.
* **Verification (Database Checks)**:
  1. The applied reward coupon (`ReferralReward` with `id: 5`) should now have `isRedeemed: true` and populated `redemptionDetails`.
  2. Since User B bought Package 1 (which is listed in `referrerTriggerPackageIds`), User A (the referrer) should automatically receive a **new** `ReferralReward` coupon in the database.
  3. A new `TrackReferral` log with `triggeredBySignup: false` and `triggeringOrderId: <orderId>` is created.

---

### Scenario 6: Referral Tracking & Audit Logs
Verify audit endpoints for admin monitoring.

#### Test 6.1: Program Tracks List
* **Method & Endpoint**: `GET /admin/referral-programs/:id/track?page=1&limit=10`
* **Expected Response (200 OK)**: Returns the list of track records, detailed referrer object, and detailed referee object.
