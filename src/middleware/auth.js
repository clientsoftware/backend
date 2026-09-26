import jwt from 'jsonwebtoken';
import { fail } from '../utils/apiResponse.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return fail(res, 'Authentication required', 401);

    // Dev demo token from frontend when API was offline
    if (token === 'demo-token' && process.env.NODE_ENV !== 'production') {
      req.user = { _id: 'demo', name: 'Demo Admin', email: 'demo@coppermart.app', role: 'Admin' };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return fail(res, 'User not found', 401);
    req.user = user;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return fail(res, 'Not authorized for this action', 403);
  }
  next();
};

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
