import { Router } from 'express';
import {
  readBooks, readConfession, readConfessionList, removeConfession, updateConfession,
} from './confession.controller.js';
import { requireBackendRole } from '../../middlewares/backend-role.middleware.js';

const router = Router();

router.get('/books', readBooks);
router.get('/', readConfessionList);
router.get('/:book/:questionNo', readConfession);
// 수정·삭제는 백엔드와 같은 기준(manager 이상)으로 막는다.
router.patch('/:book/:questionNo', requireBackendRole, updateConfession);
router.delete('/:book/:questionNo', requireBackendRole, removeConfession);

export default router;
