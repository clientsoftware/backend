import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'cheque'],
      default: 'cash',
    },
    relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['received', 'refund'], default: 'received' },
    note: { type: String, default: '' },
    receiptNo: { type: String },
    pdfUrl: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
