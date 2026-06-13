import { prisma } from "../../lib/prisma.js";
import { generateOtp } from "../../utils/generateOtp.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  created,
  ok,
  internalError,
  errorResponse,
  unauthorized,
  forbidden,
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
      return errorResponse(res, "Invalid or expired OTP", 400);
    }

    // 3. Delete OTP from Redis BEFORE DB transaction (prevent reuse)
    await deleteKey(`otp:${mobileNumber}`);

    // 4. Generate tokens BEFORE transaction (keeps transaction short)
    const tempUser = { id: null, mobileNumber, role: "user" };

    // 5. Wrap DB operations in a single transaction
    const updatedUser = await prisma.$transaction(
      async (tx) => {
        // upsert = find OR create in one atomic operation (no race condition)
        const user = await tx.user.upsert({
          where: { mobileNumber },
          update: {}, // if exists, do nothing yet
          create: {
            mobileNumber,
            role: "user",
          },
        });

        // Now generate tokens with real user id
        const { accessToken, refreshToken } =
          await generateAccessAndRefreshTokens(user);

        const existingTokens = Array.isArray(user.refreshTokens)
          ? user.refreshTokens
          : [];

        const updated = await tx.user.update({
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

        return { user: updated, accessToken, refreshToken };
      },
      {
        timeout: 8000, // 8 second max
        isolationLevel: "ReadCommitted", // less locking than default
      },
    );

    // 6. Set cookie and respond
    res.cookie("refreshToken", updatedUser.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    updatedUser.user.refreshTokens = undefined;

    return ok(
      res,
      {
        accessToken: updatedUser.accessToken,
        refreshToken: updatedUser.refreshToken,
        user: updatedUser.user,
      },
      "OTP verified successfully",
    );
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
