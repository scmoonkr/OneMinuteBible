import {
  findBibleEditRows, updateBibleEditRows,
  findBiblehubDocument, findExistingVerseNos, replaceBibleParagraphs, setChapterAudio,
  findExistingVerseKeys, updateVerseExcerpts,
  findBiblehubChapter,
  findPostsByBiblehubSlugs, findBibleChaptersByBookNo, findBibleRows, findRecentVerseTopicAction, findVerseTopicsByCategory, incrementVerseTopicScore, saveVerseTopicAction } from './bible.repository.js';
import { calcWeight, sortByWeight, weightedPick } from './verse-topics.util.js';
import { findBibleBookMetaByNo, formatChurchKorVerseId, normalizeVerseId } from '../../utils/bible-book-meta.js';
import { env } from '../../config/env.js';
import fs from 'node:fs';
import path from 'node:path';
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
    title: chapterMeta?.title || chapterMeta?.subject || '',
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
        title: row.title || '',
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

function parseChapterKey(params) {
  return {
    bookNo: parsePositiveInteger(params.bookNo, 'bookNo'),
    chapterNo: parsePositiveInteger(params.chapterNo, 'chapterNo'),
  };
}

// 편집 화면용 한 장: 장 정보(verseNo 0)와 절 행 목록.
export async function getBibleEdit(params = {}) {
  const { bookNo, chapterNo } = parseChapterKey(params);
  const rows = await findBibleEditRows(bookNo, chapterNo);
  const info = rows.find((row) => row.verseNo === 0);

  return {
    bookNo,
    chapterNo,
    subject: info?.subject || '',
    excerpt: info?.excerpt || '',
    rows: rows
      .filter((row) => row.verseNo > 0)
      .map((row) => ({
        verseNo: row.verseNo,
        subject: row.subject || '',
        excerpt: row.excerpt || '',
        verses: (row.verses || []).map((v) => ({
          category: v.category || '',
          verse: v.verse || '',
          say: v.say === true,
        })),
      })),
  };
}

function optionalText(value, fieldName) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw createAppError(`${fieldName} must be a string.`, 400);
  return value.trim();
}

function parseEditRows(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw createAppError('rows must be an array.', 400);

  return value.map((row) => {
    const verseNo = parsePositiveInteger(row?.verseNo, 'rows.verseNo');
    let verses;

    if (row.verses !== undefined) {
      if (!Array.isArray(row.verses)) throw createAppError('rows.verses must be an array.', 400);
      verses = row.verses
        .map((v) => ({
          category: String(v?.category ?? '').trim(),
          verse: String(v?.verse ?? '').trim(),
          say: v?.say === true,
        }))
        // 엔터로 쪼개다 남은 빈 조각은 저장하지 않는다. (읽기 화면에서도 버려지는 값)
        .filter((v) => v.verse);
      if (!verses.length) throw createAppError(`${verseNo}절 본문이 비어 있습니다.`, 400);
    }

    return {
      verseNo,
      subject: optionalText(row.subject, 'rows.subject'),
      excerpt: optionalText(row.excerpt, 'rows.excerpt'),
      verses,
    };
  });
}

export async function saveBibleEdit(params = {}, body = {}) {
  const { bookNo, chapterNo } = parseChapterKey(params);
  const subject = optionalText(body.subject, 'subject');
  const excerpt = optionalText(body.excerpt, 'excerpt');
  const rows = parseEditRows(body.rows);
  const info = subject !== undefined || excerpt !== undefined ? { subject, excerpt } : undefined;

  if (!info && !rows?.length) {
    throw createAppError('No editable fields were provided.', 400);
  }

  const result = await updateBibleEditRows(
    bookNo,
    chapterNo,
    { info, rows },
    formatChurchKorVerseId({ bookNo, chapterNo, verseNo: 0 }),
  );

  return { ...result, chapter: await getBibleEdit({ bookNo, chapterNo }) };
}

// ── editHub: biblehub 영문 요약을 번역해 단락 주제·요약으로 넣는 화면 ──────────

// biblehub 원문 한 장 (chaptersummaries 화면과 editHub 가 함께 쓴다).
export async function getBiblehubSource(params = {}) {
  const { bookNo, chapterNo } = parseChapterKey(params);
  const doc = await findBiblehubDocument(bookNo, chapterNo);

  if (!doc) {
    throw createAppError('Biblehub chapter not found.', 404);
  }

  const english = findBibleBookMetaByNo(bookNo)?.english || '';

  return {
    ...doc,
    bookEnglish: english,
    biblehubUrl: english
      ? `https://biblehub.com/chaptersummaries/${english.toLowerCase().replace(/ /g, '_')}/${chapterNo}.htm`
      : '',
  };
}

