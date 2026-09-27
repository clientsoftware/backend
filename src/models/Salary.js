import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true }, // YYYY-MM
    baseSalary: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    attendanceSalary: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    productionUnits: { type: Number, default: 0 },
    productionSalary: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Salary', salarySchema);
