import { body, param, query, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const getUserReferralSummaryValidation = [
  query("category")
    .exists()
    .withMessage("category query parameter is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("category cannot be empty"),
  validate,
];

export const applyReferralCodeValidation = [
  body("referralCode")
    .exists()
    .withMessage("Referral code is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Referral code cannot be empty"),
  query("category")
    .exists()
    .withMessage("category query parameter is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("category cannot be empty"),
  validate,
];

export const createReferralProgramValidation = [
  body("name")
    .exists()
    .withMessage("Program name is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Program name cannot be empty"),
  body("packageCategory")
    .exists()
    .withMessage("Package category is required")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Package category cannot be empty"),
  body("startDate")
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage("startDate must be a valid ISO8601 date"),
  body("endDate")
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage("endDate must be a valid ISO8601 date"),
  body("programStatus")
    .optional()
    .isIn(["active", "paused", "cancelled"])
    .withMessage("programStatus must be one of active, paused, cancelled"),
  body("maxTotalRedemptions")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("maxTotalRedemptions must be a non-negative integer")
    .toInt(),
  body("maxRedemptionsPerUser")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("maxRedemptionsPerUser must be a non-negative integer")
    .toInt(),
  body("rewardOnSignup")
    .optional()
    .isBoolean()
    .withMessage("rewardOnSignup must be a boolean")
    .toBoolean(),
  body("referrerRewardType")
    .optional({ nullable: true })
    .isIn(["none", "discount", "wallet"])
    .withMessage("referrerRewardType must be one of none, discount, wallet"),
  body("referrerRewardCalcType")
    .optional({ nullable: true })
    .isIn(["percentage", "fixed"])
    .withMessage("referrerRewardCalcType must be one of percentage, fixed"),
  body("referrerRewardValue")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("referrerRewardValue must be a non-negative number")
    .toFloat(),
  body("referrerPackageScope")
    .optional({ nullable: true })
    .isIn(["any", "custom"])
    .withMessage("referrerPackageScope must be one of any, custom"),
  body("referrerTriggerPackageIds")
    .optional()
    .isArray()
    .withMessage("referrerTriggerPackageIds must be an array"),
  body("referrerTriggerPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("referrerTriggerPackageIds elements must be positive integers")
    .toInt(),
  body("referrerAllowedPackageIds")
    .optional()
    .isArray()
    .withMessage("referrerAllowedPackageIds must be an array"),
  body("referrerAllowedPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("referrerAllowedPackageIds elements must be positive integers")
    .toInt(),
  body("refereeRewardType")
    .optional({ nullable: true })
    .isIn(["none", "discount", "wallet"])
    .withMessage("refereeRewardType must be one of none, discount, wallet"),
  body("refereeRewardCalcType")
    .optional({ nullable: true })
    .isIn(["percentage", "fixed"])
    .withMessage("refereeRewardCalcType must be one of percentage, fixed"),
  body("refereeRewardValue")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("refereeRewardValue must be a non-negative number")
    .toFloat(),
  body("refereePackageScope")
    .optional({ nullable: true })
    .isIn(["any", "custom"])
    .withMessage("refereePackageScope must be one of any, custom"),
  body("refereeAllowedPackageIds")
    .optional()
    .isArray()
    .withMessage("refereeAllowedPackageIds must be an array"),
  body("refereeAllowedPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("refereeAllowedPackageIds elements must be positive integers")
    .toInt(),
  validate,
];

export const updateReferralProgramValidation = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Referral program ID must be a positive integer")
    .toInt(),
  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Program name cannot be empty"),
  body("packageCategory")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Package category cannot be empty"),
  body("startDate")
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage("startDate must be a valid ISO8601 date"),
  body("endDate")
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage("endDate must be a valid ISO8601 date"),
  body("programStatus")
    .optional()
    .isIn(["active", "paused", "cancelled"])
    .withMessage("programStatus must be one of active, paused, cancelled"),
  body("maxTotalRedemptions")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("maxTotalRedemptions must be a non-negative integer")
    .toInt(),
  body("maxRedemptionsPerUser")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("maxRedemptionsPerUser must be a non-negative integer")
    .toInt(),
  body("rewardOnSignup")
    .optional()
    .isBoolean()
    .withMessage("rewardOnSignup must be a boolean")
    .toBoolean(),
  body("referrerRewardType")
    .optional({ nullable: true })
    .isIn(["none", "discount", "wallet"])
    .withMessage("referrerRewardType must be one of none, discount, wallet"),
  body("referrerRewardCalcType")
    .optional({ nullable: true })
    .isIn(["percentage", "fixed"])
    .withMessage("referrerRewardCalcType must be one of percentage, fixed"),
  body("referrerRewardValue")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("referrerRewardValue must be a non-negative number")
    .toFloat(),
  body("referrerPackageScope")
    .optional({ nullable: true })
    .isIn(["any", "custom"])
    .withMessage("referrerPackageScope must be one of any, custom"),
  body("referrerTriggerPackageIds")
    .optional()
    .isArray()
    .withMessage("referrerTriggerPackageIds must be an array"),
  body("referrerTriggerPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("referrerTriggerPackageIds elements must be positive integers")
    .toInt(),
  body("referrerAllowedPackageIds")
    .optional()
    .isArray()
    .withMessage("referrerAllowedPackageIds must be an array"),
  body("referrerAllowedPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("referrerAllowedPackageIds elements must be positive integers")
    .toInt(),
  body("refereeRewardType")
    .optional({ nullable: true })
    .isIn(["none", "discount", "wallet"])
    .withMessage("refereeRewardType must be one of none, discount, wallet"),
  body("refereeRewardCalcType")
    .optional({ nullable: true })
    .isIn(["percentage", "fixed"])
    .withMessage("refereeRewardCalcType must be one of percentage, fixed"),
  body("refereeRewardValue")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("refereeRewardValue must be a non-negative number")
    .toFloat(),
  body("refereePackageScope")
    .optional({ nullable: true })
    .isIn(["any", "custom"])
    .withMessage("refereePackageScope must be one of any, custom"),
  body("refereeAllowedPackageIds")
    .optional()
    .isArray()
    .withMessage("refereeAllowedPackageIds must be an array"),
  body("refereeAllowedPackageIds.*")
    .isInt({ gt: 0 })
    .withMessage("refereeAllowedPackageIds elements must be positive integers")
    .toInt(),
  validate,
];

export const getReferralProgramTracksValidation = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Referral program ID must be a positive integer")
    .toInt(),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("limit must be a positive integer")
    .toInt(),
  validate,
];

export const referralProgramIdParamValidation = [
  param("id")
    .isInt({ gt: 0 })
    .withMessage("Referral program ID must be a positive integer")
    .toInt(),
  validate,
];
