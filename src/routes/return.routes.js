import { Router } from 'express';
import {
  createReturn,
  listReturns,
  searchInvoice,
} from '../controllers/returnController.js';

const router = Router();

router.get('/search-invoice', searchInvoice);
router.post('/', createReturn);
router.get('/', listReturns);

export default router;
