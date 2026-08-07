import { prisma } from "../../lib/prisma.js";
import { generateOtp } from "../../utils/generateOtp.js";
import { generateId } from "../../utils/generateId.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  created,
  ok,
  internalError,
  errorResponse,
  unauthorized,
  forbidden,
  notFound,
} from "../../utils/response.js";
import {
  generateAccessAndRefreshTokens,
  sendSmsOTPHandler,
  sendWhatsappOTPHandler,
} from "./auth.service.js";
import {
  setKey,
  getKey,
  deleteKey,
  incrementKey,
  setExpiry,
} from "../../config/redis/redis.utils.js";
import {
  BLOCK_DURATION,
  MAX_ATTEMPTS,
  OTP_EXPIRY,
  RESEND_EXPIRY,
  RESEND_LIMIT,
} from "../../config/redis/redis.constants.js";
import {
  OTP_ATTEMPTS_KEY,
  OTP_BLOCKED_KEY,
  OTP_KEY,
  OTP_RESEND_KEY,
} from "../../config/redis/redis.keys.js";

const sendOTPHandler = async (mobileNumber, platform) => {
  try {
    // 1. Check send/resend rate limit
    const resendCount = await getKey(OTP_RESEND_KEY(mobileNumber));

    const currentCount = resendCount ? parseInt(resendCount) : 0;
    if (currentCount >= RESEND_LIMIT) {
      throw Object.assign(
        new Error("OTP request limit reached. Please try again later."),
        { code: "RESEND_LIMIT_EXCEEDED" },
      );
    }
    const newCount = await incrementKey(OTP_RESEND_KEY(mobileNumber));
    if (newCount === 1) {
      // first request — start the expiry window
      await setExpiry(OTP_RESEND_KEY(mobileNumber), RESEND_EXPIRY);
    }

    // 2. check if there is an existing OTP for this phone number that is still valid (not expired).
    const existingOtp = await getKey(OTP_KEY(mobileNumber));
    if (existingOtp) {
      // 3. If there is a valid OTP, delete it
      await deleteKey(OTP_KEY(mobileNumber));
    }
    // 4. Generate a random 6-digit OTP (e.g. 482910).
    const otp = generateOtp();
    // 4. Hash the OTP using bcrypt before saving.
    const hashedOtp = await bcrypt.hash(otp, 10);
    // 5. Save the hashed OTP + phone + expiry (10 minutes from now) in the redis cache.
    await setKey(OTP_KEY(mobileNumber), hashedOtp, OTP_EXPIRY); // store OTP in Redis with 10 minutes expiry
    // 6. Call MSG91 API with the phone number and OTP to send the SMS.
    if (platform === "SMS") {
      await sendSmsOTPHandler(mobileNumber, otp);
    } else if (platform === "Whatsapp") {
      await sendWhatsappOTPHandler(mobileNumber, otp);
    }
  } catch (error) {
    if (error.code) throw error; // re-throw known/coded errors (e.g. RESEND_LIMIT_EXCEEDED)
    console.error("Error in sendOTPHandler:", error);
    throw new Error("Failed to send OTP");
  }
};

export const sendOtp = async (req, res) => {
  try {
    // 1.  Receive phone number from request body.
    const { mobileNumber } = req.body;
    // 2.  Validate the phone number format (must be a valid mobile number with country code).
    // (Validation should be handled in middleware using express-validator, so we assume it's valid here)

    await sendOTPHandler(mobileNumber, "SMS");
    // 8.  Return success response.
    return created(res, null, `OTP sent successfully`);
  } catch (error) {
    if (error.code === "RESEND_LIMIT_EXCEEDED") {
      return errorResponse(res, error.message, 429);
    }
    console.error("Error in sendOtp:", error);
    return internalError(res, "Failed to send OTP");
  }
};

