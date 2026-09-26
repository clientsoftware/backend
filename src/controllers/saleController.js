import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { nextInvoiceNumber } from '../models/Counter.js';
import { getSettings } from '../models/Settings.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSecondary } from '../utils/units.js';
import { generateInvoicePdf } from '../utils/pdf.js';
import { AppError } from '../middleware/errorHandler.js';
import { appendLedger } from './customerController.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serializeSale(sale, extras = {}) {
  const obj = sale.toObject ? sale.toObject() : { ...sale };
  return {
    ...obj,
    total: obj.totalAmount,
    invoiceNo: obj.invoiceNumber,
    paidAmount: obj.amountPaid,
    creditAmount: obj.dueAmount,
    customerPhone:
      extras.customerPhone ||
      obj.customer?.phone ||
      obj.customer?.contact ||
      '',
  };
}

/**
 * Shared sale creation used by /sales and /scrap-sales
 */
export async function createSaleLogic(body, user, { isScrapSale = false } = {}) {
  const rawItems = body.items || body.cart || [];
  if (!rawItems.length) throw new AppError('Cart is empty', 400);

  let customerId = body.customerId || body.customer || null;
  let customer = null;
  if (customerId) {
    customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);
  } else {
    // Lightweight walk-in / manual customer entry at checkout
    const walkInName = (body.customerName || body.walkInName || '').trim();
    const walkInPhone = (body.customerPhone || body.walkInPhone || body.phone || '').trim();
    if (walkInName) {
      // For walk-in customers doing credit/partial sales, auto-set creditLimit
      // to the credit amount so the sale doesn't fail the credit check
      const creditNeeded = Number(body.creditAmount) || 0;
      const explicitLimit = Number(body.creditLimit) || 0;
      const creditLimit = explicitLimit > 0 ? explicitLimit : creditNeeded;
      customer = await Customer.create({
        name: walkInName,
        phone: walkInPhone,
        contact: walkInPhone,
        creditLimit,
        currentDueBalance: 0,
      });
      customerId = customer._id;
    }
  }

  const saleItems = [];
  let totalAmount = 0;

  for (const raw of rawItems) {
    const productId = raw.productId || raw.product || raw._id;
    const product = await Product.findById(productId);
    if (!product) throw new AppError(`Product not found: ${productId}`, 404);

    if (isScrapSale && !product.isScrapItem) {
      throw new AppError(`${product.name} is not a scrap item`, 400);
    }

    const unitUsed = raw.unitUsed || raw.unit || 'primary';
    const quantity = Number(raw.quantity) || 0;
    const qtySecondary = toSecondary(quantity, unitUsed, product.conversionRate);

    if (product.stockInSecondaryUnit < qtySecondary) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    const defaultPrice = product.salePrice;
    const unitPriceCharged = Number(raw.unitPriceCharged ?? raw.price ?? raw.salePrice ?? defaultPrice);
    const manualPriceOverride =
      raw.manualPriceOverride === true || unitPriceCharged !== defaultPrice;
    const lineTotal = quantity * unitPriceCharged;
    totalAmount += lineTotal;

    saleItems.push({
      product: product._id,
      productName: product.name,
      quantity,
      unitUsed: unitUsed === 'secondary' ? 'secondary' : 'primary',
      unitPriceCharged,
      costPriceAtSale: Number(raw.costPrice ?? product.costPrice) || 0,
      manualPriceOverride,
      quantityInSecondary: qtySecondary,
      lineTotal,
    });

    product.stockInSecondaryUnit -= qtySecondary;
    await product.save();
  }

  if (body.total != null || body.totalAmount != null) {
    totalAmount = Number(body.total ?? body.totalAmount);
  }

  const paymentMode = body.paymentMode || body.payment?.mode || 'cash';
  let amountPaid = Number(
    body.amountPaid ?? body.paidAmount ?? body.cashReceived ?? body.payment?.paidAmount
  );
  if (Number.isNaN(amountPaid)) {
    amountPaid = paymentMode === 'credit' ? 0 : totalAmount;
  }
  if (paymentMode === 'credit') amountPaid = 0;
  if (paymentMode === 'cash' || paymentMode === 'bank' || paymentMode === 'upi') {
    if (body.amountPaid == null && body.paidAmount == null && body.cashReceived == null) {
      amountPaid = totalAmount;
    }
  }

  const dueAmount = Math.max(0, totalAmount - amountPaid);

  if (dueAmount > 0) {
    if (!customer) {
      throw new AppError('Customer required for credit / partial payment', 400);
    }
    const projected = (customer.currentDueBalance || 0) + dueAmount;
    if (projected > (customer.creditLimit || 0)) {
      throw new AppError(
        'Credit limit exceeded. Clear dues or reduce credit amount before checkout.',
        400,
        {
          currentDueBalance: customer.currentDueBalance,
          creditLimit: customer.creditLimit,
          newDueAmount: dueAmount,
          projected,
        }
      );
    }
  }

  const invoiceNumber = await nextInvoiceNumber(isScrapSale ? 'SCR' : 'INV');

  const sale = await Sale.create({
    invoiceNumber,
    customer: customer?._id || null,
    customerName: customer?.name || body.customerName || body.walkInName || 'Walk-in Customer',
    items: saleItems,
    totalAmount,
    amountPaid,
    paymentMode,
    dueAmount,
    isScrapSale,
    date: new Date(),
    createdBy: user?._id && user._id !== 'demo' ? user._id : undefined,
  });

  if (customer && dueAmount > 0) {
    await appendLedger({
      customerId: customer._id,
      description: `Sale ${invoiceNumber}`,
      debit: dueAmount,
      refType: 'sale',
      refId: sale._id,
    });
  }

  if (amountPaid > 0) {
    const settings = await getSettings();
    settings.cashInHand = (settings.cashInHand || 0) + amountPaid;
    await settings.save();
  }

  try {
    const settings = await getSettings();
    const pdf = await generateInvoicePdf(sale, {
      ...settings.business,
      footerNote: settings.invoice?.footerNote,
    });
    sale.pdfUrl = pdf.urlPath;
    await sale.save();
  } catch (e) {
    console.warn('Invoice PDF failed:', e.message);
  }

  // Non-persisted helper for receipts
  sale.$locals = sale.$locals || {};
  sale.$locals.customerPhone =
    customer?.phone || customer?.contact || body.customerPhone || body.walkInPhone || '';

  return sale;
}

export const createSale = asyncHandler(async (req, res) => {
  const sale = await createSaleLogic(req.body, req.user, { isScrapSale: false });
  return created(
    res,
    serializeSale(sale, { customerPhone: sale.$locals?.customerPhone }),
    'Sale created'
  );
});

export const listSales = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.customerId) filter.customer = req.query.customerId;
  if (req.query.isScrapSale != null) filter.isScrapSale = req.query.isScrapSale === 'true';
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) {
      const end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  const sales = await Sale.find(filter).sort({ date: -1 }).populate('customer', 'name contact phone');
  return ok(res, sales.map(serializeSale));
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('customer');
  if (!sale) return fail(res, 'Sale not found', 404);
  return ok(res, serializeSale(sale));
});

export const getInvoicePdf = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return fail(res, 'Sale not found', 404);

  const filePath = path.join(
    __dirname,
    '../../uploads/invoices',
    `${sale.invoiceNumber || sale._id}.pdf`
  );

  if (!fs.existsSync(filePath)) {
    const settings = await getSettings();
    await generateInvoicePdf(sale, settings.business);
  }

  res.download(filePath);
});
