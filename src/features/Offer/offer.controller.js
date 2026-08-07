import { prisma } from "../../lib/prisma.js";
import { generateId } from "../../utils/generateId.js";
import {
  ok,
  created,
  conflict,
  internalError,
  notFound,
  badRequest,
  noContent,
} from "../../utils/response.js";

export const createOffer = async (req, res) => {
  const {
    slug,
    isActive,
    startDate,
    endDate,
    category,
    alertText,
    eyebrow,
    title,
    titleAccent,
    description,
    countdownLabel,
    pricingLabel,
    benefitsHeading,
    benefits,
    deadlineNoteStrong,
    deadlineNoteBody,
    ctaPrimaryText,
    ctaPrimaryHref,
    featuredPackageIds,
    ctaSecondaryText,
    footerNote,
  } = req.body;

  try {
    const existingOffer = await prisma.offer.findUnique({
      where: { slug },
    });

    if (existingOffer) {
      return res.status(200).json({
        success: false,
        statusCode: 200,
        message: "Offer with this slug already exists",
        errors: null,
      });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = new Date(endDate);
    if (start && start >= end) {
      return badRequest(res, "Start date must be before end date");
    }

    if (featuredPackageIds && Array.isArray(featuredPackageIds)) {
      for (const pId of featuredPackageIds) {
        const packageExists = await prisma.package.findUnique({
          where: { id: pId },
        });
        if (!packageExists) {
          return notFound(res, `Featured package with ID ${pId} not found`);
        }
      }
    }

    const existingOfferForCategory = await prisma.offer.findFirst({
      where: {
        category,
        isActive: true,
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (existingOfferForCategory) {
      return res.status(200).json({
        success: false,
        message:
          "Offer already going on in this category. Please make the earlier one inactive first.",
      });
    }

    const newOffer = await prisma.offer.create({
      data: {
        id: generateId.offer(),
        slug,
        isActive: true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: new Date(endDate),
        category,
        alertText,
        eyebrow,
        title,
        titleAccent,
        description,
        countdownLabel,
        pricingLabel,
        benefitsHeading,
        deadlineNoteStrong,
        deadlineNoteBody,
        ctaPrimaryText,
        ctaPrimaryHref,
        featuredPackages: {
          connect:
            featuredPackageIds && Array.isArray(featuredPackageIds)
              ? featuredPackageIds.map((pkgId) => ({ id: pkgId }))
              : [],
        },
        ctaSecondaryText,
        footerNote,
        benefits: {
          create: benefits
            ? benefits.map((b) => ({
                id: generateId.offerBenefit(),
                icon: b.icon,
                title: b.title,
                description: b.description,
                order: b.order || 0,
              }))
            : [],
        },
      },
      include: {
        benefits: true,
        featuredPackages: true,
      },
    });

    return created(res, newOffer, "Offer created successfully");
  } catch (error) {
    console.error("Error creating offer:", error);
    return internalError(res, "Failed to create offer");
  }
};

export const updateOffer = async (req, res) => {
  const { id } = req.params;
  const {
    slug,
    isActive,
    startDate,
    endDate,
    category,
    alertText,
    eyebrow,
    title,
    titleAccent,
    description,
    countdownLabel,
    pricingLabel,
    benefitsHeading,
    benefits,
    deadlineNoteStrong,
    deadlineNoteBody,
    ctaPrimaryText,
    ctaPrimaryHref,
    featuredPackageIds,
    ctaSecondaryText,
    footerNote,
  } = req.body;

  try {
    const offerId = id;

    const currentOffer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!currentOffer) {
      return notFound(res, "Offer not found");
    }

    if (slug) {
      const existingOffer = await prisma.offer.findUnique({
        where: { slug },
      });
      if (existingOffer && existingOffer.id !== offerId) {
        return res.status(200).json({
          success: false,
          statusCode: 200,
          message: "Offer with this slug already exists",
          errors: null,
        });
      }
    }

    const targetStart =
      startDate !== undefined
        ? startDate
          ? new Date(startDate)
          : null
        : currentOffer.startDate
          ? new Date(currentOffer.startDate)
          : null;
    const targetEnd = endDate
      ? new Date(endDate)
      : new Date(currentOffer.endDate);
    if (targetStart && targetStart >= targetEnd) {
      return badRequest(res, "Start date must be before end date");
    }

    const targetCategory =
      category !== undefined ? category : currentOffer.category;
    const targetIsActive =
      isActive !== undefined ? isActive : currentOffer.isActive;

    if (featuredPackageIds && Array.isArray(featuredPackageIds)) {
      for (const pId of featuredPackageIds) {
        const packageExists = await prisma.package.findUnique({
          where: { id: pId },
        });
        if (!packageExists) {
          return notFound(res, `Featured package with ID ${pId} not found`);
        }
      }
    }

    if (targetIsActive) {
      const existingOfferForCategory = await prisma.offer.findFirst({
        where: {
          id: { not: offerId },
          category: targetCategory,
          isActive: true,
          endDate: {
            gte: new Date(),
          },
        },
      });

      if (existingOfferForCategory) {
        return res.status(200).json({
          success: false,
          message:
            "Offer already going on in this category. Please make the earlier one inactive first.",
        });
      }
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        slug,
        isActive,
        startDate:
          startDate !== undefined
            ? startDate
              ? new Date(startDate)
              : null
            : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        category,
        alertText,
        eyebrow,
        title,
        titleAccent,
        description,
        countdownLabel,
        pricingLabel,
        benefitsHeading,
        deadlineNoteStrong,
        deadlineNoteBody,
        ctaPrimaryText,
        ctaPrimaryHref,
        featuredPackages:
          featuredPackageIds !== undefined
            ? {
                set: featuredPackageIds
                  ? featuredPackageIds.map((pkgId) => ({ id: pkgId }))
                  : [],
              }
            : undefined,
        ctaSecondaryText,
        footerNote,
        ...(benefits && {
          benefits: {
            deleteMany: {},
            create: benefits.map((b) => ({
              id: generateId.offerBenefit(),
              icon: b.icon,
              title: b.title,
              description: b.description,
              order: b.order || 0,
            })),
          },
        }),
      },
      include: {
        benefits: true,
        featuredPackages: true,
      },
    });

    return ok(res, updatedOffer, "Offer updated successfully");
  } catch (error) {
    console.error("Error updating offer:", error);
    return internalError(res, "Failed to update offer");
  }
};

export const deleteOffer = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.offer.delete({
      where: { id },
    });
    return noContent(res, "Offer deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Offer not found");
    }
    console.error("Error deleting offer:", error);
    return internalError(res, "Failed to delete offer");
  }
};

