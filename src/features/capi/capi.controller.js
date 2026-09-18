import { ok, badRequest, internalError } from "../../utils/response.js";
import { sendCapiEventToMeta } from "./capi.service.js";

export const sendCapiEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventId,
      phone,
      email,
      firstName,
      lastName,
      fbc,
      fbp,
      url,
      value,
      currency,
      contentName,
      contentId,
      orderId,
    } = req.body;

    if (!eventName || typeof eventName !== "string") {
      return badRequest(res, "eventName is required");
    }
    if (!eventId || typeof eventId !== "string") {
      return badRequest(res, "eventId is required");
    }

    if (!process.env.META_PIXEL_ID || !process.env.META_ACCESS_TOKEN) {
      return internalError(res, "Meta CAPI is not configured");
    }

    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : undefined) ||
      req.headers["x-real-ip"] ||
      req.ip ||
      "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";

    const result = await sendCapiEventToMeta({
      eventName,
      eventId,
      userData: {
        email: email || null,
        phone: phone || null,
        firstName: firstName || null,
        lastName: lastName || null,
        ip,
        userAgent,
        fbc: fbc || null,
        fbp: fbp || null,
      },
      customData: {
        value: value ?? 0,
        currency: currency || "INR",
        contentName: contentName || null,
        contentId: contentId || null,
        orderId: orderId || null,
      },
      eventSourceUrl: url,
    });
    

    return ok(res, result, "CAPI event sent successfully");
  } catch (error) {
    console.error("[sendCapiEvent] Error:", error);
    return internalError(res, "Failed to send CAPI event");
  }
};
