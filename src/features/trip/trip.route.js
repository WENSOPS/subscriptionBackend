import { Router } from 'express';
import * as tripController from './trip.controller.js';
import authMiddleware from '../../middleware/auth.middlewares.js';
import * as tripValidation from './trip.validation.js';

const router = Router();

router.post('/request', authMiddleware(['user', 'admin', 'ops']), tripValidation.requestTripValidation, tripController.requestTrip);
router.post('/create', authMiddleware(['admin', 'ops']), tripValidation.createTripValidation, tripController.createTrip);
router.get('/mine', authMiddleware(['user', 'admin', 'ops']), tripController.getMyTrips);
router.post('/approve/:id', authMiddleware(['admin', 'ops']), tripValidation.approveTripValidation, tripController.approveTrip);
router.get('/get-all', authMiddleware([ 'admin', 'ops']), tripController.getAllTrips);
router.put('/update/:id', authMiddleware(['admin', 'ops']), tripValidation.updateTripValidation, tripController.updateTrip);
router.delete('/delete/:id', authMiddleware(['admin', 'ops']), tripValidation.deleteTripValidation, tripController.deleteTrip);
router.post('/cancel/:id', authMiddleware(['user', 'admin', 'ops']),  tripController.cancelTrip);
router.post('/complete/:id', authMiddleware(['admin', 'ops']),  tripController.markCompleted);
router.get('/:id', authMiddleware(['admin', 'ops']), tripValidation.getTripByIdValidation, tripController.getTripById);

export default router;
