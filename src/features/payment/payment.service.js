import cashfree from "../../config/cashfree.js";
import { prisma } from "../../lib/prisma.js";
import { createSubscription } from "../subscription/subscription.service.js";
import { findActiveProgramForPackage } from "../referral/referral.service.js";
import { generateId } from "../../utils/generateId.js";

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

/**
 * Atomically marks a PENDING order as PAID and increments coupon usage.
 * Returns { order, newlyPaid } — newlyPaid is false if already PAID or not found.
 */
export const markOrderAsPaid = async (cashfreeOrderId) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { cashfreeOrderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });

    const order = await tx.order.findUnique({
      where: { cashfreeOrderId },
      select: {
        id: true,
        status: true,
        userId: true,
        packageId: true,
        finalAmount: true,
        couponId: true,
        appliedReferralRewardId: true,
        referralDiscountAmount: true,
        user: { select: { name: true, mobileNumber: true } },
      },
    });

    if (!order) {
      return { order: null, newlyPaid: false };
    }

    if (updated.count === 0) {
      return { order, newlyPaid: false };
    }

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { order, newlyPaid: true };
  });
};

export const processReferralOnPayment = async (order) => {
  // 1. Redeems the applied referral reward if one was used
  if (order.appliedReferralRewardId) {
    await prisma.referralReward.update({
      where: { id: order.appliedReferralRewardId },
      data: {
        isRedeemed: true,
        redemptionDetails: {
          orderId: order.id,
          redeemedAt: new Date(),
        },
      },
    });
  }

  // 2. If the buyer was referred and the purchased package is a trigger package,
  // creates the referrer's ReferralReward + TrackReferral row and increments totalRedemptionCount.
  const buyer = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { referredByUserId: true },
  });

  if (buyer && buyer.referredByUserId) {
    const activeProgram = await findActiveProgramForPackage(order.packageId);
    if (activeProgram && activeProgram.rewardOnSignup === false) {
      const isTriggerPackage = activeProgram.referrerTriggerPackages.some(
        (p) => p.packageId === order.packageId,
      );

      if (isTriggerPackage) {
        await prisma.$transaction(async (tx) => {
          const alreadyRewarded = await tx.trackReferral.findFirst({
            where: {
              refereeUserId: order.userId,
              referralProgramId: activeProgram.id,
            },
          });
          if (alreadyRewarded) {
            return;
          }

          const program = await tx.referralProgram.findUnique({
            where: { id: activeProgram.id },
          });
          if (
            program.maxTotalRedemptions !== null &&
            program.totalRedemptionCount >= program.maxTotalRedemptions
          ) {
            return;
          }

          if (program.maxRedemptionsPerUser !== null) {
            const referrerUsageCount = await tx.trackReferral.count({
              where: {
                referrerUserId: buyer.referredByUserId,
                referralProgramId: activeProgram.id,
              },
            });
            if (referrerUsageCount >= program.maxRedemptionsPerUser) {
              return;
            }
          }

          let referrerReward = null;
          if (
            activeProgram.referrerRewardType &&
            activeProgram.referrerRewardType !== "none"
          ) {
            const referrerRewardAmount =
              activeProgram.referrerRewardCalcType === "percentage"
                ? 0
                : activeProgram.referrerRewardValue || 0;

            referrerReward = await tx.referralReward.create({
              data: {
                id: generateId.referralReward(),
                userId: buyer.referredByUserId,
                rewardCalcType:
                  activeProgram.referrerRewardCalcType || "fixed",
                rewardValue: activeProgram.referrerRewardValue || 0,
                rewardAmountINR: referrerRewardAmount,
                eligiblePackageIds:
                  activeProgram.referrerPackageScope === "custom"
                    ? activeProgram.referrerAllowedPackages.map(
                        (p) => p.packageId,
                      )
                    : [],
                isRedeemed: false,
              },
            });
          }

          let refereeReward = null;
          if (
            activeProgram.refereeRewardType &&
            activeProgram.refereeRewardType !== "none"
          ) {
            const refereeRewardAmount =
              activeProgram.refereeRewardCalcType === "percentage"
                ? 0
                : activeProgram.refereeRewardValue || 0;

            refereeReward = await tx.referralReward.create({
              data: {
                id: generateId.referralReward(),
                userId: order.userId,
                rewardCalcType: activeProgram.refereeRewardCalcType || "fixed",
                rewardValue: activeProgram.refereeRewardValue || 0,
                rewardAmountINR: refereeRewardAmount,
                eligiblePackageIds:
                  activeProgram.refereePackageScope === "custom"
                    ? activeProgram.refereeAllowedPackages.map(
                        (p) => p.packageId,
                      )
                    : [],
                isRedeemed: false,
              },
            });
          }

          await tx.trackReferral.create({
            data: {
              id: generateId.trackReferral(),
              referralProgramId: activeProgram.id,
              referralProgramNameSnapshot: activeProgram.name,
              referrerUserId: buyer.referredByUserId,
              refereeUserId: order.userId,
              triggeredBySignup: false,
              referrerRewardTypeSnapshot: activeProgram.referrerRewardType,
              referrerRewardSnapshot: referrerReward
                ? {
                    id: referrerReward.id,
                    rewardCalcType: referrerReward.rewardCalcType,
                    rewardValue: referrerReward.rewardValue,
                    rewardAmountINR: referrerReward.rewardAmountINR,
                    eligiblePackageIds: referrerReward.eligiblePackageIds,
                  }
                : null,
              refereeRewardTypeSnapshot: activeProgram.refereeRewardType,
              refereeRewardSnapshot: refereeReward
                ? {
                    id: refereeReward.id,
                    rewardCalcType: refereeReward.rewardCalcType,
                    rewardValue: refereeReward.rewardValue,
                    rewardAmountINR: refereeReward.rewardAmountINR,
                    eligiblePackageIds: refereeReward.eligiblePackageIds,
                  }
                : null,
              referrerReferralRewardId: referrerReward
                ? referrerReward.id
                : null,
              triggeringOrderId: order.id,
            },
          });

          await tx.referralProgram.update({
            where: { id: activeProgram.id },
            data: {
              totalRedemptionCount: {
                increment: 1,
              },
            },
          });
        });
      }
    }
  }
};
