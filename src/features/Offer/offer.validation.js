import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createOfferValidationRules = () => {
  return [
    body("slug")
      .notEmpty()
      .withMessage("Slug is required")
      .isString()
      .withMessage("Slug must be a string"),
    body("endDate")
      .notEmpty()
      .withMessage("End date is required")
      .isISO8601()
      .toDate()
      .withMessage("End date must be a valid date"),
    body("startDate")
      .optional({ nullable: true })
      .isISO8601()
      .toDate()
      .withMessage("Start date must be a valid date"),
    body("category")
      .notEmpty()
      .withMessage("Category is required")
      .isString()
      .withMessage("Category must be a string"),
    body("title")
      .notEmpty()
      .withMessage("Title is required")
      .isString()
      .withMessage("Title must be a string"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    body("alertText")
      .optional()
      .isString()
      .withMessage("Alert text must be a string"),
    body("eyebrow")
      .optional({ nullable: true })
      .isString()
      .withMessage("Eyebrow must be a string"),
    body("titleAccent")
      .optional({ nullable: true })
      .isString()
      .withMessage("Title accent must be a string"),
    body("description")
      .optional({ nullable: true })
      .isString()
      .withMessage("Description must be a string"),
    body("countdownLabel")
      .optional({ nullable: true })
      .isString()
      .withMessage("Countdown label must be a string"),
    body("pricingLabel")
      .optional({ nullable: true })
      .isString()
      .withMessage("Pricing label must be a string"),
    body("benefitsHeading")
      .optional({ nullable: true })
      .isString()
      .withMessage("Benefits heading must be a string"),
    body("deadlineNoteStrong")
      .optional({ nullable: true })
      .isString()
      .withMessage("Deadline note strong must be a string"),
    body("deadlineNoteBody")
      .optional({ nullable: true })
      .isString()
      .withMessage("Deadline note body must be a string"),
    body("ctaPrimaryText")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA primary text must be a string"),
    body("ctaPrimaryHref")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA primary href must be a string"),
    body("featuredPackageIds")
      .optional()
      .isArray()
      .withMessage("Featured package IDs must be an array"),
    body("featuredPackageIds.*")
      .isInt({ gt: 0 })
      .withMessage("Featured package ID must be a positive integer"),
    body("ctaSecondaryText")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA secondary text must be a string"),
    body("footerNote")
      .optional({ nullable: true })
      .isString()
      .withMessage("Footer note must be a string"),
    body("benefits")
      .optional()
      .isArray()
      .withMessage("Benefits must be an array"),
    body("benefits.*.icon")
      .notEmpty()
      .withMessage("Benefit icon is required")
      .isString()
      .withMessage("Benefit icon must be a string"),
    body("benefits.*.title")
      .notEmpty()
      .withMessage("Benefit title is required")
      .isString()
      .withMessage("Benefit title must be a string"),
    body("benefits.*.description")
      .notEmpty()
      .withMessage("Benefit description is required")
      .isString()
      .withMessage("Benefit description must be a string"),
    body("benefits.*.order")
      .optional()
      .isInt()
      .withMessage("Benefit order must be an integer"),
    validate,
  ];
};

export const updateOfferValidationRules = () => {
  return [
    param("id")
      .isInt({ gt: 0 })
      .withMessage("Offer ID must be a positive integer"),
    body("slug").optional().isString().withMessage("Slug must be a string"),
    body("endDate")
      .optional()
      .isISO8601()
      .toDate()
      .withMessage("End date must be a valid date"),
    body("startDate")
      .optional({ nullable: true })
      .isISO8601()
      .toDate()
      .withMessage("Start date must be a valid date"),
    body("category")
      .optional()
      .isString()
      .withMessage("Category must be a string"),
    body("title").optional().isString().withMessage("Title must be a string"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    body("alertText")
      .optional()
      .isString()
      .withMessage("Alert text must be a string"),
    body("eyebrow")
      .optional({ nullable: true })
      .isString()
      .withMessage("Eyebrow must be a string"),
    body("titleAccent")
      .optional({ nullable: true })
      .isString()
      .withMessage("Title accent must be a string"),
    body("description")
      .optional({ nullable: true })
      .isString()
      .withMessage("Description must be a string"),
    body("countdownLabel")
      .optional({ nullable: true })
      .isString()
      .withMessage("Countdown label must be a string"),
    body("pricingLabel")
      .optional({ nullable: true })
      .isString()
      .withMessage("Pricing label must be a string"),
    body("benefitsHeading")
      .optional({ nullable: true })
      .isString()
      .withMessage("Benefits heading must be a string"),
    body("deadlineNoteStrong")
      .optional({ nullable: true })
      .isString()
      .withMessage("Deadline note strong must be a string"),
    body("deadlineNoteBody")
      .optional({ nullable: true })
      .isString()
      .withMessage("Deadline note body must be a string"),
    body("ctaPrimaryText")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA primary text must be a string"),
    body("ctaPrimaryHref")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA primary href must be a string"),
    body("featuredPackageIds")
      .optional()
      .isArray()
      .withMessage("Featured package IDs must be an array"),
    body("featuredPackageIds.*")
      .isInt({ gt: 0 })
      .withMessage("Featured package ID must be a positive integer"),
    body("ctaSecondaryText")
      .optional({ nullable: true })
      .isString()
      .withMessage("CTA secondary text must be a string"),
    body("footerNote")
      .optional({ nullable: true })
      .isString()
      .withMessage("Footer note must be a string"),
    body("benefits")
      .optional()
      .isArray()
      .withMessage("Benefits must be an array"),
    body("benefits.*.icon")
      .notEmpty()
      .withMessage("Benefit icon is required")
      .isString()
      .withMessage("Benefit icon must be a string"),
    body("benefits.*.title")
      .notEmpty()
      .withMessage("Benefit title is required")
      .isString()
      .withMessage("Benefit title must be a string"),
    body("benefits.*.description")
      .notEmpty()
      .withMessage("Benefit description is required")
      .isString()
      .withMessage("Benefit description must be a string"),
    body("benefits.*.order")
      .optional()
      .isInt()
      .withMessage("Benefit order must be an integer"),
    validate,
  ];
};

export const idValidationRules = () => {
  return [
    param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
    validate,
  ];
};

export const categoryValidationRules = () => {
  return [
    param("category")
      .notEmpty()
      .withMessage("Category is required")
      .isString()
      .withMessage("Category must be a string"),
    validate,
  ];
};
