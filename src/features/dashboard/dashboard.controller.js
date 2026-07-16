import { created, ok, internalError } from "../../utils/response.js";
import { prisma } from "../../lib/prisma.js";

export const getAdminDashboard = async (req, res) => {
  try {
    // 1. Core overall stats
    const [
      totalUsers,
      totalActiveSubscriptions,
      totalBookings,
      totalPackages,
      totalServices,
      totalCoupons,
      revenueResult
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "user" }
      }),
      prisma.subscription.count({
        where: { status: "active" }
      }),
      prisma.booking.count(),
      prisma.package.count(),
      prisma.service.count(),
      prisma.coupon.count(),
      prisma.order.aggregate({
        _sum: {
          finalAmount: true
        },
        where: {
          status: "PAID"
        }
      })
    ]);

    const totalRevenue = revenueResult._sum.finalAmount || 0;

    // 2. Trends for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [recentUsers, recentOrders] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "user",
          createdAt: { gte: sixMonthsAgo }
        },
        select: { createdAt: true }
      }),
      prisma.order.findMany({
        where: {
          status: "PAID",
          createdAt: { gte: sixMonthsAgo }
        },
        select: { createdAt: true, finalAmount: true }
      })
    ]);

    // Construct 6 months template
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthsData.push({
        month: d.toLocaleString("default", { month: "short" }),
        year: d.getFullYear(),
        revenue: 0,
        orders: 0,
        users: 0
      });
    }

    // Populate revenue and orders trend
    recentOrders.forEach(order => {
      const oDate = new Date(order.createdAt);
      const oMonth = oDate.toLocaleString("default", { month: "short" });
      const oYear = oDate.getFullYear();
      const bucket = monthsData.find(m => m.month === oMonth && m.year === oYear);
      if (bucket) {
        bucket.revenue += order.finalAmount;
        bucket.orders += 1;
      }
    });

    // Populate user growth trend
    recentUsers.forEach(user => {
      const uDate = new Date(user.createdAt);
      const uMonth = uDate.toLocaleString("default", { month: "short" });
      const uYear = uDate.getFullYear();
      const bucket = monthsData.find(m => m.month === uMonth && m.year === uYear);
      if (bucket) {
        bucket.users += 1;
      }
    });

    // 3. Subscription distribution by status
    const subsGrouped = await prisma.subscription.groupBy({
      by: ["status"],
      _count: { id: true }
    });
    const subscriptionStatus = subsGrouped.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // 4. Trip distribution by status
    const tripsGrouped = await prisma.trip.groupBy({
      by: ["status"],
      _count: { id: true }
    });
    const tripStatus = tripsGrouped.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // 5. Booking distribution by status
    const bookingsGrouped = await prisma.booking.groupBy({
      by: ["status"],
      _count: { id: true }
    });
    const bookingStatus = bookingsGrouped.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // 6. Package Popularity
    const packages = await prisma.package.findMany({
      select: {
        name: true,
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    const packagePopularity = packages
      .map(p => ({
        name: p.name,
        subscriptions: p._count.subscriptions
      }))
      .sort((a, b) => b.subscriptions - a.subscriptions)
      .slice(0, 5);

    // 7. Coupon Usage
    const coupons = await prisma.coupon.findMany({
      select: {
        code: true,
        usedCount: true,
        isActive: true
      },
      orderBy: {
        usedCount: "desc"
      },
      take: 5
    });

    return ok(res, {
      stats: {
        totalUsers,
        activeSubscriptions: totalActiveSubscriptions,
        totalBookings,
        totalPackages,
        totalServices,
        totalCoupons,
        totalRevenue
      },
      trends: monthsData.map(m => ({
        month: `${m.month} ${m.year.toString().slice(-2)}`,
        revenue: Math.round(m.revenue),
        orders: m.orders,
        users: m.users
      })),
      subscriptionStatus,
      tripStatus,
      bookingStatus,
      packagePopularity,
      couponUsage: coupons
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return internalError(res, error);
  }
};

