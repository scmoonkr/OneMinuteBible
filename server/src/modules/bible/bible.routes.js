import { Router } from 'express';
import { readBookChapters, readChapter, readTopicVerses, updateTopicVerseAction } from './bible.controller.js';

const router = Router();

router.get('/read', readChapter);
router.get('/chapters', readBookChapters);
router.get('/topics', readTopicVerses);
router.post('/topics/action', updateTopicVerseAction);

export default router;


