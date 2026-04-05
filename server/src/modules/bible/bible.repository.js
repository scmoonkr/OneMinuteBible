import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
import { escapeRegExp } from '../../utils/validation.js';

const MAX_LIMIT = 500;

function buildQuery(params = {}) {
  const query = {};

  if (params.bookNo !== undefined) query.bookNo = Number(params.bookNo);
  if (params.book !== undefined) query.book = String(params.book).trim();
  if (params.bookENG) {
    const book = String(params.bookENG).trim();
    query.bookENG = book.slice(0, 1).toUpperCase() + book.slice(1).toLowerCase();
  }
  if (params.chapterNo !== undefined) query.chapterNo = Number(params.chapterNo);
  if (params.verseNo !== undefined) query.verseNo = Number(params.verseNo);
  if (params.content) {
    const content = String(params.content).trim();
    if (content) {
      query.content = new RegExp(escapeRegExp(content), 'i');
    }
  }

  return query;
}

export async function findBibleRows(params = {}) {
  const database = getDatabase();
  const query = buildQuery(params);

  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(query, {
      projection: { _id: 0 },
      sort: { bookNo: 1, chapterNo: 1, verseNo: 1 },
      limit: MAX_LIMIT,
    })
    .toArray();

  return rows;
}


export async function findBibleChaptersByBookNo(bookNo) {
  const database = getDatabase();

  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(
      {
        bookNo: Number(bookNo),
        verseNo: 1,
      },
      {
        projection: { _id: 0, bookNo: 1, chapterNo: 1, subject: 1 },
        sort: { chapterNo: 1 },
      },
    )
    .toArray();

  return rows;
}

export async function findVerseTopicsByCategory(categoryNames = []) {
  const database = getDatabase();
  const names = Array.from(new Set(categoryNames.filter(Boolean).map((item) => String(item).trim())));

  if (!names.length) {
    return [];
  }

  const rows = await database
    .collection(env.mongoCollectionVerseTopics)
    .find(
      {
        mainCategory: { $in: names },
      },
      {
        projection: {
          _id: 0,
          verseId: 1,
          bookNo: 1,
          chapterNo: 1,
          verseNo: 1,
          mainCategory: 1,
          subCategories: 1,
          baseWeight: 1,
          score: 1,
          recentScore: 1,
          isAnchor: 1,
        },
        sort: { isAnchor: -1, baseWeight: -1, score: -1, recentScore: -1, bookNo: 1, chapterNo: 1, verseNo: 1 },
        limit: MAX_LIMIT,
      },
    )
    .toArray();

  return rows;
}
