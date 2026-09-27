import { Router } from 'express';
import Salary from '../models/Salary.js';

const router = Router();

// GET salaries
router.get('/', async (req, res, next) => {
  try {
    const { month, employeeId } = req.query;
    const filter = {};
    if (month) filter.month = month;
    if (employeeId) filter.employeeId = employeeId;
    const records = await Salary.find(filter).populate('employeeId', 'name designation baseSalary').sort({ month: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

// POST generate/upsert salary
router.post('/', async (req, res, next) => {
  try {
    const { month, employeeId } = req.body;
    let salary = await Salary.findOne({ month, employeeId });
    if (salary) {
      Object.assign(salary, req.body);
      await salary.save();
    } else {
      salary = await Salary.create(req.body);
    }
    const populated = await Salary.findById(salary._id).populate('employeeId', 'name designation baseSalary');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// DELETE salary
router.delete('/:id', async (req, res, next) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Salary record deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
