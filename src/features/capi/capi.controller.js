import { ok, badRequest, internalError } from "../../utils/response.js";
import {
  sendCapiEventToMeta,
  sendGAEventToGoogle,
  sendGadsClickConversion,
  isGoogleAdsConfigured,
} from "./capi.service.js";

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
    return internalError(res, "Failed to send CAPI event");
  }
};

export const sendGAEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventId,
      userData,
      customData,
      eventSourceUrl,
      ga_client_id,
      ga_session_id,
    } = req.body;

    if (!eventName || typeof eventName !== "string") {
      return badRequest(res, "eventName is required");
    }
    if (!eventId || typeof eventId !== "string") {
      return badRequest(res, "eventId is required");
    }
    if (!ga_client_id || typeof ga_client_id !== "string") {
      return badRequest(res, "ga_client_id is required");
    }
    if (!ga_session_id || typeof ga_session_id !== "string") {
      return badRequest(res, "ga_session_id is required");
    }

    if (!process.env.GA_MEASUREMENT_ID || !process.env.GA_API_SECRET) {
      return internalError(res, "Google Analytics is not configured");
    }

    const result = await sendGAEventToGoogle({
      eventName,
      eventId,
      userData,
      customData,
      eventSourceUrl,
      ga_client_id,
      ga_session_id,
    });

    return ok(res, result, "GA event sent successfully");
  } catch (error) {
    console.error("[sendGAEvent] Error:", error);
    return internalError(res, "Failed to send GA event");
  }
};

export const sendGadsEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventId,
      phone,
      email,
      gclid,
      gbraid,
      wbraid,
      value,
      currency,
      orderId,
    } = req.body;

    if (!eventName || typeof eventName !== "string") {
      return badRequest(res, "eventName is required");
    }
    if (!eventId || typeof eventId !== "string") {
      return badRequest(res, "eventId is required");
    }

    if (!isGoogleAdsConfigured()) {
      return internalError(res, "Google Ads is not configured");
    }

    const result = await sendGadsClickConversion({
      eventName,
      eventId,
      gclid: gclid || null,
      gbraid: gbraid || null,
      wbraid: wbraid || null,
      userData: {
        email: email || null,
        phone: phone || null,
      },
      customData: {
        value: value ?? 0,
        currency: currency || "INR",
        orderId: orderId || null,
      },
    });

    return ok(res, result, "Google Ads conversion uploaded successfully");
  } catch (error) {
    console.error("[sendGadsEvent] Error:", error);
    return internalError(res, "Failed to upload Google Ads conversion");
  }
};
