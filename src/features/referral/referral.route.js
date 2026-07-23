import { Router } from "express";
import * as referralController from "./referral.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

router.get(
  "/summary",
  authMiddleware(["admin", "ops", "user"]),
  referralController.getUserReferralSummary
);

router.post(
  "/apply",
  authMiddleware(["admin", "ops", "user"]),
  referralController.applyReferralCode
);

export default router;
