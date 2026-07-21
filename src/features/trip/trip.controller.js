import { prisma } from "../../lib/prisma.js";
import {
  checkSubscriptionAvailabilityForTrip,
  deductSubscriptionUsageForTrip,
} from "./trip.service.js";
import {
  accepted,
  ok,
  created,
  conflict,
  badRequest,
  notFound,
  forbidden,
  errorResponse,
  internalError,
  noContent,
  serviceUnavailable,
  successResponse,
  unauthorized,
  unprocessable,
} from "../../utils/response.js";
import {
  sendWhatsAppTemplate,
  sendWhatsAppTemplateToBroadcast,
} from "../../utils/whatsapp-notification.js";

export const requestTrip = async (req, res) => {
  try {
    const {
      subscriptionId,
      pickupLocation,
      dropLocation,
      tripDate,
      tripType,
      services,
      additionalAmount,
      planName,
    } = req.body;
    const phone = req.user?.mobileNumber;
    const customerName = req.user?.name;
    const plan = subscriptionId ? subscriptionId : "";

    // Check subscription availability for the requested trip and belongs to the user
    const availability = await checkSubscriptionAvailabilityForTrip(
      subscriptionId,
      services,
      req.user.userId,
    );
    if (!availability.ok) {
      return res.status(200).json({
        success: false,
        statusCode: 200,
        message: availability.message,
        errors: {
          code: availability.code,
          unavailableServices: availability.unavailableServices || [],
        },
      });
    }

    const trip = await prisma.trip.create({
      data: {
        subscriptionId: parseInt(subscriptionId),
        pickupLocation,
        dropLocation,
        tripDate: new Date(tripDate),
        tripType,
        userId: req.user.userId,
        additionalAmount: additionalAmount !== undefined ? additionalAmount : 0,
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
        })),
      },
    });
    const requestId = trip.id ? trip.id : "";
    // Send success template
    (sendWhatsAppTemplate({
      to: phone,
      templateName: "trip_request_client",

      templateParams: [
        customerName,
        plan,
        planName,
        requestId,
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      ],
    }),
      sendWhatsAppTemplateToBroadcast(
        "Testing Office",
        "trip_request_team",

        [
          requestId,
          customerName,
          plan,
          planName,
          new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        ],
        phone,
      ),
      created(res, trip));
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to request trip");
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    ok(res, trips);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to fetch trips");
  }
};

/* ADMIN AND OPS */

export const createTrip = async (req, res) => {
  try {
    const {
      assignmentId,
      subscriptionId,
      pickupLocation,
      dropLocation,
      packageName,
      tripDate,
      tripType,
      services,
      additionalServices,
      userId,
      additionalAmount,
    } = req.body;
    const phone = req.user?.mobileNumber;
    const customerName = req.user?.name;

    const plan = subscriptionId;
    const availability = await checkSubscriptionAvailabilityForTrip(
      subscriptionId,
      services,
    );
    if (!availability.ok) {
      return unprocessable(res, availability.message, {
        code: availability.code,
        unavailableServices: availability.unavailableServices || [],
      });
    }

    const combinedServices = [
      ...(Array.isArray(services) ? services : []),
      ...(Array.isArray(additionalServices) ? additionalServices : []),
    ];

    const trip = await prisma.trip.create({
      data: {
        assignmentId,
        subscriptionId: parseInt(subscriptionId),
        pickupLocation,
        dropLocation,
        tripDate: new Date(tripDate),
        tripType,
        status: "confirmed", // Admin-created trips are confirmed by default
        createdBy: req.user.userId,
        userId,
        additionalAmount: additionalAmount !== undefined ? additionalAmount : 0,
        services: combinedServices.map((service) => ({
          id: service.id,
          name: service.name,
        })),
      },
    });
    const tripId = trip.id ? trip.id : "";

    await deductSubscriptionUsageForTrip(trip); // Deduct usage immediately for admin-created trips
    // Validation
    if (
      !packageName ||
      typeof packageName !== "string" ||
      packageName.trim() === ""
    ) {
      return unprocessable(res, "packageName is required");
    }

    (sendWhatsAppTemplate({
      to: phone,
      templateName: "trip_confirmed_client",

      templateParams: [
        customerName,
        plan,
        packageName,
        tripId,
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      ],
    }),
      created(res, trip));
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to create trip");
  }
};

