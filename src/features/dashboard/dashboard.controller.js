import { created, ok, internalError } from "../../utils/response.js";
import { prisma } from "../../lib/prisma.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const [users, subscriptions, revenue, trips] = await Promise.all([
      prisma.user.count({
        where: {
          role: "user",
        },
      }),
      prisma.subscription.count({
        where: {
          status: "active",
        },
      }),
      prisma.order.aggregate({
        _sum: {
          finalAmount: true,
        },
        where: {
          status: "active",
        },
      }),
      prisma.trip.count({
        where: {
          tripDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
          },
        },
      }),
    ]);
    return ok(res, {
      users,
      subscriptions,
      revenue: revenue._sum.finalAmount || 0,
      trips,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return internalError(res, error);
  }
};
