import { prisma } from "../../lib/prisma.js";
import { generateId } from "../../utils/generateId.js";

const generateRandomString = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateReferralCode = async (category = "general") => {
  const cleanCategory = category.trim().toLowerCase();

  let categoryPrefix = cleanCategory.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  if (cleanCategory === "membership" || cleanCategory === "welcome india" || cleanCategory === "welcome_india") {
    categoryPrefix = "MEMB";
  }

  let attempts = 0;
  while (attempts < 10) {
    const code = `${categoryPrefix}_${generateRandomString(8)}`;
    const existing = await prisma.userReferralCategoryTrack.findFirst({
      where: {
        referralCode: code,
      },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    attempts++;
  }

  // Fallback — timestamp suffix guarantees uniqueness
  return `${categoryPrefix}_${generateRandomString(8)}${Date.now().toString().slice(-4)}`;
};

export const findActiveProgramForPackage = async (packageId, customCategory = null) => {
  let category = customCategory;
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

  const includeRelations = {
    referrerAllowedPackages: true,
    refereeAllowedPackages: true,
    referrerTriggerPackages: true,
  };

  if (category) {
    let activeProgram = await prisma.referralProgram.findFirst({
      where: { ...where, packageCategory: category },
      include: includeRelations,
    });

    if (!activeProgram) {
      activeProgram = await prisma.referralProgram.findFirst({
        where: {
          ...where,
          packageCategory: { in: ["all", "ALL"] },
        },
        include: includeRelations,
      });
    }

    return activeProgram;
  }

  const activeProgram = await prisma.referralProgram.findFirst({
    where,
    include: includeRelations,
  });

  return activeProgram;
};

export const checkReferralAlreadyRewarded = async (refereeUserId, referralProgramId) => {
  const existingTrack = await prisma.trackReferral.findFirst({
    where: {
      refereeUserId,
      referralProgramId,
    },
  });
  return !!existingTrack;
};

export const maybeCreateSignupReward = async (referrerId, refereeId, category = "general") => {
  const activeProgram = await findActiveProgramForPackage(null, category);

  if (!activeProgram || !activeProgram.rewardOnSignup) {
    return;
  }

  // Check if referee has already been rewarded for this program
  const alreadyRewarded = await checkReferralAlreadyRewarded(refereeId, activeProgram.id);
  if (alreadyRewarded) {
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
          id: generateId.referralReward(),
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
          id: generateId.referralReward(),
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
        id: generateId.trackReferral(),
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