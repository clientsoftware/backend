import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productId: String,
    productName: String,
    quantity: { type: Number, required: true, min: 0 },
    unitUsed: { type: String, default: 'primary' },
    unitPriceCharged: { type: Number, required: true },
    costPriceAtSale: { type: Number, default: 0 },
    manualPriceOverride: { type: Boolean, default: false },
    quantityInSecondary: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
    newSalePrice: Number,
  },
  { _id: false }
);

const tradeInItemSchema = new mongoose.Schema(
  {
    itemId: String,
    name: String,
    nameUrdu: String,
    unit: String,
    qty: Number,
    price: Number,
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    salesman: { type: String, default: '' },
    type: { type: String, default: 'sale' },
    items: { type: [saleItemSchema], required: true },
    tradeInItems: { type: [tradeInItemSchema], default: [] },
    tradeInTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['rs', 'pct'], default: 'rs' },
    discountValue: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paidCash: { type: Number, default: 0 },
    paidBank: { type: Number, default: 0 },
    paymentBankId: { type: String, default: null },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank', 'split', 'partial', 'credit', 'upi'],
      default: 'cash',
    },
    dueAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: String, default: '' },
    isScrapSale: { type: Boolean, default: false },
    paidScrapReceived: { type: Number, default: 0 },
    pendingScrap: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    description: { type: String, default: '' },
    terms: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    dateStr: { type: String }, // YYYY-MM-DD
    createdBy: { type: String, default: '' },
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
