import { Router } from 'express';
import * as dashboardController from './dashboard.controller.js';

const router = Router();


router.get('/admin', dashboardController.getAdminDashboard);
// router.get('/user', dashboardController.getUserDashboard);


export default router;

