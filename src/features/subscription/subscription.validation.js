import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createSubscriptionValidation = [
  body("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("User ID must be a non-empty string"),
  body("packageId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Package ID must be a non-empty string"),
  body("startDate")
    .isISO8601()
    .toDate()
    .withMessage("Start date must be a valid date"),
  body("paymentId").isString().withMessage("Payment ID must be a string"),
  validate,
];

export const paramsIdValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("ID must be a non-empty string"),
  validate,
];

export const verifySubscriptionValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("ID must be a non-empty string"),
  body("adminRemarks")
    .optional()
    .isString()
    .withMessage("Admin remarks must be a string"),
  validate,
];

export const cancelSubscriptionValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("ID must be a non-empty string"),
  body("adminRemarks")
    .optional()
    .isString()
    .withMessage("Admin remarks must be a string"),
  validate,
];
