import { prisma } from "../../lib/prisma.js";
import { calculateDiscount } from "../../services/discount.service.js";
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
    const coupons = await prisma.coupon.findMany();
    ok(res, coupons);
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

    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        validUntil: new Date(expiryDate),
        packageId: packageId ? JSON.stringify(packageId) : null,
        usageLimit: usageLimit || null,
      },
    });
    created(res, newCoupon, "Coupon created successfully");
  } catch (error) {
    console.error("Error creating coupon:", error);
    internalError(res, "Failed to create coupon");
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
  const { code, discountType, discountValue, expiryDate, usageLimit, packageId } = req.body;
  try {
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingCoupon) {
      return notFound(res, "Coupon not found");
    }
    const updatedCoupon = await prisma.coupon.update({
      where: { id: parseInt(id) },
      data: {
        code,
        discountType,
        discountValue,
        validUntil: new Date(expiryDate),
        packageId: packageId ? JSON.stringify(packageId) : null,
        usageLimit: usageLimit || null,
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
      where: { id: parseInt(id) },
    });
    if (!existingCoupon) {
      return notFound(res, "Coupon not found");
    }
    await prisma.coupon.delete({ where: { id: parseInt(id) } });
    noContent(res);
  } catch (error) {
    console.error("Error deleting coupon:", error);
    internalError(res, "Failed to delete coupon");
  }
};
