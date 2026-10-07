import { Router } from "express";
import * as enquiryController from "./enquiry.controller.js";
import { takeEnquiryValidation } from "./enquiry.validation.js";

const router = Router();

// Public — no auth
router.post("/", takeEnquiryValidation, enquiryController.takeEnquiry);
router.post("/login-lead", enquiryController.loginLead);
router.post("/booking-lead", enquiryController.bookingLead);
router.post("/whatsapp", enquiryController.whatsappEnquiry);
export default router;
