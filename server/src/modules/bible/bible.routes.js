import { Router } from 'express';
import {
  readBibleEdit, readBiblehubChapter, readBookChapters, readChapter, readChapterAudio, readTopicVerses,
  updateBibleEdit, updateTopicVerseAction,
} from './bible.controller.js';
import { requireBackendRole } from '../../middlewares/backend-role.middleware.js';

const router = Router();

router.get('/read', readChapter);
router.get('/chapters', readBookChapters);
router.get('/biblehub', readBiblehubChapter);
router.get('/audio/:bookNo/:chapterNo', readChapterAudio);
router.get('/topics', readTopicVerses);
router.post('/topics/action', updateTopicVerseAction);

// 대시보드 편집 화면(/bible/edit). 저장은 manager 이상만.
router.get('/edit/:bookNo/:chapterNo', readBibleEdit);
router.patch('/edit/:bookNo/:chapterNo', requireBackendRole, updateBibleEdit);

export default router;
