import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { bibleTable } = require('../../../docs/content/bible_table.js');

const bibleBooks = Array.isArray(bibleTable) ? bibleTable : [];

export function findBibleBookMeta(bookName = '') {
  const normalized = String(bookName || '').trim();
  if (!normalized) return null;
  return bibleBooks.find((item) => String(item?.church || '').trim() === normalized) || null;
}

export function findBibleBookMetaByNo(bookNo) {
  const normalized = Number(bookNo);
  if (!Number.isInteger(normalized)) return null;
  return bibleBooks.find((item) => Number(item?.bookNo) === normalized) || null;
}

export function formatChurchKorVerseId({ bookNo, book, chapterNo, verseNo }) {
  const meta = findBibleBookMeta(book) || findBibleBookMetaByNo(bookNo);
  const churchKor = String(meta?.churchKor || '').trim();

  if (churchKor) {
    return `${churchKor}${chapterNo}:${verseNo}`;
  }

  return `${bookNo}:${chapterNo}:${verseNo}`;
}
