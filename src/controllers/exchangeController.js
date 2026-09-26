import ScrapCopperExchange from '../models/ScrapCopperExchange.js';
import BulkDispatch from '../models/BulkDispatch.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { nextSequence } from '../models/Counter.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSecondary } from '../utils/units.js';
import { AppError } from '../middleware/errorHandler.js';
import { appendLedger } from './customerController.js';

/**
 * Scrap↔Copper exchange
 * Customer gives scrap → INCREMENT scrap stock
 * Business gives copper → DECREMENT copper stock
 * netBalance = copperValue - scrapValue (positive = customer owes)
 */
export const createExchange = asyncHandler(async (req, res) => {
  const body = req.body || {};

  // Accept both frontend shapes: itemGiven / scrapGiven, itemReceived / copperReceived
  const given = body.itemGiven || body.scrapGiven || {};
  const received = body.itemReceived || body.copperReceived || {};

  let customerId = body.customerId || body.customer || null;
  let customer = null;

  if (customerId) {
    customer = await Customer.findById(customerId);
    if (!customer) return fail(res, 'Customer not found', 404);
  } else {
    const walkInName = (body.customerName || body.walkInName || '').trim();
    const walkInPhone = (body.customerPhone || body.walkInPhone || body.phone || '').trim();
    if (walkInName) {
      customer = await Customer.create({
        name: walkInName,
        phone: walkInPhone,
        contact: walkInPhone,
        creditLimit: Number(body.creditLimit) || 0,
        currentDueBalance: 0,
      });
      customerId = customer._id;
    }
  }

  const scrapProductId =
    given.productId || given.product || body.scrapProductId || body.scrapId;
  const copperProductId =
    received.productId || received.product || body.copperProductId || body.copperId;

  // Support custom (free-text) product names when no DB product is selected
  const scrapCustomName = given.productName || body.scrapProductName || '';
  const copperCustomName = received.productName || body.copperProductName || '';

  if (!scrapProductId && !scrapCustomName.trim()) {
    return fail(res, 'Enter or select a Scrap product', 400);
  }
  if (!copperProductId && !copperCustomName.trim()) {
    return fail(res, 'Enter or select a Copper product', 400);
  }

  const scrapProduct = scrapProductId ? await Product.findById(scrapProductId) : null;
  const copperProduct = copperProductId ? await Product.findById(copperProductId) : null;

  // If IDs were provided but not found in DB, reject
  if (scrapProductId && !scrapProduct) {
    return fail(res, 'Scrap product not found', 400);
  }
  if (copperProductId && !copperProduct) {
    return fail(res, 'Copper product not found', 400);
  }

  const scrapQty = Number(given.quantity ?? body.scrapQuantity) || 0;
  const scrapRate = Number(given.rate ?? body.scrapRate) || 0;
  const copperQty = Number(received.quantity ?? body.copperQuantity) || 0;
  const copperRate = Number(received.rate ?? body.copperRate) || 0;

  if (scrapQty <= 0 || copperQty <= 0) {
    return fail(res, 'Enter valid quantities for scrap and copper', 400);
  }

  const scrapValue = Number(given.value) || scrapQty * scrapRate;
  const copperValue = Number(received.value) || copperQty * copperRate;
  const netBalance = copperValue - scrapValue;

  // Customer required when there is a payable/receivable balance
  if (netBalance !== 0 && !customer) {
    return fail(
      res,
      'Select or enter a customer when the exchange has a net balance (payable/receivable)',
      400
    );
  }

  // Add scrap stock (customer gives scrap) — only when a DB product is linked
  if (scrapProduct) {
    const scrapSecondary = toSecondary(
      scrapQty,
      given.unitUsed || 'primary',
      scrapProduct.conversionRate
    );
    scrapProduct.stockInSecondaryUnit += scrapSecondary;
    await scrapProduct.save();
  }

  // Remove copper stock (business gives copper) — only when a DB product is linked
  if (copperProduct) {
    const copperSecondary = toSecondary(
      copperQty,
      received.unitUsed || 'primary',
      copperProduct.conversionRate
    );
    if (copperProduct.stockInSecondaryUnit < copperSecondary) {
      throw new AppError(`Insufficient copper stock for ${copperProduct.name}`, 400);
    }
    copperProduct.stockInSecondaryUnit -= copperSecondary;
    await copperProduct.save();
  }

  const partyType = body.partyType === 'company' ? 'company' : 'customer';
  const companyName = (body.companyName || body.destinationCompany || '').trim();
  const deliveryMethod = body.deliveryMethod === 'dispatch' ? 'dispatch' : 'self';

  // Dispatch details calculation
  const rawDispatch = body.dispatchDetails || body.dispatch || {};
  const vehicleNumber = rawDispatch.vehicleNumber || body.vehicleNumber || '';
  const driverName = rawDispatch.driverName || body.driverName || '';
  const driverPhone = rawDispatch.driverPhone || body.driverPhone || '';
  const sentQuantity = Number(rawDispatch.sentQuantity ?? body.sentQuantity ?? copperQty) || copperQty;
  const receivedQuantity = Number(rawDispatch.receivedQuantity ?? body.receivedQuantity ?? sentQuantity);
  const shortageQuantity = Math.max(0, sentQuantity - receivedQuantity);
  const shortageLoss = shortageQuantity * copperRate;

  const boxCount = Number(rawDispatch.boxCount ?? body.boxCount) || 0;
  const boxCostPerUnit = Number(rawDispatch.boxCostPerUnit ?? body.boxCostPerUnit) || 0;
  const totalBoxCost = boxCount * boxCostPerUnit;
  const freightCost = Number(rawDispatch.freightCost ?? body.freightCost) || 0;
  const otherExpensesCost = Number(rawDispatch.otherExpensesCost ?? body.otherExpensesCost) || 0;
  const notes = rawDispatch.notes || body.notes || '';
  const customFields = Array.isArray(rawDispatch.customFields || body.customFields)
    ? rawDispatch.customFields || body.customFields
    : [];

  const seq = await nextSequence('exchange');
  const receiptNumber = `EXC-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;

  const finalScrapName = scrapProduct?.name || scrapCustomName;
  const finalCopperName = copperProduct?.name || copperCustomName;

  const dispatchDetailsData = {
    vehicleNumber,
    driverName,
    driverPhone,
    sentQuantity,
    receivedQuantity,
    shortageQuantity,
    shortageLoss,
    boxCount,
    boxCostPerUnit,
    totalBoxCost,
    freightCost,
    otherExpensesCost,
    notes,
    customFields,
  };

  let bulkDispatchId = null;

  // Auto-create BulkDispatch if Company or Dispatch selected
  if (partyType === 'company' || deliveryMethod === 'dispatch') {
    const totalSaleValue = receivedQuantity * copperRate;
    const costOfGoods = copperProduct ? (sentQuantity * (copperProduct.costPrice || 0)) : 0;
    const expensesList = [
      ...(freightCost > 0 ? [{ label: 'Freight / Gadi Rent', amount: freightCost }] : []),
      ...(totalBoxCost > 0 ? [{ label: `Box/Packing (${boxCount} x Rs.${boxCostPerUnit})`, amount: totalBoxCost }] : []),
      ...(otherExpensesCost > 0 ? [{ label: 'Misc Expenses', amount: otherExpensesCost }] : []),
    ];
    const totalExpense = freightCost + totalBoxCost + otherExpensesCost;
    const netProfitLoss = totalSaleValue - (costOfGoods + totalExpense + shortageLoss);

    const bulkDispatch = await BulkDispatch.create({
      companyName: companyName || customer?.name || 'Company Deal',
      partyType,
      deliveryMethod,
      vehicleNumber,
      driverName,
      driverPhone,
      item: copperProduct?._id || undefined,
      itemName: finalCopperName,
      quantity: sentQuantity,
      sentQuantity,
      receivedQuantity,
      shortageQuantity,
      shortageLoss,
      unitUsed: 'primary',
      saleRate: copperRate,
      totalSaleValue,
      costOfGoods,
      boxCount,
      boxCostPerUnit,
      totalBoxCost,
      freightCost,
      expenses: expensesList,
      totalExpense,
      netProfitLoss,
      notes,
      customFields,
      date: new Date(),
      createdBy: req.user?._id && req.user._id !== 'demo' ? req.user._id : undefined,
    });
    bulkDispatchId = bulkDispatch._id;
  }

  const exchange = await ScrapCopperExchange.create({
    receiptNumber,
    customer: customer?._id || undefined,
    partyType,
    companyName: companyName || customer?.name || '',
    deliveryMethod,
    dispatchDetails: dispatchDetailsData,
    bulkDispatchId,
    date: new Date(),
    itemGiven: {
      product: scrapProduct?._id || undefined,
      productName: finalScrapName,
      quantity: scrapQty,
      rate: scrapRate,
      value: scrapValue,
    },
    itemReceived: {
      product: copperProduct?._id || undefined,
      productName: finalCopperName,
      quantity: copperQty,
      rate: copperRate,
      value: copperValue,
    },
    netBalance,
    status: netBalance === 0 ? 'settled' : 'pending',
    createdBy: req.user?._id && req.user._id !== 'demo' ? req.user._id : undefined,
  });

  if (bulkDispatchId) {
    await BulkDispatch.findByIdAndUpdate(bulkDispatchId, { exchangeId: exchange._id });
  }

  if (customer && netBalance > 0) {
    await appendLedger({
      customerId: customer._id,
      description: `Exchange ${receiptNumber} (customer owes)`,
      debit: netBalance,
      refType: 'exchange',
      refId: exchange._id,
    });
  } else if (customer && netBalance < 0) {
    await appendLedger({
      customerId: customer._id,
      description: `Exchange ${receiptNumber} (business owes)`,
      credit: Math.abs(netBalance),
      refType: 'exchange',
      refId: exchange._id,
    });
  }

  const populated = await ScrapCopperExchange.findById(exchange._id)
    .populate('customer', 'name contact phone')
    .lean();

  return created(
    res,
    {
      ...populated,
      customerName: customer?.name || 'Walk-in Customer',
      customerPhone: customer?.phone || customer?.contact || '',
      scrapValue,
      copperValue,
      receiptNo: receiptNumber,
      scrapProductName: finalScrapName,
      copperProductName: finalCopperName,
    },
    'Exchange created'
  );
});

export const listExchanges = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.customerId) filter.customer = req.query.customerId;
  const list = await ScrapCopperExchange.find(filter)
    .sort({ date: -1 })
    .populate('customer', 'name contact phone');
  return ok(
    res,
    list.map((e) => {
      const o = e.toObject();
      return { ...o, customerName: o.customer?.name };
    })
  );
});

export const getExchange = asyncHandler(async (req, res) => {
  const row = await ScrapCopperExchange.findById(req.params.id).populate('customer');
  if (!row) return fail(res, 'Exchange not found', 404);
  return ok(res, row);
});
