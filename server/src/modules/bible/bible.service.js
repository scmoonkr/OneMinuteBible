import { findBibleChaptersByBookNo, findBibleRows, findRecentVerseTopicAction, findVerseTopicsByCategory, incrementVerseTopicScore, saveVerseTopicAction } from './bible.repository.js';
import { calcWeight, sortByWeight, weightedPick } from './verse-topics.util.js';
import { normalizeVerseId } from '../../utils/bible-book-meta.js';
import { createAppError, parsePositiveInteger, requireTrimmedString } from '../../utils/validation.js';

const TOPIC_INITIAL_COUNT = 3;
const TOPIC_MORE_COUNT = 5;
const TOPIC_CANDIDATE_LIMIT = 120;
const TOPIC_ACTION_SCORES = {
  read: 1,
  view_reflection: 2,
  write_reflection: 3,
};
const TOPIC_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

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

function normalizeTopicMode(value) {
  const mode = String(value || 'initial').trim().toLowerCase();
  if (mode === 'more' || mode === 'all') {
    return mode;
  }
  return 'initial';
}

function normalizeShownIds(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
  }

  const source = String(value || '').trim();
  if (!source) {
    return [];
  }

  return Array.from(new Set(source.split(',').map((item) => item.trim()).filter(Boolean)));
}

async function attachTopicVerseContent(rows = [], category) {
  if (!rows.length) {
    return [];
  }

  const queryRows = await Promise.all(
    rows.map((row) => findBibleRows({
      bookNo: Number(row.bookNo),
      chapterNo: Number(row.chapterNo),
      verseNo: Number(row.verseNo),
    })),
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
      verseId: normalizeVerseId({
        verseId: row.verseId,
        bookNo: row.bookNo,
        book: matched.book,
        chapterNo: row.chapterNo,
        verseNo: row.verseNo,
      }),
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
      finalWeight: calcWeight(row, 'all'),
      readTarget: {
        bookNo: Number(row.bookNo),
        chapterNo: Number(row.chapterNo),
      },
    };
  });
}

async function getTopicCandidates(category, mode) {
  const limit = mode === 'all' ? undefined : TOPIC_CANDIDATE_LIMIT;
  const rows = await findVerseTopicsByCategory([category], {
    sort: { bookNo: 1, chapterNo: 1, verseNo: 1 },
    limit,
  });

  return attachTopicVerseContent(rows, category);
}

function buildInitialTopicVerses(candidates = []) {
  if (!candidates.length) {
    return [];
  }

  const rankedAnchors = sortByWeight(candidates.filter((item) => item.isAnchor), 'initial');
  const rankedCandidates = sortByWeight(candidates, 'initial');
  const first = rankedAnchors[0] || rankedCandidates[0];
  const pool = candidates.filter((item) => item.verseId !== first.verseId);
  const rest = weightedPick(pool, TOPIC_INITIAL_COUNT - 1, 'initial');

  return [first, ...rest];
}

function buildMoreTopicVerses(candidates = [], shownIds = []) {
  const shownIdSet = new Set(shownIds);
  const pool = candidates.filter((item) => !shownIdSet.has(item.verseId));
  return weightedPick(pool, TOPIC_MORE_COUNT, 'more');
}

function buildAllTopicVerses(candidates = []) {
  return sortByWeight(candidates, 'all');
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

  const mode = normalizeTopicMode(params.mode);
  const shownIds = normalizeShownIds(params.shownIds);
  const candidates = await getTopicCandidates(category, mode);

  if (mode === 'all') {
    return buildAllTopicVerses(candidates);
  }

  if (mode === 'more') {
    return buildMoreTopicVerses(candidates, shownIds);
  }

  return buildInitialTopicVerses(candidates);
}

export async function recordTopicVerseAction(body = {}) {
  const actionType = requireTrimmedString(body.actionType, 'actionType');
  const scoreDelta = TOPIC_ACTION_SCORES[actionType];

  if (!scoreDelta) {
    throw createAppError('actionType is invalid.', 400);
  }

  const userNo = parsePositiveInteger(body.userNo, 'userNo');
  const rawVerseId = requireTrimmedString(body.verseId, 'verseId');
  const bookNo = parsePositiveInteger(body.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(body.chapterNo, 'chapterNo');
  const verseNo = parsePositiveInteger(body.verseNo, 'verseNo');
  const verseId = normalizeVerseId({ verseId: rawVerseId, bookNo, chapterNo, verseNo });
  const mainCategory = requireTrimmedString(body.mainCategory, 'mainCategory');
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - TOPIC_DUPLICATE_WINDOW_MS).toISOString();

  const recentAction = await findRecentVerseTopicAction({
    userNo,
    verseId,
    mainCategory,
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
