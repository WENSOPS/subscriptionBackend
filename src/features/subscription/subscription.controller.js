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
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import S3Client from "../../config/storage/s3.js";
export const getMySubscription = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: { in: ["active", "pending"] } },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    });

    if (!subscriptions.length) {
      return ok(res, []);
    }

    for (const subscription of subscriptions) {
      subscription.package.thumbnailUrl = subscription.package?.thumbnailUrlKey
        ? await getSignedUrl(
            S3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: subscription.package.thumbnailUrlKey,
            }),
          )
        : null;
    }

    ok(res, subscriptions);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    internalError(res, "Failed to fetch subscription");
  }
};

export const getMySubscriptionHistory = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        package: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (!subscriptions) {
      return notFound(res, "No subscription history found");
    }

    for (const subscription of subscriptions) {
      const thumbnailUrl = subscription.package?.thumbnailUrlKey
        ? await getSignedUrl(
            S3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: subscription.package.thumbnailUrlKey,
            }),
          )
        : null;

      subscription.package.thumbnailUrl = thumbnailUrl;
    }

    ok(res, subscriptions);
  } catch (error) {
    console.error("Error fetching subscription history:", error);
    internalError(res, "Failed to fetch subscription history");
  }
};

export const createSubscriptionController = async (req, res) => {
  const { userId, packageId, startDate, paymentId } = req.body;
  try {
    const subscription = await createSubscription(
      userId,
      packageId,
      startDate,
      paymentId,
      "active",
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
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            regularPrice: true,
            discountedPrice: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
      },
    });
    if (!subscription) {
      return notFound(res, "Subscription not found");
    }
    const thumbnailUrl = subscription.package?.thumbnailUrlKey
      ? await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: subscription.package?.thumbnailUrlKey,
          }),
        )
      : null;

    subscription.package.thumbnailUrl = thumbnailUrl;
    ok(res, subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    internalError(res, "Failed to fetch subscription");
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        select: {
          id: true,
          userId: true,
          packageId: true,
          startDate: true,
          endDate: true,
          status: true,
          tripsTotal: true,
          tripsUsed: true,
          vehicleType: true,
          bodyguardType: true,
          services: true,
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              mobileNumber: true,
            },
          },
        },
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),

      prisma.subscription.count({
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

    ok(
      res,
      {
        subscriptions,
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
      },
      "Subscriptions fetched successfully",
    );
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
  const { adminRemarks } = req.body;
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(id) },
    });
    if (!subscription) {
      return notFound(res, "Subscription not found");
    }
    await prisma.subscription.update({
      where: { id: parseInt(id) },
      data: { status: "cancelled", adminRemarks: adminRemarks || null },
    });
    accepted(res, { message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    internalError(res, "Failed to cancel subscription");
  }
};
