import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(200).json({
      success: false,
      statusCode: 200,
      message: errors.array().map((e) => e.msg).join(", "),
      errors: errors.array(),
    });
  }
  next();
};

export const createUserValidationRules = () => {
  return [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("mobileNumber").notEmpty().withMessage("Mobile number is required"),
    body("role").notEmpty().withMessage("Role is required"),
    body("city").notEmpty().withMessage("City is required"),
    validate,
  ];
};

export const updateUserValidationRules = () => {
  return [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("ID must be a non-empty string"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("mobileNumber")
      .optional()
      .notEmpty()
      .withMessage("Mobile number cannot be empty"),
    body("role").optional().notEmpty().withMessage("Role cannot be empty"),
    body("city").optional().notEmpty().withMessage("City cannot be empty"),
    validate,
  ];
};

export const paramsValidationRules = () => {
  return [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("ID must be a non-empty string"),
    validate,
  ];
};
