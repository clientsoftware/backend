import { Router } from 'express';
import {
  createExchange,
  listExchanges,
  getExchange,
} from '../controllers/exchangeController.js';

const router = Router();

router.post('/', createExchange);
router.get('/', listExchanges);
router.get('/:id', getExchange);

export default router;
