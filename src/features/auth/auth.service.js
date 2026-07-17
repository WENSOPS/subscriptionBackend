import jwt from "jsonwebtoken";
import axios from "axios";

const generateAccessAndRefreshTokens = (user) => {
  const payload = {
    userId: user.id,
    role: user.role,
    mobileNumber: user.mobileNumber,
    name: user.name,
  };
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h",
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d",
  });
  return { accessToken, refreshToken };
};

const sendSmsOTPHandler = async (mobileNumber, otp) => {
  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/flow",
      {
        template_id: process.env.MSG91_SENDOTP_TEMPLATE_ID,
        short_url: "0",
        recipients: [
          {
            mobiles: mobileNumber,
            var1: otp,
            var2: 10, // Assuming your template uses var1 for OTP
          },
        ],
      },
      {
        headers: {
          accept: "application/json",
          authkey: process.env.MSG91_AUTH_KEY,
          "content-type": "application/json",
        },
      },
    );
    if (response.data?.type !== "success") {
      console.error("Failed to send SMS OTP:", response.data);
      throw new Error("Failed to send OTP via SMS");
    }
    return response.data;
  } catch (error) {
    console.error(
      "Error in sendSmsOTPHandler:",
      error.response?.data || error.message,
    );
    throw new Error("Failed to send OTP via SMS");
  }
};

const sendWhatsappOTPHandler = async (mobileNumber, otp) => {
  try {
    const response = await axios.post(
      "https://public.doubletick.io/whatsapp/message/template",
      {
        messages: [
          {
            content: {
              language: "en",
              templateData: {
                body: {
                  placeholders: [otp],
                },
              },
              templateName: "subscription_otp_login", // Replace with your actual template name
            },
            from: process.env.DOUBLETICK_FROM_NUMBER, // Set this in your .env file
            to: mobileNumber,
          },
        ],
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: `${process.env.DOUBLETICK_API_KEY}`, // Set this in your .env file
        },
      },
    );
    console.log("WhatsApp OTP response:", response.data);
    if (response.status !== 200) {
      console.error("Failed to send WhatsApp OTP:", response.data);
      throw new Error("Failed to send OTP via WhatsApp");
    }
    return response.data;
  } catch (error) {
    console.error(
      "Error in sendWhatsappOTPHandler:",
      error.response?.data || error.message,
    );
    throw new Error("Failed to send OTP via WhatsApp");
  }
};

export { generateAccessAndRefreshTokens, sendSmsOTPHandler, sendWhatsappOTPHandler };
