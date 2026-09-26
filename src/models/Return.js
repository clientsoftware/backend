import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    quantity: { type: Number, required: true, min: 0 },
    unitUsed: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
    quantityInSecondary: Number,
    unitPrice: Number,
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    slipNumber: { type: String, unique: true },
    originalInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [returnItemSchema], required: true },
    refundMode: { type: String, enum: ['cash', 'credit_note', 'bank'], default: 'credit_note' },
    refundAmount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Return', returnSchema);
