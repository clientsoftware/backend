import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'halfday'], default: 'present' },
    arrivalTime: { type: String, default: null }, // HH:mm
    departureTime: { type: String, default: null }, // HH:mm
    workedHours: { type: Number, default: 0 },
    recordedBy: { type: String, default: 'manual' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);
