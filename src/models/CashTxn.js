import mongoose from 'mongoose';

const cashTxnSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: { type: String, enum: ['payment_in', 'payment_out', 'deposit', 'withdraw'], required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    method: { type: String, enum: ['cash', 'bank', 'split'], default: 'cash' },
    bankId: { type: String, default: null },
    cashAmt: { type: Number, default: 0 },
    bankAmt: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    partyId: { type: String, default: null },
    partyName: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('CashTxn', cashTxnSchema);
