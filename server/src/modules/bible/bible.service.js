import { findBibleChaptersByBookNo, findBibleRows } from './bible.repository.js';
import { parsePositiveInteger } from '../../utils/validation.js';

export function convertToBibleChapter(rows = []) {
  if (!rows.length) {
    return null;
  }

  const chapterMeta = rows.find((row) => row.verseNo === 0);
  const chapter = {
    book: chapterMeta?.book || rows[0].book || '',
    bookNo: rows[0].bookNo,
    chapterNo: rows[0].chapterNo,
    subject: chapterMeta?.subject || '',
    excerpt: chapterMeta?.excerpt || '',
    audio: chapterMeta?.audio || '',
    paragraphs: [],
  };

  let paragraphNo = 0;
  let currentParagraph = null;

  for (const row of rows) {
    if (row.verseNo === 0) {
      continue;
    }

    if (!currentParagraph || row.subject) {
      if (currentParagraph?.verses?.length) {
        chapter.paragraphs.push(currentParagraph);
      }

      paragraphNo += 1;
      currentParagraph = {
        paragraphNo,
        verseNo: row.verseNo,
        startVerse: row.verseNo,
        endVerse: row.verseNo,
        subject: row.subject || '',
        excerpt: row.excerpt || '',
        summary: row.summary || row.excerpt || '',
        verses: [],
      };
    }

    const normalizedVerses = (row.verses || []).map((verse) => ({
      category: verse.category || '',
      categoryOriginal: verse.category || '',
      verse: verse.verse || '',
      godSay: verse.godSay === true || verse.say === true,
      verseNo: row.verseNo,
    }));

    currentParagraph.verses.push(...normalizedVerses);
    currentParagraph.endVerse = row.verseNo;
  }

  if (currentParagraph?.verses?.length) {
    chapter.paragraphs.push(currentParagraph);
  }

  return chapter;
}

export async function getBibleChapter(params = {}) {
  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(params.chapterNo, 'chapterNo');
  const verseNo = parsePositiveInteger(params.verseNo, 'verseNo', { required: false });
  const content = String(params.content || '').trim();

  const rows = await findBibleRows({
    bookNo,
    chapterNo,
    verseNo,
    content,
  });

  return {
    rows,
    chapter: convertToBibleChapter(rows),
  };
}



export async function listBibleChapters(params = {}) {
  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo');
  const rows = await findBibleChaptersByBookNo(bookNo);

  return rows.map((row) => ({
    bookNo: row.bookNo,
    chapterNo: row.chapterNo,
    subject: row.subject || '',
  }));
}
