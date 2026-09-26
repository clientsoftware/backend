import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import ReturnModel from '../models/Return.js';
import BulkDispatch from '../models/BulkDispatch.js';
import Payment from '../models/Payment.js';
import ReportGroup from '../models/ReportGroup.js';
import { getSettings } from '../models/Settings.js';
import { ok, created } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { serializeProduct } from '../utils/units.js';

export const getGroups = asyncHandler(async (_req, res) => {
  return ok(res, await ReportGroup.find().sort({ name: 1 }));
});

export const createGroup = asyncHandler(async (req, res) => {
  const group = await ReportGroup.create({
    name: req.body.name,
    description: req.body.description || '',
    categoryFilter: req.body.categoryFilter || '',
  });
  return created(res, group, 'Report group created');
});

function dateFilter(query, field = 'date') {
  if (!query.from && !query.to) return {};
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) {
    const end = new Date(query.to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
}

async function buildReport(type, query) {
  const group = query.groupId ? await ReportGroup.findById(query.groupId) : null;
  const groupName = (group?.name || '').toLowerCase();
  const customerQ = query.customer;
  const categoryQ = query.category || group?.categoryFilter;

  if (type === 'sales') {
    const filter = { ...dateFilter(query) };
    if (groupName.includes('scrap')) filter.isScrapSale = true;
    if (groupName.includes('copper')) filter.isScrapSale = false;
    if (customerQ) filter.customerName = new RegExp(customerQ, 'i');
    const sales = await Sale.find(filter).sort({ date: -1 });
    return {
      rows: sales.map((s) => ({
        date: s.date,
        reference: s.invoiceNumber,
        party: s.customerName,
        category: s.isScrapSale ? 'Scrap' : 'Sale',
        amount: s.totalAmount,
        debit: 0,
        credit: s.totalAmount,
      })),
      summary: {
        totalSales: sales.reduce((a, s) => a + s.totalAmount, 0),
        count: sales.length,
      },
    };
  }

  if (type === 'stock') {
    const filter = {};
    if (categoryQ) filter.category = new RegExp(categoryQ, 'i');
    const products = (await Product.find(filter)).map(serializeProduct);
    return {
      rows: products.map((p) => ({
        date: p.updatedAt,
        reference: String(p._id).slice(-6),
        party: p.name,
        category: p.category,
        amount: (p.currentStock || 0) * (p.costPrice || 0),
        debit: p.currentStock,
        credit: 0,
      })),
      summary: {
        stockValue: products.reduce((a, p) => a + (p.currentStock || 0) * (p.costPrice || 0), 0),
        items: products.length,
      },
    };
  }

  if (type === 'returns') {
    const filter = { ...dateFilter(query) };
    const returns = await ReturnModel.find(filter).populate('customer', 'name').sort({ date: -1 });
    return {
      rows: returns.map((r) => ({
        date: r.date,
        reference: r.slipNumber,
        party: r.customer?.name,
        category: 'Return',
        amount: r.refundAmount,
        debit: r.refundAmount,
        credit: 0,
      })),
      summary: {
        totalReturns: returns.reduce((a, r) => a + (r.refundAmount || 0), 0),
      },
    };
  }

  if (type === 'profit-loss') {
    const sales = await Sale.find(dateFilter(query));
    const dispatches = await BulkDispatch.find(dateFilter(query));
    const salesTotal = sales.reduce((a, s) => a + s.totalAmount, 0);
    const dispatchNet = dispatches.reduce((a, d) => a + (d.netProfitLoss || 0), 0);
    const expenses = dispatches.reduce((a, d) => a + (d.totalExpense || 0), 0);
    return {
      rows: [
        {
          date: new Date(),
          reference: 'P&L',
          party: 'Sales',
          category: 'Income',
          amount: salesTotal,
          credit: salesTotal,
          debit: 0,
        },
        {
          date: new Date(),
          reference: 'P&L',
          party: 'Dispatch Net',
          category: 'Income',
          amount: dispatchNet,
          credit: dispatchNet,
          debit: 0,
        },
        {
          date: new Date(),
          reference: 'P&L',
          party: 'Expenses',
          category: 'Expense',
          amount: expenses,
          debit: expenses,
          credit: 0,
        },
      ],
      summary: {
        sales: salesTotal,
        expenses,
        netProfit: salesTotal + dispatchNet,
      },
    };
  }

  if (type === 'day-book') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sales = await Sale.find({ date: { $gte: start } });
    const payments = await Payment.find({ date: { $gte: start }, type: 'received' }).populate(
      'customer',
      'name'
    );
    const settings = await getSettings();
    return {
      rows: [
        ...sales.map((s) => ({
          date: s.date,
          reference: s.invoiceNumber,
          party: s.customerName,
          category: 'Sale',
          amount: s.totalAmount,
          credit: s.amountPaid,
          debit: 0,
        })),
        ...payments.map((p) => ({
          date: p.date,
          reference: p.receiptNo,
          party: p.customer?.name,
          category: 'Payment',
          amount: p.amount,
          credit: p.amount,
          debit: 0,
        })),
      ],
      summary: { cashInHand: settings.cashInHand },
    };
  }

  // purchases / default — dispatch expenses
  const dispatches = await BulkDispatch.find(dateFilter(query));
  return {
    rows: dispatches.map((d) => ({
      date: d.date,
      reference: String(d._id).slice(-6),
      party: d.companyName,
      category: 'Dispatch',
      amount: d.totalExpense,
      debit: d.totalExpense,
      credit: 0,
    })),
    summary: {
      totalPurchases: dispatches.reduce((a, d) => a + (d.totalExpense || 0), 0),
    },
  };
}

export const getReport = asyncHandler(async (req, res) => {
  const result = await buildReport(req.params.type, req.query);
  return ok(res, result);
});

export const exportReport = asyncHandler(async (req, res) => {
  const { rows } = await buildReport(req.params.type, req.query);
  const header = 'Date,Reference,Party,Category,Amount\n';
  const csv =
    header +
    rows
      .map((r) =>
        [r.date, r.reference, r.party, r.category, r.amount]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${req.params.type}-report.csv"`
  );
  res.send(Buffer.from(csv));
});
