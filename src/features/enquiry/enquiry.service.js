import axios from "axios";

export const forwardEnquiry = async (payload) => {
  const url = process.env.ENQUIRY_ZOHO_FLOW_API_URL;

  if (!url) {
    throw new Error("ENQUIRY_ZOHO_FLOW_API_URL is not configured");
  }

  const summary = await generateSummary(payload);

  const response = await axios.post(url, {...payload, summary }, {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const generateSummary = async (payload) => {
  const summary = `
  Name: ${payload.name}
  Phone: ${payload.phone}
  ${payload.email ? `Email: ${payload.email}` : ""}
  Service Date: ${payload.serviceDate}
  Service City: ${payload.serviceCity}
  No of Days: ${payload.noOfDays}
  Service Type: ${payload.serviceType}
  ${payload.additionalFacilities ? `Additional Facilities: ${payload.additionalFacilities}` : ""}
  Route: ${payload.route}
  ${payload.customisation ? `Customisation: ${JSON.stringify(payload.customisation)}` : ""}
  From Campaign: ${payload.fromCampaign ?? false}
  ${payload.campaign ? `Campaign: ${JSON.stringify(payload.campaign)}` : ""}
  `;

  return summary;
};