// 번역된 단락 목록으로 이 장의 단락 나누기를 바꾼다.
// body: { subject, excerpt, paragraphs: [{ verseNo, subject, excerpt }] }
export async function saveBibleParagraphs(params = {}, body = {}) {
  const { bookNo, chapterNo } = parseChapterKey(params);

  if (!Array.isArray(body.paragraphs) || !body.paragraphs.length) {
    throw createAppError('paragraphs must be a non-empty array.', 400);
  }

  const paragraphs = body.paragraphs.map((p) => ({
    verseNo: parsePositiveInteger(p?.verseNo, 'paragraphs.verseNo'),
    subject: requireTrimmedString(p?.subject, 'paragraphs.subject'),
    excerpt: String(p?.excerpt ?? '').trim(),
  }));

  const seen = new Set();
  for (const p of paragraphs) {
    if (seen.has(p.verseNo)) throw createAppError(`${p.verseNo}절이 두 번 들어 있습니다.`, 400);
    seen.add(p.verseNo);
  }

  // 없는 절에 단락을 만들지 않도록 먼저 확인한다.
  const existing = await findExistingVerseNos(bookNo, chapterNo);
  const missing = paragraphs.filter((p) => !existing.has(p.verseNo)).map((p) => p.verseNo);
  if (missing.length) {
    throw createAppError(`본문에 없는 절입니다: ${missing.join(', ')}`, 400);
  }

  await replaceBibleParagraphs(
    bookNo,
    chapterNo,
    {
      info: { subject: String(body.subject ?? '').trim(), excerpt: String(body.excerpt ?? '').trim() },
      paragraphs,
    },
    formatChurchKorVerseId({ bookNo, chapterNo, verseNo: 0 }),
  );

  return getBibleEdit({ bookNo, chapterNo });
}

const MAX_EXCERPT_ITEMS = 5000;

// 번역 JSON 을 위치별로 저장한다. (editHub 의 CSV 모달 저장)
// body: { items: [{ bookNo, chapterNo, verseNo, subject, summary | excerpt }] }
// 여러 책·장이 섞여도 되고, 각 위치의 subject 와 excerpt(= summary)만 바꾼다.
// 없는 절이 하나라도 있으면 아무것도 저장하지 않고 그 목록을 알려 준다.
export async function saveVerseExcerpts(body = {}) {
  const raw = Array.isArray(body.items) ? body.items : null;
  if (!raw || !raw.length) {
    throw createAppError('items must be a non-empty array.', 400);
  }
  if (raw.length > MAX_EXCERPT_ITEMS) {
    throw createAppError(`한 번에 ${MAX_EXCERPT_ITEMS}줄까지 저장할 수 있습니다.`, 400);
  }

  const seen = new Set();
  const items = raw.map((item, i) => {
    const at = `${i + 1}번째 줄`;
    const bookNo = parsePositiveInteger(item?.bookNo, `${at} bookNo`);
    const chapterNo = parsePositiveInteger(item?.chapterNo, `${at} chapterNo`);
    const verseNo = Number(item?.verseNo);
    if (!Number.isInteger(verseNo) || verseNo < 0) {
      throw createAppError(`${at}: verseNo 는 0 이상의 정수여야 합니다.`, 400);
    }

    const key = `${bookNo}:${chapterNo}:${verseNo}`;
    if (seen.has(key)) throw createAppError(`${at}: ${key} 위치가 두 번 들어 있습니다.`, 400);
    seen.add(key);

    // 요약 안의 줄바꿈은 기존 데이터처럼 '|' 로 저장한다.
    const text = (value) => (value === undefined || value === null ? undefined : String(value).replace(/\r?\n/g, '|').trim());
    const subject = text(item.subject);
    const excerpt = text(item.summary ?? item.excerpt);
    if (!subject && !excerpt) {
      throw createAppError(`${at}: subject 와 summary 가 모두 비어 있습니다.`, 400);
    }

    return { bookNo, chapterNo, verseNo, subject: subject || undefined, excerpt: excerpt || undefined };
  });

  // 절 행은 새로 만들지 않는다. 없는 절이 있으면 전부 거절한다.
  const verses = items.filter((item) => item.verseNo > 0);
  const existing = await findExistingVerseKeys(verses);
  const missing = verses
    .map((item) => `${item.bookNo}:${item.chapterNo}:${item.verseNo}`)
    .filter((key) => !existing.has(key));
  if (missing.length) {
    const shown = missing.slice(0, 10).join(', ');
    throw createAppError(`본문에 없는 절이 ${missing.length}개 있습니다: ${shown}${missing.length > 10 ? ' …' : ''}`, 400);
  }

  const result = await updateVerseExcerpts(items, (item) =>
    formatChurchKorVerseId({ bookNo: item.bookNo, chapterNo: item.chapterNo, verseNo: 0 }));

  const chapters = [...new Set(items.map((item) => `${item.bookNo}:${item.chapterNo}`))];
  return { count: items.length, chapters: chapters.length, ...result };
}

