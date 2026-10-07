import { ok, badRequest, internalError } from "../../utils/response.js";
import {
  forwardEnquiry,
  loginLeadService,
  bookingLeadService,
  whatsappEnquiryService,
} from "./enquiry.service.js";

export const takeEnquiry = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      serviceDate,
      serviceCity,
      noOfDays,
      serviceType,
      additionalFacilities,
      route,
      customisation,
      fromCampaign,
      campaign,
    } = req.body;

    const payload = {
      name,
      phone,
      email,
      serviceDate,
      serviceCity,
      noOfDays,
      serviceType,
      additionalFacilities: additionalFacilities ?? null,
      route: route || "membership",
      customisation: customisation ?? null,
      fromCampaign: fromCampaign ?? false,
      campaign: campaign ?? null,
    };

    const data = await forwardEnquiry(payload);
    return ok(res, data, "Enquiry submitted successfully");
  } catch (error) {
    console.error(
      "Error submitting enquiry:",
      error?.response?.data || error.message,
    );

    if (error.message === "ENQUIRY_ZOHO_FLOW_API_URL is not configured") {
      return badRequest(res, error.message);
    }

    return internalError(res, "Failed to submit enquiry");
  }
};

export const loginLead = async (req, res) => {
  try {
    if (!req.body.phone) {
      return badRequest(res, "Phone is required");
    }

    const data = await loginLeadService(req.body);
    return ok(res, data, "Lead logged successfully");
  } catch (error) {
    console.error(
      "Error logging lead:",
      error?.response?.data || error.message,
    );
    return internalError(res, "Failed to log lead");
  }
};

export const bookingLead = async (req, res) => {
  try {
    const data = await bookingLeadService(req.body);
    return ok(res, data, "Booking lead successfully");
  } catch (error) {
    console.error(
      "Error booking lead:",
      error?.response?.data || error.message,
    );
    return internalError(res, "Failed to book lead");
  }
};

export const whatsappEnquiry = async (req, res) => {
  try {
    if (!req.body?.referenceId) {
      return badRequest(res, "Reference ID is required");
    }
    const data = await whatsappEnquiryService(req.body);
    return ok(res, data, "Whatsapp enquiry successfully");
  } catch (error) {
    console.log(
      "Error whatsapp enquiry:",
      error?.response?.data || error.message,
    );
    return internalError(res, "Failed to whatsapp enquiry");
  }
};
