import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('BankAccount', bankAccountSchema);
