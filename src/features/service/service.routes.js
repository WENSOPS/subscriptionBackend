import { Router } from 'express';
import * as serviceController from './service.controller.js';
import authMiddleware from '../../middleware/auth.middlewares.js';
import { createServiceValidationRules, serviceIdValidationRules } from './service.validation.js';

const router = Router();

router.post('/create', authMiddleware(['admin']), createServiceValidationRules(), serviceController.createService);
router.get('/list', authMiddleware(['admin']), serviceController.listServices);
router.get('/:id', authMiddleware(['admin', 'user']), serviceIdValidationRules(), serviceController.getServiceById);
router.put('/:id', authMiddleware(['admin']), serviceIdValidationRules(), serviceController.updateService);
router.delete('/:id', authMiddleware(['admin']), serviceIdValidationRules(), serviceController.deleteService);

export default router;