import mongoose from 'mongoose';

const exchangeSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    date: { type: Date, default: Date.now },
    itemGiven: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
      productName: String,
      quantity: { type: Number, required: true },
      rate: { type: Number, required: true },
      value: { type: Number, required: true },
    },
    itemReceived: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
      productName: String,
      quantity: { type: Number, required: true },
      rate: { type: Number, required: true },
      value: { type: Number, required: true },
    },
    /** customer vs company */
    partyType: { type: String, enum: ['customer', 'company'], default: 'customer' },
    companyName: { type: String, default: '' },
    /** self delivery vs company vehicle dispatch */
    deliveryMethod: { type: String, enum: ['self', 'dispatch'], default: 'self' },
    dispatchDetails: {
      vehicleNumber: { type: String, default: '' },
      driverName: { type: String, default: '' },
      driverPhone: { type: String, default: '' },
      sentQuantity: { type: Number, default: 0 },
      receivedQuantity: { type: Number, default: 0 },
      shortageQuantity: { type: Number, default: 0 },
      shortageLoss: { type: Number, default: 0 },
      boxCount: { type: Number, default: 0 },
      boxCostPerUnit: { type: Number, default: 0 },
      totalBoxCost: { type: Number, default: 0 },
      freightCost: { type: Number, default: 0 },
      otherExpensesCost: { type: Number, default: 0 },
      notes: { type: String, default: '' },
      customFields: [{ label: String, value: String }],
    },
    bulkDispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkDispatch' },
    /** positive = customer owes, negative = business owes */
    netBalance: { type: Number, required: true },
    status: { type: String, enum: ['settled', 'pending'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('ScrapCopperExchange', exchangeSchema);
