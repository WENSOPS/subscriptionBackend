import { prisma } from "../../lib/prisma.js";
import { ok, notFound, internalError, created } from "../../utils/response.js";

export const createBooking = async (req, res) => {
  try {
    const { packageId, packageName, purchaseDate, validity, purchaseAmount, currency, serviceCity, cashfreeId } = req.body;
    const booking = await prisma.booking.create({
      data: {
        userId: req.user.userId,
        packageId,
        packageName,
        purchaseDate: new Date(purchaseDate),
        validity,
        purchaseAmount,
        currency,
        serviceCity,
        cashfreeOrderId: cashfreeId,
      },
    });
    created(res, booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    internalError(res, "Failed to create booking");
  }
};

export const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { packageName: { contains: search } },
        { serviceCity: { contains: search } },
        { user: { mobileNumber: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          packageName: true,
          cashfreeOrderId: true,
          status: true,
          purchaseDate: true,
          validity: true,
          purchaseAmount: true,
          currency: true,
          serviceCity: true,
          user: {
            select: { name: true, mobileNumber: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);
    
    ok(res, {
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    internalError(res, "Failed to fetch bookings");
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await prisma.booking.findMany({
      where: { 
        userId,
        status: { notIn: ['initiated', 'failed'] } 
       },
    });
    ok(res, bookings);
  } catch (error) {
    internalError(res, "Failed to fetch your bookings");
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    ok(res, booking);
  } catch (error) {
    internalError(res, "Failed to update booking status");
  }
};

export const webhookUpdate = async (req, res) => {
  try {
    const { cashfreeId, orderAmount, orderStatus } = req.body;
    const booking = await prisma.booking.updateMany({
      where: { cashfreeOrderId: cashfreeId, status: 'initiated' },
      data: { 
        status: orderStatus === 'SUCCESS' ? 'pending' : 'failed',
         purchaseAmount: parseFloat(orderAmount)
      },
    });
    ok(res, booking, "Booking updated successfully via webhook");
  } catch (error) {
    console.error("Error updating booking via webhook:", error);
    internalError(res, "Failed to update booking via webhook");
  }
};