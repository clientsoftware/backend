import { Router } from 'express';
import { pendingPayments } from '../controllers/notificationController.js';

const router = Router();

router.get('/pending-payments', pendingPayments);

export default router;
