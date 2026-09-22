import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createScheduleValidation = [
  body("type")
    .isIn(["call", "meeting"])
    .withMessage("type must be call or meeting"),
  body("name")
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage("name must be at least 2 characters"),
  body("phone")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("phone is required"),
  body("scheduledAt").optional({ values: "falsy" }).isString().trim(),
  body("date").optional({ values: "falsy" }).isString().trim(),
  body("time").optional({ values: "falsy" }).isString().trim(),
  body("note").optional({ values: "falsy" }).isString().trim(),
  body("pageUrl").optional({ values: "falsy" }).isString().trim(),
  validate,
];
