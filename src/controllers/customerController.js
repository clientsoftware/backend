import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Payment from '../models/Payment.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generatePaymentReceiptPdf } from '../utils/pdf.js';
import { getSettings } from '../models/Settings.js';
import { AppError } from '../middleware/errorHandler.js';
import { body } from 'express-validator';

export const customerValidators = [
  body('name').notEmpty().withMessage('Customer name is required'),
];

function serializeCustomer(c) {
  const obj = c.toObject ? c.toObject() : { ...c };
  return {
    ...obj,
    phone: obj.phone || obj.contact,
    contact: obj.contact || obj.phone,
    dueBalance: obj.currentDueBalance,
    status: obj.status,
  };
}

export const listCustomers = asyncHandler(async (req, res) => {
  const filter = {};
  const q = req.query.search || req.query.q;
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { contact: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }
  const customers = await Customer.find(filter).sort({ name: 1 });
  return ok(res, customers.map(serializeCustomer));
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);
  return ok(res, serializeCustomer(customer));
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({
    name: req.body.name,
    contact: req.body.contact || req.body.phone || '',
    phone: req.body.phone || req.body.contact || '',
    email: req.body.email || '',
    address: req.body.address || '',
    creditLimit: Number(req.body.creditLimit) || 0,
    currentDueBalance: Number(req.body.currentDueBalance || req.body.dueBalance) || 0,
  });
  return created(res, serializeCustomer(customer), 'Customer created');
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);

  ['name', 'email', 'address', 'creditLimit'].forEach((f) => {
    if (req.body[f] != null) customer[f] = req.body[f];
  });
  if (req.body.contact != null || req.body.phone != null) {
    customer.contact = req.body.contact || req.body.phone;
    customer.phone = req.body.phone || req.body.contact;
  }

  await customer.save();
  return ok(res, serializeCustomer(customer), 'Customer updated');
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);
  return ok(res, null, 'Customer deleted');
});

/**
 * GET /api/customers/:id/ledger
 */
export const getLedger = asyncHandler(async (req, res) => {
  const entries = await LedgerEntry.find({ customer: req.params.id }).sort({ date: -1 });
  return ok(res, entries);
});

/**
 * GET /api/customers/:id/credit-check?newDue=1000
 */
export const creditCheck = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);
  const newDue = Number(req.query.newDue) || 0;
  const projected = (customer.currentDueBalance || 0) + newDue;
  const allowed = projected <= (customer.creditLimit || 0);
  return ok(res, {
    allowed,
    currentDueBalance: customer.currentDueBalance,
    creditLimit: customer.creditLimit,
    projected,
    message: allowed
      ? 'Within credit limit'
      : 'Credit limit exceeded. Clear dues or reduce credit amount before checkout.',
  });
});

/**
 * Helper used by sales/payments
 */
export async function appendLedger({
  customerId,
  description,
  debit = 0,
  credit = 0,
  refType,
  refId,
}) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError('Customer not found', 404);
  const balance = (customer.currentDueBalance || 0) + Number(debit) - Number(credit);
  customer.currentDueBalance = balance;
  if (credit > 0) customer.lastPaymentDate = new Date();
  await customer.save();

  return LedgerEntry.create({
    customer: customerId,
    description,
    debit,
    credit,
    balance,
    refType,
    refId,
    date: new Date(),
  });
}

/**
 * POST /api/customers/:id/payments  (frontend alias)
 * Also used via /api/payments
 */
export const receivePaymentForCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return fail(res, 'Valid amount required', 400);

  const payment = await Payment.create({
    customer: customer._id,
    amount,
    paymentMode: req.body.mode || req.body.paymentMode || 'cash',
    relatedInvoice: req.body.relatedInvoice || null,
    type: 'received',
    note: req.body.note || '',
    receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
    createdBy: req.user?._id !== 'demo' ? req.user?._id : undefined,
  });

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

  try {
    const pdf = await generatePaymentReceiptPdf(payment, customer, settings.business);
    payment.pdfUrl = pdf.urlPath;
    await payment.save();
  } catch (e) {
    console.warn('PDF generation failed', e.message);
  }

  const fresh = await Customer.findById(customer._id);
  return created(
    res,
    { ...payment.toObject(), customer: serializeCustomer(fresh) },
    'Payment recorded'
  );
});
