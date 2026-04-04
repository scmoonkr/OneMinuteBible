import { insertReflection, listReflections } from './reflection.repository.js';
import {
  normalizeSelectedVerseItems,
  parsePositiveInteger,
  requireTrimmedString,
} from '../../utils/validation.js';

function parseReflectionQuery(params = {}) {
  const query = {
    bookNo: parsePositiveInteger(params.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(params.chapterNo, 'chapterNo'),
  };

  const paragraphNo = parsePositiveInteger(params.paragraphNo, 'paragraphNo', {
    required: false,
  });

  if (paragraphNo !== undefined) {
    query.paragraphNo = paragraphNo;
  }

  return query;
}

export async function getReflections(params = {}) {
  const query = parseReflectionQuery(params);

  return listReflections(query);
}

export async function saveReflection(body = {}) {
  const now = new Date().toISOString();

  const document = {
    userId: requireTrimmedString(body.userId, 'userId'),
    bookNo: parsePositiveInteger(body.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(body.chapterNo, 'chapterNo'),
    paragraphNo: parsePositiveInteger(body.paragraphNo, 'paragraphNo'),
    verseRange: requireTrimmedString(body.verseRange, 'verseRange'),
    verseIDs: normalizeSelectedVerseItems(body.verseIDs),
    text: requireTrimmedString(body.text, 'text'),
    updatedAt: now,
    createdAt: now,
  };

  return insertReflection(document);
}
