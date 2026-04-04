import { insertReflection, listReflections } from './reflection.repository.js';
import {
  normalizeIntegerList,
  parseOptionalBoolean,
  parsePositiveInteger,
  requireTrimmedString,
} from '../../utils/validation.js';

function parseReflectionQuery(params = {}) {
  const userId = String(params.userId ?? '').trim();
  const query = {
    bookNo: parsePositiveInteger(params.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(params.chapterNo, 'chapterNo'),
  };

  const paragraphNo = parsePositiveInteger(params.paragraphNo, 'paragraphNo', {
    required: false,
  });
  const mine = parseOptionalBoolean(params.mine);

  if (paragraphNo !== undefined) {
    query.paragraphNo = paragraphNo;
  }

  if (mine === true) {
    query.userId = userId || requireTrimmedString(params.userId, 'userId');
    query.mine = true;
  } else if (mine !== undefined) {
    query.mine = mine;
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
    verseIDs: normalizeIntegerList(body.verseIDs),
    text: requireTrimmedString(body.text, 'text'),
    mine: body.mine === false ? false : true,
    updatedAt: now,
    createdAt: now,
  };

  return insertReflection(document);
}
