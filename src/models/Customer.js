import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['customer', 'retail', 'supplier'], default: 'customer' },
    contact: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    openingBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0, min: 0 },
    currentDueBalance: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
  },
  { timestamps: true }
);

customerSchema.virtual('status').get(function () {
  const due = this.currentDueBalance || 0;
  const limit = this.creditLimit || 0;
  if (due <= 0) return 'Clear';
  if (limit > 0 && due > limit) return 'Over Limit';
  return 'Due';
});

customerSchema.virtual('dueBalance').get(function () {
  return this.currentDueBalance;
});

customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Customer', customerSchema);
