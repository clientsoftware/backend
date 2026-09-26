import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Payment from '../models/Payment.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications/pending-payments & /api/customers/dues
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

      // Find all payments made by this customer
      const payments = await Payment.find({ customer: c._id }).sort({ date: -1, createdAt: -1 });
      const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const latestPayment = payments[0] || null;

      let lastPaymentDate = latestPayment?.date || c.lastPaymentDate || null;
      let lastPaymentAmount = latestPayment?.amount || 0;
      let lastPaymentMode = latestPayment?.paymentMode || 'cash';

      if (!latestPayment) {
        const lastCredit = await LedgerEntry.findOne({
          customer: c._id,
          credit: { $gt: 0 },
        }).sort({ date: -1 });
        if (lastCredit) {
          lastPaymentDate = lastCredit.date;
          lastPaymentAmount = lastCredit.credit;
          lastPaymentMode = 'cash';
        }
      }

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
        lastPaymentDate,
        lastPaymentAmount,
        lastPaymentMode,
        totalPaid,
        paymentsHistory: payments.map((p) => ({
          _id: p._id,
          amount: p.amount,
          date: p.date || p.createdAt,
          paymentMode: p.paymentMode,
          receiptNo: p.receiptNo,
          note: p.note,
        })),
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
