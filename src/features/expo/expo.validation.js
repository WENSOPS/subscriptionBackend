import { body, param, validationResult } from "express-validator";
import {
  parseExpoDate,
  validateExpoDateFields,
} from "./expoDateValidation.js";

export const EXPO_STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const optionalStringArray = (field) =>
  body(field)
    .optional({ nullable: true })
    .isArray()
    .withMessage(`${field} must be an array`);

function expoDateCrossFieldRules() {
  return [
    body("eventStart")
      .notEmpty()
      .withMessage("Event start is required")
      .custom((value) => {
        parseExpoDate(value, "Event start");
        return true;
      }),

    body("eventEnd")
      .notEmpty()
      .withMessage("Event end is required")
      .custom((value) => {
        parseExpoDate(value, "Event end");
        return true;
      }),

    body().custom((_, { req }) => {
      req.body.serviceStart = req.body.eventStart;
      req.body.serviceEnd = req.body.eventEnd;
      const messages = validateExpoDateFields({
        eventStart: req.body.eventStart,
        eventEnd: req.body.eventEnd,
      });
      if (messages.length > 0) {
        throw new Error(messages[0]);
      }
      return true;
    }),
  ];
}

function sharedExpoBodyRules() {
  return [
    body("slug")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Slug is required")
      .isLength({ max: 191 })
      .withMessage("Slug must be at most 191 characters"),

    body("name")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Name is required"),

    body("shortName")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("Short name must be a string"),

    body("city")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("City is required"),

    body("venue")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Venue is required"),

    ...expoDateCrossFieldRules(),

    body("status")
      .optional()
      .isIn(EXPO_STATUSES)
      .withMessage(`Status must be one of: ${EXPO_STATUSES.join(", ")}`),

    body("featured")
      .optional()
      .isBoolean()
      .withMessage("featured must be a boolean")
      .toBoolean(),

    optionalStringArray("heroImages"),
    body("heroImages.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each hero image must be a non-empty string"),

    body("cardImage")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("cardImage must be a string"),

    body("bannerImage")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("bannerImage must be a string"),

    optionalStringArray("eventImages"),
    body("eventImages.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each event image must be a non-empty string"),

    optionalStringArray("eventVideos"),
    body("eventVideos.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each event video must be a non-empty string"),

    body("airportCode")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("airportCode must be a string"),

    body("airportName")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("airportName must be a string"),

    body("airportDistance")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("airportDistance must be a non-negative number (km)")
      .toFloat(),

    body("airportTravelTime")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("airportTravelTime must be a non-negative number (hours)")
      .toFloat(),

    optionalStringArray("pickupPoints"),
    body("pickupPoints.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each pickup point must be a non-empty string"),

    body("dropLocation")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("dropLocation must be a string"),

    body("serviceArea")
      .optional({ nullable: true })
      .isString()
      .trim()
      .withMessage("serviceArea must be a string"),

    optionalStringArray("amenities"),
    body("amenities.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each amenity must be a non-empty string"),

    body("faqOverrides")
      .optional({ nullable: true })
      .isArray()
      .withMessage("faqOverrides must be an array"),
    body("faqOverrides.*.question")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each FAQ override must have a question"),
    body("faqOverrides.*.answer")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each FAQ override must have an answer"),

    optionalStringArray("testimonialIds"),
    body("testimonialIds.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each testimonial ID must be a non-empty string"),

    body("packageIds")
      .optional({ nullable: true })
      .isArray()
      .withMessage("packageIds must be an array"),
    body("packageIds.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each package ID must be a non-empty string"),
  ];
}

export const createExpoValidationRules = () => {
  return [
    body("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Expo ID is required")
      .isLength({ max: 50 })
      .withMessage("Expo ID must be at most 50 characters"),

    ...sharedExpoBodyRules(),
    validate,
  ];
};

export const updateExpoValidationRules = () => {
  return [...sharedExpoBodyRules(), validate];
};

export const expoIdValidationRules = () => {
  return [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Expo ID must be a non-empty string")
      .isLength({ max: 50 })
      .withMessage("Expo ID must be at most 50 characters"),
    validate,
  ];
};
