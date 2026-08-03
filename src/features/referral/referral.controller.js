import { prisma } from "../../lib/prisma.js";
import {
  ok,
  internalError,
  notFound,
  errorResponse,
  created,
  badRequest,
  conflict,
} from "../../utils/response.js";
import {
  maybeCreateSignupReward,
  generateReferralCode,
} from "./referral.service.js";

// Categories that are treated as interchangeable for referral programs.
// A welcome_india purchase can use a membership referral program and vice-versa.
const MEMBERSHIP_GROUP = new Set(["membership", "welcome_india", "welcome india"]);

export const getUserReferralSummary = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return notFound(res, "User not found");
  }

  const { category } = req.query;
  if (!category || typeof category !== "string") {
    return errorResponse(res, "category query parameter is required", 200);
  }
  const cleanCategory = category.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        referralRewards: {
          select: {
            id: true,
            rewardCalcType: true,
            rewardValue: true,
            rewardAmountINR: true,
            eligiblePackageIds: true,
            isRedeemed: true,
          },
        },
      },
    });

    if (!user) {
      return notFound(res, "User not found");
    }

    const programInclude = {
      referrerTriggerPackages: true,
      referrerAllowedPackages: true,
      refereeAllowedPackages: true,
    };

    // Query active referral program for this category
    let activeProgram = await prisma.referralProgram.findFirst({
      where: {
        programStatus: "active",
        packageCategory: cleanCategory,
      },
      include: programInclude,
    });

    // If no program found and the category is in the membership group,
    // fall back to any other category in the group (e.g. welcome_india → membership).
    if (!activeProgram && MEMBERSHIP_GROUP.has(cleanCategory)) {
      const fallbackCategories = Array.from(MEMBERSHIP_GROUP).filter(
        (c) => c !== cleanCategory,
      );
      activeProgram = await prisma.referralProgram.findFirst({
        where: {
          programStatus: "active",
          packageCategory: { in: fallbackCategories },
        },
        include: programInclude,
      });
    }

    if (!activeProgram) {
      return errorResponse(
        res,
        `No active referral program found for category "${cleanCategory}"`,
        200,
      );
    }

    // Use the program's actual category for track creation so cross-category
    // codes remain consistent (e.g. welcome_india users share the membership track).
    const trackCategory = activeProgram.packageCategory;

    // Find or create the category track for this user & active program
    let track = await prisma.userReferralCategoryTrack.findUnique({
      where: {
        userId_referralProgramId: {
          userId: userId,
          referralProgramId: activeProgram.id,
        },
      },
    });

    if (!track) {
      const categoryCode = await generateReferralCode(trackCategory);
      track = await prisma.userReferralCategoryTrack.create({
        data: {
          userId: userId,
          referralProgramId: activeProgram.id,
          category: trackCategory,
          referralCode: categoryCode,
          maxRedemptions: activeProgram.maxRedemptionsPerUser,
          redemptions: 0,
        },
      });
    }

    const categoryCode = track.referralCode;

    // Collect all package IDs across program & rewards to batch-resolve package names
    const packageIdsSet = new Set();

    if (activeProgram) {
      (activeProgram.referrerTriggerPackages || []).forEach((tp) =>
        packageIdsSet.add(tp.packageId),
      );
      (activeProgram.referrerAllowedPackages || []).forEach((ap) =>
        packageIdsSet.add(ap.packageId),
      );
      (activeProgram.refereeAllowedPackages || []).forEach((ap) =>
        packageIdsSet.add(ap.packageId),
      );
    }

    const rawRewards = user.referralRewards || [];
    rawRewards.forEach((r) => {
      let ids = [];
      try {
        ids = Array.isArray(r.eligiblePackageIds)
          ? r.eligiblePackageIds
          : JSON.parse(r.eligiblePackageIds || "[]");
      } catch (e) {
        ids = [];
      }
      ids.forEach((id) => {
        const num = Number(id);
        if (!isNaN(num)) packageIdsSet.add(num);
      });
    });

    const packageIds = Array.from(packageIdsSet);
    let packageMap = {};

    if (packageIds.length > 0) {
      const pkgs = await prisma.package.findMany({
        where: { id: { in: packageIds } },
        select: { id: true, name: true },
      });
      pkgs.forEach((p) => {
        packageMap[p.id] = p.name;
      });
    }

    // Enrich rewards with eligiblePackageNames and eligiblePackages
    const enrichedRewards = rawRewards.map((r) => {
      let ids = [];
      try {
        ids = Array.isArray(r.eligiblePackageIds)
          ? r.eligiblePackageIds
          : JSON.parse(r.eligiblePackageIds || "[]");
      } catch (e) {
        ids = [];
      }
      const eligiblePackages = ids.map((id) => ({
        id: Number(id),
        name: packageMap[Number(id)] || `Package #${id}`,
      }));
      const eligiblePackageNames = eligiblePackages.map((p) => p.name);

      return {
        ...r,
        eligiblePackageIds: ids,
        eligiblePackages,
        eligiblePackageNames,
      };
    });

    // Format active program summary if exists
    let formattedActiveProgram = null;
    if (activeProgram) {
      formattedActiveProgram = {
        id: activeProgram.id,
        name: activeProgram.name,
        packageCategory: activeProgram.packageCategory,
        rewardOnSignup: activeProgram.rewardOnSignup,
        referrerRewardType: activeProgram.referrerRewardType,
        referrerRewardCalcType: activeProgram.referrerRewardCalcType,
        referrerRewardValue: activeProgram.referrerRewardValue,
        referrerPackageScope: activeProgram.referrerPackageScope,
        refereeRewardType: activeProgram.refereeRewardType,
        refereeRewardCalcType: activeProgram.refereeRewardCalcType,
        refereeRewardValue: activeProgram.refereeRewardValue,
        refereePackageScope: activeProgram.refereePackageScope,
        referrerTriggerPackages: (
          activeProgram.referrerTriggerPackages || []
        ).map((tp) => ({
          packageId: tp.packageId,
          packageName: packageMap[tp.packageId] || `Package #${tp.packageId}`,
        })),
        referrerAllowedPackages: (
          activeProgram.referrerAllowedPackages || []
        ).map((ap) => ({
          packageId: ap.packageId,
          packageName: packageMap[ap.packageId] || `Package #${ap.packageId}`,
        })),
        refereeAllowedPackages: (
          activeProgram.refereeAllowedPackages || []
        ).map((ap) => ({
          packageId: ap.packageId,
          packageName: packageMap[ap.packageId] || `Package #${ap.packageId}`,
        })),
      };
    }

    const data = {
      referralCode: categoryCode,
      rewards: enrichedRewards,
      activeProgram: formattedActiveProgram,
    };

    return ok(res, data);
  } catch (error) {
    console.error("Error in getUserReferralSummary:", error);
    return internalError(res, "Failed to fetch referral summary");
  }
};

