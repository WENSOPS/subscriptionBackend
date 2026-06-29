import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};


export const createPaymentValidation = [
  /* packageId, couponCode from body */
    body("packageId")
    .exists()
    .withMessage("packageId is required")
    .isInt({ gt: 0 })
    .withMessage("packageId must be a positive integer"),
  body("couponCode")
    .optional()
    .isString()
    .withMessage("couponCode must be a string"),
  validate,
];


export const verifyPaymentValidation = [
    param('orderId')
      .exists()
      .withMessage('orderId is required')
      .isString(),
    validate
];

export const paramsIdValidation = [
    param('id')
      .exists()
      .withMessage('id is required'),
    validate
];