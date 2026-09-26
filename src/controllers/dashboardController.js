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
  // 24-hour / today start (handling UTC server offset for Pakistan timezone)
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24h fallback
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const dateQuery = {
    $or: [{ date: { $gte: startOfDay } }, { createdAt: { $gte: startOfDay } }, { date: { $gte: start } }],
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

  // Top products sold today calculation
  const productSalesMap = {};
  todaySalesDocs.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const pName = item.productName || 'Product';
      if (!productSalesMap[pName]) {
        productSalesMap[pName] = {
          name: pName,
          quantity: 0,
          totalAmount: 0,
          unit: item.unitUsed || 'unit',
        };
      }
      productSalesMap[pName].quantity += Number(item.quantity) || 0;
      productSalesMap[pName].totalAmount += Number(item.lineTotal) || (Number(item.quantity) || 0) * (Number(item.unitPriceCharged) || 0);
    });
  });

  const topProductsToday = Object.values(productSalesMap)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

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
    todaySalesCount: todaySalesDocs.length,
    topProductsToday,
    totalDue,
    stockValue,
    cashInHand: settings.cashInHand || 0,
  });
});

export const getRecentTransactions = asyncHandler(async (_req, res) => {
  const [sales, exchanges, dispatches, payments, returns] = await Promise.all([
    Sale.find().sort({ date: -1, createdAt: -1 }).limit(25),
    ScrapCopperExchange.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
    BulkDispatch.find().sort({ date: -1, createdAt: -1 }).limit(15),
    Payment.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
    Return.find().sort({ date: -1, createdAt: -1 }).limit(15).populate('customer', 'name'),
  ]);

  const rows = [
    ...sales.map((s) => ({
      _id: s._id,
      invoiceNumber: s.invoiceNumber,
      type: s.isScrapSale ? 'Scrap Sale' : s.paymentMode === 'credit' ? 'Credit Sale' : 'Cash Sale',
      customerName: s.customerName || 'Walk-in Customer',
      amount: s.totalAmount || 0,
      paymentMode: s.paymentMode || 'cash',
      items: (s.items || []).map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unit: i.unitUsed,
        rate: i.unitPriceCharged,
        lineTotal: i.lineTotal,
      })),
      createdAt: s.date || s.createdAt,
    })),
    ...exchanges.map((e) => ({
      _id: e._id,
      invoiceNumber: e.receiptNo || 'EXC',
      type: 'Exchange',
      customerName: e.customerName || e.customer?.name || e.companyName || 'Exchange Deal',
      amount: Math.max(e.itemReceived?.value || 0, e.itemGiven?.value || 0),
      items: [
        e.itemReceived ? { name: `Received: ${e.itemReceived.itemType || 'Scrap'}`, quantity: e.itemReceived.weight, unit: 'kg' } : null,
        e.itemGiven ? { name: `Given: ${e.itemGiven.itemType || 'Copper'}`, quantity: e.itemGiven.weight, unit: 'kg' } : null,
      ].filter(Boolean),
      createdAt: e.date || e.createdAt,
    })),
    ...dispatches.map((d) => ({
      _id: d._id,
      invoiceNumber: d.dispatchNo || 'DISP',
      type: 'Bulk Dispatch',
      customerName: d.companyName || d.destinationCompany || 'Company Dispatch',
      amount: d.totalSaleValue || 0,
      items: (d.items || []).map((i) => ({ name: i.itemType, quantity: i.weight, unit: 'kg' })),
      createdAt: d.date || d.createdAt,
    })),
    ...payments.map((p) => ({
      _id: p._id,
      invoiceNumber: p.receiptNo || 'PAY',
      type: 'Payment',
      customerName: p.customer?.name || 'Customer',
      amount: p.amount || 0,
      items: [],
      createdAt: p.date || p.createdAt,
    })),
    ...returns.map((r) => ({
      _id: r._id,
      invoiceNumber: r.returnNo || 'RET',
      type: 'Return',
      customerName: r.customer?.name || 'Customer',
      amount: r.refundAmount || 0,
      items: (r.items || []).map((i) => ({ name: i.productName || 'Item', quantity: i.quantity })),
      createdAt: r.date || r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 25);

  return ok(res, rows);
});

export const getLowStock = asyncHandler(async (_req, res) => {
  const products = (await Product.find()).map(serializeProduct);
  const low = products.filter((p) => (p.currentStock || 0) <= (p.lowStockThreshold || 10));
  return ok(res, low);
});