export const getOffer = async (req, res) => {
  const { category } = req.params;
  try {
    const offer = await prisma.offer.findFirst({
      where: {
        category,
        isActive: true,
      },
      include: {
        benefits: {
          orderBy: {
            order: "asc",
          },
        },
        featuredPackages: true,
      },
    });

    if (!offer) {
      return res.status(200).json({
        success: false,
        statusCode: 200,
        message: "Active offer for this category not found",
        errors: null,
      });
    }

    return ok(res, offer, "Offer fetched successfully");
  } catch (error) {
    console.error("Error fetching offer:", error);
    return internalError(res, "Failed to fetch offer");
  }
};

export const getAllOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        benefits: {
          orderBy: {
            order: "asc",
          },
        },
        featuredPackages: true,
      },
    });
    return ok(res, offers, "All offers fetched successfully");
  } catch (error) {
    console.error("Error fetching all offers:", error);
    return internalError(res, "Failed to fetch offers");
  }
};

export const getOfferById = async (req, res) => {
  const { id } = req.params;
  try {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        benefits: {
          orderBy: {
            order: "asc",
          },
        },
        featuredPackages: true,
      },
    });

    if (!offer) {
      return notFound(res, "Offer not found");
    }

    return ok(res, offer, "Offer fetched successfully");
  } catch (error) {
    console.error("Error fetching offer by ID:", error);
    return internalError(res, "Failed to fetch offer");
  }
};
