import { Router } from 'express';
import ProductionItem from '../models/ProductionItem.js';
import ProductionRecord from '../models/ProductionRecord.js';

const router = Router();

// Production Items
router.get('/items', async (req, res, next) => {
  try {
    const items = await ProductionItem.find().sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/items', async (req, res, next) => {
  try {
    const item = await ProductionItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.put('/items/:id', async (req, res, next) => {
  try {
    const item = await ProductionItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    await ProductionItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Production item deleted' });
  } catch (err) {
    next(err);
  }
});

// Production Records
router.get('/records', async (req, res, next) => {
  try {
    const { date, month, employeeId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (month) filter.date = { $regex: `^${month}` };
    if (employeeId) filter.employeeId = employeeId;
    const records = await ProductionRecord.find(filter).populate('employeeId', 'name').sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

router.post('/records', async (req, res, next) => {
  try {
    const record = await ProductionRecord.create(req.body);
    const populated = await ProductionRecord.findById(record._id).populate('employeeId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

router.put('/records/:id', async (req, res, next) => {
  try {
    const record = await ProductionRecord.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('employeeId', 'name');
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

router.delete('/records/:id', async (req, res, next) => {
  try {
    await ProductionRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Production record deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
