import { Router } from "express";
import * as dashboardController from "./dashboard.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

router.get(
  "/admin",
  authMiddleware(["admin", "ops"]),
  dashboardController.getAdminDashboard,
);
// router.get('/user', dashboardController.getUserDashboard);

export default router;
