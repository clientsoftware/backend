import { Router } from 'express';
import {
  getSummary,
  getRecentTransactions,
  getLowStock,
} from '../controllers/dashboardController.js';

const router = Router();

router.get('/', getSummary);
router.get('/transactions', getRecentTransactions);
router.get('/low-stock', getLowStock);

export default router;
