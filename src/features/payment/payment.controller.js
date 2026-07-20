import { prisma } from "../../lib/prisma.js";
import { createCashfreeOrder, calculateGST, ensureSubscriptionCreated } from "./payment.service.js";
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
    const baseAmount = packageData.discountedPrice - discountAmount;
    const { gstAmount } = calculateGST(packageData.gst, baseAmount);
    const orderAmount = Math.max(
      1,
      baseAmount + gstAmount,
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
          // status:
          //   req.user.role === "admin" || req.user.role === "ops"
          //     ? "ACTIVE"
          //     : "PENDING",
          status:"PENDING",
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

export const verifyPayment = async (req, res) => {
  const { orderId } = req.params;
  const phone = req.user?.mobileNumber;

  const order = await prisma.order.findUnique({
    where: { cashfreeOrderId: orderId },
    select: {
      id: true,
      status: true,
      amount: true,
      packageId: true,
      userId: true,
      user: {
        select: { name: true }
      }
    },
  });

  if (!order) {
    return notFound(res, "Order not found");
  }

  const customerName = order.user?.name;

  if (order.status === "PAID") {
    return ok(res, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      packageId: order.packageId,
    });
  }

  if (order.status === "PENDING") {
    const cfResponse = await cashfree.PGFetchOrder(orderId);
    const cfStatus = cfResponse.data.order_status;

    if (cfStatus === "PAID") {
      await prisma.order.update({
        where: { cashfreeOrderId: orderId },
        data: { status: "PAID", paidAt: new Date() },
      });
      order.status = "PAID";

      const formattedDate = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

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

      try {
        await ensureSubscriptionCreated({
          userId: order.userId,
          packageId: order.packageId,
          paymentId: orderId,
        });
      } catch (subErr) {
        console.error("[verifyPayment] Error creating subscription:", subErr);
      }
    }
  }

  return ok(res, {
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    packageId: order.packageId,
  });
};


export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    const rawBody = req.body.toString("utf8");

    const isValid = cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);

    if (!isValid) {
      return badRequest(res, "Invalid signature");
    }

    const event = JSON.parse(rawBody);
    

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const cashfreeOrderId = event.data.order.order_id;

      try {
        const existingOrder = await prisma.order.findUnique({
          where: { cashfreeOrderId },
          select: {
            id: true,
            status: true,
            amount: true,
            packageId: true,
            userId: true,
            user: {
              select: { name: true, mobileNumber: true }
            }
          },
        });

        if (!existingOrder) {
          return notFound(res, "Order not found");
        }

        // Already processed, nothing to do
        if (existingOrder.status === "PAID") {
          return ok(res, { success: true });
        }

        const updatedOrder = await prisma.order.update({
          where: { cashfreeOrderId },
          data: { status: "PAID", paidAt: new Date() },
        });

        const customerName = existingOrder.user?.name;
        const phone = existingOrder.user?.mobileNumber;

        const formattedDate = new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        sendWhatsAppTemplate({
          to: phone,
          templateName: "payment_confirmed_client",
          templateParams: [customerName, cashfreeOrderId, existingOrder.amount, formattedDate],
        });

        sendWhatsAppTemplateToBroadcast(
          "Testing Office",
          "payment_confirmed_team",
          [cashfreeOrderId, customerName, existingOrder.amount, formattedDate],
          phone,
        );

         ensureSubscriptionCreated({
          userId: updatedOrder.userId,
          packageId: updatedOrder.packageId,
          paymentId: cashfreeOrderId,
        });

      } catch (error) {
        console.error("[webhook] Error during PAYMENT_SUCCESS handling:", error);
        console.error("[webhook] Error code:", error.code);
        if (error.code === "P2025") {
          return notFound(res, "Order not found");
        }
        throw error;
      }

    } else if (event.type === "PAYMENT_FAILED_WEBHOOK") {
      const cashfreeOrderId = event.data.order.order_id;

      await prisma.order.update({
        where: { cashfreeOrderId },
        data: { status: "FAILED" },
      });
    }

    return ok(res, { success: true });

  } catch (err) {
    console.error("[webhook] Unhandled error:", err);
    return internalError(res, "Failed to process webhook");
  }
};

export const getAllPayments = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  try {
    const [payments, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
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
        orderBy: { createdAt: "desc" },
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
