import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, default: '', trim: true },
    code: { type: String, default: '', trim: true },
    barcode: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true, default: 'General' },
    group: { type: String, default: '', trim: true },
    primaryUnit: { type: String, required: true, default: 'Pcs' },
    secondaryUnit: { type: String, default: '' },
    conversionRate: { type: Number, required: true, min: 0.0001, default: 1 },
    altUnit: { type: String, default: '', trim: true },
    altUnitFactor: { type: Number, default: 0 },
    altUnitPrice: { type: Number, default: 0 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    salePrice: { type: Number, required: true, min: 0, default: 0 },
    wholesalePrice: { type: Number, default: 0, min: 0 },
    stockInSecondaryUnit: { type: Number, required: true, min: 0, default: 0 },
    isScrapItem: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

productSchema.virtual('isLowStock').get(function () {
  const rate = this.conversionRate || 1;
  const primaryStock = (this.stockInSecondaryUnit || 0) / rate;
  return primaryStock <= (this.lowStockThreshold || 0);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);
