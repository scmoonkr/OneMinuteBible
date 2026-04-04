import { Router } from 'express';
import { createPaint, listPaints } from './reading.controller.js';

const router = Router();

router.get('/', listPaints);
router.post('/', createPaint);

export default router;