// 장 정보에 낭독 경로를 기록한다. 파일이 있을 때만.
export async function enableChapterAudio(params = {}) {
  const { bookNo, chapterNo } = parseChapterKey(params);

  if (!getChapterAudioPath({ bookNo, chapterNo })) {
    throw createAppError('이 장의 낭독 파일이 없습니다.', 404);
  }

  const audio = `/bible/audio/${bookNo}/${chapterNo}`;
  await setChapterAudio(bookNo, chapterNo, audio, formatChurchKorVerseId({ bookNo, chapterNo, verseNo: 0 }));
  return { bookNo, chapterNo, audio };
}

// 장별 낭독 mp3 경로. 파일이 없으면 null.
export function getChapterAudioPath(params = {}) {
  const bookNo = parsePositiveInteger(params.bookNo, 'bookNo');
  const chapterNo = parsePositiveInteger(params.chapterNo, 'chapterNo');
  const english = findBibleBookMetaByNo(bookNo)?.english;

  if (!english) return null;

  const file = path.resolve(env.bibleAudioDir, english, `${chapterNo}.mp3`);
  return fs.existsSync(file) ? file : null;
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

// 한글이 하나라도 들어 있으면 한글 제목으로 본다.
const HANGUL = /[가-힣]/;

// biblehub 항목의 연결 키. key 가 있으면 그대로 쓰고,
// 없으면 link("/topical/a/adam.htm")에서 파일명만 뽑아 쓴다.
function toBiblehubSlug(item) {
  if (item?.key) return String(item.key);
  if (!item?.link) return '';

  const file = String(item.link).split('/').pop() || '';
  return file.replace(/\.htm$/i, '');
}

// 읽기 화면 사이드바에 쓰는 장별 인물·장소·사건.
//
// biblehub 항목 자체를 보여 주는 게 아니라, 그 항목의 slug 와
// contents.biblehubSlug 가 맞는 "공개된 글"을 찾아 글 제목으로 보여 준다.
// 한 항목에 글이 여럿이면 모두 나열하고, 맞는 글이 없으면 목록에서 빠진다.
export async function getBiblehubChapter(params = {}) {
  const bookNo = Number(params.bookNo);
  const chapterNo = Number(params.chapterNo);
  const empty = { bookNo: null, chapterNo: null, people: [], place: [], events: [] };

  if (!Number.isInteger(bookNo) || !Number.isInteger(chapterNo)) return empty;

  const doc = await findBiblehubChapter(bookNo, chapterNo);
  if (!doc) return { ...empty, bookNo, chapterNo };

  const groups = {
    people: doc.people ?? [],
    place: doc.place ?? [],
    events: doc.events ?? [],
  };

  // 세 그룹의 slug 를 한 번에 모아 글을 한 번만 조회한다.
  const slugs = [...new Set(
    Object.values(groups).flat().map(toBiblehubSlug).filter(Boolean),
  )];
  const posts = await findPostsByBiblehubSlugs(slugs);

  const bySlug = new Map();
  for (const post of posts) {
    const key = post.biblehubSlug;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push({ title: post.title, slug: post.slug });
  }

  // 맞는 글이 있으면 글 제목(+ slug), 없으면 biblehub 항목 제목만 내려준다.
  // slug 가 없는 항목은 화면에서 링크가 아니라 텍스트로 표시된다.
  // 서로 다른 항목이 같은 글을 가리킬 수 있어 그룹 안에서 중복을 제거한다.
  const resolve = (items) => {
    const seen = new Set();
    const out = [];

    for (const item of items) {
      const posts = bySlug.get(toBiblehubSlug(item)) ?? [];

      if (posts.length) {
        for (const post of posts) {
          if (seen.has(`post:${post.slug}`)) continue;
          seen.add(`post:${post.slug}`);
          out.push(post);
        }
        continue;
      }

      const title = item?.title?.trim();
      if (!title || seen.has(`title:${title}`)) continue;
      seen.add(`title:${title}`);
      out.push({ title });
    }

    // 한글 제목을 앞으로 뺀다. 연결된 글은 대개 한글이라 먼저 눈에 들어온다.
    // 같은 부류 안에서는 원래 순서를 지킨다 — 사건(events)은 이야기 순서라
    // 가나다순으로 다시 정렬하면 흐름이 깨진다.
    return [
      ...out.filter((x) => HANGUL.test(x.title)),
      ...out.filter((x) => !HANGUL.test(x.title)),
    ];
  };

  return {
    bookNo,
    chapterNo,
    people: resolve(groups.people),
    place: resolve(groups.place),
    events: resolve(groups.events),
  };
}
