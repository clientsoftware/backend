import { Router } from 'express';
import CashTxn from '../models/CashTxn.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';

const router = Router();

// GET cash & bank transactions
router.get('/', async (req, res, next) => {
  try {
    const txns = await CashTxn.find().sort({ date: -1, createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    next(err);
  }
});

// POST record cash/bank transaction
router.post('/', async (req, res, next) => {
  try {
    const { partyId, amount, discount, type, note, date } = req.body;
    const txn = await CashTxn.create(req.body);

    if (partyId) {
      const customer = await Customer.findById(partyId);
      if (customer) {
        const settled = Number(amount || 0) + Number(discount || 0);
        const sign = type === 'payment_in' ? -1 : 1;
        customer.currentDueBalance += sign * settled;
        customer.lastPaymentDate = new Date();
        await customer.save();

        await LedgerEntry.create({
          customer: customer._id,
          type: type === 'payment_in' ? 'PAYMENT' : 'CHARGE',
          amount: settled,
          description: `${type === 'payment_in' ? 'Payment Received' : 'Payment Made'} (${req.body.method || 'cash'}) ${note ? '— ' + note : ''}`,
          balanceAfter: customer.currentDueBalance,
          date: date || new Date().toISOString().slice(0, 10),
        });
      }
    }

    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
});

// DELETE transaction
router.delete('/:id', async (req, res, next) => {
  try {
    await CashTxn.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
