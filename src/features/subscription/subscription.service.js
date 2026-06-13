import { prisma } from "../../lib/prisma.js";

export const createSubscription = async (
  userId,
  packageId,
  startDate,
  endDate,
  paymentId,
) => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(packageId) },
      include: {
        services: true,
      },
    });

    if (!pkg) {
      throw new Error("Package not found");
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: parseInt(userId),
        packageId: parseInt(packageId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "pending",
        paymentId,
        tripsTotal: pkg.trips,
        tripsUsed: 0,
        verifiedBy: null,
        verifiedAt: null,
        adminRemarks: null,
        vehicleType: pkg.vehicleType,
        bodyguardType: pkg.bodyguardType,
        services: pkg.services, // Store subscribed services as JSON array
      },
    });
    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw new Error("Failed to create subscription");
  }
};
