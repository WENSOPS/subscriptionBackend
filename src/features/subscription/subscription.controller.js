import { prisma } from "../../lib/prisma.js";
import { createSubscription } from "./subscription.service.js";
import {
  notFound,
  internalError,
  created,
  ok,
  accepted,
  badRequest,
  conflict,
  forbidden,
  errorResponse,
  noContent,
  serviceUnavailable,
  successResponse,
  unauthorized,
  unprocessable,
} from "../../utils/response.js";
import { stringify } from "node:querystring";

export const getMySubscription = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      include: {
        package: true,
      },
    });
    if (!subscription) {
      return notFound(res, "No active subscription found");
    }
    ok(res, subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    internalError(res, "Failed to fetch subscription");
  }
};

export const createSubscriptionController = async (req, res) => {
  const {
    userId,
    packageId,
    startDate,
    endDate,
    amount,
    couponCode,
    couponId,
    paymentId,
  } = req.body;
  try {
    const subscription = await createSubscription(
      userId,
      packageId,
      startDate,
      endDate,
      paymentId,
    );
    created(res, subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    internalError(res, "Failed to create subscription");
  }
};

export const getSubscriptionById = async (req, res) => {
  const { id } = req.params;
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(id) },
      include: {
        package: true,
      },
    });
    if (!subscription) {
      return notFound(res, "Subscription not found");
    }
    ok(res, subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    internalError(res, "Failed to fetch subscription");
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        package: true,
      },
    });
    ok(res, subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    internalError(res, "Failed to fetch subscriptions");
  }
};

export const verifySubscription = async (req, res) => {
  const { id } = req.params;
  const { adminRemarks } = req.body;
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(id) },
    });
    if (!subscription) {
      return notFound(res, "Subscription not found");
    }
    if (subscription.status === "active") {
      return conflict(res, "Subscription is already active");
    }

    await prisma.subscription.update({
      where: { id: parseInt(id) },
      data: {
        status: "active",
        verifiedBy: req.user?.userId || "unknown",
        verifiedAt: new Date(),
        adminRemarks: adminRemarks || null,
      },
    });
    ok(res, { message: "Subscription verified successfully" });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    internalError(res, "Failed to verify subscription");
  }
};

export const cancelSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(id) },
    });
    if (!subscription) {
      return notFound(res, "Subscription not found");
    }
    await prisma.subscription.update({
      where: { id: parseInt(id) },
      data: { status: "cancelled" },
    });
    accepted(res, { message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    internalError(res, "Failed to cancel subscription");
  }
};
