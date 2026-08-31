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
import {
  sendWhatsAppTemplate,
  sendWhatsAppTemplateToBroadcast,
} from "../../utils/whatsapp-notification.js";
const CF_BASE_URL = "https://sandbox.cashfree.com"; // sandbox url
import { handlePaymentSuccess, handlePaymentFailed } from "./payment.service.js";

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
          status:
            req.user.role === "admin" || req.user.role === "ops"
              ? "ACTIVE"
              : "PENDING",
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
  const signature  = req.headers["x-webhook-signature"];
  const timestamp  = req.headers["x-webhook-timestamp"];
  const idempotencyKey = req.headers["x-webhook-idempotency"];   // NEW (2025-01-01 webhook version)

  // ── 1. Signature verification ────────────────────────────────────────────
  // rawBody MUST be the raw bytes/string, never re-serialised JSON.
  // Ensure server.js captures req.rawBody before express.json() runs.
  const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body);

  try {
    cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
  } catch {
    console.error("[webhook] Invalid signature:", signature);
    return badRequest(res, "Invalid webhook signature");
  }

  // ── 2. Idempotency guard (Cashfree uses at-least-once delivery) ──────────
  // Skip if this key was already processed. Implement with Redis/DB as needed.
  if (idempotencyKey) {
    const alreadyProcessed = await checkIdempotencyKey(idempotencyKey); // implement this
    if (alreadyProcessed) {
      console.info("[webhook] Duplicate event, skipping:", idempotencyKey);
      return ok(res, { success: true });
    }
    await markIdempotencyKey(idempotencyKey); // implement this
  }

  // ── 3. Parse and route events ────────────────────────────────────────────
  // Always return 200 after sig check passes. Anything else causes Cashfree
  // to retry the webhook repeatedly.
  const event = JSON.parse(rawBody);

  try {
    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      await handlePaymentSuccess(event);

    } else if (event.type === "PAYMENT_FAILED_WEBHOOK") {
      await handlePaymentFailed(event);

    } else if (event.type === "PAYMENT_USER_DROPPED_WEBHOOK") {
      // User abandoned checkout — treat same as failed
      await handlePaymentFailed(event);

    } else {
      console.info("[webhook] Unhandled event type:", event.type);
    }
  } catch (err) {
    // Log but still return 200 — a 500 triggers Cashfree retries unnecessarily.
    // Handle true unrecoverable errors (e.g. poison-pill events) out-of-band.
    console.error("[webhook] Processing error for event type", event.type, err);
  }

  return ok(res, { success: true });
};

export const verifyPayment = async (req, res) => {
  const { orderId } = req.params;
  const phone = req.user?.mobileNumber;
  const customerName = req.user?.name;

  const order = await prisma.order.findUnique({
    where: { cashfreeOrderId: orderId },
    select: { id: true, status: true, amount: true, packageId: true },
  });
 
  if (!order) return ok(res, { orderId, status: "NOT_FOUND" });

  if (order.status === "PENDING") {
    const cfResponse = await cashfree.PGFetchOrder(orderId);
    const cfStatus = cfResponse.data.order_status;
    if (cfStatus === "PAID") {
      await prisma.order.update({
        where: { cashfreeOrderId: orderId },
        // data: { status: "PAID", paidAt: new Date() },
        data: { status: "PAID" }, // FIX: don't set paidAt here, let webhook handle it
      });
      order.status = "PAID";
    }
  }

  const formattedDate = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
 
  if (order.status === "PAID") {
    sendWhatsAppTemplate({
      to: phone,
      templateName: "payment_confirmed_client",
      templateParams: [customerName, orderId, order.amount, formattedDate],
    });

    sendWhatsAppTemplateToBroadcast(
      "Testing Office",
      "payment_confirmed_team",
      [orderId, customerName, order.amount, formattedDate],
      phone,
    );
  }

  return ok(res, {
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    packageId: order.packageId,
  });
};

export const getAllPayments = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  try {
    const [payments, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          OR: [
            {
              user: {
                name: {
                  contains: search,
                },
              },
            },
            {
              package: {
                name: {
                  contains: search,
                },
              },
            },
            {
              OR: [
                {
                  cashfreeOrderId: {
                    contains: search,
                  },
                },
                {
                  paymentId: {
                    contains: search,
                  },
                },
              ],
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              regularPrice: true,
              discountedPrice: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.order.count({
        where: {
          OR: [
            {
              user: {
                name: {
                  contains: search,
                },
              },
            },
            {
              package: {
                name: {
                  contains: search,
                },
              },
            },
          ],
        },
      }),
    ]);

    return ok(res, {
      payments,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("[getAllPayments] Error:", err);
    return internalError(res, "Failed to fetch payments");
  }
};

export const getPaymentById = async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            regularPrice: true,
            discountedPrice: true,
          },
        },
      },
    });

    if (!payment) {
      return notFound(res, "Payment not found");
    }

    return ok(res, payment);
  } catch (err) {
    console.error("[getPaymentById] Error:", err);
    return internalError(res, "Failed to fetch payment");
  }
};

export const getUserPayments = async (req, res) => {
  const userId = req.user.userId;
  try {
    const payments = await prisma.order.findMany({
      where: { userId, status: { in: ["PAID", "FAILED", "PENDING"] } },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            regularPrice: true,
            discountedPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(res, payments);
  } catch (err) {
    console.error("[getUserPayments] Error:", err);
    return internalError(res, "Failed to fetch user payments");
  }
};
