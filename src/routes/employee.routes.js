import { Router } from 'express';
import Employee from '../models/Employee.js';

const router = Router();

// GET all employees
router.get('/', async (req, res, next) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
});

// POST create employee
router.post('/', async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// PUT update employee
router.put('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// DELETE employee
router.delete('/:id', async (req, res, next) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
