import { body, param, validationResult } from "express-validator";


const validate = (req,res,next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}


export const createPackageValidationRules = () => {
    return [
        body("name").notEmpty().withMessage("Name is required"),
        body("description").notEmpty().withMessage("Description is required"),
        body("regularPrice").isFloat({ gt: 0 }).withMessage("Regular price must be a positive number"),
        body("discountedPrice").isFloat({ gt: 0 }).withMessage("Discounted price must be a positive number"),
        body("serviceIds").isArray({ min: 1 }).withMessage("At least one service ID is required"),  
        body("vehicleType").notEmpty().withMessage("Vehicle type is required"),
        body("vehicleModel").notEmpty().withMessage("Vehicle model is required"),
        body("bodyguardType").notEmpty().withMessage("Bodyguard type is required"),
        body("trips").isInt({ gt: 0 }).withMessage("Trips must be a positive integer"),
        body("validity").isInt({ gt: 0 }).withMessage("Validity must be a positive integer"),
        body("thumbnailUrl").isURL().withMessage("Thumbnail URL must be a valid URL"),
        validate
    ];
}


// get, update, delete validation rules is same so use same data 
export const idValidationRules = () => {
    return [
        param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
        validate
    ];
}