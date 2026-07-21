import { prisma } from "../../lib/prisma.js";

export const deductSubscriptionUsageForTrip = async (trip) => {
  if (!trip?.subscriptionId) {
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: trip.subscriptionId },
  });

  if (
    !subscription ||
    (subscription.tripsUsed ?? 0) >= (subscription.tripsTotal ?? 0)
  ) {
    return;
  }

  const updatedServices = (subscription.services || []).map((service) => {
    const match = (trip.services || []).find(
      (tripService) => Number(tripService.id) === Number(service.id),
    );
    return match
      ? { ...service, count: Math.max(0, (service.count ?? 0) - 1) }
      : service;
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tripsUsed: (subscription.tripsUsed ?? 0) + 1,
      services: updatedServices,
    },
  });
};

export const checkSubscriptionAvailabilityForTrip = async (
  subscriptionId,
  selectedServices = [],
  userId = null,
) => {
  const parsedSubscriptionId = parseInt(subscriptionId, 10);
  if (Number.isNaN(parsedSubscriptionId)) {
    return {
      ok: false,
      message: "Invalid subscription id",
      code: "INVALID_SUBSCRIPTION_ID",
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: parsedSubscriptionId },
  });

  if (!subscription) {
    return {
      ok: false,
      message: "Subscription not found",
      code: "SUBSCRIPTION_NOT_FOUND",
    };
  }

  if (subscription.status !== "active") {
    return {
      ok: false,
      message: "Subscription is not active",
      code: "SUBSCRIPTION_NOT_ACTIVE",
    };
  }

  const tripsTotal = subscription.tripsTotal ?? 0;
  const tripsUsed = subscription.tripsUsed ?? 0;
  if (tripsUsed >= tripsTotal) {
    return {
      ok: false,
      message: "No trips available in this subscription",
      code: "NO_TRIPS_AVAILABLE",
    };
  }

  if (userId && subscription.userId !== userId) {
    return {
      ok: false,
      message: "Subscription does not belong to the user",
      code: "SUBSCRIPTION_NOT_OWNED",
    };
  }

  const subscriptionServices = Array.isArray(subscription.services)
    ? subscription.services
    : [];
  const requestedServices = Array.isArray(selectedServices)
    ? selectedServices
    : [];

  const unavailableServices = requestedServices
    .map((service) => ({
      id: parseInt(service?.id, 10),
      name: service?.name,
    }))
    .filter((service) => {
      if (Number.isNaN(service.id)) {
        return true;
      }

      const matchedService = subscriptionServices.find(
        (subscriptionService) =>
          parseInt(subscriptionService?.id, 10) === service.id,
      );

      if (!matchedService) {
        return false;
      }
      return (matchedService.count ?? 0) <= 0;
    });

  if (unavailableServices.length > 0) {
    return {
      ok: false,
      message: "Some selected services are not available",
      code: "SERVICES_NOT_AVAILABLE",
      unavailableServices,
    };
  }

  return {
    ok: true,
    subscription,
  };
};
