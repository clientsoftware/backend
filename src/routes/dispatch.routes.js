import { Router } from 'express';
import {
  createDispatch,
  updateDispatch,
  listDispatches,
  getDispatch,
} from '../controllers/dispatchController.js';

const router = Router();

router.post('/', createDispatch);
router.put('/:id', updateDispatch);
router.get('/', listDispatches);
router.get('/:id', getDispatch);

export default router;
