import { Router } from "express";
import * as couponController from "./coupon.controller.js";
import * as couponValidation from "./coupon.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";
const router = Router();

router.get("/", authMiddleware(['admin', 'ops']), couponController.getAllCoupons);
router.get("/validate", authMiddleware(['admin', 'user', 'ops']), couponValidation.validateCouponQuery, couponController.validateCoupon);
router.post("/", authMiddleware(['admin']), couponValidation.validateCreateCoupon, couponController.createCoupon);
router.put("/:id", authMiddleware(['admin']), couponValidation.validateUpdateCoupon, couponController.updateCoupon);
router.delete("/:id", authMiddleware(['admin']), couponValidation.validateDeleteCoupon, couponController.deleteCoupon);

export default router;
