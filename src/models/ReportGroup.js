import mongoose from 'mongoose';

const reportGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    categoryFilter: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('ReportGroup', reportGroupSchema);
