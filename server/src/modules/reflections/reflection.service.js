import { listReflections, upsertReflection } from './reflection.repository.js';
import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
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

async function resolveNickname(userNo, fallbackNickname = '') {
  const nickname = String(fallbackNickname || '').trim();
  if (nickname) return nickname;

  const database = getDatabase();
  const user = await database.collection('users').findOne(
    { userNo },
    { projection: { _id: 0, nickname: 1 } },
  );

  return String(user?.nickname || '').trim();
}


const TOPIC_ACTION_COLLECTION = 'verse_topic_actions';
const WRITE_REFLECTION_SCORE = 3;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

async function applyWriteReflectionScores(document) {
  if (!document.verseIDs.length) {
    return;
  }

  const database = getDatabase();
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - DUPLICATE_WINDOW_MS).toISOString();
  const perScore = WRITE_REFLECTION_SCORE / document.verseIDs.length;
  const actionType = 'write_reflection';
  const verseRows = await database.collection(env.mongoCollectionBibleEdit)
    .find(
      {
        bookNo: document.bookNo,
        chapterNo: document.chapterNo,
        verseNo: { $in: [...new Set(document.verseIDs.map((item) => item.verseNo))] },
      },
      {
        projection: { _id: 0, verseNo: 1, index: 1 },
      },
    )
    .toArray();

  const verseIdMap = new Map(verseRows.map((row) => [Number(row.verseNo), row.index || `${document.bookNo}:${document.chapterNo}:${row.verseNo}`]));

  for (const item of document.verseIDs) {
    const recentAction = await database.collection(TOPIC_ACTION_COLLECTION).findOne(
      {
        userNo: document.userNo,
        actionType,
        bookNo: document.bookNo,
        chapterNo: document.chapterNo,
        verseNo: item.verseNo,
        mainCategory: item.category,
        createdAt: { $gte: cutoffIso },
      },
      { projection: { _id: 1 } },
    );

    if (recentAction) {
      continue;
    }

    await database.collection(env.mongoCollectionVerseTopics).updateOne(
      {
        bookNo: document.bookNo,
        chapterNo: document.chapterNo,
        verseNo: item.verseNo,
        mainCategory: item.category,
      },
      {
        $setOnInsert: {
          verseId: verseIdMap.get(item.verseNo) || `${document.bookNo}:${document.chapterNo}:${item.verseNo}`,
          bookNo: document.bookNo,
          chapterNo: document.chapterNo,
          verseNo: item.verseNo,
          mainCategory: item.category,
          baseWeight: 0,
          score: 0,
          recentScore: 0,
          isAnchor: false,
          subCategories: [],
        },
        $inc: {
          score: perScore,
          recentScore: perScore,
        },
      },
      { upsert: true },
    );

    await database.collection(TOPIC_ACTION_COLLECTION).insertOne({
      userNo: document.userNo,
      actionType,
      bookNo: document.bookNo,
      chapterNo: document.chapterNo,
      verseNo: item.verseNo,
      mainCategory: item.category,
      createdAt: now.toISOString(),
    });
  }
}
export async function saveReflection(body = {}) {
  const now = new Date().toISOString();
  const rid = typeof body.rid === 'string' && body.rid.trim()
    ? body.rid.trim()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const userNo = parsePositiveInteger(body.userNo, 'userNo');
  const nickname = await resolveNickname(userNo, body.nickname);

  const document = {
    rid,
    userNo,
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

  const saved = await upsertReflection(document);
  await applyWriteReflectionScores(document);
  return saved;
}






