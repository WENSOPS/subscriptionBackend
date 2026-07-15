import { Router } from "express";
import * as homepageController from "./homepage.controller.js";
import * as homepageValidation from "./homepage.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

// Public route to get offer by category or ID
router.get("/offer/category/:category", homepageValidation.categoryValidationRules(), homepageController.getOffer);
router.get("/offer/:id", homepageValidation.idValidationRules(), homepageController.getOfferById);

// Protected routes for admin and ops only
router.get("/offer", authMiddleware(["admin", "ops"]), homepageController.getAllOffers);
router.post("/offer", authMiddleware(["admin", "ops"]), homepageValidation.createOfferValidationRules(), homepageController.createOffer);
router.put("/offer/:id", authMiddleware(["admin", "ops"]), homepageValidation.updateOfferValidationRules(), homepageController.updateOffer);
router.delete("/offer/:id", authMiddleware(["admin", "ops"]), homepageValidation.idValidationRules(), homepageController.deleteOffer);

export default router;
