import { Router } from 'express';
import * as bookingController from './booking.controller.js';
import authMiddleware from '../../middleware/auth.middlewares.js';
import signatureVerificationMiddleware from '../../middleware/signatureVerification.middleware.js';
import * as bookingValidation from './booking.validation.js';
const router = Router();

router.post('/', authMiddleware(['user', 'admin','ops']), bookingValidation.createBookingValidation, bookingController.createBooking);
router.get('/', authMiddleware(['admin','ops']), bookingController.getBookings);
router.put('/status/:id', authMiddleware(['admin','ops']), bookingValidation.updateStatusValidation, bookingController.updateStatus);
router.get('/my', authMiddleware(['user','admin','ops']), bookingController.getMyBookings);
//webhook update api protect this endpoint with a secret key or signature verification
router.post('/webhook', signatureVerificationMiddleware, bookingController.webhookUpdate);
router.get('/invoice/:id', authMiddleware(['admin','ops','user']), bookingController.generateInvoice);

export default router;
