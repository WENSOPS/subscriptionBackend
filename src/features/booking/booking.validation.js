import { validationResult, body } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createBookingValidation = [
  body("packageId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Package ID must be a non-empty string"),
  body("packageName").isString().withMessage("Package name must be a string"),
  body("purchaseDate")
    .isISO8601()
    .toDate()
    .withMessage("Purchase date must be a valid date"),
  body("validity").isString().withMessage("Validity must be a string"),
  body("purchaseAmount")
    .isFloat({ gt: 0 })
    .withMessage("Purchase amount must be a positive number"),
  validate,
];

export const updateStatusValidation = [
  body("status")
    .isIn([
      "initiated",
      "pending",
      "active",
      "cancelled",
      "completed",
      "failed",
    ])
    .withMessage(
      "Status must be one of: initiated, pending, active, cancelled, completed, failed",
    ),
  validate,
];
