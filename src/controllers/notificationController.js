import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications/pending-payments
 */
export const pendingPayments = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ currentDueBalance: { $gt: 0 } });

  const list = await Promise.all(
    customers.map(async (c) => {
      const oldest = await LedgerEntry.findOne({
        customer: c._id,
        debit: { $gt: 0 },
      }).sort({ date: 1 });

      const daysOverdue = oldest
        ? Math.floor((Date.now() - new Date(oldest.date).getTime()) / 86400000)
        : 0;

      return {
        _id: c._id,
        name: c.name,
        contact: c.contact || c.phone,
        phone: c.phone || c.contact,
        dueBalance: c.currentDueBalance,
        amount: c.currentDueBalance,
        creditLimit: c.creditLimit,
        status: c.status,
        daysOverdue,
        lastPaymentDate: c.lastPaymentDate,
      };
    })
  );

  if (req.query.sort === 'days') {
    list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  } else {
    list.sort((a, b) => b.dueBalance - a.dueBalance);
  }

  return ok(res, list);
});
