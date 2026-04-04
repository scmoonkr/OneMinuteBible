import { listReadingPaints, upsertReadingPaint } from './reading.repository.js';
import {
  normalizeIntegerList,
  parsePositiveInteger,
  requireTrimmedString,
} from '../../utils/validation.js';

function parseReadingQuery(params = {}) {
  return {
    userId: requireTrimmedString(params.userId, 'userId'),
    bookNo: parsePositiveInteger(params.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(params.chapterNo, 'chapterNo'),
    paragraphNo: parsePositiveInteger(params.paragraphNo, 'paragraphNo', {
      required: false,
    }),
  };
}

export async function getReadingPaints(params = {}) {
  const query = parseReadingQuery(params);

  return listReadingPaints(query);
}

export async function saveReadingPaint(body = {}) {
  const now = new Date().toISOString();

  const document = {
    userId: requireTrimmedString(body.userId, 'userId'),
    bookNo: parsePositiveInteger(body.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(body.chapterNo, 'chapterNo'),
    paragraphNo: parsePositiveInteger(body.paragraphNo, 'paragraphNo'),
    verseRange: requireTrimmedString(body.verseRange, 'verseRange'),
    verseIDs: normalizeIntegerList(body.verseIDs),
    category: requireTrimmedString(body.category, 'category'),
    updatedAt: now,
  };

  return upsertReadingPaint(document);
}
