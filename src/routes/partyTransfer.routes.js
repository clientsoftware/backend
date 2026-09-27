import { Router } from 'express';
import PartyTransfer from '../models/PartyTransfer.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';

const router = Router();

// GET all transfers
router.get('/', async (req, res, next) => {
  try {
    const transfers = await PartyTransfer.find().sort({ date: -1, createdAt: -1 });
    res.json({ success: true, data: transfers });
  } catch (err) {
    next(err);
  }
});

// POST transfer balance between parties
router.post('/', async (req, res, next) => {
  try {
    const { fromPartyId, toPartyId, amount, date, reference } = req.body;
    const transferAmt = Number(amount);

    const fromParty = await Customer.findById(fromPartyId);
    const toParty = await Customer.findById(toPartyId);

    if (!fromParty || !toParty) {
      return res.status(404).json({ success: false, message: 'One or both parties not found' });
    }

    // Update balances
    fromParty.currentDueBalance += transferAmt; // Balance increases for sender (credited to ledger)
    toParty.currentDueBalance -= transferAmt; // Balance decreases for receiver (debited from ledger)

    await fromParty.save();
    await toParty.save();

    const transfer = await PartyTransfer.create({
      date: date || new Date().toISOString().slice(0, 10),
      fromPartyId,
      fromPartyName: fromParty.name,
      toPartyId,
      toPartyName: toParty.name,
      amount: transferAmt,
      reference: reference || '',
    });

    // Create ledger entries for both parties
    await LedgerEntry.create({
      customer: fromParty._id,
      type: 'CHARGE',
      amount: transferAmt,
      description: `Party Transfer to ${toParty.name} ${reference ? ' (Ref: ' + reference + ')' : ''}`,
      balanceAfter: fromParty.currentDueBalance,
      date: date || new Date().toISOString().slice(0, 10),
    });

    await LedgerEntry.create({
      customer: toParty._id,
      type: 'PAYMENT',
      amount: transferAmt,
      description: `Party Transfer from ${fromParty.name} ${reference ? ' (Ref: ' + reference + ')' : ''}`,
      balanceAfter: toParty.currentDueBalance,
      date: date || new Date().toISOString().slice(0, 10),
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    next(err);
  }
});

export default router;
