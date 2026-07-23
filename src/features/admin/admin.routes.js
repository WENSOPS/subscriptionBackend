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
  getReferralProgramById,
);

router.patch(
  "/referral-programs/:id",
  authMiddleware(["admin", "ops"]),
  updateReferralProgram,
);

router.delete(
  "/referral-programs/:id",
  authMiddleware(["admin", "ops"]),
  deleteReferralProgram,
);

router.get(
  "/referral-programs/:id/track",
  authMiddleware(["admin", "ops"]),
  getReferralProgramTracks,
);

export default router;
