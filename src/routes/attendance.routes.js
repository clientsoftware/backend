import { Router } from 'express';
import Attendance from '../models/Attendance.js';

const router = Router();

// GET attendance by date or all
router.get('/', async (req, res, next) => {
  try {
    const { date, employeeId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (employeeId) filter.employeeId = employeeId;
    const records = await Attendance.find(filter).populate('employeeId', 'name designation dutyHours').sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

// POST mark/upsert attendance
router.post('/', async (req, res, next) => {
  try {
    const { date, employeeId } = req.body;
    let attendance = await Attendance.findOne({ date, employeeId });
    if (attendance) {
      Object.assign(attendance, req.body);
      await attendance.save();
    } else {
      attendance = await Attendance.create(req.body);
    }
    const populated = await Attendance.findById(attendance._id).populate('employeeId', 'name designation dutyHours');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// DELETE attendance
router.delete('/:id', async (req, res, next) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Attendance deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
