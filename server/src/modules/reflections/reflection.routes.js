import { Router } from 'express';
import { createReflection, listReflectionItems } from './reflection.controller.js';

const router = Router();

router.get('/', listReflectionItems);
router.post('/', createReflection);

export default router;
