import mongoose from 'mongoose';

/**
 * Rate history — never overwrite. Always insert new records with effectiveDate.
 */
const rateSchema = new mongoose.Schema(
  {
    itemType: { type: String, required: true, trim: true }, // Copper / Scrap / etc.
    rate: { type: Number, required: true, min: 0 },
    effectiveDate: { type: Date, default: Date.now },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previousRate: { type: Number },
  },
  { timestamps: true }
);

rateSchema.index({ itemType: 1, effectiveDate: -1 });

export default mongoose.model('Rate', rateSchema);