export const applyReferralCode = async (req, res) => {
  const { referralCode } = req.body;
  const { category } = req.query;
  const userId = req.user?.userId;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!referralCode || typeof referralCode !== "string") {
    return errorResponse(res, "Referral code is required", 200);
  }

  if (!category || typeof category !== "string") {
    return errorResponse(res, "category query parameter is required", 200);
  }

  const cleanCategory = category.trim().toLowerCase();

  try {
    // 1. Fetch referee user (the user applying the code)
    const refereeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referredByUserId: true,
        createdAt: true,
      },
    });

    if (!refereeUser) {
      return notFound(res, "User not found");
    }

    // 2. Check if user has already applied a referral code
    if (refereeUser.referredByUserId !== null) {
      return errorResponse(res, "Referral code has already been applied", 200);
    }

    // 3. Check registration date constraint (within 2 days of registration)
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(refereeUser.createdAt).getTime() > twoDaysInMs) {
      return errorResponse(
        res,
        "Referral code can only be applied within 2 days of registration",
        200,
      );
    }

    // 4. Fetch the referrer's category track record using the referral code.
    // When the category is in the membership group (e.g. welcome_india), also
    // accept codes that were generated under any other category in the same group
    // (e.g. membership), so a single referral code works across both.
    const trackCategoryOptions = MEMBERSHIP_GROUP.has(cleanCategory)
      ? Array.from(MEMBERSHIP_GROUP)
      : [cleanCategory];

    const referrerTrack = await prisma.userReferralCategoryTrack.findFirst({
      where: {
        referralCode: referralCode,
        category: { in: trackCategoryOptions },
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!referrerTrack || !referrerTrack.user) {
      return errorResponse(res, "Invalid referral code", 200);
    }

    const referrerUser = referrerTrack.user;

    // 5. Prevent self-referral
    if (referrerUser.id === userId) {
      return errorResponse(res, "You cannot refer yourself", 200);
    }

    // 6. Check if the referral code has reached its per-code usage limit
    if (
      referrerTrack.maxRedemptions !== null &&
      referrerTrack.redemptions >= referrerTrack.maxRedemptions
    ) {
      return errorResponse(
        res,
        "This referral code has reached its maximum usage limit",
        200,
      );
    }

    // 7. Find active referral program for this category (falls back to membership group, then "all")
    const now = new Date();
    const baseProgramWhere = {
      programStatus: "active",
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [
        {
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      ],
    };

    let activeProgram = await prisma.referralProgram.findFirst({
      where: {
        packageCategory: cleanCategory,
        ...baseProgramWhere,
      },
    });

    // Fallback: if category is in the membership group and no exact program found,
    // check the other categories in the group before falling back to "all".
    if (!activeProgram && MEMBERSHIP_GROUP.has(cleanCategory)) {
      const fallbackCategories = Array.from(MEMBERSHIP_GROUP).filter(
        (c) => c !== cleanCategory,
      );
      activeProgram = await prisma.referralProgram.findFirst({
        where: {
          packageCategory: { in: fallbackCategories },
          ...baseProgramWhere,
        },
      });
    }

    if (!activeProgram) {
      activeProgram = await prisma.referralProgram.findFirst({
        where: {
          packageCategory: { in: ["all", "ALL"] },
          ...baseProgramWhere,
        },
      });
    }

    if (!activeProgram) {
      return errorResponse(
        res,
        `No active referral program found for category "${cleanCategory}"`,
        200,
      );
    }

    // 8. Check program-wide redemption limit
    if (
      activeProgram.maxTotalRedemptions !== null &&
      activeProgram.totalRedemptionCount >= activeProgram.maxTotalRedemptions
    ) {
      return errorResponse(
        res,
        "This referral program has reached its maximum limit",
        200,
      );
    }

    // 9. Atomically apply referral:
    //    - Set referredByUserId on referee (unique constraint prevents double-apply)
    //    - Conditionally increment redemptions only if limit not yet reached
    //      (guards against race condition on per-code limit)
    const [, updatedTrack] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { referredByUserId: referrerUser.id },
      }),
      prisma.userReferralCategoryTrack.updateMany({
        where: {
          id: referrerTrack.id,
          OR: [
            { maxRedemptions: null },
            { redemptions: { lt: referrerTrack.maxRedemptions } },
          ],
        },
        data: {
          redemptions: { increment: 1 },
          lastRedeemedAt: new Date(),
        },
      }),
    ]);

    // If updatedTrack.count === 0 the code hit its limit between our check
    // and the transaction — roll back is automatic; return an error.
    if (updatedTrack.count === 0) {
      return errorResponse(
        res,
        "This referral code has reached its maximum usage limit",
        200,
      );
    }

    // 10. Trigger signup rewards if configured
    if (activeProgram.rewardOnSignup) {
      try {
        await maybeCreateSignupReward(
          referrerUser.id,
          refereeUser.id,
          cleanCategory,
        );
      } catch (rewardError) {
        // Reward failure must not roll back a successful referral application.
        // Log for retry / manual resolution.
        console.error(
          "Failed to create signup reward after referral apply:",
          rewardError,
        );
      }
    }

    return ok(res, null, "Referral code applied successfully");
  } catch (error) {
    // Unique constraint violation on referredByUserId means a concurrent
    // request already applied a code — treat it as "already applied".
    if (error?.code === "P2002") {
      return errorResponse(res, "Referral code has already been applied", 200);
    }

    console.error("Error in applyReferralCode:", error);
    return internalError(res, "Failed to apply referral code");
  }
};
export const createReferralProgram = async (req, res) => {
  try {
    const {
      name,
      packageCategory,
      startDate,
      endDate,
      programStatus = "active",
      maxTotalRedemptions,
      maxRedemptionsPerUser,
      rewardOnSignup = false,
      referrerRewardType,
      referrerRewardCalcType,
      referrerRewardValue,
      referrerPackageScope,
      referrerTriggerPackageIds = [],
      referrerAllowedPackageIds = [],
      refereeRewardType,
      refereeRewardCalcType,
      refereeRewardValue,
      refereePackageScope,
      refereeAllowedPackageIds = [],
    } = req.body;

    // Required fields
    if (!name) return badRequest(res, "Program name is required");
    if (!packageCategory)
      return badRequest(res, "Package category is required");

    const cleanCategory = packageCategory.trim().toLowerCase();

    // Enum validations
    const validStatuses = ["active", "paused", "cancelled"];
    const validRewardTypes = ["none", "discount", "wallet"];
    const validCalcTypes = ["percentage", "fixed"];
    const validScopes = ["any", "custom"];

    if (programStatus && !validStatuses.includes(programStatus))
      return badRequest(res, "Invalid programStatus value");
    if (referrerRewardType && !validRewardTypes.includes(referrerRewardType))
      return badRequest(res, "Invalid referrerRewardType value");
    if (refereeRewardType && !validRewardTypes.includes(refereeRewardType))
      return badRequest(res, "Invalid refereeRewardType value");
    if (
      referrerRewardCalcType &&
      !validCalcTypes.includes(referrerRewardCalcType)
    )
      return badRequest(res, "Invalid referrerRewardCalcType value");
    if (
      refereeRewardCalcType &&
      !validCalcTypes.includes(refereeRewardCalcType)
    )
      return badRequest(res, "Invalid refereeRewardCalcType value");
    if (referrerPackageScope && !validScopes.includes(referrerPackageScope))
      return badRequest(res, "Invalid referrerPackageScope value");
    if (refereePackageScope && !validScopes.includes(refereePackageScope))
      return badRequest(res, "Invalid refereePackageScope value");

    // Date validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return badRequest(res, "Start date cannot be later than end date");
    }

    // Percentage validation
    if (
      referrerRewardType !== "none" &&
      referrerRewardCalcType === "percentage" &&
      parseFloat(referrerRewardValue) > 100
    ) {
      return badRequest(res, "Referrer reward percentage must be 100% or less");
    }
    if (
      refereeRewardType !== "none" &&
      refereeRewardCalcType === "percentage" &&
      parseFloat(refereeRewardValue) > 100
    ) {
      return badRequest(res, "Referee reward percentage must be 100% or less");
    }

    // Custom scope package validation
    if (
      referrerPackageScope === "custom" &&
      (!Array.isArray(referrerAllowedPackageIds) ||
        referrerAllowedPackageIds.length === 0)
    ) {
      return badRequest(
        res,
        "Please select at least one package for Referrer Allowed Packages when scope is set to custom",
      );
    }
    if (
      refereePackageScope === "custom" &&
      (!Array.isArray(refereeAllowedPackageIds) ||
        refereeAllowedPackageIds.length === 0)
    ) {
      return badRequest(
        res,
        "Please select at least one package for Referee Allowed Packages when scope is set to custom",
      );
    }
    if (
      !rewardOnSignup &&
      (!Array.isArray(referrerTriggerPackageIds) ||
        referrerTriggerPackageIds.length === 0)
    ) {
      return badRequest(
        res,
        "Please select at least one package for Referrer Trigger Packages when reward trigger is set to package purchase",
      );
    }

    // Fetch package names to snapshot them at creation time
    const allCreatePackageIds = [
      ...new Set([
        ...referrerTriggerPackageIds.map((id) => parseInt(id, 10)),
        ...referrerAllowedPackageIds.map((id) => parseInt(id, 10)),
        ...refereeAllowedPackageIds.map((id) => parseInt(id, 10)),
      ].filter(Boolean)),
    ];
    let createPackageNameMap = {};
    if (allCreatePackageIds.length > 0) {
      const pkgs = await prisma.package.findMany({
        where: { id: { in: allCreatePackageIds } },
        select: { id: true, name: true },
      });
      pkgs.forEach((p) => { createPackageNameMap[p.id] = p.name; });
    }

    // Only one active program per packageCategory allowed (case-insensitive check)
    if (programStatus === "active") {
      const existing = await prisma.referralProgram.findFirst({
        where: {
          programStatus: "active",
          packageCategory: cleanCategory,
        },
        select: { id: true, name: true, packageCategory: true },
      });
      if (existing) {
        return conflict(
          res,
          `An active referral program already exists for category "${cleanCategory}" (Program #${existing.id}: "${existing.name}")`,
        );
      }
    }

    const program = await prisma.referralProgram.create({
      data: {
        name,
        packageCategory,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        programStatus,
        maxTotalRedemptions:
          maxTotalRedemptions != null
            ? parseInt(maxTotalRedemptions, 10)
            : null,
        maxRedemptionsPerUser:
          maxRedemptionsPerUser != null
            ? parseInt(maxRedemptionsPerUser, 10)
            : null,
        rewardOnSignup: !!rewardOnSignup,
        referrerRewardType: referrerRewardType || null,
        referrerRewardCalcType: referrerRewardCalcType || null,
        referrerRewardValue:
          referrerRewardValue != null ? parseFloat(referrerRewardValue) : null,
        referrerPackageScope: referrerPackageScope || null,
        refereeRewardType: refereeRewardType || null,
        refereeRewardCalcType: refereeRewardCalcType || null,
        refereeRewardValue:
          refereeRewardValue != null ? parseFloat(refereeRewardValue) : null,
        refereePackageScope: refereePackageScope || null,
        referrerTriggerPackages: {
          create: referrerTriggerPackageIds.map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: createPackageNameMap[parseInt(id, 10)] || null,
          })),
        },
        referrerAllowedPackages: {
          create: referrerAllowedPackageIds.map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: createPackageNameMap[parseInt(id, 10)] || null,
          })),
        },
        refereeAllowedPackages: {
          create: refereeAllowedPackageIds.map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: createPackageNameMap[parseInt(id, 10)] || null,
          })),
        },
      },
      include: {
        referrerTriggerPackages: true,
        referrerAllowedPackages: true,
        refereeAllowedPackages: true,
      },
    });

    return created(res, program, "Referral program created successfully");
  } catch (error) {
    console.error("Error creating referral program:", error);
    return internalError(res, "Failed to create referral program");
  }
};

