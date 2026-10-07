import { ok, badRequest, internalError } from "../../utils/response.js";
import { forwardEnquiry, loginLeadService } from "./enquiry.service.js";

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
    const { phone, email } = req.body;
    const payload = {
      phone: phone ?? null,
      email: email ?? null,
    };
    const data = await loginLeadService(payload);
    return ok(res, data, "Lead logged successfully");
  } catch (error) {
    console.error(
      "Error logging lead:",
      error?.response?.data || error.message,
    );
    return internalError(res, "Failed to log lead");
  }
};
