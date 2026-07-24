import { Router } from "express";
import * as referralController from "./referral.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";
import {
  getUserReferralSummaryValidation,
  applyReferralCodeValidation,
} from "./referral.validation.js";

const router = Router();

router.get(
  "/summary",
  authMiddleware(["admin", "ops", "user"]),
  getUserReferralSummaryValidation,
  referralController.getUserReferralSummary
);

router.post(
  "/apply",
  authMiddleware(["admin", "ops", "user"]),
  applyReferralCodeValidation,
  referralController.applyReferralCode
);

export default router;