export const getReferralPrograms = async (req, res) => {
  try {
    const { status, programStatus, search, page = 1, limit = 10 } = req.query;

    const targetStatus = status || programStatus;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (targetStatus && targetStatus.toLowerCase() !== "all") {
      where.programStatus = targetStatus.toLowerCase();
    }

    if (search && typeof search === "string" && search.trim()) {
      const cleanSearch = search.trim();
      where.OR = [
        { name: { contains: cleanSearch } },
        { packageCategory: { contains: cleanSearch } },
      ];
    }

    const [total, programs] = await Promise.all([
      prisma.referralProgram.count({ where }),
      prisma.referralProgram.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          referrerTriggerPackages: true,
          referrerAllowedPackages: true,
          refereeAllowedPackages: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    };

    return ok(
      res,
      { programs, pagination },
      "Referral programs retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching referral programs:", error);
    return internalError(res, "Failed to fetch referral programs");
  }
};

export const getReferralProgramById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid referral program ID", 400);
    }

    const program = await prisma.referralProgram.findUnique({
      where: { id },
      include: {
        referrerTriggerPackages: true,
        referrerAllowedPackages: true,
        refereeAllowedPackages: true,
      },
    });

    if (!program) {
      return notFound(res, "Referral program not found");
    }

    // Collect all referenced package IDs across junction tables
    const pkgIdSet = new Set();
    program.referrerTriggerPackages.forEach((p) => pkgIdSet.add(p.packageId));
    program.referrerAllowedPackages.forEach((p) => pkgIdSet.add(p.packageId));
    program.refereeAllowedPackages.forEach((p) => pkgIdSet.add(p.packageId));

    let livePkgMap = {};
    if (pkgIdSet.size > 0) {
      const livePkgs = await prisma.package.findMany({
        where: { id: { in: Array.from(pkgIdSet) } },
        select: { id: true, name: true, discountedPrice: true, regularPrice: true },
      });
      livePkgs.forEach((p) => { livePkgMap[p.id] = p; });
    }

    const enrichPkg = (p) => ({
      ...p,
      name: p.packageNameSnapshot || livePkgMap[p.packageId]?.name || `Package #${p.packageId}`,
      discountedPrice: livePkgMap[p.packageId]?.discountedPrice ?? null,
      regularPrice: livePkgMap[p.packageId]?.regularPrice ?? null,
    });

    const enrichedProgram = {
      ...program,
      referrerTriggerPackages: program.referrerTriggerPackages.map(enrichPkg),
      referrerAllowedPackages: program.referrerAllowedPackages.map(enrichPkg),
      refereeAllowedPackages: program.refereeAllowedPackages.map(enrichPkg),
    };

    return ok(res, enrichedProgram, "Referral program retrieved successfully");
  } catch (error) {
    console.error("Error fetching referral program:", error);
    return internalError(res, "Failed to fetch referral program");
  }
};

