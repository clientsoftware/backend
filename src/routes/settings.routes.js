import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getBusiness,
  updateBusiness,
  getInvoiceTemplate,
  updateInvoiceTemplate,
  getUnits,
  createUnit,
  deleteUnit,
  getCategories,
  createCategory,
  deleteCategory,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/settingsController.js';

const router = Router();

router.get('/business', getBusiness);
router.put('/business', updateBusiness);
router.get('/invoice-template', getInvoiceTemplate);
router.put('/invoice-template', updateInvoiceTemplate);
router.get('/units', getUnits);
router.post('/units', createUnit);
router.delete('/units/:id', deleteUnit);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/users', protect, authorize('Admin'), getUsers);
router.post('/users', protect, authorize('Admin'), createUser);
router.put('/users/:id', protect, authorize('Admin'), updateUser);
router.delete('/users/:id', protect, authorize('Admin'), deleteUser);

export default router;
