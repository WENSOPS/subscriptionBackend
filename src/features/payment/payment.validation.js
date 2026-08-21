import { body, param, header, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

export const createPaymentValidation = [
  /* packageId, couponCode, referralRewardId from body */
  body("packageId")
    .exists()
    .withMessage("packageId is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("packageId must be a non-empty string"),
  body("couponCode")
    .optional({ nullable: true })
    .isString()
    .withMessage("couponCode must be a string"),
  body("referralRewardId")
    .optional({ nullable: true })
    .isString()
    .trim()
    .notEmpty()
    .withMessage("referralRewardId must be a non-empty string"),
  body("currency")
    .optional({ nullable: true })
    .isString()
    .trim()
    .toUpperCase()
    .isLength({ min: 3, max: 3 })
    .withMessage("currency must be a 3-letter ISO code"),
  validate,
];

export const verifyPaymentValidation = [
  param("orderId").exists().withMessage("orderId is required").isString(),
  validate,
];

export const paramsIdValidation = [
  param("id").exists().withMessage("id is required"),
  validate,
];

export const handleWebhookValidation = [
  header("x-webhook-signature")
    .exists()
    .withMessage("x-webhook-signature is required")
    .isString()
    .notEmpty()
    .withMessage("x-webhook-signature cannot be empty"),
  header("x-webhook-timestamp")
    .exists()
    .withMessage("x-webhook-timestamp is required")
    .isString()
    .notEmpty()
    .withMessage("x-webhook-timestamp cannot be empty"),
  validate,
];
