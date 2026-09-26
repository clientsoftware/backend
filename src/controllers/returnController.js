import ReturnModel from '../models/Return.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import { nextSequence } from '../models/Counter.js';
import { getSettings } from '../models/Settings.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSecondary } from '../utils/units.js';
import { AppError } from '../middleware/errorHandler.js';
import { appendLedger } from './customerController.js';

export const searchInvoice = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return ok(res, []);
  const sales = await Sale.find({
    $or: [
      { invoiceNumber: new RegExp(q, 'i') },
      { customerName: new RegExp(q, 'i') },
      { customerPhone: new RegExp(q, 'i') },
    ],
  })
    .sort({ date: -1 })
    .limit(20);
  return ok(
    res,
    sales.map((s) => ({
      ...s.toObject(),
      invoiceNo: s.invoiceNumber,
      total: s.totalAmount,
    }))
  );
});

export const createReturn = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const sale = await Sale.findById(body.originalInvoice || body.saleId || body.invoiceId);
  if (!sale) return fail(res, 'Original invoice not found', 404);

  const items = body.items || [];
  if (!items.length) return fail(res, 'Select items to return', 400);

  let refundAmount = Number(body.refundAmount) || 0;
  const returnItems = [];

  for (const raw of items) {
    const productId = raw.productId || raw.product || raw._id;
    const product = productId ? await Product.findById(productId).catch(() => null) : null;

    const quantity = Number(raw.returnQty ?? raw.quantity) || 0;
    const unitUsed = raw.unitUsed || raw.unit || 'primary';
    const unitPrice = Number(raw.unitPrice ?? raw.unitPriceCharged ?? raw.price ?? raw.salePrice) || 0;
    const lineTotal = raw.lineTotal != null ? Number(raw.lineTotal) : quantity * unitPrice;

    if (!body.refundAmount) refundAmount += lineTotal;

    let qtySecondary = quantity;
    if (product) {
      qtySecondary = toSecondary(quantity, unitUsed, product.conversionRate);
      product.stockInSecondaryUnit += qtySecondary;
      await product.save();
    }

    returnItems.push({
      product: product?._id || (productId && String(productId).length === 24 ? productId : undefined),
      productName: raw.productName || product?.name || 'Returned Product',
      quantity,
      unitUsed,
      quantityInSecondary: qtySecondary,
      unitPrice,
      reason: raw.reason || body.reason || '',
    });
  }

  const seq = await nextSequence('return');
  const slipNumber = `RET-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
  const refundMode = body.refundMode || body.mode || 'credit_note';

  const ret = await ReturnModel.create({
    slipNumber,
    originalInvoice: sale._id,
    customer: sale.customer || body.customerId,
    items: returnItems,
    refundMode,
    refundAmount,
    reason: body.reason || '',
    date: new Date(),
    createdBy: req.user?._id !== 'demo' ? req.user?._id : undefined,
  });

  if (sale.customer && refundAmount > 0) {
    if (refundMode === 'credit_note') {
      await appendLedger({
        customerId: sale.customer,
        description: `Return / credit note ${slipNumber}`,
        credit: refundAmount,
        refType: 'return',
        refId: ret._id,
      });
    } else {
      const settings = await getSettings();
      settings.cashInHand = Math.max(0, (settings.cashInHand || 0) - refundAmount);
      await settings.save();
    }
  }

  return created(
    res,
    {
      ...ret.toObject(),
      invoiceNo: sale.invoiceNumber,
      customerName: sale.customerName,
    },
    'Return processed'
  );
});

export const listReturns = asyncHandler(async (_req, res) => {
  const list = await ReturnModel.find()
    .sort({ date: -1 })
    .populate('originalInvoice', 'invoiceNumber')
    .populate('customer', 'name');
  return ok(res, list);
});
