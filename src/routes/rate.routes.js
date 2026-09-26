import { Router } from 'express';
import {
  setRates,
  getCurrentRates,
  getRateHistory,
} from '../controllers/rateController.js';

const router = Router();

router.get('/today', getCurrentRates);
router.get('/current', getCurrentRates);
router.get('/history', getRateHistory);
router.put('/', setRates);
router.post('/', setRates);

export default router;
