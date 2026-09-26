import mongoose from 'mongoose';
import User from '../models/User.js';
import { getSettings } from '../models/Settings.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBusiness = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  return ok(res, s.business);
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const s = await getSettings();
  s.business = { ...s.business.toObject?.() ?? s.business, ...req.body };
  await s.save();
  return ok(res, s.business, 'Business profile saved');
});

export const getInvoiceTemplate = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  return ok(res, s.invoice);
});

export const updateInvoiceTemplate = asyncHandler(async (req, res) => {
  const s = await getSettings();
  s.invoice = { ...s.invoice.toObject?.() ?? s.invoice, ...req.body };
  await s.save();
  return ok(res, s.invoice, 'Invoice template saved');
});

export const getUnits = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  return ok(
    res,
    (s.units || []).map((u) => (u._id ? u : { _id: u.name, name: u.name || u }))
  );
});

export const createUnit = asyncHandler(async (req, res) => {
  const s = await getSettings();
  const unit = { _id: new mongoose.Types.ObjectId(), name: req.body.name };
  s.units.push(unit);
  await s.save();
  return created(res, unit, 'Unit added');
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const s = await getSettings();
  s.units = s.units.filter((u) => String(u._id) !== req.params.id && u.name !== req.params.id);
  await s.save();
  return ok(res, null, 'Unit deleted');
});

export const getCategories = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  return ok(
    res,
    (s.categories || []).map((c) => (c._id ? c : { _id: c.name, name: c.name || c }))
  );
});

export const createCategory = asyncHandler(async (req, res) => {
  const s = await getSettings();
  const cat = { _id: new mongoose.Types.ObjectId(), name: req.body.name };
  s.categories.push(cat);
  await s.save();
  return created(res, cat, 'Category added');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const s = await getSettings();
  s.categories = s.categories.filter(
    (c) => String(c._id) !== req.params.id && c.name !== req.params.id
  );
  await s.save();
  return ok(res, null, 'Category deleted');
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return ok(res, users);
});

export const createUser = asyncHandler(async (req, res) => {
  const exists = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (exists) return fail(res, 'Email already registered', 409);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password || 'password123',
    role: req.body.role === 'admin' || req.body.role === 'Admin' ? 'Admin' : 'Cashier',
  });
  return created(
    res,
    { _id: user._id, name: user.name, email: user.email, role: user.role },
    'User created'
  );
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return fail(res, 'User not found', 404);
  if (req.body.name) user.name = req.body.name;
  if (req.body.email) user.email = req.body.email;
  if (req.body.role) {
    user.role = req.body.role === 'admin' || req.body.role === 'Admin' ? 'Admin' : 'Cashier';
  }
  if (req.body.password) user.password = req.body.password;
  await user.save();
  return ok(res, { _id: user._id, name: user.name, email: user.email, role: user.role });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return ok(res, null, 'User deleted');
});
