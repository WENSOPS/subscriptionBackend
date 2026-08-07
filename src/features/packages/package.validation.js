import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const createPackageValidationRules = () => {
  return [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("regularPrice")
      .isFloat({ gt: 0 })
      .withMessage("Regular price must be a positive number")
      .toFloat(),
    body("discountedPrice")
      .isFloat({ gt: 0 })
      .withMessage("Discounted price must be a positive number")
      .toFloat()
      .custom((value, { req }) => {
        if (Number(req.body.regularPrice) < value) {
          throw new Error("Regular price cannot be less than discounted price");
        }
        return true;
      }),
    body("services")
      .isArray({ min: 1 })
      .withMessage("At least one service is required"),
    body("services.*.id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each service ID must be a non-empty string"),
    body("services.*.count")
      .optional()
      .isInt({ gt: 0 })
      .withMessage("Service count must be a positive integer"),
    body("vehicleType").notEmpty().withMessage("Vehicle type is required"),
    body("vehicleModel").optional({ nullable: true }),
    body("bodyguardType").notEmpty().withMessage("Bodyguard type is required"),
    body("trips")
      .isInt({ gt: 0 })
      .withMessage("Trips must be a positive integer"),
    body("validity")
      .optional({ nullable: true })
      .isInt({ gt: 0 })
      .withMessage("Validity must be a positive integer (months)"),
    body("thumbnailUrlKey")
      .notEmpty()
      .withMessage("Thumbnail URL key is required"),
    body("gst")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("GST must be a non-negative float")
      .toFloat(),

    body("category")
      .optional({ nullable: true })
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Category must be a non-empty string"),

    body("images")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Images must be an array with at most 10 items"),
    body("images.*")
      .isString()
      .withMessage("Each image must be a valid S3 key")
      .notEmpty()
      .withMessage("Image key cannot be empty"),

    body("videos")
      .optional()
      .isArray({ max: 5 })
      .withMessage("Videos must be an array with at most 5 items"),
    body("videos.*")
      .isString()
      .withMessage("Each video must be a valid S3 key")
      .notEmpty()
      .withMessage("Video key cannot be empty"),

    validate,
  ];
};

// get, update, delete validation rules is same so use same data
export const idValidationRules = () => {
  return [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("ID must be a non-empty string"),
    validate,
  ];
};

export const packageIdValidationRules = () => {
  return [
    param("packageId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Package ID must be a non-empty string"),
    validate,
  ];
};
