import { prisma } from "../../lib/prisma.js";
import { calculateDiscount } from "../../services/discount.service.js";
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

export const getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    // const coupons = await prisma.coupon.findMany();
    const [coupons, totalCount] = await Promise.all([
      prisma.coupon.findMany({
        where: {
          code: {
            contains: search,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.coupon.count({
        where: {
          code: {
            contains: search,
          },
        },
      }),
    ]);

    ok(
      res,
      {
        coupons,
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
      },
      "Coupons fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching coupons:", error);
    internalError(res, "Failed to fetch coupons");
  }
};

export const createCoupon = async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    expiryDate,
    packageId,
    usageLimit,
  } = req.body;

  try {
    const existingCoupon = await prisma.coupon.findUnique({ where: { code } });
    if (existingCoupon) {
      return conflict(res, "Coupon code already exists");
    }

    const packageIds = Array.isArray(packageId)
      ? packageId.filter((id) => typeof id === "string" && id.trim())
      : [];

    const newCoupon = await prisma.coupon.create({
      data: {
        id: generateId.coupon(),
        code,
        discountType,
        discountValue,
        validUntil: new Date(expiryDate),
        usageLimit: usageLimit || null,
        packages: {
          connect: packageIds.map((id) => ({ id })),
        },
      },
      include: {
        packages: {
          select: {
            id: true,
          },
        },
      },
    });
    created(res, newCoupon, "Coupon created successfully");
  } catch (error) {
    console.error("Error creating coupon:", error);
    internalError(res, "Failed to create coupon");
  }
};

export const getCouponById = async (req, res) => {
  const { id } = req.params;
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        packages: {
          select: {
            id: true,
            name: true,
            description: true,
            regularPrice: true,
            discountedPrice: true,
          },
        },
      },
    });
    if (!coupon) {
      return notFound(res, "Coupon not found");
    }
    ok(res, coupon, "Coupon fetched successfully");
  } catch (error) {
    console.error("Error fetching coupon:", error);
    internalError(res, "Failed to fetch coupon");
  }
};

export const validateCoupon = async (req, res) => {
  const { code, packageId } = req.query;
  try {
    let discountData;
    try {
      discountData = await calculateDiscount(packageId, code);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const resData = {
      discountType: discountData.discountType,
      discountValue: discountData.discountValue,
      discountAmount: discountData.discountAmount,
    };

    ok(res, resData);
  } catch (error) {
    console.error("Error validating coupon:", error);
    internalError(res, error.message);
  }
};

export const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    expiryDate,
    usageLimit,
    packageId,
  } = req.body;
  try {
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
    });
    if (!existingCoupon) {
      return notFound(res, "Coupon not found");
    }

    const updateData = {
      code,
      discountType,
      discountValue,
      usageLimit: usageLimit || null,
    };

    if (expiryDate) {
      updateData.validUntil = new Date(expiryDate);
    }

    if (Array.isArray(packageId)) {
      const packageIds = packageId.filter(
        (value) => typeof value === "string" && value.trim(),
      );

      updateData.packages = {
        set: packageIds.map((value) => ({ id: value })),
      };
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
      include: {
        packages: {
          select: {
            id: true,
            name: true,
            description: true,
            regularPrice: true,
            discountedPrice: true,
          },
        },
      },
    });
    ok(res, updatedCoupon, "Coupon updated successfully");
  } catch (error) {
    console.error("Error updating coupon:", error);
    internalError(res, "Failed to update coupon");
  }
};

export const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  try {
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
    });
    if (!existingCoupon) {
      return notFound(res, "Coupon not found");
    }
    await prisma.coupon.delete({ where: { id } });
    noContent(res);
  } catch (error) {
    console.error("Error deleting coupon:", error);
    internalError(res, "Failed to delete coupon");
  }
};
