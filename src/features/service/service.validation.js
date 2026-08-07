import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createServiceValidationRules = () => {
  return [
    body("title").notEmpty().withMessage("Service title is required"),
    body("description")
      .notEmpty()
      .withMessage("Service description is required"),
    body("thumbnailUrlKey")
      .optional()
      .isString()
      .withMessage("Thumbnail URL key must be a string"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a non-negative number"),
    validate,
  ];
};

// use common name for id validation in all get, update and delete
export const serviceIdValidationRules = () => {
  return [
    param("id").notEmpty().withMessage("Service ID is required"),
    validate,
  ];
};

export const servicesNotIncludedValidationRules = () => {
  return [
    param("packageId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Package ID must be a non-empty string"),
    validate,
  ];
};
