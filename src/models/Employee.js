import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    baseSalary: { type: Number, required: true, min: 0, default: 0 },
    dutyHours: { type: Number, required: true, min: 1, max: 24, default: 8 },
    attendanceType: { type: String, enum: ['manual', 'fingerprint', 'both'], default: 'manual' },
  },
  { timestamps: true }
);

export default mongoose.model('Employee', employeeSchema);
