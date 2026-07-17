import { Router } from "express";
import * as offerController from "./offer.controller.js";
import * as offerValidation from "./offer.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

// Public route to get offer by category or ID
router.get("/category/:category", offerValidation.categoryValidationRules(), offerController.getOffer);
router.get("/:id", offerValidation.idValidationRules(), offerController.getOfferById);

// Protected routes for admin and ops only
router.get("/", authMiddleware(["admin", "ops"]), offerController.getAllOffers);
router.post("/", authMiddleware(["admin", "ops"]), offerValidation.createOfferValidationRules(), offerController.createOffer);
router.put("/:id", authMiddleware(["admin", "ops"]), offerValidation.updateOfferValidationRules(), offerController.updateOffer);
router.delete("/:id", authMiddleware(["admin", "ops"]), offerValidation.idValidationRules(), offerController.deleteOffer);

export default router;
