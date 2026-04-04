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
