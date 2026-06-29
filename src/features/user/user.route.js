import { Router } from 'express';
import * as userController from './user.controller.js';
import authMiddleware from '../../middleware/auth.middlewares.js';
import * as userValidation from './user.validation.js';
const router = Router();



router.post('/',authMiddleware(["admin"]), userValidation.createUserValidationRules(), userController.createUser);
router.get('/', authMiddleware(["admin"]), userController.getAllUsers);
router.get('/:id', authMiddleware(["admin"]), userValidation.paramsValidationRules(), userController.getUserById);
router.put('/:id', authMiddleware(["admin"]), userValidation.updateUserValidationRules(), userController.updateUser);

export default router;