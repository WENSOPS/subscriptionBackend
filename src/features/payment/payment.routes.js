import express, { Router } from "express";
import authMiddleware from "../../middleware/auth.middlewares.js";
import { validateCoupon } from "../coupon/coupon.controller.js";
import * as paymentController from "./payment.controller.js";
import * as paymentValidation from "./payment.validation.js";
const router = Router();

router.post(
  "/create-order",
  authMiddleware(["user", "admin", "ops"]),
  paymentValidation.createPaymentValidation,
  paymentController.createOrder,
);
router.get(
  "/verify-payment/:orderId",
  authMiddleware(["user", "admin", "ops"]),
  paymentValidation.verifyPaymentValidation,
  paymentController.verifyPayment,
);
router.post("/webhook", express.raw({ type: "*/*" }), paymentController.handleWebhook); // No auth, Cashfree calls this
router.get(
  "/",
  authMiddleware(["admin", "ops"]),
  paymentController.getAllPayments,
);
router.get(
  "/user",
  authMiddleware(["user", "admin", "ops"]),
  paymentController.getUserPayments,
);
router.get(
  "/:id",
  authMiddleware(["admin", "ops"]),
  paymentValidation.paramsIdValidation,
  paymentController.getPaymentById,
);
export default router;
