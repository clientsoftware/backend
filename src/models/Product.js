import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    primaryUnit: { type: String, required: true, default: 'Kg' },
    secondaryUnit: { type: String, required: true, default: 'Pieces' },
    /** 1 primary = conversionRate secondary */
    conversionRate: { type: Number, required: true, min: 0.0001, default: 1 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    salePrice: { type: Number, required: true, min: 0, default: 0 },
    /** Always stored in secondary (base) unit */
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
