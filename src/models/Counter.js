import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  seq: { type: Number, default: 0 },
});

export async function nextSequence(key) {
  const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

export async function nextInvoiceNumber(prefix = 'INV') {
  const seq = await nextSequence(`invoice_${prefix}`);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}
