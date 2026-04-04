import { listReflections, upsertReflection } from './reflection.repository.js';
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
  const userNo = parsePositiveInteger(params.userNo, 'userNo', {
    required: false,
  });

  if (paragraphNo !== undefined) {
    query.paragraphNo = paragraphNo;
  }

  if (userNo !== undefined) {
    query.userNo = userNo;
  }

  return query;
}

export async function getReflections(params = {}) {
  const query = parseReflectionQuery(params);
  return listReflections(query);
}

export async function saveReflection(body = {}) {
  const now = new Date().toISOString();
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const rid = typeof body.rid === 'string' && body.rid.trim()
    ? body.rid.trim()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const document = {
    rid,
    userNo: parsePositiveInteger(body.userNo, 'userNo'),
    nickname: nickname || undefined,
    bookNo: parsePositiveInteger(body.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(body.chapterNo, 'chapterNo'),
    paragraphNo: parsePositiveInteger(body.paragraphNo, 'paragraphNo'),
    verseRange: requireTrimmedString(body.verseRange, 'verseRange'),
    verseIDs: normalizeSelectedVerseItems(body.verseIDs),
    text: requireTrimmedString(body.text, 'text'),
    updatedAt: now,
    createdAt: String(body.createdAt || now),
  };

  return upsertReflection(document);
}



