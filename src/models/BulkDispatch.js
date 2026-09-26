import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bulkDispatchSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    partyType: { type: String, enum: ['customer', 'company'], default: 'company' },
    deliveryMethod: { type: String, enum: ['self', 'dispatch'], default: 'dispatch' },
    vehicleNumber: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    itemName: String,
    quantity: { type: Number, required: true, min: 0 },
    sentQuantity: { type: Number, default: 0 },
    receivedQuantity: { type: Number, default: 0 },
    shortageQuantity: { type: Number, default: 0 },
    shortageLoss: { type: Number, default: 0 },
    unitUsed: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
    saleRate: { type: Number, required: true, min: 0 },
    totalSaleValue: { type: Number, required: true },
    costOfGoods: { type: Number, default: 0 },
    boxCount: { type: Number, default: 0 },
    boxCostPerUnit: { type: Number, default: 0 },
    totalBoxCost: { type: Number, default: 0 },
    freightCost: { type: Number, default: 0 },
    expenses: { type: [expenseSchema], default: [] },
    totalExpense: { type: Number, default: 0 },
    /** netProfitLoss = totalSaleValue - (totalExpense + costOfGoods + shortageLoss) */
    netProfitLoss: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    customFields: [{ label: String, value: String }],
    exchangeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapCopperExchange' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('BulkDispatch', bulkDispatchSchema);
