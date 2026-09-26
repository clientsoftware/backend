import BulkDispatch from '../models/BulkDispatch.js';
import Product from '../models/Product.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSecondary } from '../utils/units.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * netProfitLoss = totalSaleValue - (totalExpense + costOfGoods)
 */
export const createDispatch = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const productId = body.item || body.productId || body.itemId;
  const product = productId ? await Product.findById(productId) : null;

  const sentQuantity = Number(body.sentQuantity ?? body.quantity) || 0;
  const receivedQuantity = Number(body.receivedQuantity ?? sentQuantity);
  const shortageQuantity = Math.max(0, sentQuantity - receivedQuantity);
  const unitUsed = body.unitUsed || 'primary';
  const saleRate = Number(body.saleRate || body.rate) || 0;

  if (product) {
    const qtySecondary = toSecondary(sentQuantity, unitUsed, product.conversionRate);
    if (product.stockInSecondaryUnit < qtySecondary) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }
    product.stockInSecondaryUnit -= qtySecondary;
    await product.save();
  }

  const primaryQty = unitUsed === 'secondary' && product ? sentQuantity / (product.conversionRate || 1) : sentQuantity;
  const costOfGoods = product ? primaryQty * (Number(product.costPrice) || 0) : Number(body.costOfGoods) || 0;
  
  const totalSaleValue = Number(body.totalSaleValue) || (receivedQuantity * saleRate);
  const shortageLoss = shortageQuantity * saleRate;

  const boxCount = Number(body.boxCount) || 0;
  const boxCostPerUnit = Number(body.boxCostPerUnit) || 0;
  const totalBoxCost = Number(body.totalBoxCost) || (boxCount * boxCostPerUnit);
  const freightCost = Number(body.freightCost) || 0;

  const expenses = (body.expenses || []).map((e) => ({
    label: e.label || e.description || e.name || 'Expense',
    amount: Number(e.amount) || 0,
  }));

  const totalExpense = (Number(body.totalExpense) || expenses.reduce((a, e) => a + e.amount, 0)) + totalBoxCost + freightCost;
  const netProfitLoss = totalSaleValue - (totalExpense + costOfGoods + shortageLoss);

  const dispatch = await BulkDispatch.create({
    companyName: body.companyName || body.destinationCompany || body.company || '',
    partyType: body.partyType || 'company',
    deliveryMethod: body.deliveryMethod || 'dispatch',
    vehicleNumber: body.vehicleNumber || '',
    driverName: body.driverName || '',
    driverPhone: body.driverPhone || '',
    item: product?._id,
    itemName: product?.name || body.itemName || body.productName || 'Custom Product',
    quantity: sentQuantity,
    sentQuantity,
    receivedQuantity,
    shortageQuantity,
    shortageLoss,
    unitUsed,
    saleRate,
    totalSaleValue,
    costOfGoods,
    boxCount,
    boxCostPerUnit,
    totalBoxCost,
    freightCost,
    expenses,
    totalExpense,
    netProfitLoss,
    notes: body.notes || '',
    customFields: Array.isArray(body.customFields) ? body.customFields : [],
    date: body.date ? new Date(body.date) : new Date(),
    createdBy: req.user?._id !== 'demo' ? req.user?._id : undefined,
  });

  return created(
    res,
    {
      ...dispatch.toObject(),
      destinationCompany: dispatch.companyName,
      productName: dispatch.itemName,
      netProfit: dispatch.netProfitLoss,
    },
    'Dispatch created'
  );
});

export const updateDispatch = asyncHandler(async (req, res) => {
  const dispatch = await BulkDispatch.findById(req.params.id);
  if (!dispatch) return fail(res, 'Dispatch not found', 404);

  const body = req.body || {};
  if (body.receivedQuantity != null) dispatch.receivedQuantity = Number(body.receivedQuantity);
  if (body.vehicleNumber != null) dispatch.vehicleNumber = body.vehicleNumber;
  if (body.driverName != null) dispatch.driverName = body.driverName;
  if (body.driverPhone != null) dispatch.driverPhone = body.driverPhone;
  if (body.boxCount != null) dispatch.boxCount = Number(body.boxCount);
  if (body.boxCostPerUnit != null) dispatch.boxCostPerUnit = Number(body.boxCostPerUnit);
  if (body.freightCost != null) dispatch.freightCost = Number(body.freightCost);
  if (body.notes != null) dispatch.notes = body.notes;
  if (Array.isArray(body.customFields)) dispatch.customFields = body.customFields;
  if (Array.isArray(body.expenses)) {
    dispatch.expenses = body.expenses.map((e) => ({
      label: e.label || e.description || e.name || 'Expense',
      amount: Number(e.amount) || 0,
    }));
  }

  // Recalculate shortage & financials
  dispatch.totalBoxCost = dispatch.boxCount * dispatch.boxCostPerUnit;
  dispatch.shortageQuantity = Math.max(0, dispatch.sentQuantity - dispatch.receivedQuantity);
  dispatch.shortageLoss = dispatch.shortageQuantity * dispatch.saleRate;
  dispatch.totalSaleValue = dispatch.receivedQuantity * dispatch.saleRate;

  const miscExpenses = dispatch.expenses.reduce((a, e) => a + e.amount, 0);
  dispatch.totalExpense = miscExpenses + dispatch.totalBoxCost + dispatch.freightCost;
  dispatch.netProfitLoss = dispatch.totalSaleValue - (dispatch.totalExpense + dispatch.costOfGoods + dispatch.shortageLoss);

  await dispatch.save();

  return ok(res, {
    ...dispatch.toObject(),
    destinationCompany: dispatch.companyName,
    productName: dispatch.itemName,
    netProfit: dispatch.netProfitLoss,
  }, 'Dispatch updated');
});

export const listDispatches = asyncHandler(async (req, res) => {
  const list = await BulkDispatch.find().sort({ date: -1 }).populate('item', 'name category');
  return ok(
    res,
    list.map((d) => {
      const o = d.toObject();
      return {
        ...o,
        destinationCompany: o.companyName,
        productName: o.itemName,
        netProfit: o.netProfitLoss,
      };
    })
  );
});

export const getDispatch = asyncHandler(async (req, res) => {
  const row = await BulkDispatch.findById(req.params.id).populate('item');
  if (!row) return fail(res, 'Dispatch not found', 404);
  return ok(res, row);
});
