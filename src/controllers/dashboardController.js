import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import Return from '../models/Return.js';
import ScrapCopperExchange from '../models/ScrapCopperExchange.js';
import BulkDispatch from '../models/BulkDispatch.js';
import { getSettings } from '../models/Settings.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { serializeProduct } from '../utils/units.js';

export const getSummary = asyncHandler(async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const dateQuery = {
    $or: [{ date: { $gte: start } }, { createdAt: { $gte: start } }],
  };

  const [todaySalesDocs, todayExchanges, todayDispatches, todayReturns] = await Promise.all([
    Sale.find(dateQuery),
    ScrapCopperExchange.find(dateQuery),
    BulkDispatch.find(dateQuery),
    Return.find(dateQuery),
  ]);

  const salesSum = todaySalesDocs.reduce((a, s) => a + (s.totalAmount || 0), 0);
  const exchangeSum = todayExchanges.reduce((a, e) => a + Math.max(0, e.itemReceived?.value || 0), 0);
  const dispatchSum = todayDispatches.reduce((a, d) => a + (d.totalSaleValue || 0), 0);
  const returnSum = todayReturns.reduce((a, r) => a + (r.refundAmount || 0), 0);

  const todaySales = Math.max(0, salesSum + exchangeSum + dispatchSum - returnSum);

  const customers = await Customer.find({ currentDueBalance: { $gt: 0 } });
  const totalDue = customers.reduce((a, c) => a + (c.currentDueBalance || 0), 0);

  const products = (await Product.find()).map(serializeProduct);
  const stockValue = products.reduce(
    (a, p) => a + (p.currentStock || 0) * (p.costPrice || p.salePrice || 0),
    0
  );

  const settings = await getSettings();

  return ok(res, {
    todaySales,
    totalDue,
    stockValue,
    cashInHand: settings.cashInHand || 0,
  });
});

export const getRecentTransactions = asyncHandler(async (_req, res) => {
  const [sales, exchanges, dispatches, payments, returns] = await Promise.all([
    Sale.find().sort({ date: -1, createdAt: -1 }).limit(15),
    ScrapCopperExchange.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
    BulkDispatch.find().sort({ date: -1, createdAt: -1 }).limit(15),
    Payment.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
    Return.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
  ]);

  const rows = [
    ...sales.map((s) => ({
      _id: s._id,
      type: s.isScrapSale ? 'Scrap Sale' : 'Sale',
      customerName: s.customerName || 'Walk-in Customer',
      amount: s.totalAmount || 0,
      createdAt: s.date || s.createdAt,
    })),
    ...exchanges.map((e) => ({
      _id: e._id,
      type: 'Exchange',
      customerName: e.customerName || e.customer?.name || e.companyName || 'Exchange Deal',
      amount: Math.max(e.itemReceived?.value || 0, e.itemGiven?.value || 0),
      createdAt: e.date || e.createdAt,
    })),
    ...dispatches.map((d) => ({
      _id: d._id,
      type: 'Bulk Dispatch',
      customerName: d.companyName || d.destinationCompany || 'Company Dispatch',
      amount: d.totalSaleValue || 0,
      createdAt: d.date || d.createdAt,
    })),
    ...payments.map((p) => ({
      _id: p._id,
      type: 'Payment',
      customerName: p.customer?.name || 'Customer',
      amount: p.amount || 0,
      createdAt: p.date || p.createdAt,
    })),
    ...returns.map((r) => ({
      _id: r._id,
      type: 'Return',
      customerName: r.customer?.name || 'Customer',
      amount: r.refundAmount || 0,
      createdAt: r.date || r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  return ok(res, rows);
});

export const getLowStock = asyncHandler(async (_req, res) => {
  const products = (await Product.find()).map(serializeProduct);
  const low = products.filter((p) => (p.currentStock || 0) <= (p.lowStockThreshold || 10));
  return ok(res, low);
});