export const updateReferralProgram = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid referral program ID", 400);
    }

    const {
      name,
      packageCategory,
      startDate,
      endDate,
      programStatus,
      maxTotalRedemptions,
      maxRedemptionsPerUser,
      rewardOnSignup,
      referrerRewardType,
      referrerRewardCalcType,
      referrerRewardValue,
      referrerPackageScope,
      referrerTriggerPackageIds,
      referrerAllowedPackageIds,
      refereeRewardType,
      refereeRewardCalcType,
      refereeRewardValue,
      refereePackageScope,
      refereeAllowedPackageIds,
    } = req.body;

    const validStatuses = ["active", "paused", "cancelled"];
    const validRewardTypes = ["none", "discount", "wallet"];
    const validCalcTypes = ["percentage", "fixed"];
    const validScopes = ["any", "custom"];

    if (
      programStatus !== undefined &&
      programStatus &&
      !validStatuses.includes(programStatus)
    )
      return badRequest(res, "Invalid programStatus value");
    if (
      referrerRewardType !== undefined &&
      referrerRewardType &&
      !validRewardTypes.includes(referrerRewardType)
    )
      return badRequest(res, "Invalid referrerRewardType value");
    if (
      referrerRewardCalcType !== undefined &&
      referrerRewardCalcType &&
      !validCalcTypes.includes(referrerRewardCalcType)
    )
      return badRequest(res, "Invalid referrerRewardCalcType value");
    if (
      referrerPackageScope !== undefined &&
      referrerPackageScope &&
      !validScopes.includes(referrerPackageScope)
    )
      return badRequest(res, "Invalid referrerPackageScope value");
    if (
      refereeRewardType !== undefined &&
      refereeRewardType &&
      !validRewardTypes.includes(refereeRewardType)
    )
      return badRequest(res, "Invalid refereeRewardType value");
    if (
      refereeRewardCalcType !== undefined &&
      refereeRewardCalcType &&
      !validCalcTypes.includes(refereeRewardCalcType)
    )
      return badRequest(res, "Invalid refereeRewardCalcType value");
    if (
      refereePackageScope !== undefined &&
      refereePackageScope &&
      !validScopes.includes(refereePackageScope)
    )
      return badRequest(res, "Invalid refereePackageScope value");

    // Date validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return badRequest(res, "Start date cannot be later than end date");
    }

    // Percentage validation
    if (
      referrerRewardType !== "none" &&
      referrerRewardCalcType === "percentage" &&
      parseFloat(referrerRewardValue) > 100
    ) {
      return badRequest(res, "Referrer reward percentage must be 100% or less");
    }
    if (
      refereeRewardType !== "none" &&
      refereeRewardCalcType === "percentage" &&
      parseFloat(refereeRewardValue) > 100
    ) {
      return badRequest(res, "Referee reward percentage must be 100% or less");
    }

    // Fetch existing program to check active status validation
    const existingProgram = await prisma.referralProgram.findUnique({
      where: { id },
      select: {
        packageCategory: true,
        programStatus: true,
      },
    });

    if (!existingProgram) {
      return notFound(res, "Referral program not found");
    }

    const targetStatus =
      programStatus !== undefined
        ? programStatus
        : existingProgram.programStatus;
    const rawCategory =
      packageCategory !== undefined
        ? packageCategory
        : existingProgram.packageCategory;
    const targetCategory = rawCategory
      ? rawCategory.trim().toLowerCase()
      : existingProgram.packageCategory;

    if (targetStatus === "active") {
      const activeExist = await prisma.referralProgram.findFirst({
        where: {
          programStatus: "active",
          packageCategory: targetCategory,
          id: { not: id },
        },
        select: { id: true, name: true, packageCategory: true },
      });
      if (activeExist) {
        return conflict(
          res,
          `An active referral program already exists for category "${targetCategory}" (Program #${activeExist.id}: "${activeExist.name}")`,
        );
      }
    }

    // Fetch package names to snapshot them at update time
    const allUpdatePackageIds = [
      ...new Set([
        ...(referrerTriggerPackageIds || []).map((id) => parseInt(id, 10)),
        ...(referrerAllowedPackageIds || []).map((id) => parseInt(id, 10)),
        ...(refereeAllowedPackageIds || []).map((id) => parseInt(id, 10)),
      ].filter(Boolean)),
    ];
    let updatePackageNameMap = {};
    if (allUpdatePackageIds.length > 0) {
      const pkgs = await prisma.package.findMany({
        where: { id: { in: allUpdatePackageIds } },
        select: { id: true, name: true },
      });
      pkgs.forEach((p) => { updatePackageNameMap[p.id] = p.name; });
    }

    const updateData = {
      ...(name !== undefined && { name }),
      ...(packageCategory !== undefined && { packageCategory }),
      ...(startDate !== undefined && {
        startDate: startDate ? new Date(startDate) : null,
      }),
      ...(endDate !== undefined && {
        endDate: endDate ? new Date(endDate) : null,
      }),
      ...(programStatus !== undefined && { programStatus }),
      ...(maxTotalRedemptions !== undefined && {
        maxTotalRedemptions:
          maxTotalRedemptions !== null
            ? parseInt(maxTotalRedemptions, 10)
            : null,
      }),
      ...(maxRedemptionsPerUser !== undefined && {
        maxRedemptionsPerUser:
          maxRedemptionsPerUser !== null
            ? parseInt(maxRedemptionsPerUser, 10)
            : null,
      }),
      ...(rewardOnSignup !== undefined && { rewardOnSignup: !!rewardOnSignup }),
      ...(referrerRewardType !== undefined && {
        referrerRewardType: referrerRewardType || null,
      }),
      ...(referrerRewardCalcType !== undefined && {
        referrerRewardCalcType: referrerRewardCalcType || null,
      }),
      ...(referrerRewardValue !== undefined && {
        referrerRewardValue:
          referrerRewardValue !== null ? parseFloat(referrerRewardValue) : null,
      }),
      ...(referrerPackageScope !== undefined && {
        referrerPackageScope: referrerPackageScope || null,
      }),
      ...(refereeRewardType !== undefined && {
        refereeRewardType: refereeRewardType || null,
      }),
      ...(refereeRewardCalcType !== undefined && {
        refereeRewardCalcType: refereeRewardCalcType || null,
      }),
      ...(refereeRewardValue !== undefined && {
        refereeRewardValue:
          refereeRewardValue !== null ? parseFloat(refereeRewardValue) : null,
      }),
      ...(refereePackageScope !== undefined && {
        refereePackageScope: refereePackageScope || null,
      }),
      ...(referrerTriggerPackageIds !== undefined && {
        referrerTriggerPackages: {
          deleteMany: {},
          create: (referrerTriggerPackageIds || []).map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: updatePackageNameMap[parseInt(id, 10)] || null,
          })),
        },
      }),
      ...(referrerAllowedPackageIds !== undefined && {
        referrerAllowedPackages: {
          deleteMany: {},
          create: (referrerAllowedPackageIds || []).map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: updatePackageNameMap[parseInt(id, 10)] || null,
          })),
        },
      }),
      ...(refereeAllowedPackageIds !== undefined && {
        refereeAllowedPackages: {
          deleteMany: {},
          create: (refereeAllowedPackageIds || []).map((id) => ({
            packageId: parseInt(id, 10),
            packageNameSnapshot: updatePackageNameMap[parseInt(id, 10)] || null,
          })),
        },
      }),
    };

    const updatedProgram = await prisma.referralProgram.update({
      where: { id },
      data: updateData,
      include: {
        referrerTriggerPackages: true,
        referrerAllowedPackages: true,
        refereeAllowedPackages: true,
      },
    });

    return ok(res, updatedProgram, "Referral program updated successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Referral program not found");
    }
    console.error("Error updating referral program:", error);
    return internalError(res, "Failed to update referral program");
  }
};

