import { Router } from 'express';
import {
  getGroups,
  createGroup,
  getReport,
  exportReport,
} from '../controllers/reportController.js';

const router = Router();

router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.get('/:type/export', exportReport);
router.get('/:type', getReport);

export default router;
