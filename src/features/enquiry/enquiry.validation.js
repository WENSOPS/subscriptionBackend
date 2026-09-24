import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const takeEnquiryValidation = [
  body("name").notEmpty().withMessage("Name is required").isString(),
  body("phone").notEmpty().withMessage("Phone is required").isString(),
  body("email").optional({ nullable: true }).isEmail(),
  body("serviceDate").optional({ nullable: true }).isString(),
  body("serviceCity").optional({ nullable: true }).isString(),
  body("noOfDays").optional({ nullable: true }),
  body("serviceType").optional({ nullable: true }).isString(),
  body("additionalFacilities").optional({ nullable: true }),
  body("route").optional({ nullable: true }).isString(),
  body("customisation").optional({ nullable: true }).isObject(),
  body("customisation.budgetRange").optional({ nullable: true }).isString(),
  body("customisation.customisedType").optional({ nullable: true }).isString(),
  body("customisation.carType").optional({ nullable: true }).isString(),
  body("customisation.bodyguardType").optional({ nullable: true }).isString(),
  body("customisation.armedCount").optional({ nullable: true }),
  body("customisation.unarmedCount").optional({ nullable: true }),
  body("customisation.standard").optional({ nullable: true }).isObject(),
  body("customisation.standard.categories").optional({ nullable: true }).isArray(),
  body("customisation.standard.count").optional({ nullable: true }),
  body("customisation.luxury").optional({ nullable: true }).isObject(),
  body("customisation.luxury.categories").optional({ nullable: true }).isArray(),
  body("customisation.luxury.count").optional({ nullable: true }),
  body("fromCampaign").optional({ nullable: true }).isBoolean(),
  body("campaign").optional({ nullable: true }).isObject(),
  body("campaign.gclid").optional({ nullable: true }).isString(),
  body("campaign.utm_source").optional({ nullable: true }).isString(),
  body("campaign.utm_campaign").optional({ nullable: true }).isString(),
  validate,
];
