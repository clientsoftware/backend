import mongoose from 'mongoose';

const partyTransferSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    fromPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    fromPartyName: { type: String, required: true },
    toPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    toPartyName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reference: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('PartyTransfer', partyTransferSchema);
