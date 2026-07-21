import { Router } from "express";
import * as authController from "./auth.controller.js";
import * as authValidation from "./auth.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

router.post(
  "/send-otp",
  authValidation.sendOtpValidationRules(),
  authController.sendOtp,
);

router.post(
  "/verify-otp",
  authValidation.verifyOtpValidationRules(),
  authController.verifyOtp,
);

router.post(
  "/resend-otp",
  authValidation.resendOtpValidationRules(),
  authController.resendOtp,
);

router.post(
  "/refresh-token",
  authValidation.refreshTokenValidationRules(),
  authController.refreshToken,
);

router.post(
  "/logout",
  authMiddleware(["user", "admin", "ops"]),
  authValidation.logoutValidationRules(),
  authController.logout,
);

router.get(
  "/me",
  authMiddleware(["user", "admin", "ops"]),
  authController.getCurrentUser,
);

router.put(
  "/update-profile",
  authMiddleware(["user", "admin", "ops"]),
  authValidation.updateProfileValidationRules(),
  authController.updateUserProfile,
);

export default router;
