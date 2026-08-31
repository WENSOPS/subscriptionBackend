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
    order_amount: String(orderAmount),
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

export async function handlePaymentSuccess(event) {
  const cashfreeOrderId = event.data.order.order_id;

  let updatedOrder;
  try {
    updatedOrder = await prisma.order.update({
      where: { cashfreeOrderId },
      data:  { status: "PAID", paidAt: new Date() },
    });
  } catch (err) {
    if (err.code === "P2025") {
      // Order not found — log and bail; no point retrying.
      console.warn("[webhook] PAYMENT_SUCCESS: order not found:", cashfreeOrderId);
      return;
    }
    throw err; // unexpected DB error — let caller log it
  }

  // Subscription creation is isolated: failure here doesn't undo the PAID status.
  try {
    await createSubscription(
      updatedOrder.userId,
      updatedOrder.packageId,
      new Date(),
      new Date(new Date().setMonth(new Date().getMonth() + 1)), // TODO: use package duration
      updatedOrder.amount,
      updatedOrder.couponCode,
      updatedOrder.couponId,
      updatedOrder.paymentId,
    );
  } catch (err) {
    // The order is already marked PAID. Alert/queue a retry for subscription creation.
    console.error("[webhook] Failed to create subscription for order:", cashfreeOrderId, err);
    // TODO: push to a retry queue or alert your on-call channel here
  }
}

export async function handlePaymentFailed(event) {
  const cashfreeOrderId = event.data.order.order_id;
  try {
    await prisma.order.update({
      where: { cashfreeOrderId },
      data:  { status: "FAILED" },
    });
  } catch (err) {
    if (err.code === "P2025") {
      console.warn("[webhook] PAYMENT_FAILED: order not found:", cashfreeOrderId);
      return;
    }
    throw err;
  }
}
