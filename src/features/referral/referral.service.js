import { prisma } from "../../lib/prisma.js";
import { generateId } from "../../utils/generateId.js";

const MEMBERSHIP_GROUP = new Set([
  "membership",
  "welcome_india",
  "welcome india",
]);

export const normalizeCategory = (category) =>
  (category || "").trim().toLowerCase();

export const isMembershipGroupCategory = (category) =>
  MEMBERSHIP_GROUP.has(normalizeCategory(category));

/** membership ↔ welcome_india rewards are cross-usable at checkout only; all other flows are strict. */
export const categoriesCompatibleForReferral = (categoryA, categoryB) => {
  const a = normalizeCategory(categoryA);
  const b = normalizeCategory(categoryB);
  if (a === b) return true;
  return isMembershipGroupCategory(a) && isMembershipGroupCategory(b);
};

const defaultProgramInclude = {
  referrerTriggerPackages: true,
  referrerAllowedPackages: true,
  refereeAllowedPackages: true,
};

/**
 * Resolves the active referral program for a package category.
 * @param {object} [options]
 * @param {boolean} [options.crossCategoryFallback=false] — when true, membership ↔ welcome_india programs are interchangeable (rewards/apply only).
 */
export const resolveActiveReferralProgram = async (
  category,
  include = defaultProgramInclude,
  { crossCategoryFallback = false } = {},
) => {
  const cleanCategory = normalizeCategory(category);
  const now = new Date();

  const activePrograms = await prisma.referralProgram.findMany({
    where: {
      programStatus: "active",
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [
        {
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      ],
    },
    include,
  });

  if (!cleanCategory) {
    return (
      activePrograms.find((p) => normalizeCategory(p.packageCategory) === "all") ||
      activePrograms[0] ||
      null
    );
  }

  const matchCategory = (programCategory) =>
    normalizeCategory(programCategory) === cleanCategory;

  let activeProgram = activePrograms.find((p) =>
    matchCategory(p.packageCategory),
  );

  if (!activeProgram && crossCategoryFallback && isMembershipGroupCategory(cleanCategory)) {
    activeProgram = activePrograms.find((p) =>
      isMembershipGroupCategory(p.packageCategory),
    );
  }

  if (!activeProgram) {
    activeProgram = activePrograms.find((p) =>
      ["all"].includes(normalizeCategory(p.packageCategory)),
    );
  }

  return activeProgram;
};

const getMembershipSiblingCategory = (category) => {
  const clean = normalizeCategory(category);
  if (clean === "membership") return "welcome_india";
  if (clean === "welcome_india" || clean === "welcome india") return "membership";
  return null;
};

async function createUserReferralCategoryTrack(
  userId,
  category,
  activeProgram,
  referralCode,
) {
  try {
    return await prisma.userReferralCategoryTrack.create({
      data: {
        id: generateId.userReferralCategoryTrack(),
        userId,
        referralProgramId: activeProgram.id,
        category,
        referralCode,
        maxRedemptions: activeProgram.maxRedemptionsPerUser,
        redemptions: 0,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const existing = await prisma.userReferralCategoryTrack.findFirst({
        where: { userId, category },
      });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

/**
 * Ensures a referral track/code exists for the user in the given category.
 * membership ↔ welcome_india share one stored code (membership row); welcome_india resolves via sibling lookup.
 */
export const ensureUserReferralCategoryTrack = async (
  userId,
  category,
  activeProgram,
) => {
  const cleanCategory = normalizeCategory(category);

  let track = await prisma.userReferralCategoryTrack.findFirst({
    where: {
      userId,
      category: cleanCategory,
    },
  });

  if (track) {
    return track;
  }

  const siblingCategory = getMembershipSiblingCategory(cleanCategory);

  if (siblingCategory && isMembershipGroupCategory(cleanCategory)) {
    const siblingTrack = await prisma.userReferralCategoryTrack.findFirst({
      where: {
        userId,
        category: siblingCategory,
      },
    });

    if (siblingTrack) {
      return siblingTrack;
    }
  }

  const codeCategory = isMembershipGroupCategory(cleanCategory)
    ? "membership"
    : cleanCategory;
  const categoryCode = await generateReferralCode(codeCategory);

  return createUserReferralCategoryTrack(
    userId,
    cleanCategory,
    activeProgram,
    categoryCode,
  );
};

/**
 * Validates a referral code for apply/signup using referralCode + category (+ referrer userId on the track).
 * membership ↔ welcome_india: code stored under either category row can match the other category at apply time.
 */
export const findReferrerTrackForCategory = async (referralCode, category) => {
  const cleanCategory = normalizeCategory(category);
  const code = referralCode.trim();
  const include = {
    user: {
      select: { id: true },
    },
  };

  const categoriesToTry = [cleanCategory];
  if (isMembershipGroupCategory(cleanCategory)) {
    const siblingCategory = getMembershipSiblingCategory(cleanCategory);
    if (siblingCategory) {
      categoriesToTry.push(siblingCategory);
    }
  }

  for (const cat of categoriesToTry) {
    const track = await prisma.userReferralCategoryTrack.findFirst({
      where: {
        referralCode: code,
        category: cat,
      },
      include,
    });
    if (track?.user) {
      return track;
    }
  }

  return null;
};

function parseEligiblePackageIds(reward) {
  try {
    return Array.isArray(reward.eligiblePackageIds)
      ? reward.eligiblePackageIds
      : JSON.parse(reward.eligiblePackageIds || "[]");
  } catch {
    return [];
  }
}

/**
 * Filters rewards for a category summary (strict — no cross-category mixing).
 */
async function resolveRewardOriginCategories(rewardIds, userId) {
  const map = {};
  if (!rewardIds.length) return map;

  const tracks = await prisma.trackReferral.findMany({
    where: {
      OR: [{ referrerUserId: userId }, { refereeUserId: userId }],
    },
    select: {
      referrerReferralRewardId: true,
      refereeRewardSnapshot: true,
      referralProgram: { select: { packageCategory: true } },
    },
  });

  const programCategory = (track) =>
    normalizeCategory(track.referralProgram?.packageCategory);

  for (const track of tracks) {
    const category = programCategory(track);
    if (!category) continue;

    if (
      track.referrerReferralRewardId &&
      rewardIds.includes(track.referrerReferralRewardId)
    ) {
      map[track.referrerReferralRewardId] = category;
    }

    if (track.refereeRewardSnapshot) {
      let snapshot = track.refereeRewardSnapshot;
      try {
        snapshot =
          typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
      } catch {
        snapshot = null;
      }
      if (snapshot?.id && rewardIds.includes(snapshot.id)) {
        map[snapshot.id] = category;
      }
    }
  }

  return map;
}

export const filterRewardsForCategory = async (rewards, category, userId) => {
  const cleanCategory = normalizeCategory(category);
  if (!rewards?.length) return [];

  const rewardIds = rewards.map((r) => r.id);
  const originCategoryByRewardId = userId
    ? await resolveRewardOriginCategories(rewardIds, userId)
    : {};

  const allPkgIds = new Set();
  for (const reward of rewards) {
    parseEligiblePackageIds(reward).forEach((id) => {
      if (id) allPkgIds.add(id);
    });
  }

  const packageCategoryById = {};
  if (allPkgIds.size > 0) {
    const pkgs = await prisma.package.findMany({
      where: { id: { in: [...allPkgIds] } },
      select: { id: true, category: true },
    });
    pkgs.forEach((p) => {
      packageCategoryById[p.id] = normalizeCategory(p.category);
    });
  }

  return rewards.filter((reward) => {
    const ids = parseEligiblePackageIds(reward);

    if (ids.length === 0) {
      const origin = originCategoryByRewardId[reward.id];
      return origin === cleanCategory;
    }

    return ids.some((pkgId) => {
      const pkgCategory = packageCategoryById[pkgId];
      if (!pkgCategory) return false;
      return pkgCategory === cleanCategory;
    });
  });
};

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

  let categoryPrefix = cleanCategory
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();

  if (cleanCategory === "membership") {
    categoryPrefix = "MEMB";
  } else if (
    cleanCategory === "welcome india" ||
    cleanCategory === "welcome_india"
  ) {
    categoryPrefix = "WELI";
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

  if (!category) {
    return resolveActiveReferralProgram(null, defaultProgramInclude);
  }

  return resolveActiveReferralProgram(category, defaultProgramInclude);
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