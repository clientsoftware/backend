import { Router } from 'express';
import BankAccount from '../models/BankAccount.js';

const router = Router();

// GET all bank accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await BankAccount.find().sort({ name: 1 });
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

// POST create bank account
router.post('/', async (req, res, next) => {
  try {
    const account = await BankAccount.create(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// PUT update bank account
router.put('/:id', async (req, res, next) => {
  try {
    const account = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// DELETE bank account
router.delete('/:id', async (req, res, next) => {
  try {
    await BankAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bank account deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
