import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    description: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    refType: {
      type: String,
      enum: ['sale', 'payment', 'exchange', 'return', 'opening', 'adjustment'],
    },
    refId: { type: mongoose.Schema.Types.ObjectId },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('LedgerEntry', ledgerSchema);
