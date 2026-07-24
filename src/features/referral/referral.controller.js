import { prisma } from "../../lib/prisma.js";
import { ok, internalError, notFound, errorResponse, created } from "../../utils/response.js";
import { maybeCreateSignupReward, generateReferralCode } from "./referral.service.js";

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
    const safeCategoryKey = cleanCategory.replace(/[^a-zA-Z0-9]/g, "_");

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                name: true,
                referralCode: true,
                referredUsers: {
                    select: {
                        id: true,
                        name: true,
                        mobileNumber: true,
                        createdAt: true,
                    },
                },
                referralRewards: {
                    select: {
                        id: true,
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

        let codesObj = {};
        if (user.referralCode && typeof user.referralCode === "object" && !Array.isArray(user.referralCode)) {
            codesObj = { ...user.referralCode };
        } else if (user.referralCode && typeof user.referralCode === "string") {
            try {
                codesObj = JSON.parse(user.referralCode);
            } catch (e) {
                codesObj = {};
            }
        }

        let categoryCode = codesObj[safeCategoryKey];
        if (!categoryCode) {
            categoryCode = await generateReferralCode(user.name, cleanCategory);
            codesObj[safeCategoryKey] = categoryCode;
            await prisma.user.update({
                where: { id: userId },
                data: { referralCode: codesObj },
            });
        }

        const referredUsers = (user.referredUsers || []).map((u) => {
            let maskedMobile = u.mobileNumber || "";
            if (maskedMobile.length > 2) {
                maskedMobile =
                    maskedMobile.slice(0, 2) + "x".repeat(Math.max(0, maskedMobile.length - 2));
            }
            return {
                id: u.id,
                name: u.name,
                mobileNumber: maskedMobile,
                createdAt: u.createdAt,
            };
        });

        const data = {
            referralCode: categoryCode,
            referredUsers,
            rewards: user.referralRewards || [],
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

    if (!referralCode || typeof referralCode !== "string") {
        return errorResponse(res, "Referral code is required", 200);
    }

    if (!category || typeof category !== "string") {
        return errorResponse(res, "category query parameter is required", 200);
    }

    const cleanCategory = category.trim().toLowerCase();
    const safeCategoryKey = cleanCategory.replace(/[^a-zA-Z0-9]/g, "_");

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

        // 2. Fetch referrer user first to validate code existence and self-referral
        const referrerUser = await prisma.user.findFirst({
            where: {
                referralCode: {
                    path: `$.${safeCategoryKey}`,
                    equals: referralCode,
                },
            },
            select: {
                id: true,
            },
        });

        if (!referrerUser) {
            return errorResponse(
                res,
                "Invalid referral code",
                200
            );
        }

        if (referrerUser.id === userId) {
            return errorResponse(
                res,
                "You cannot refer yourself",
                200
            );
        }

        // 3. check if user has already applied a code
        if (refereeUser.referredByUserId !== null) {
            return errorResponse(res, "Referral code has already been applied", 200);
        }

        // 4. check registration date constraints (within 2 days of registration)
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(refereeUser.createdAt).getTime() > twoDaysInMs) {
            return errorResponse(
                res,
                "Referral code can only be applied within 2 days of registration",
                200
            );
        }

        // 6. Find matched active referral program for that category
        const now = new Date();
        const activeProgram = await prisma.referralProgram.findFirst({
            where: {
                packageCategory: cleanCategory,
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
            },
            include: {
                referrerAllowedPackages: true,
                refereeAllowedPackages: true,
            },
        });

        if (!activeProgram) {
            return errorResponse(
                res,
                `No active referral program found for category "${cleanCategory}"`,
                200
            );
        }

        // 6a. Check program-wide limit (maxTotalRedemptions)
        if (
            activeProgram.maxTotalRedemptions !== null &&
            activeProgram.totalRedemptionCount >= activeProgram.maxTotalRedemptions
        ) {
            return errorResponse(res, "This referral program has reached its maximum limit", 200);
        }

        // 6b. Check per-user referrer limit (maxRedemptionsPerUser)
        if (activeProgram.maxRedemptionsPerUser !== null) {
            const referrerUsageCount = await prisma.trackReferral.count({
                where: {
                    referrerUserId: referrerUser.id,
                    referralProgramId: activeProgram.id,
                },
            });
            if (referrerUsageCount >= activeProgram.maxRedemptionsPerUser) {
                return errorResponse(res, "This referral code has reached its usage limit", 200);
            }
        }

        // 7. Set the referrer for the referee user
        await prisma.user.update({
            where: { id: userId },
            data: { referredByUserId: referrerUser.id },
        });

        // 8. Trigger signup rewards if configured
        if (activeProgram.rewardOnSignup) {
            await maybeCreateSignupReward(referrerUser.id, refereeUser.id, cleanCategory);
        }

        return ok(res, null, "Referral code applied successfully");
    } catch (error) {
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
        if (!name) return errorResponse(res, "Program name is required", 200);
        if (!packageCategory) return errorResponse(res, "Package category is required", 200);

        // Enum validations
        const validStatuses = ["active", "paused", "cancelled"];
        const validRewardTypes = ["none", "discount", "wallet"];
        const validCalcTypes = ["percentage", "fixed"];
        const validScopes = ["any", "custom"];

        if (programStatus && !validStatuses.includes(programStatus))
            return errorResponse(res, "Invalid programStatus value", 200);
        if (referrerRewardType && !validRewardTypes.includes(referrerRewardType))
            return errorResponse(res, "Invalid referrerRewardType value", 200);
        if (refereeRewardType && !validRewardTypes.includes(refereeRewardType))
            return errorResponse(res, "Invalid refereeRewardType value", 200);
        if (referrerRewardCalcType && !validCalcTypes.includes(referrerRewardCalcType))
            return errorResponse(res, "Invalid referrerRewardCalcType value", 200);
        if (refereeRewardCalcType && !validCalcTypes.includes(refereeRewardCalcType))
            return errorResponse(res, "Invalid refereeRewardCalcType value", 200);
        if (referrerPackageScope && !validScopes.includes(referrerPackageScope))
            return errorResponse(res, "Invalid referrerPackageScope value", 200);
        if (refereePackageScope && !validScopes.includes(refereePackageScope))
            return errorResponse(res, "Invalid refereePackageScope value", 200);

        // Only one active program per packageCategory allowed
        if (programStatus === "active") {
            const existing = await prisma.referralProgram.findFirst({
                where: { packageCategory, programStatus: "active" },
                select: { id: true },
            });
            if (existing) {
                return errorResponse(
                    res,
                    `An active referral program already exists for category "${packageCategory}"`,
                    200
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
                maxTotalRedemptions: maxTotalRedemptions != null ? parseInt(maxTotalRedemptions, 10) : null,
                maxRedemptionsPerUser: maxRedemptionsPerUser != null ? parseInt(maxRedemptionsPerUser, 10) : null,
                rewardOnSignup: !!rewardOnSignup,
                referrerRewardType: referrerRewardType || null,
                referrerRewardCalcType: referrerRewardCalcType || null,
                referrerRewardValue: referrerRewardValue != null ? parseFloat(referrerRewardValue) : null,
                referrerPackageScope: referrerPackageScope || null,
                refereeRewardType: refereeRewardType || null,
                refereeRewardCalcType: refereeRewardCalcType || null,
                refereeRewardValue: refereeRewardValue != null ? parseFloat(refereeRewardValue) : null,
                refereePackageScope: refereePackageScope || null,
                referrerTriggerPackages: {
                    create: referrerTriggerPackageIds.map((id) => ({ packageId: parseInt(id, 10) })),
                },
                referrerAllowedPackages: {
                    create: referrerAllowedPackageIds.map((id) => ({ packageId: parseInt(id, 10) })),
                },
                refereeAllowedPackages: {
                    create: refereeAllowedPackageIds.map((id) => ({ packageId: parseInt(id, 10) })),
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
        const programs = await prisma.referralProgram.findMany({
            include: {
                referrerTriggerPackages: true,
                referrerAllowedPackages: true,
                refereeAllowedPackages: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return ok(res, programs, "Referral programs retrieved successfully");
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

        return ok(res, program, "Referral program retrieved successfully");
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

        if (programStatus !== undefined && programStatus && !validStatuses.includes(programStatus))
            return errorResponse(res, "Invalid programStatus value", 200);
        if (referrerRewardType !== undefined && referrerRewardType && !validRewardTypes.includes(referrerRewardType))
            return errorResponse(res, "Invalid referrerRewardType value", 200);
        if (referrerRewardCalcType !== undefined && referrerRewardCalcType && !validCalcTypes.includes(referrerRewardCalcType))
            return errorResponse(res, "Invalid referrerRewardCalcType value", 200);
        if (referrerPackageScope !== undefined && referrerPackageScope && !validScopes.includes(referrerPackageScope))
            return errorResponse(res, "Invalid referrerPackageScope value", 200);
        if (refereeRewardType !== undefined && refereeRewardType && !validRewardTypes.includes(refereeRewardType))
            return errorResponse(res, "Invalid refereeRewardType value", 200);
        if (refereeRewardCalcType !== undefined && refereeRewardCalcType && !validCalcTypes.includes(refereeRewardCalcType))
            return errorResponse(res, "Invalid refereeRewardCalcType value", 200);
        if (refereePackageScope !== undefined && refereePackageScope && !validScopes.includes(refereePackageScope))
            return errorResponse(res, "Invalid refereePackageScope value", 200);

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

        const targetStatus = programStatus !== undefined ? programStatus : existingProgram.programStatus;
        const targetCategory = packageCategory !== undefined ? packageCategory : existingProgram.packageCategory;

        if (targetStatus === "active") {
            const activeExist = await prisma.referralProgram.findFirst({
                where: {
                    packageCategory: targetCategory,
                    programStatus: "active",
                    id: { not: id },
                },
                select: { id: true },
            });
            if (activeExist) {
                return errorResponse(
                    res,
                    `An active referral program already exists for category "${targetCategory}"`,
                    200
                );
            }
        }

        const updateData = {
            ...(name !== undefined && { name }),
            ...(packageCategory !== undefined && { packageCategory }),
            ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
            ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
            ...(programStatus !== undefined && { programStatus }),
            ...(maxTotalRedemptions !== undefined && { maxTotalRedemptions: maxTotalRedemptions !== null ? parseInt(maxTotalRedemptions, 10) : null }),
            ...(maxRedemptionsPerUser !== undefined && { maxRedemptionsPerUser: maxRedemptionsPerUser !== null ? parseInt(maxRedemptionsPerUser, 10) : null }),
            ...(rewardOnSignup !== undefined && { rewardOnSignup: !!rewardOnSignup }),
            ...(referrerRewardType !== undefined && { referrerRewardType: referrerRewardType || null }),
            ...(referrerRewardCalcType !== undefined && { referrerRewardCalcType: referrerRewardCalcType || null }),
            ...(referrerRewardValue !== undefined && { referrerRewardValue: referrerRewardValue !== null ? parseFloat(referrerRewardValue) : null }),
            ...(referrerPackageScope !== undefined && { referrerPackageScope: referrerPackageScope || null }),
            ...(refereeRewardType !== undefined && { refereeRewardType: refereeRewardType || null }),
            ...(refereeRewardCalcType !== undefined && { refereeRewardCalcType: refereeRewardCalcType || null }),
            ...(refereeRewardValue !== undefined && { refereeRewardValue: refereeRewardValue !== null ? parseFloat(refereeRewardValue) : null }),
            ...(refereePackageScope !== undefined && { refereePackageScope: refereePackageScope || null }),
            ...(referrerTriggerPackageIds !== undefined && {
                referrerTriggerPackages: {
                    deleteMany: {},
                    create: (referrerTriggerPackageIds || []).map((id) => ({ packageId: parseInt(id, 10) })),
                },
            }),
            ...(referrerAllowedPackageIds !== undefined && {
                referrerAllowedPackages: {
                    deleteMany: {},
                    create: (referrerAllowedPackageIds || []).map((id) => ({ packageId: parseInt(id, 10) })),
                },
            }),
            ...(refereeAllowedPackageIds !== undefined && {
                refereeAllowedPackages: {
                    deleteMany: {},
                    create: (refereeAllowedPackageIds || []).map((id) => ({ packageId: parseInt(id, 10) })),
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
                "Referral program has active history and has been marked as cancelled."
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
            "Referral program audit tracks retrieved successfully"
        );
    } catch (error) {
        console.error("Error fetching referral program tracks:", error);
        return internalError(res, "Failed to fetch referral program tracks");
    }
};


