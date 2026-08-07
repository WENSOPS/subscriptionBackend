import { prisma } from "../../lib/prisma.js";
import { generateId } from "../../utils/generateId.js";

const getEndDate = (startDate, duration) => {
  const start = new Date(startDate);
  start.setMonth(start.getMonth() + duration);
  return start;
};

export const createSubscription = async (
  userId,
  packageId,
  startDate,
  paymentId,
  status = "pending",
) => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        packageServices: {
          select: {
            service: true,
            count: true,
          },
        },
      },
    });

    if (!pkg) {
      throw new Error("Package not found");
    }

    const subscription = await prisma.subscription.create({
      data: {
        id: generateId.subscription(),
        userId,
        packageId,
        startDate: new Date(startDate),
        endDate:
          pkg.validity != null
            ? getEndDate(startDate, pkg.validity)
            : getEndDate(startDate, 12),
        status,
        paymentId,
        tripsTotal: pkg.trips,
        tripsUsed: 0,
        verifiedBy: null,
        verifiedAt: null,
        adminRemarks: null,
        vehicleType: pkg.vehicleType,
        bodyguardType: pkg.bodyguardType,
        services: pkg.packageServices.map((s) => {
          return { ...s.service, count: s.count };
        }), // Store subscribed services as JSON array
      },
    });
    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw new Error("Failed to create subscription");
  }
};
