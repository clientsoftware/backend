import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  lowStock,
  productValidators,
} from '../controllers/productController.js';

const router = Router();

router.get('/low-stock', lowStock);
router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', productValidators, validate, createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/adjust-stock', adjustStock);

export default router;
