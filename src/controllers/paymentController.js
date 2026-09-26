import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import { getSettings } from '../models/Settings.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generatePaymentReceiptPdf } from '../utils/pdf.js';
import { appendLedger } from './customerController.js';

export const createPayment = asyncHandler(async (req, res) => {
  const customerId = req.body.customerId || req.body.customer;
  const customer = await Customer.findById(customerId);
  if (!customer) return fail(res, 'Customer not found', 404);

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return fail(res, 'Valid amount required', 400);

  const type = req.body.type || 'received';
  const payment = await Payment.create({
    customer: customer._id,
    amount,
    paymentMode: req.body.paymentMode || req.body.mode || 'cash',
    relatedInvoice: req.body.relatedInvoice || null,
    type,
    note: req.body.note || '',
    receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
    createdBy: req.user?._id !== 'demo' ? req.user?._id : undefined,
  });

  if (type === 'received') {
    await appendLedger({
      customerId: customer._id,
      description: `Payment received (${payment.paymentMode})`,
      credit: amount,
      refType: 'payment',
      refId: payment._id,
    });
    const settings = await getSettings();
    settings.cashInHand = (settings.cashInHand || 0) + amount;
    await settings.save();
  } else {
    await appendLedger({
      customerId: customer._id,
      description: `Refund (${payment.paymentMode})`,
      debit: amount,
      refType: 'payment',
      refId: payment._id,
    });
    const settings = await getSettings();
    settings.cashInHand = Math.max(0, (settings.cashInHand || 0) - amount);
    await settings.save();
  }

  try {
    const settings = await getSettings();
    const pdf = await generatePaymentReceiptPdf(payment, customer, settings.business);
    payment.pdfUrl = pdf.urlPath;
    await payment.save();
  } catch (e) {
    console.warn('Receipt PDF failed:', e.message);
  }

  return created(res, payment, 'Payment recorded');
});

export const listPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.customerId || req.query.customer) {
    filter.customer = req.query.customerId || req.query.customer;
  }
  const list = await Payment.find(filter).sort({ date: -1 }).populate('customer', 'name contact phone');
  return ok(res, list);
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('customer');
  if (!payment) return fail(res, 'Payment not found', 404);
  return ok(res, payment);
});
