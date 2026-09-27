import mongoose from 'mongoose';

const productionItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, default: 'Pcs' },
    defaultPrice: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('ProductionItem', productionItemSchema);
