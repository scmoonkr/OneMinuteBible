import { Router } from 'express';
import {
  readBibleEdit, readBiblehubChapter, readBiblehubSource, readBookChapters, readChapter, readChapterAudio,
  readTopicVerses, updateBibleEdit, updateBibleParagraphs, updateChapterAudio, updateTopicVerseAction,
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

// 대시보드 editHub 화면(/biblehub/edit): biblehub 영문 원문 → 번역 → 단락 주제·요약 저장.
router.get('/hub/:bookNo/:chapterNo', readBiblehubSource);
router.patch('/edit/:bookNo/:chapterNo/paragraphs', requireBackendRole, updateBibleParagraphs);
router.patch('/edit/:bookNo/:chapterNo/audio', requireBackendRole, updateChapterAudio);

export default router;
