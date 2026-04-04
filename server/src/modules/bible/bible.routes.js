import { Router } from 'express';
import { readChapter } from './bible.controller.js';

const router = Router();

router.get('/read', readChapter);

export default router;
