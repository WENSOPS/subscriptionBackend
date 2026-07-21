import { Router } from "express";
import multer from "multer";
import * as adminController from "./admin.controller.js";
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

export default router;
