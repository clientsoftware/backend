import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    quantity: { type: Number, required: true, min: 0 },
    unitUsed: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
    unitPriceCharged: { type: Number, required: true },
    costPriceAtSale: { type: Number, default: 0 },
    manualPriceOverride: { type: Boolean, default: false },
    quantityInSecondary: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: 'Walk-in Customer' },
    items: { type: [saleItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank', 'partial', 'credit', 'upi'],
      default: 'cash',
    },
    dueAmount: { type: Number, default: 0, min: 0 },
    isScrapSale: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pdfUrl: String,
  },
  { timestamps: true }
);

saleSchema.virtual('total').get(function () {
  return this.totalAmount;
});

saleSchema.set('toJSON', { virtuals: true });
saleSchema.set('toObject', { virtuals: true });

export default mongoose.model('Sale', saleSchema);
