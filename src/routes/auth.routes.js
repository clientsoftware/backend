import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  login,
  register,
  me,
  logout,
  loginValidators,
  registerValidators,
} from '../controllers/authController.js';

const router = Router();

router.post('/login', loginValidators, validate, login);
router.post('/register', protect, authorize('Admin'), registerValidators, validate, register);
router.get('/me', protect, me);
router.post('/logout', protect, logout);

export default router;
