import { prisma } from "../../lib/prisma.js";
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

export const requestTrip = async (req, res) => {
  try {
    const {
      subscriptionId,
      pickupLocation,
      dropLocation,
      tripDate,
      tripType,
      services,
    } = req.body;
    const trip = await prisma.trip.create({
      data: {
        subscriptionId: parseInt(subscriptionId),
        pickupLocation,
        dropLocation,
        tripDate: new Date(tripDate),
        tripType,
        userId: req.user.userId,
        services: services.map((service) => ({
          name: service.name,
          price: service.price,
        })),
      },
    });
    created(res, trip);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to request trip");
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { userId: req.user.userId },
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
    } = req.body;
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
        services: services.map((service) => ({
          name: service.name,
          price: service.price,
        })),
      },
    });
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
        include: { user: true }, // ✅ include user
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
        services: {
          create: services.map((service) => ({
            name: service.name,
            price: service.price,
          })),
        },
      },
    });
    ok(res, trip);
  } catch (error) {
    console.error(error);
    internalError(res, "Failed to update trip");
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