export const approveTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignmentId, customerName, plan, packageName, tripId, phone } =
      req.body;

    const existingTrip = await prisma.trip.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTrip) {
      return notFound(res, "Trip not found");
    }

    if (existingTrip.status !== "requested") {
      return badRequest(
        res,
        `Trip status is ${existingTrip.status}, only requested trips can be approved.`,
      );
    }

    // Check subscription availability
    const availability = await checkSubscriptionAvailabilityForTrip(
      existingTrip.subscriptionId,
      existingTrip.services,
    );
    if (!availability.ok) {
      return unprocessable(res, availability.message, {
        code: availability.code,
        unavailableServices: availability.unavailableServices || [],
      });
    }

    const trip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: { status: "confirmed", confirmedBy: req.user.userId, assignmentId },
    });

    await deductSubscriptionUsageForTrip(trip);

    (sendWhatsAppTemplate({
      to: phone,
      templateName: "trip_confirmed_client",

      templateParams: [
        customerName,
        plan,
        packageName,
        tripId,
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      ],
    }),
      ok(res, trip));
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Trip not found");
    }
    console.error(error);
    internalError(res, "Failed to approve trip");
  }
};

export const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        assignmentId: true,
        subscriptionId: true,
        pickupLocation: true,
        dropLocation: true,
        tripDate: true,
        tripType: true,
        status: true,
        createdBy: true,
        confirmedBy: true,
        userId: true,
        services: true,
        additionalAmount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
        subscription: {
          select: {
            id: true,
            packageId: true,
            status: true,
            paymentId: true,
            startDate: true,
            endDate: true,
            services: true,
            tripsTotal: true,
            tripsUsed: true,
            package: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    if (!trip) {
      return notFound(res, "Trip not found");
    }
    ok(res, trip);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to fetch trip");
  }
};

export const getAllTrips = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const { tripDate } = req.query;

    const where = {
      OR: [
        { pickupLocation: { contains: search } },
        { dropLocation: { contains: search } },
        { assignmentId: { contains: search } },
        { tripType: { contains: search } },
        { user: { name: { contains: search } } },
      ],
    };

    if (tripDate) {
      const start = new Date(tripDate);
      const end = new Date(tripDate);
      end.setDate(end.getDate() + 1);
      where.tripDate = { gte: start, lt: end };
    }

    // Run both queries in parallel
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.trip.count({ where }),
    ]);

    ok(res, {
      trips,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to fetch trips");
  }
};

export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assignmentId,
      subscriptionId,
      pickupLocation,
      dropLocation,
      tripDate,
      tripType,
      services,
      additionalServices,
      additionalAmount,
    } = req.body;

    const combinedServices = [
      ...(Array.isArray(services) ? services : []),
      ...(Array.isArray(additionalServices) ? additionalServices : []),
    ];

    const trip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: {
        assignmentId,
        subscriptionId: parseInt(subscriptionId),
        pickupLocation,
        dropLocation,
        tripDate: new Date(tripDate),
        tripType,
        additionalAmount:
          additionalAmount !== undefined ? additionalAmount : undefined,
        services: combinedServices.map((service) => ({
          id: service.id,
          name: service.name,
        })),
      },
    });
    ok(res, trip);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to update trip");
  }
};

export const cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const trip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy: req.user?.userId,
      },
    });
    ok(res, trip, "Trip cancelled successfully");
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to cancel trip");
  }
};

export const markCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(id) },
    });
    if (!trip) {
      return notFound(res, "Trip not found");
    }
    if (trip.status === "completed") {
      return badRequest(res, "Trip is already marked as completed");
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: { status: "completed" },
    });

    ok(res, updatedTrip, "Trip marked as completed");
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to mark trip as completed");
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trip.delete({
      where: { id: parseInt(id) },
    });
    noContent(res, "Trip deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Trip not found");
    }
    console.error(error);
    internalError(res, "Failed to delete trip");
  }
};
