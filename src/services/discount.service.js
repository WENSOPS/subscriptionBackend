import { prisma } from "../lib/prisma.js";

export const calculateDiscount = async (packageId, couponCode) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
    include: {
      packages: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  if (new Date(coupon.validUntil) < new Date()) {
    throw new Error("Coupon has expired");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  if (coupon.packages.length > 0) {
    const applicablePackageIds = coupon.packages.map((item) => item.id);
    if (!applicablePackageIds.includes(packageId)) {
      throw new Error("Coupon not applicable for this package");
    }
  }

  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
  });

  if (!packageData) {
    throw new Error("Package not found");
  }

  const discountAmount =
    coupon.discountType === "percentage"
      ? (packageData.discountedPrice * coupon.discountValue) / 100
      : coupon.discountValue;

  return {
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
  };
};
