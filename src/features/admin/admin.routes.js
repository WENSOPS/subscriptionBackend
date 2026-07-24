import { Router } from "express";
import multer from "multer";
import * as adminController from "./admin.controller.js";
import {
  createReferralProgram,
  getReferralPrograms,
  getReferralProgramById,
  updateReferralProgram,
  deleteReferralProgram,
  getReferralProgramTracks,
} from "../referral/referral.controller.js";
import {
  createReferralProgramValidation,
  updateReferralProgramValidation,
  referralProgramIdParamValidation,
  getReferralProgramTracksValidation,
} from "../referral/referral.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // limit file size to 10MB
  },
});

router.post(
  "/import",
  authMiddleware(["admin"]),
  upload.single("file"),
  adminController.importData,
);

router.get("/export", authMiddleware(["admin"]), adminController.exportData);

router.post(
  "/referral-programs",
  authMiddleware(["admin", "ops"]),
  createReferralProgramValidation,
  createReferralProgram,
);

router.get(
  "/referral-programs",
  authMiddleware(["admin", "ops"]),
  getReferralPrograms,
);

router.get(
  "/referral-programs/:id",
  authMiddleware(["admin", "ops"]),
  referralProgramIdParamValidation,
  getReferralProgramById,
);

router.patch(
  "/referral-programs/:id",
  authMiddleware(["admin", "ops"]),
  updateReferralProgramValidation,
  updateReferralProgram,
);

router.delete(
  "/referral-programs/:id",
  authMiddleware(["admin", "ops"]),
  referralProgramIdParamValidation,
  deleteReferralProgram,
);

router.get(
  "/referral-programs/:id/track",
  authMiddleware(["admin", "ops"]),
  getReferralProgramTracksValidation,
  getReferralProgramTracks,
);

export default router;
