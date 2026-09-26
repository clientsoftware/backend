import { body } from 'express-validator';
import User from '../models/User.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../middleware/auth.js';

export const loginValidators = [
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const registerValidators = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').optional().isIn(['Admin', 'Cashier']),
];

/**
 * POST /api/auth/login
 * Body: { email|username, password }
 */
export const login = asyncHandler(async (req, res) => {
  const email = (req.body.email || req.body.username || '').toLowerCase().trim();
  const { password } = req.body;
  if (!email || !password) return fail(res, 'Email and password are required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return fail(res, 'Invalid credentials', 401);
  }
  if (!user.isActive) return fail(res, 'Account is disabled', 403);

  const token = signToken(user._id);
  return ok(
    res,
    {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    },
    'Login successful'
  );
});

/**
 * POST /api/auth/register — Admin only
 */
export const register = asyncHandler(async (req, res) => {
  const exists = await User.findOne({ email: req.body.email.toLowerCase() });
  if (exists) return fail(res, 'Email already registered', 409);

  const user = await User.create({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    password: req.body.password,
    role: req.body.role || 'Cashier',
  });

  return created(
    res,
    { _id: user._id, name: user.name, email: user.email, role: user.role },
    'User registered'
  );
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user });
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (_req, res) => {
  return ok(res, null, 'Logged out');
});
