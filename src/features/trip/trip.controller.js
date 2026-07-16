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
import { sendWhatsAppTemplate, sendWhatsAppTemplateToBroadcast } from "../../utils/whatsapp-notification.js";

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
    } = req.body;
    const phone = req.user?.mobileNumber;
    const customerName = req.user?.name;
    const plan = subscriptionId?subscriptionId:"";

    // Check subscription availability for the requested trip and belongs to the user
    const availability = await checkSubscriptionAvailabilityForTrip(
      subscriptionId,
      services,
      req.user.userId,
    );

    if (!availability.ok) {
      return unprocessable(res, availability.message, {
        code: availability.code,
        unavailableServices: availability.unavailableServices || [],
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
    const requestId = trip.id?trip.id:"";
    // Send success template
 
      sendWhatsAppTemplate({
        to: phone,
        // templateName: "trip_request",
        templateName:"new_assignment_creation_2",
        templateParams: [customerName, plan, requestId, new Date().toISOString()],
      }),
      sendWhatsAppTemplateToBroadcast(
        "Testing Office",
        "new_assignment_creation_2",
        [requestId, customerName, plan, new Date().toISOString()],
        phone,
      ),
     
    
    created(res, trip);
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
      tripDate,
      tripType,
      services,
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
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
        })),
      },
    });
    const tripId = trip.id?trip.id:"";

    deductSubscriptionUsageForTrip(trip); // Deduct usage immediately for admin-created trips

    sendWhatsAppTemplate({
        to: phone,
        // templateName: "trip_create",
        templateName:"new_assignment_creation_2",
        templateParams: [customerName, plan, tripId, new Date().toISOString()],
      }),
    created(res, trip);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to create trip");
  }
};

export const approveTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignmentId } = req.body;

    const trip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: { status: "confirmed", confirmedBy: req.user.userId, assignmentId },
    });
    ok(res, trip);
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
      additionalAmount,
    } = req.body;
    const trip = await prisma.trip.update({
      where: { id: parseInt(id) },
      data: {
        assignmentId,
        subscriptionId: parseInt(subscriptionId),
        pickupLocation,
        dropLocation,
        tripDate: new Date(tripDate),
        tripType,
        additionalAmount: additionalAmount !== undefined ? additionalAmount : undefined,
        services: services.map((service) => ({
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

    await deductSubscriptionUsageForTrip(trip);

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
