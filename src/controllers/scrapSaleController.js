import Sale from '../models/Sale.js';
import { ok, created } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createSaleLogic } from './saleController.js';

export const createScrapSale = asyncHandler(async (req, res) => {
  const sale = await createSaleLogic(req.body, req.user, { isScrapSale: true });
  return created(
    res,
    {
      ...serializeSale(sale),
      customerPhone: sale.$locals?.customerPhone || '',
    },
    'Scrap sale created'
  );
});

function serializeSale(sale) {
  const obj = sale.toObject ? sale.toObject() : { ...sale };
  return {
    ...obj,
    total: obj.totalAmount,
    invoiceNo: obj.invoiceNumber,
    paidAmount: obj.amountPaid,
    creditAmount: obj.dueAmount,
    customerPhone: sale.$locals?.customerPhone || '',
  };
}

export const listScrapSales = asyncHandler(async (req, res) => {
  const filter = { isScrapSale: true };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) {
      const end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  const sales = await Sale.find(filter).sort({ date: -1 });
  return ok(res, sales.map(serializeSale));
});

export const todayScrapTotal = asyncHandler(async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sales = await Sale.find({ isScrapSale: true, date: { $gte: start } });
  const total = sales.reduce((a, s) => a + (s.totalAmount || 0), 0);
  return ok(res, { total, todayTotal: total });
});
