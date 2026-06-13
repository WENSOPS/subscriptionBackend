import { prisma } from "../lib/prisma.js";

export const calculateDiscount = async (packageId, couponCode) => {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });
    if (!coupon) {
      throw new Error("Invalid coupon code");
    }
    if (new Date(coupon.validUntil) < new Date()) {
      throw new Error("Coupon has expired");
    }
    if (coupon.usageLimit !== null) {
      if (coupon.usedCount >= coupon.usageLimit) {
        throw new Error("Coupon usage limit reached");
      }
    }

    if (coupon.packageId) {
      const applicablePackages = JSON.parse(coupon.packageId);
      if (!applicablePackages.includes(parseInt(packageId))) {
        throw new Error("Coupon not applicable for this package");
      }
    }

    // fetch package price and calculate discount
    const packageData = await prisma.package.findUnique({
      where: { id: parseInt(packageId) },
    });
    if (!packageData) {
      throw new Error("Package not found");
    }

    const discountAmount =
      coupon.discountType === "percentage"
        ? (packageData.discountedPrice * coupon.discountValue) / 100
        : coupon.discountValue;

    // return discount amount

    return {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    };
  } catch (error) {
    throw error;
  }
};
