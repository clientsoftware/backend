import { Router } from 'express';
import {
  createScrapSale,
  listScrapSales,
  todayScrapTotal,
} from '../controllers/scrapSaleController.js';

const router = Router();

router.post('/', createScrapSale);
router.get('/today', todayScrapTotal);
router.get('/', listScrapSales);

export default router;
