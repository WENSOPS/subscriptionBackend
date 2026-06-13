import {body, cookie, validationResult} from 'express-validator';


// for error handling from validationResult
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}


// mobile number validation rules should be 10 digit and with country code


// Validation rules for registration
export const sendOtpValidationRules = () => {
    return [
        body('mobileNumber')
            .notEmpty().withMessage('Mobile number is required')
            .isMobilePhone('any', { strictMode: true }) .withMessage('Invalid mobile number format - must include country code')
            .isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 digits'),
        validate
    ];
}

export const verifyOtpValidationRules = () => {
    return [
        body('mobileNumber')
            .notEmpty().withMessage('Mobile number is required')
            .isMobilePhone('any', { strictMode: true }).withMessage('Invalid mobile number format - must include country code')
            .isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 digits'),
        body('otp')
            .notEmpty().withMessage('OTP is required')
            .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
        validate
    ];
}

export const resendOtpValidationRules = () => {
    return [
        body('mobileNumber')
            .notEmpty().withMessage('Mobile number is required')
            .isMobilePhone('any', { strictMode: true }).withMessage('Invalid mobile number format - must include country code')
            .isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 digits'),
        validate
    ];
}

export const refreshTokenValidationRules = () => {
    return [
        cookie('refreshToken')
            .notEmpty().withMessage('Refresh token is required'),
        validate
    ];
}

export const logoutValidationRules = () => {
    return [
        cookie('refreshToken')
            .notEmpty().withMessage('Refresh token is required'),
        validate
    ];
}

export const updateProfileValidationRules = () => {
    return [
        body('name')
            .optional()
            .isString().withMessage('Name must be a string')
            .isLength({ min: 1 }).withMessage('Name cannot be empty'),
        body('email')
            .optional()
            .isEmail().withMessage('Invalid email format'),
        body('city')
            .optional()
            .isString().withMessage('City must be a string')
            .isLength({ min: 1 }).withMessage('City cannot be empty'),
        validate
    ];
}