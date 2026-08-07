import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const TRIP_TYPES = ["airport-transfer", "8Hr/80Km", "Full day"];

export const createTripValidation = [
  body("assignmentId").isString().withMessage("Assignment ID must be a string"),
  body("subscriptionId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Subscription ID must be a non-empty string"),
  body("pickupLocation")
    .isString()
    .withMessage("Pickup location must be a string"),
  body("dropLocation").isString().withMessage("Drop location must be a string"),
  body("tripDate").isISO8601().withMessage("Trip date must be a valid date"),
  body("tripType")
    .isIn(TRIP_TYPES)
    .withMessage(
      "Trip type must be one of: airport-transfer, 8Hr/80Km, Full day",
    ),
  body("services").isArray().withMessage("Services must be an array"),
  body("services.*.id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Service ID must be a non-empty string"),
  body("services.*.name")
    .isString()
    .withMessage("Service name must be a string"),
  body("services.*.price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Service price must be a positive number"),
  body("additionalAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Additional amount must be a non-negative number")
    .toFloat(),
  validate,
];

export const requestTripValidation = [
  body("pickupLocation")
    .isString()
    .withMessage("Pickup location must be a string"),
  body("dropLocation").isString().withMessage("Drop location must be a string"),
  body("tripDate").isISO8601().withMessage("Trip date must be a valid date"),
  body("tripType")
    .isIn(TRIP_TYPES)
    .withMessage(
      "Trip type must be one of: airport-transfer, 8Hr/80Km, Full day",
    ),
  body("services").isArray().withMessage("Services must be an array"),
  body("services.*.id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Service ID must be a non-empty string"),
  body("services.*.name")
    .isString()
    .withMessage("Service name must be a string"),
  body("additionalAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Additional amount must be a non-negative number")
    .toFloat(),
  validate,
];

export const approveTripValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Trip ID must be a non-empty string"),
  body("assignmentId").isString().withMessage("Assignment ID must be a string"),
  validate,
];

export const updateTripValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Trip ID must be a non-empty string"),
  body("pickupLocation")
    .optional()
    .isString()
    .withMessage("Pickup location must be a string"),
  body("dropLocation")
    .optional()
    .isString()
    .withMessage("Drop location must be a string"),
  body("tripDate")
    .optional()
    .isISO8601()
    .withMessage("Trip date must be a valid date"),
  body("tripType")
    .optional()
    .isIn(TRIP_TYPES)
    .withMessage(
      "Trip type must be one of: airport-transfer, 8Hr/80Km, Full day",
    ),
  body("services")
    .optional()
    .isArray()
    .withMessage("Services must be an array"),
  body("services.*.name")
    .optional()
    .isString()
    .withMessage("Service name must be a string"),
  body("services.*.price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Service price must be a positive number"),
  body("additionalAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Additional amount must be a non-negative number")
    .toFloat(),
  validate,
];

export const deleteTripValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Trip ID must be a non-empty string"),
  validate,
];

export const getTripByIdValidation = [
  param("id")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Trip ID must be a non-empty string"),
  validate,
];
