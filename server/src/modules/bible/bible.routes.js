import { Router } from 'express';
import { readBookChapters, readChapter, readTopicVerses } from './bible.controller.js';

const router = Router();

router.get('/read', readChapter);
router.get('/chapters', readBookChapters);
router.get('/topics', readTopicVerses);

export default router;