export const deleteReferralProgram = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid referral program ID", 200);
    }

    const program = await prisma.referralProgram.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            referralEvents: true,
          },
        },
      },
    });

    if (!program) {
      return notFound(res, "Referral program not found");
    }

    if (program._count.referralEvents > 0) {
      // Soft-cancel/disable it if program contains tracking logs (due to Restrict foreign key constraint)
      const updatedProgram = await prisma.referralProgram.update({
        where: { id },
        data: { programStatus: "cancelled" },
        include: {
          referrerTriggerPackages: true,
          referrerAllowedPackages: true,
          refereeAllowedPackages: true,
        },
      });

      return ok(
        res,
        updatedProgram,
        "Referral program has active history and has been marked as cancelled.",
      );
    }

    // Physical delete if no history/tracks exist
    await prisma.referralProgram.delete({
      where: { id },
    });

    return ok(res, null, "Referral program deleted successfully");
  } catch (error) {
    console.error("Error deleting referral program:", error);
    return internalError(res, "Failed to delete referral program");
  }
};

export const getReferralProgramTracks = async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    if (isNaN(programId)) {
      return errorResponse(res, "Invalid referral program ID", 200);
    }

    const programExists = await prisma.referralProgram.findUnique({
      where: { id: programId },
      select: { id: true },
    });
    if (!programExists) {
      return notFound(res, "Referral program not found");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [tracks, total] = await Promise.all([
      prisma.trackReferral.findMany({
        where: { referralProgramId: programId },
        include: {
          referrer: {
            select: {
              id: true,
              name: true,
              email: true,
              mobileNumber: true,
            },
           
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.trackReferral.count({
        where: { referralProgramId: programId },
      }),
    ]);

    let refereeUsersMap = {};
    if (tracks.length > 0) {
      const refereeUserIds = [...new Set(tracks.map((t) => t.refereeUserId))];
      const refereeUsers = await prisma.user.findMany({
        where: { id: { in: refereeUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      });
      refereeUsersMap = refereeUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
    }

    const formattedTracks = tracks.map((track) => ({
      ...track,
      referee: refereeUsersMap[track.refereeUserId] || null,
    }));

    return ok(
      res,
      {
        tracks: formattedTracks,
        total,
        page,
        limit,
      },
      "Referral program audit tracks retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching referral program tracks:", error);
    return internalError(res, "Failed to fetch referral program tracks");
  }
};
