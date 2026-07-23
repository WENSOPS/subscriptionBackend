import { prisma } from "../../lib/prisma.js";

const generateRandomString = (length = 4) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateReferralCode = async (name, category = "general") => {
  const cleanCategory = category.trim().toLowerCase();
  const safeCategoryKey = cleanCategory.replace(/[^a-zA-Z0-9]/g, "_");
  const categoryPrefix = cleanCategory.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();

  let userPrefix = "USER";
  if (name) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanName.length > 0) {
      userPrefix = cleanName.slice(0, 5);
    }
  }

  let attempts = 0;
  while (attempts < 10) {
    const code = `${categoryPrefix}_${userPrefix}${generateRandomString(4)}`;
    const existing = await prisma.user.findFirst({
      where: {
        referralCode: {
          path: `$.${safeCategoryKey}`,
          equals: code,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    attempts++;
  }
  return `${categoryPrefix}_${userPrefix}${Date.now().toString().slice(-4)}`;
};

export const findActiveProgramForPackage = async (packageId) => {
  let category = null;
  if (packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      select: { category: true },
    });
    if (pkg) {
      category = pkg.category;
    }
  }

  const now = new Date();
  const where = {
    programStatus: "active",
    OR: [
      { startDate: null },
      { startDate: { lte: now } }
    ],
    AND: [
      {
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    ]
  };

  if (category) {
    where.packageCategory = category;
  }

  const activeProgram = await prisma.referralProgram.findFirst({
    where,
    include: {
      referrerAllowedPackages: true,
      refereeAllowedPackages: true,
      referrerTriggerPackages: true,
    }
  });

  return activeProgram;
};

export const maybeCreateSignupReward = async (referrerId, refereeId) => {
  const activeProgram = await findActiveProgramForPackage(null);

  if (!activeProgram || !activeProgram.rewardOnSignup) {
    return;
  }

  // Check program-wide limit (maxTotalRedemptions)
  if (
    activeProgram.maxTotalRedemptions !== null &&
    activeProgram.totalRedemptionCount >= activeProgram.maxTotalRedemptions
  ) {
    return;
  }

  // Check per-user referrer limit (maxRedemptionsPerUser)
  if (activeProgram.maxRedemptionsPerUser !== null) {
    const referrerUsageCount = await prisma.trackReferral.count({
      where: {
        referrerUserId: referrerId,
        referralProgramId: activeProgram.id,
      },
    });
    if (referrerUsageCount >= activeProgram.maxRedemptionsPerUser) {
      return;
    }
  }

  // Perform inside transaction
  await prisma.$transaction(async (tx) => {
    let referrerReward = null;
    if (activeProgram.referrerRewardType && activeProgram.referrerRewardType !== "none") {
      const referrerRewardAmount =
        activeProgram.referrerRewardCalcType === "percentage"
          ? 0
          : (activeProgram.referrerRewardValue || 0);

      referrerReward = await tx.referralReward.create({
        data: {
          userId: referrerId,
          rewardCalcType: activeProgram.referrerRewardCalcType || "fixed",
          rewardValue: activeProgram.referrerRewardValue || 0,
          rewardAmountINR: referrerRewardAmount,
          eligiblePackageIds:
            activeProgram.referrerPackageScope === "custom"
              ? activeProgram.referrerAllowedPackages.map((p) => p.packageId)
              : [],
          isRedeemed: false,
        },
      });
    }

    let refereeReward = null;
    if (activeProgram.refereeRewardType && activeProgram.refereeRewardType !== "none") {
      const refereeRewardAmount =
        activeProgram.refereeRewardCalcType === "percentage"
          ? 0
          : (activeProgram.refereeRewardValue || 0);

      refereeReward = await tx.referralReward.create({
        data: {
          userId: refereeId,
          rewardCalcType: activeProgram.refereeRewardCalcType || "fixed",
          rewardValue: activeProgram.refereeRewardValue || 0,
          rewardAmountINR: refereeRewardAmount,
          eligiblePackageIds:
            activeProgram.refereePackageScope === "custom"
              ? activeProgram.refereeAllowedPackages.map((p) => p.packageId)
              : [],
          isRedeemed: false,
        },
      });
    }

    await tx.trackReferral.create({
      data: {
        referralProgramId: activeProgram.id,
        referralProgramNameSnapshot: activeProgram.name,
        referrerUserId: referrerId,
        refereeUserId: refereeId,
        triggeredBySignup: true,
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
        referrerReferralRewardId: referrerReward ? referrerReward.id : null,
        triggeringOrderId: null,
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
};