import { Router } from 'express';
import {
  createSale,
  listSales,
  getSale,
  getInvoicePdf,
} from '../controllers/saleController.js';

const router = Router();

router.post('/', createSale);
router.get('/', listSales);
router.get('/:id/invoice', getInvoicePdf);
router.get('/:id', getSale);

export default router;
