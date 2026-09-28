import {
  findBooks, findConfession, findConfessionList, softDeleteConfession, updateConfession,
} from './confession.repository.js';
import { createAppError, parsePositiveInteger, requireTrimmedString } from '../../utils/validation.js';

// 오늘의 묵상은 { monday: '...', ..., saturday: '...' } 객체로 저장돼 있다.
export const CONTEMPLATION_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// 편집 화면에서 고칠 수 있는 문자열 필드.
// bible(성경구절)은 구절 본문이 별도 성경 DB 에서 만들어진 값이라 여기서는 고치지 않는다.
const TEXT_FIELDS = ['title', 'subject', 'question', 'answer', 'summary', 'questionEng', 'answerEng'];

function parseKey(params) {
  return {
    book: requireTrimmedString(params.book, 'book'),
    questionNo: parsePositiveInteger(params.questionNo, 'questionNo'),
  };
}

function hasContemplation(doc) {
  return Boolean(doc.contemplation && Object.values(doc.contemplation).some((v) => String(v || '').trim()));
}

export async function listBooks() {
  return findBooks();
}

export async function listConfessions(params = {}) {
  const book = requireTrimmedString(params.book, 'book');
  const rows = await findConfessionList(book);

  return rows.map(({ contemplation, ...row }) => ({
    ...row,
    daily: hasContemplation({ contemplation }),
  }));
}

export async function getConfession(params = {}) {
  const { book, questionNo } = parseKey(params);
  const doc = await findConfession(book, questionNo);

  if (!doc) {
    throw createAppError('Confession not found.', 404);
  }

  return { ...doc, daily: hasContemplation(doc) };
}

// 요청 본문에서 허용된 필드만 골라 검증한다. 보내지 않은 필드는 건드리지 않는다.
function pickEditableFields(body = {}) {
  const fields = {};

  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined) fields[key] = String(body[key] ?? '');
  }

  if (body.week !== undefined) {
    fields.week = parsePositiveInteger(body.week, 'week');
  }

  if (body.check !== undefined) {
    if (!Array.isArray(body.check)) throw createAppError('check must be an array.', 400);
    fields.check = body.check.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (body.contemplation !== undefined) {
    const source = body.contemplation;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw createAppError('contemplation must be an object.', 400);
    }
    fields.contemplation = Object.fromEntries(
      CONTEMPLATION_DAYS.map((day) => [day, String(source[day] ?? '')]),
    );
  }

  return fields;
}

export async function saveConfession(params = {}, body = {}) {
  const { book, questionNo } = parseKey(params);
  const fields = pickEditableFields(body);

  if (!Object.keys(fields).length) {
    throw createAppError('No editable fields were provided.', 400);
  }

  const found = await updateConfession(book, questionNo, fields);
  if (!found) {
    throw createAppError('Confession not found.', 404);
  }

  return getConfession({ book, questionNo });
}

export async function deleteConfession(params = {}) {
  const { book, questionNo } = parseKey(params);
  const found = await softDeleteConfession(book, questionNo);

  if (!found) {
    throw createAppError('Confession not found.', 404);
  }

  return { book, questionNo };
}
