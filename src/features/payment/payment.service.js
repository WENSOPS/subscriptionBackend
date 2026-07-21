import cashfree from "../../config/cashfree.js";
import { prisma } from "../../lib/prisma.js";
import { createSubscription } from "../subscription/subscription.service.js";

export const createCashfreeOrder = async (
  orderId,
  orderAmount,
  currency,
  packageId,
  customer,
) => {
  const orderRequest = {
    order_id: orderId,
    order_amount: orderAmount, // ← just pass the number directly
    order_currency: currency,
    customer_details: {
      customer_id: String(customer.id),
      customer_name: customer.name || "test",
      customer_phone: customer.phone,
    },
    order_meta: {
      return_url: `${process.env.RETURN_URL}?order_id=${orderId}`,
    },
    order_note: customer.note || "",
  };

  const response = await cashfree.PGCreateOrder(orderRequest);
  const order = response.data;

  return {
    orderId: order.order_id,
    paymentSessionId: order.payment_session_id,
  };
};
export const calculateGST = (packageGst, baseAmount) => {
  const gstRate =
    packageGst !== null && packageGst !== undefined ? Number(packageGst) : 0;
  const gstAmount = Math.ceil(baseAmount * (gstRate / 100));
  return {
    gstRate,
    gstAmount,
  };
};

// services/subscriptionService.js

/**
 * Idempotently creates a subscription for a paid order.
 * Safe to call multiple times with the same paymentId — will not create duplicates.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.packageId
 * @param {string} params.paymentId  - Cashfree order ID used as idempotency key
 * @param {Date}   params.startDate  - defaults to now
 * @returns {{ subscription: object, created: boolean }}
 */
export const ensureSubscriptionCreated = async ({
  userId,
  packageId,
  paymentId,
  startDate = new Date(),
}) => {
  const existingSub = await prisma.subscription.findFirst({
    where: { paymentId },
  });

  if (existingSub) {
    return { subscription: existingSub, created: false };
  }

  const subscription = await createSubscription(
    userId,
    packageId,
    startDate,
    paymentId,
  );

  return { subscription, created: true };
};
