import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } from "../../config/storage/s3.constants.js";
import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateImage = [
    body("filename").notEmpty().withMessage("filename is required"),
    body("contentType")
        .notEmpty()
        .withMessage("contentType is required")
        .isIn(ALLOWED_FILE_TYPES)
        .withMessage(`File type not allowed. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`),
    body("sizeMB")
        .optional()
        .isFloat({ max: MAX_FILE_SIZE_MB })
        .withMessage(`File too large. Max allowed: ${MAX_FILE_SIZE_MB}MB`),
    validate,
];

export default validateImage;