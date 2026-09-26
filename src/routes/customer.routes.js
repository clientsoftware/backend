import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getLedger,
  creditCheck,
  receivePaymentForCustomer,
  customerValidators,
} from '../controllers/customerController.js';
import { pendingPayments } from '../controllers/notificationController.js';

const router = Router();

// Must be before /:id
router.get('/dues', pendingPayments);

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', customerValidators, validate, createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/ledger', getLedger);
router.get('/:id/credit-check', creditCheck);
router.post('/:id/payments', receivePaymentForCustomer);

export default router;
