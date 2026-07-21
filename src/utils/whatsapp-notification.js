import axios from "axios";

const DOUBLETICK_API_URL =
  "https://public.doubletick.io/whatsapp/message/template";
const API_TOKEN = process.env.DOUBLETICK_API_TOKEN;
const BOT_NUMBER = process.env.DOUBLETICK_BOT_NUMBER;

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  templateParams = [],
  mediaUrl = null,
}) {
  try {
    if (!API_TOKEN || !BOT_NUMBER) {
      throw new Error("Missing WhatsApp API credentials");
    }

    const normalizedPhone = normalizePhone(to);
    if (!normalizedPhone) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    const payload = {
      messages: [
        {
          content: {
            language: "en",
            templateData: {
              body: {
                placeholders: templateParams.map((p) => String(p)),
              },
            },
            templateName: templateName,
          },
          from: BOT_NUMBER,
          to: normalizedPhone,
        },
      ],
    };

    const response = await axios.post(DOUBLETICK_API_URL, payload, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: API_TOKEN,
      },
    });

    return {
      success: true,
      messageId: response.data?.message_id,
      data: response.data,
    };
  } catch (error) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp message",
      data: error.response?.data,
    };
  }
}

export async function sendWhatsAppTemplateToBroadcast(
  groupName,
  templateName,
  templateParams = [],
  customerPhone = null,
) {
  try {
    const templateData = {
      body: {
        placeholders: templateParams.map((p) => String(p)),
      },
    };

    // Add button only if phone is provided
    if (customerPhone) {
      templateData.buttons = [
        {
          type: "URL",
          parameter: customerPhone,
        },
      ];
    }

    const payload = {
      groupName,
      from: BOT_NUMBER,
      content: {
        language: "en",
        templateName,
        templateData,
      },
    };

    const response = await axios.post(
      "https://public.doubletick.io/whatsapp/message/broadcast",
      payload,
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: API_TOKEN,
        },
      },
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Broadcast Error:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
