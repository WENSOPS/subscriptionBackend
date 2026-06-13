import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createSubscriptionValidation = [
  /* userId,
    packageId,
    startDate,
    endDate,
    amount,
    couponCode,
    couponId,
    paymentId, */

  body("userId").isInt().withMessage("User ID must be an integer"),
  body("packageId").isInt().withMessage("Package ID must be an integer"),
  body("startDate")
    .isISO8601()
    .toDate()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .isISO8601()
    .toDate()
    .withMessage("End date must be a valid date"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),
  body("couponCode")
    .optional()
    .isString()
    .withMessage("Coupon code must be a string"),
  body("couponId")
    .optional()
    .isInt()
    .withMessage("Coupon ID must be an integer"),
  body("paymentId").isString().withMessage("Payment ID must be a string"),
  validate,
];

export const paramsIdValidation = [
  param("id").isInt().withMessage("ID must be an integer"),
  validate,
];

export const verifySubscriptionValidation = [
  param("id").isInt().withMessage("ID must be an integer"),
  body("adminRemarks")
    .optional()
    .isString()
    .withMessage("Admin remarks must be a string"),
  validate,
];