export const resendOtp = async (req, res) => {
  try {
    // 1.  Receive phone number from request body.
    const { mobileNumber, platform } = req.body;
    // 2.  Validate the phone number format (must be a valid mobile number with country code).
    // (Validation should be handled in middleware using express-validator, so we assume it's valid here)
    await sendOTPHandler(mobileNumber, platform);
    // 8.  Return success response.
    return ok(res, null, `OTP resent successfully`);
  } catch (error) {
    if (error.code === "RESEND_LIMIT_EXCEEDED") {
      return errorResponse(res, error.message, 429);
    }
    console.error("Error in resendOtp:", error);
    return internalError(res, "Failed to resend OTP");
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    // 1. Check if user is blocked
    const isBlocked = await getKey(OTP_BLOCKED_KEY(mobileNumber));
    if (isBlocked) {
      return forbidden(
        res,
        `Too many failed attempts. Please try again after ${BLOCK_DURATION / 60} minutes.`,
      );
    }

    // 2. Validate OTP from Redis
    const hashedOtp = await getKey(OTP_KEY(mobileNumber));
    if (!hashedOtp) {
      return errorResponse(res, "Invalid or expired OTP", 400);
    }

    const isMatch = await bcrypt.compare(otp, hashedOtp);
    if (!isMatch) {
      const attempts = await incrementKey(OTP_ATTEMPTS_KEY(mobileNumber));
      if (attempts === 1) {
        await setExpiry(OTP_ATTEMPTS_KEY(mobileNumber), OTP_EXPIRY);
      }
      if (attempts >= MAX_ATTEMPTS) {
        await setKey(OTP_BLOCKED_KEY(mobileNumber), "1", BLOCK_DURATION);
        await deleteKey(OTP_ATTEMPTS_KEY(mobileNumber));
        await deleteKey(OTP_KEY(mobileNumber));
        return forbidden(
          res,
          `Too many failed attempts. Please try again after ${BLOCK_DURATION / 60} minutes.`,
        );
      }
      return errorResponse(res, "Invalid or expired OTP", 400);
    }

    await deleteKey(OTP_ATTEMPTS_KEY(mobileNumber));
    await deleteKey(OTP_KEY(mobileNumber));

    // 4. Upsert user — atomic, single DB hit
    const user = await prisma.user.upsert({
      where: { mobileNumber },
      update: {},
      create: { id: generateId.user(), mobileNumber, role: "user" },
    });

    // 5. Detect new user — createdAt and updatedAt are identical on creation
    const isNewUser = Math.abs(
      user.createdAt.getTime() - user.updatedAt.getTime()
    ) < 100; // 100ms threshold to avoid clock rounding issues

    // 6. Generate tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user);

    // 7. Update refresh tokens
    const existingTokens = Array.isArray(user.refreshTokens)
      ? user.refreshTokens
      : [];
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokens: [
          ...existingTokens,
          {
            token: refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    });

    // 8. Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    updatedUser.refreshTokens = undefined;

    const responseData = {
      accessToken,
      refreshToken,
      user: updatedUser,
    };

    // 9. 201 for new user, 200 for existing
    return isNewUser
      ? created(res, responseData, "Account created successfully")
      : ok(res, responseData, "OTP verified successfully");

  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return internalError(res, "Failed to verify OTP");
  }
};

export const refreshToken = async (req, res) => {
  try {
    // 1.  Receive refreshToken from request body.
    const refreshToken = req.cookies?.refreshToken;
    // 2.  Decode and verify the refresh token using the JWT secret.
    let decoded;
    try {
      // 3.  If invalid or expired — return 401 Unauthorized.
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      console.log(error);

      return errorResponse(res, "Invalid refresh token", 401);
    }
    // 4.  Look up the user in the database using the userId from the decoded token.
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      return unauthorized(res, "Invalid refresh token");
    }

    // 5.  Check that the refresh token exists in the array and has not expired.
    const tokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
    const validToken = tokens.find(
      (t) => t.token === refreshToken && new Date(t.expiresAt) > new Date(),
    );
    if (!validToken) {
      return unauthorized(res, "Invalid or expired refresh token");
    }
    // 7.  Generate a new access token and refresh token (expires in 1 hour).
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user);

    // 8.  Update the refresh token and refresh token expiry in the user record. and remove the old refresh token from the array
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokens: [
          ...tokens.filter((t) => t.token !== refreshToken), // keep all other tokens except the old one
          {
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          },
        ],
      },
    });
    // 9.  Return the new access token and refresh token.
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return ok(
      res,
      {
        accessToken,
        refreshToken: newRefreshToken,
      },
      "Token refreshed successfully",
    );
  } catch (error) {
    console.error("Error in refreshToken:", error);
    return internalError(res, "Failed to refresh token");
  }
};

export const logout = async (req, res) => {
  try {
    // 1.  Extract userId from the access token in the Authorization header.
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return unauthorized(res, "Refresh token is required for logout");
    }

    const userId = req.user.userId; // Assuming you have middleware to authenticate and set req.user
    // 2.  Look up the user in the database using the userId.
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // 3.  Update the user record in the database — remove the logout refresh token, keep others.
    const userTokens = Array.isArray(user.refreshTokens)
      ? user.refreshTokens
      : [];
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokens: userTokens.filter((t) => t.token !== refreshToken),
      },
    });

    // 4.  Return success response.
    return ok(res, null, "Logged out successfully");
  } catch (error) {
    console.error("Error in logout:", error);
    return internalError(res, "Failed to logout");
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // 1.  Extract userId from the access token in the Authorization header.
    const userId = req.user.userId;
    // 3.  Fetch the user record from the database by userId.
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    // 4.  Return user profile fields (excluding tokens and sensitive data.
    if (!user) {
      return notFound(res, "User not found");
    }

    user.refreshTokens = undefined; // remove refresh tokens from user object before sending response

    return ok(res, user, "User profile fetched successfully");
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return internalError(res, "Failed to fetch user profile");
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, city } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        city,
      },
    });

    updatedUser.refreshTokens = undefined; // remove refresh tokens from user object before sending response

    return ok(res, updatedUser, "User profile updated successfully");
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    return internalError(res, "Failed to update user profile");
  }
};
