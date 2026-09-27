import mongoose from 'mongoose';

const productionRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    productId: { type: String, default: '' },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('ProductionRecord', productionRecordSchema);
