import { findBibleChaptersByBookNo, findBibleRows, findRecentVerseTopicAction, findVerseTopicsByCategory, incrementVerseTopicScore, saveVerseTopicAction } from './bible.repository.js';
import { createAppError, parsePositiveInteger, requireTrimmedString } from '../../utils/validation.js';

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

export async function listTopicVerses(params = {}) {
  const category = String(params.category || '').trim();

  if (!category) {
    throw new Error('category is required.');
  }

  const rows = await findVerseTopicsByCategory([category]);

  if (!rows.length) {
    return [];
  }

  const verseKeys = rows.map((row) => ({
    bookNo: Number(row.bookNo),
    chapterNo: Number(row.chapterNo),
    verseNo: Number(row.verseNo),
  }));

  const queryRows = await Promise.all(
    verseKeys.map(({ bookNo, chapterNo, verseNo }) =>
      findBibleRows({ bookNo, chapterNo, verseNo }),
    ),
  );

  const verseLookup = new Map();

  queryRows.flat().forEach((row) => {
    const key = `${row.bookNo}:${row.chapterNo}:${row.verseNo}`;
    const verseText = Array.isArray(row.verses) && row.verses.length
      ? row.verses.map((item) => item.verse || '').filter(Boolean).join(' ')
      : (row.verse || row.content || '');

    verseLookup.set(key, {
      book: row.book || '',
      text: verseText,
    });
  });

  return rows.map((row) => {
    const lookupKey = `${row.bookNo}:${row.chapterNo}:${row.verseNo}`;
    const matched = verseLookup.get(lookupKey) || { book: '', text: '' };

    return {
      verseId: row.verseId || `${row.bookNo}:${row.chapterNo}:${row.verseNo}`,
      bookNo: Number(row.bookNo),
      chapterNo: Number(row.chapterNo),
      verseNo: Number(row.verseNo),
      book: matched.book,
      text: matched.text,
      mainCategory: row.mainCategory || category,
      subCategories: Array.isArray(row.subCategories) ? row.subCategories : [],
      baseWeight: Number(row.baseWeight || 0),
      score: Number(row.score || 0),
      recentScore: Number(row.recentScore || 0),
      isAnchor: row.isAnchor === true,
      readTarget: {
        bookNo: Number(row.bookNo),
        chapterNo: Number(row.chapterNo),
      },
    };
  });
}

const TOPIC_ACTION_SCORES = {
  read: 1,
  view_reflection: 2,
  write_reflection: 3,
};
const TOPIC_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function getFinalWeight(item) {
  return Number(item.baseWeight || 0) + Number(item.score || 0) + Number(item.recentScore || 0);
}

export async function recordTopicVerseAction(body = {}) {
  const actionType = requireTrimmedString(body.actionType, 'actionType');
  const scoreDelta = TOPIC_ACTION_SCORES[actionType];

  if (!scoreDelta) {
    throw createAppError('actionType is invalid.', 400);
  }

  const userNo = parsePositiveInteger(body.userNo, 'userNo');
  const verseId = requireTrimmedString(body.verseId, 'verseId');
  const bookNo = parsePositiveInteger(body.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(body.chapterNo, 'chapterNo');
  const verseNo = parsePositiveInteger(body.verseNo, 'verseNo');
  const mainCategory = requireTrimmedString(body.mainCategory, 'mainCategory');
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - TOPIC_DUPLICATE_WINDOW_MS).toISOString();

  const recentAction = await findRecentVerseTopicAction({
    userNo,
    verseId,
    actionType,
    cutoffIso,
  });

  if (recentAction) {
    return { ok: true, skipped: true };
  }

  await incrementVerseTopicScore({
    verseId,
    bookNo,
    chapterNo,
    verseNo,
    mainCategory,
    scoreDelta,
  });

  await saveVerseTopicAction({
    userNo,
    verseId,
    actionType,
    bookNo,
    chapterNo,
    verseNo,
    mainCategory,
    createdAt: now.toISOString(),
  });

  return { ok: true, skipped: false };
}
