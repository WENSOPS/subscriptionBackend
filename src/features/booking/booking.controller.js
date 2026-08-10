import { prisma } from "../../lib/prisma.js";
import {
  generateAndSendOrderInvoice,
  processInvoice,
  InvoiceServiceError,
} from "../../services/invoice.service.js";
import { getInvoiceDownloadUrl } from "../../services/s3.service.js";
import { generateId } from "../../utils/generateId.js";
import { generateInvoiceNumber } from "../../utils/invoiceHelpers.js";
import { ok, notFound, internalError, created, badRequest } from "../../utils/response.js";

export const createBooking = async (req, res) => {
  try {
    const {
      packageId,
      packageName,
      purchaseDate,
      validity,
      purchaseAmount,
      currency,
      serviceCity,
      cashfreeId,
    } = req.body;
    const booking = await prisma.booking.create({
      data: {
        id: generateId.booking(),
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
        orderBy: { createdAt: "desc" },
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
        status: { notIn: ["initiated", "failed"] },
      },
      orderBy: { createdAt: "desc" },
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
      where: { id },
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
    // const booking = await prisma.booking.updateMany({
    //   where: { cashfreeOrderId: cashfreeId, status: "initiated" },
    //   data: {
    //     status: orderStatus === "SUCCESS" ? "pending" : "failed",
    //     purchaseAmount: parseFloat(orderAmount),
    //   },
    // });
    const [booking, bookingData] = await Promise.all([
      prisma.booking.updateMany({
        where: { cashfreeOrderId: cashfreeId, status: "initiated" },
        data: {
          status: orderStatus === "SUCCESS" ? "pending" : "failed",
          purchaseAmount: parseFloat(orderAmount),
        },
      }),
      prisma.booking.findFirst({
        where: { cashfreeOrderId: cashfreeId },
        select: {
          id: true,
          packageName: true,
          purchaseAmount: true,
          currency: true,
          user: {
            select: { name: true, email: true, mobileNumber: true },
          },
        },
      }),
    ]);
    if (booking.count !== 0 && orderStatus === "SUCCESS") {
      const { invoiceNumber, s3Key } = await processInvoice({
        invoiceNumber: bookingData.invoiceNumber || generateInvoiceNumber(),
        customer: {
          name: bookingData.user.name,
          email: bookingData.user.email,
          address: "N/A",
          mobile: bookingData.user.mobileNumber,
        },
        lineItems: [
          {
            name: bookingData.packageName,
            quantity: 1,
            unitPrice: bookingData.purchaseAmount,
            currency: bookingData.currency,
          },
        ],
        taxRate: 0,
      });
      await prisma.booking.update({
        where: { id: bookingData.id },
        data: { invoiceKey: s3Key, invoiceNumber },
      });
    }
    ok(res, booking, "Booking updated successfully via webhook");
  } catch (error) {
    console.error("Error updating booking via webhook:", error);
    internalError(res, "Failed to update booking via webhook");
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const isUser = req.user.role === "user";

    if (isUser) {
      const owned = await prisma.order.findFirst({
        where: { id, userId: req.user.userId },
        select: { id: true },
      });
      if (!owned) {
        return notFound(res, "Order not found");
      }
    }

    const result = await generateAndSendOrderInvoice(id);
    const downloadUrl = await getInvoiceDownloadUrl(result.s3Key, 3600);

    ok(
      res,
      {
        orderId: result.orderId,
        invoiceNumber: result.invoiceNumber,
        displayReference: result.displayReference,
        downloadUrl,
        cashfreeOrderId: result.cashfreeOrderId,
        finalAmount: result.finalAmount,
      },
      "Invoice generated and emailed successfully",
    );
  } catch (error) {
    if (error instanceof InvoiceServiceError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return notFound(res, "Order not found");
      }
      if (error.code === "ORDER_NOT_PAID") {
        return badRequest(res, error.message);
      }
      if (error.code === "NO_CUSTOMER_EMAIL") {
        return badRequest(res, error.message);
      }
    }
    console.error("Error generating invoice:", error);
    internalError(res, "Failed to generate invoice");
  }
};
