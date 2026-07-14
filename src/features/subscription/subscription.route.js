import { Router } from "express";
import * as subscriptionController from "./subscription.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";
import * as subscriptionValidation from "./subscription.validation.js";
const router = Router();

router.get("/my", authMiddleware(["user","admin", "ops"]), subscriptionController.getMySubscription);
router.get("/my/history", authMiddleware(["user","admin", "ops"]), subscriptionController.getMySubscriptionHistory);
router.post("/", authMiddleware(["admin", "ops"]), subscriptionValidation.createSubscriptionValidation, subscriptionController.createSubscriptionController);
router.get("/:id", authMiddleware(["admin", "ops"]), subscriptionValidation.paramsIdValidation, subscriptionController.getSubscriptionById);
router.get("/", authMiddleware(["admin", "ops"]), subscriptionController.getAllSubscriptions);
router.put("/:id/verify", authMiddleware(["admin", "ops"]), subscriptionValidation.verifySubscriptionValidation, subscriptionController.verifySubscription);
router.put("/:id/cancel", authMiddleware(["admin", "ops"]), subscriptionValidation.cancelSubscriptionValidation, subscriptionController.cancelSubscription);

export default router;