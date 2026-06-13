import { body, param, query, validationResult } from "express-validator";

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};


export const validateCreateCoupon = [
    body("code").isString().notEmpty().withMessage("Code is required"),
    body("discountType").isString().notEmpty().withMessage("Discount type is required"),
    body("discountValue").isFloat({ gt: 0 }).withMessage("Discount value must be a positive number"),
    body("expiryDate").isISO8601().toDate().withMessage("Expiry date must be a valid date"),
    body("packageId").optional().isArray().withMessage("Package ID must be an array"),
    validate,
];

export const validateUpdateCoupon = [
    param("id").isInt().withMessage("Coupon ID must be an integer"),
    body("code").optional().isString().notEmpty().withMessage("Code is required"),
    body("discountType").optional().isString().notEmpty().withMessage("Discount type is required"),
    body("discountValue").optional().isFloat({ gt: 0 }).withMessage("Discount value must be a positive number"),
    body("expiryDate").optional().isISO8601().toDate().withMessage("Expiry date must be a valid date"),
    body("packageId").optional().isArray().withMessage("Package ID must be an array"),
    validate,
];

export const validateCouponQuery = [
    query("code").isString().notEmpty().withMessage("Code is required"),
    query("packageId").optional().isInt().withMessage("Package ID must be an integer"),
    validate,
];

export const validateDeleteCoupon = [
    param("id").isInt().withMessage("Coupon ID must be an integer"),
    validate,
];