import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createTripValidation = [
  body("assignmentId").isString().withMessage("Assignment ID must be a string"),
  body("subscriptionId")
    .isInt()
    .withMessage("Subscription ID must be an integer"),
  body("pickupLocation")
    .isString()
    .withMessage("Pickup location must be a string"),
  body("dropLocation").isString().withMessage("Drop location must be a string"),
  body("tripDate").isISO8601().withMessage("Trip date must be a valid date"),
  body("tripType")
    .isIn(["airport-transfer", "8Hr/80Km"])
    .withMessage("Trip type must be either 'airport-transfer' or '8Hr/80Km'"),
  body("services").isArray().withMessage("Services must be an array"),
  body("services.*.name")
    .isString()
    .withMessage("Service name must be a string"),
  body("services.*.price")
    .isFloat({ gt: 0 })
    .withMessage("Service price must be a positive number"),
  validate,
];

export const requestTripValidation = [
  body("pickupLocation")
    .isString()
    .withMessage("Pickup location must be a string"),
  body("dropLocation").isString().withMessage("Drop location must be a string"),
  body("tripDate").isISO8601().withMessage("Trip date must be a valid date"),
  body("tripType")
    .isIn(["airport-transfer", "8Hr/80Km"])
    .withMessage("Trip type must be either 'airport-transfer' or '8Hr/80Km'"),
  body("services").isArray().withMessage("Services must be an array"),
  body("services.*.name")
    .isString()
    .withMessage("Service name must be a string"),
  body("services.*.price")
    .isFloat({ gt: 0 })
    .withMessage("Service price must be a positive number"),
  validate,
];

export const approveTripValidation = [
  param("id").isInt().withMessage("Trip ID must be an integer"),
  body("assignmentId").isString().withMessage("Assignment ID must be a string"),
  validate,
];

export const updateTripValidation = [
  param("id").isInt().withMessage("Trip ID must be an integer"),
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
    .isIn(["airport-transfer", "8Hr/80Km"])
    .withMessage("Trip type must be either 'airport-transfer' or '8Hr/80Km'"),
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
  validate,
];

export const deleteTripValidation = [
  param("id").isInt().withMessage("Trip ID must be an integer"),
  validate,
];