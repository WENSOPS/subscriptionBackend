import { prisma } from "../../lib/prisma.js";
import { createCashfreeOrder } from "./payment.service.js";
import {
  accepted,
  badRequest,
  notFound,
  ok,
  internalError,
} from "../../utils/response.js";
import { calculateDiscount } from "../../services/discount.service.js";
import cashfree from "../../config/cashfree.js";
import { createSubscription } from "../subscription/subscription.service.js";
const CF_BASE_URL = "https://sandbox.cashfree.com"; // sandbox url

export const createOrder = async (req, res) => {
  const { packageId, couponCode } = req.body;
  const userId = req.user.userId;

  // ── Input validation ──────────────────────────────────────────
  const parsedPackageId = parseInt(packageId, 10);
  if (!packageId || isNaN(parsedPackageId)) {
    return badRequest(res, "Invalid packageId");
  }

  try {
    // ── Fetch package ─────────────────────────────────────────────
    const packageData = await prisma.package.findUnique({
      where: { id: parsedPackageId },
    });

    if (!packageData) {
      return notFound(res, "Package not found");
    }

    // ── Validate coupon & calculate discount ──────────────────────
    let discountAmount = 0;
    let couponId = null;

    if (couponCode) {
      // FIX: was missing `await`, so .discountAmount was called on a Promise
      const couponResult = await calculateDiscount(
        parsedPackageId,
        couponCode,
      ).catch((err) => {
        throw Object.assign(err, { isCouponError: true });
      });

      discountAmount = couponResult.discountAmount ?? 0;
      couponId = couponResult.couponId ?? null;
    }

    // ── Calculate final amount (never go below ₹1) ────────────────
    const orderAmount = Math.max(
      1,
      packageData.discountedPrice - discountAmount,
    );

    const orderId = `WENS_${packageId}_${Date.now()}`;
    // ── Create Cashfree order ─────────────────────────────────────
    const cashfreeResponse = await createCashfreeOrder(
      orderId,
      orderAmount,
      "INR",
      parsedPackageId,
      {
        id: userId,
        name: req.user.name || "",
        phone: req.user.mobileNumber || "",
      },
    );

    // ── Persist order in a transaction ────────────────────────────
    // FIX: wrapped in a transaction so a DB failure doesn't leave a
    // dangling Cashfree session with no order record to match it.
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          packageId: parsedPackageId,
          amount: packageData.discountedPrice,
          discountAmount,
          finalAmount: orderAmount,
          couponCode: couponCode || null,
          couponId: couponId || null,
          cashfreeOrderId: cashfreeResponse.orderId,
          paymentId: cashfreeResponse.paymentSessionId,
          status: "PENDING",
        },
      });

      // Mark coupon as used within the same transaction
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return created;
    });

    return ok(
      res,
      {
        orderId: order.id,
        amount: orderAmount,
        discountAmount,
        paymentSessionId: cashfreeResponse.paymentSessionId,
      },
      "Order created successfully",
    );
  } catch (error) {
    // Surface coupon-specific errors as 400, everything else as 500
    if (error.isCouponError) {
      return badRequest(res, error.message);
    }
    console.error("[createOrder] Unexpected error:", error);
    return internalError(res, "Failed to create order");
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    // Cashfree needs the raw body string for signature verification
    // Make sure this route uses express.raw(), not express.json()
    const rawBody = req.body.toString("utf8");

    const isValid = cashfree.PGVerifyWebhookSignature(
      signature,
      rawBody,
      timestamp,
    );
    if (!isValid) {
      return badRequest(res, "Invalid signature");
    }

    const event = JSON.parse(rawBody);

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const cashfreeOrderId = event.data.order.order_id; // this is your DB order id

      try {
        // Update order directly, will throw if not found
        const updatedOrder = await prisma.order.update({
          where: { cashfreeOrderId: cashfreeOrderId },
          data: { status: "PAID", paidAt: new Date() },
        });

        // create the subscription here instant
        const subscription = await createSubscription(
          updatedOrder.userId,
          updatedOrder.packageId,
          new Date(),
          new Date(new Date().setMonth(new Date().getMonth() + 1)), // TODO: calculate endDate based on package duration
          updatedOrder.amount,
          updatedOrder.couponCode,
          updatedOrder.couponId,
          updatedOrder.paymentId,
        );
        
      } catch (error) {
        if (error.code === "P2025") {
          return notFound(res, "Order not found");
        }
        throw error;
      }
    }

    if (event.type === "PAYMENT_FAILED_WEBHOOK") {
      const cashfreeOrderId = event.data.order.order_id;
      await prisma.order.update({
        where: { cashfreeOrderId: cashfreeOrderId },
        data: { status: "FAILED" },
      });
    }

    return ok(res, { success: true }); // always 200, or Cashfree retries
  } catch (err) {
    console.error("[webhook] Error:", err);
    return internalError(res, "Failed to process webhook");
  }
};

export const verifyPayment = async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { cashfreeOrderId: orderId },
    select: { id: true, status: true, amount: true, packageId: true },
  });

  if (!order) return notFound(res, "Order not found");

  // Optional: if webhook hasn't arrived yet, fetch from Cashfree as fallback
  if (order.status === "PENDING") {
    const cfResponse = await cashfree.PGFetchOrder(orderId);
    const cfStatus = cfResponse.data.order_status;

    if (cfStatus === "PAID") {
      await prisma.order.update({
        where: { cashfreeOrderId: orderId },
        data: { status: "PAID", paidAt: new Date() },
      });
      order.status = "PAID";
    }
  }

  return ok(res, {
    orderId: order.id,
    status: order.status, // "PAID" | "FAILED" | "PENDING"
    amount: order.amount,
  });
};
