'use strict';

/**
 * BibleHub 장(chapter) 페이지를 읽어 {BIBLEHUB}/biblehub/{bookNo}-{chapterNo}.json 으로 저장한다.
 * 저장 위치는 루트 .env 의 BIBLEHUB 값을 따른다(미설정 시 contents/biblehub 로 대체).
 *
 *   node contents/script/export_biblehub.js <bookNo> [chapterNo] [--from=N] [--to=M]
 *
 *   node contents/script/export_biblehub.js 50 1            -> 50-1.json (마태복음 1장)
 *   node contents/script/export_biblehub.js 50              -> 마태복음 28개 장 전부
 *   node contents/script/export_biblehub.js 1 --from=13     -> 창세기 13장부터 끝까지
 *   node contents/script/export_biblehub.js 1 --to=20       -> 창세기 1~20장
 *   node contents/script/export_biblehub.js 1 --from=13 --to=20  -> 창세기 13~20장
 *
 * bookNo 는 docs/content/bible_table.js 기준(구약 1~46, 신약 50~76).
 *
 * 요약 정보는 BibleHub 장 페이지에서 가져온다. 절 본문은 저장하지 않는다.
 *   title     : "{Book} {N} Summary" 아래 첫 굵은 제목
 *   excerpt   : 요약 끝의 Closing Reflection (없으면 단락 요약을 이어 붙임)
 *   paragraphs: "Verses 1-17 - The Royal Genealogy" 형태의 단락 범위 + 요약
 *   people    : People 섹션
 *   place     : Places 섹션
 *   events    : Events 섹션
 *
 * BSB 는 개신교 정경이라 제2경전 7권은 BibleHub 에 페이지가 없다.
 */

const fs = require('fs');
const path = require('path');
const { bibleTable } = require('../../docs/content/bible_table.js');

// 저장 위치는 루트 .env 의 BIBLEHUB 경로 아래 biblehub/ 로 한다.
// 예) BIBLEHUB=D:\OneDrive\0. 모줄성\Contents  ->  D:\...\Contents\biblehub
function readEnvBiblehub() {
  if (process.env.BIBLEHUB) return process.env.BIBLEHUB.trim();

  const envPath = path.resolve(__dirname, '..', '..', '.env');
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*BIBLEHUB\s*=\s*(.*)$/);
      if (!m) continue;
      let value = m[1].trim();
      if ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value) return value;
    }
  } catch {
    // .env 가 없거나 읽을 수 없으면 아래 기본값으로 넘어간다.
  }
  return '';
}

const biblehubRoot = readEnvBiblehub();
const OUT_DIR = biblehubRoot
  ? path.join(biblehubRoot, 'biblehub')
  : path.resolve(__dirname, '..', 'biblehub');
const USER_AGENT = 'Mozilla/5.0 (compatible; OneMinuteBible/1.0; +export_biblehub.js)';

// 요청 간 간격(ms). BibleHub 에 부담을 주지 않도록 순차 요청한다.
const REQUEST_DELAY_MS = 400;
const MAX_RETRIES = 3;

// BSB 에 페이지가 없는 제2경전.
const DEUTEROCANONICAL = new Set([17, 18, 20, 21, 27, 28, 32]);

// URL 슬러그는 "소문자 + 공백을 _ 로" 가 기본이고, 아가만 예외다.
// (73권 전수 확인: 이 규칙으로 66권 200 OK, 나머지 7권은 위 제2경전)
const SLUG_OVERRIDES = { 'Song of Solomon': 'songs' };

function toSlug(englishName) {
  return SLUG_OVERRIDES[englishName] || englishName.toLowerCase().replace(/\s+/g, '_');
}

// ── HTML 유틸 ────────────────────────────────────────────────────────────────

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…',
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : whole));
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

// id="x" 앵커 뒤의 섹션 본문만 잘라낸다.
// 첫 <div class="vheading2">제목</div> 은 섹션 제목이라 통째로 건너뛰고,
// 다음 vheading2 가 나오는 곳에서 끊는다.
function sectionAfterAnchor(html, anchorId) {
  const start = html.indexOf(`id="${anchorId}"`);
  if (start === -1) return '';

  const rest = html.slice(start);
  const headingStart = rest.indexOf('<div class="vheading2">');
  if (headingStart === -1) return '';

  // 제목을 닫는 </div> 다음부터가 본문이다. 여기를 넘기지 않으면
  // 첫 항목("1. <b>...")이 </div> 에 붙어 있어 파싱에서 누락된다.
  const headingEnd = rest.indexOf('</div>', headingStart);
  if (headingEnd === -1) return '';

  const bodyStart = headingEnd + '</div>'.length;
  const nextHeading = rest.indexOf('<div class="vheading2">', bodyStart);
  return nextHeading === -1 ? rest.slice(bodyStart) : rest.slice(bodyStart, nextHeading);
}

// ── 본문(절) 파싱 ────────────────────────────────────────────────────────────

function parseVerses(html) {
  const chapStart = html.indexOf('<div class="chap">');
  if (chapStart === -1) {
    throw new Error('본문 컨테이너(div.chap)를 찾지 못했습니다. BibleHub 구조가 바뀌었을 수 있습니다.');
  }

  const fnStart = html.indexOf('<div id="fnlink">', chapStart);
  const body = html.slice(chapStart, fnStart === -1 ? html.length : fnStart);

  const marker = /<span class="reftext">\s*<a[^>]*>\s*<b>(\d+)<\/b>\s*<\/a>\s*<\/span>/g;
  const hits = [];
  let m;
  while ((m = marker.exec(body)) !== null) {
    // index = 마커 시작(다음 절의 경계), textStart = 본문 시작
    hits.push({ verseNo: Number(m[1]), index: m.index, textStart: m.index + m[0].length });
  }

  return hits.map((hit, i) => {
    const chunk = body.slice(hit.textStart, i + 1 < hits.length ? hits[i + 1].index : body.length);
    // 각주 표식 <span class="fn"><a>a</a></span> 은 본문에서 뺀다.
    return {
      verseNo: hit.verseNo,
      verse: stripTags(chunk.replace(/<span class="fn">[\s\S]*?<\/span>/g, '')),
    };
  });
}

// ── 요약(title / excerpt / paragraphs) 파싱 ──────────────────────────────────

/**
 * "Verses 1-17 - The Royal Genealogy" / "Verse 5 - ..." 를 범위와 제목으로 나눈다.
 * BibleHub 는 en dash(–) 를 쓰므로 하이픈류를 모두 받아준다.
 */
function parseRangeHeading(text) {
  const m = text.match(/^Verses?\s+(\d+)\s*(?:[–—-]\s*(\d+))?\s*(?:[–—-]\s*)?(.*)$/i);
  if (!m) return { startVerse: null, endVerse: null, title: text };
  const startVerse = Number(m[1]);
  const endVerse = m[2] ? Number(m[2]) : startVerse;
  return { startVerse, endVerse, title: m[3].trim() };
}

function parseSummary(html) {
  const block = sectionAfterAnchor(html, 'summary');
  if (!block) return { title: '', excerpt: '', paragraphs: [] };

  // title: 요약 제목 바로 다음의 첫 굵은 글씨. (단락별 title 과는 별개인 장 제목)
  const titleMatch = block.match(/^\s*<b>([\s\S]*?)<\/b>/);
  const title = titleMatch ? stripTags(titleMatch[1]) : '';

  // paragraphs: <span class="hdglist"><b>Verses N-M - 제목</b></span> 뒤의 산문.
  const hdgRe = /<span class="hdglist">\s*<b>([\s\S]*?)<\/b>\s*<\/span>/g;
  const marks = [];
  let h;
  while ((h = hdgRe.exec(block)) !== null) {
    marks.push({ index: h.index, end: h.index + h[0].length, heading: stripTags(h[1]) });
  }

  const paragraphs = marks.map((mark, i) => {
    const raw = block.slice(mark.end, i + 1 < marks.length ? marks[i + 1].index : block.length);
    // 뒤따르는 다른 굵은 소제목(Themes, Closing Reflection 등) 앞에서 끊는다.
    const cut = raw.search(/<p>\s*<b>/);
    const summary = stripTags(cut === -1 ? raw : raw.slice(0, cut));
    const { startVerse, endVerse, title } = parseRangeHeading(mark.heading);

    // 절 본문은 저장하지 않는다. 단락은 범위(startVerse~endVerse)와 요약만 담는다.
    return {
      paragraphNo: i + 1,
      startVerse,
      endVerse,
      title,
      summary,
    };
  });

  // excerpt: 마무리 문단(Closing Reflection). 없으면 단락 요약을 이어 붙인다.
  let excerpt = '';
  const closing = block.match(/<p>\s*<b>\s*Closing Reflection\s*<\/b>([\s\S]*)$/i);
  if (closing) {
    const cut = closing[1].search(/<div class="chap">|<a name="connections"/);
    excerpt = stripTags(cut === -1 ? closing[1] : closing[1].slice(0, cut));
  }
  if (!excerpt) {
    excerpt = paragraphs.map((p) => p.summary).filter(Boolean).join(' ');
  }

  return { title, excerpt, paragraphs };
}

// ── People / Places / Events 파싱 ────────────────────────────────────────────

/**
 * 세 섹션 모두 같은 모양이다.
 *   1. <b><a href="/topical/...">Abraham</a></b><br>설명<br><br>
 *   2. <b>Isaac</b><br>설명...
 */
function parseEntryList(html, anchorId) {
  const block = sectionAfterAnchor(html, anchorId);
  if (!block) return [];

  const itemRe = /(?:^|<br\s*\/?>|<\/div>|<p>)\s*\d+\.\s*<b>([\s\S]*?)<\/b>\s*(?:<br\s*\/?>)?([\s\S]*?)(?=(?:<br\s*\/?>|<p>)\s*\d+\.\s*<b>|$)/g;
  const items = [];
  let m;
  while ((m = itemRe.exec(block)) !== null) {
    const name = stripTags(m[1]);
    if (!name) continue;
    items.push({ name, description: stripTags(m[2]) });
  }

  return items;
}

// ── 수집 ─────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChapterHtml(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.status === 404) {
        const error = new Error(`페이지가 없습니다 (404): ${url}`);
        error.notFound = true;
        throw error;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (error.notFound) throw error;
      lastError = error;
      if (attempt < MAX_RETRIES) await sleep(REQUEST_DELAY_MS * attempt * 2);
    }
  }

  throw new Error(`${MAX_RETRIES}회 시도 실패: ${url} (${lastError && lastError.message})`);
}

async function exportChapter(book, chapterNo) {
  const url = `https://biblehub.com/${toSlug(book.english)}/${chapterNo}.htm`;
  const html = await fetchChapterHtml(url);

  // 절 본문은 저장하지 않지만, 페이지가 제대로 내려왔는지 확인하는 용도로 파싱한다.
  // (BibleHub 구조가 바뀌면 여기서 먼저 걸린다)
  const verses = parseVerses(html);
  if (verses.length === 0) throw new Error(`절을 하나도 찾지 못했습니다: ${url}`);

  const { title, excerpt, paragraphs } = parseSummary(html);

  const payload = {
    book: book.english,
    bookNo: book.bookNo,
    chapterNo,
    title,
    excerpt,
    paragraphs,
    people: parseEntryList(html, 'people'),
    place: parseEntryList(html, 'places'),
    events: parseEntryList(html, 'events'),
  };

  const file = path.join(OUT_DIR, `${book.bookNo}-${chapterNo}.json`);
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    file,
    verseCount: verses.length,
    paragraphCount: paragraphs.length,
    peopleCount: payload.people.length,
    placeCount: payload.place.length,
    eventCount: payload.events.length,
    hasTitle: Boolean(title),
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function usage() {
  console.error('사용법: node contents/script/export_biblehub.js <bookNo> [chapterNo] [--from=N] [--to=M]');
  console.error('  bookNo    docs/content/bible_table.js 기준 (구약 1~46, 신약 50~76)');
  console.error('  chapterNo 생략하면 해당 권의 모든 장을 각각 저장');
  console.error('  --from=N  N 장부터 (생략하면 1)');
  console.error('  --to=M    M 장까지 (생략하면 마지막 장)');
  console.error('');
  console.error('예) node contents/script/export_biblehub.js 50 1              -> 50-1.json');
  console.error('    node contents/script/export_biblehub.js 50                -> 마태복음 28개 장');
  console.error('    node contents/script/export_biblehub.js 1 --from=13 --to=20  -> 창세기 13~20장');
}

// --from=13 처럼 값이 붙은 것은 opts 로, 나머지는 위치 인자로 나눈다.
function parseArgv(argv) {
  const opts = {};
  const positional = [];
  for (const a of argv) {
    const m = a.match(/^--([A-Za-z][A-Za-z0-9-]*)(?:=(.*))?$/);
    if (m) opts[m[1]] = m[2] === undefined ? true : m[2];
    else positional.push(a);
  }
  return { opts, positional };
}

// --from / --to 값을 검사해 숫자로 바꾼다. 없으면 undefined.
function parseBound(value, name, maxChapter) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > maxChapter) {
    throw new Error(`--${name} 은 1 ~ ${maxChapter} 사이의 정수여야 합니다 (받은 값: ${value}).`);
  }
  return n;
}

async function main() {
  const { opts, positional } = parseArgv(process.argv.slice(2));
  const [bookArg, chapterArg] = positional;

  if (!bookArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  const bookNo = Number(bookArg);
  const book = bibleTable.find((b) => b.bookNo === bookNo);

  if (!book) {
    console.error(`bookNo ${bookArg} 를 bible_table 에서 찾지 못했습니다.`);
    usage();
    process.exitCode = 1;
    return;
  }

  if (DEUTEROCANONICAL.has(bookNo)) {
    console.error(`${book.english}(${book.catholic}) 는 제2경전이라 BibleHub 의 Berean Standard Bible 에 없습니다.`);
    process.exitCode = 1;
    return;
  }

  let chapters;
  if (chapterArg === undefined) {
    // 범위를 주지 않으면 1 ~ 마지막 장.
    let from;
    let to;
    try {
      from = parseBound(opts.from, 'from', book.chapter) ?? 1;
      to = parseBound(opts.to, 'to', book.chapter) ?? book.chapter;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    if (from > to) {
      console.error(`--from(${from}) 이 --to(${to}) 보다 큽니다.`);
      process.exitCode = 1;
      return;
    }
    chapters = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  } else {
    if (opts.from !== undefined || opts.to !== undefined) {
      console.error('chapterNo 를 직접 준 경우에는 --from/--to 를 함께 쓸 수 없습니다.');
      process.exitCode = 1;
      return;
    }
    const chapterNo = Number(chapterArg);
    if (!Number.isInteger(chapterNo) || chapterNo < 1 || chapterNo > book.chapter) {
      console.error(`chapterNo 는 1 ~ ${book.chapter} 사이여야 합니다 (${book.english}).`);
      process.exitCode = 1;
      return;
    }
    chapters = [chapterNo];
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const range = chapters.length > 1 ? ` (${chapters[0]}~${chapters[chapters.length - 1]}장)` : '';
  console.log(`${book.english} (${book.church || book.catholic}) — ${chapters.length}개 장${range}`);

  const failures = [];

  for (let i = 0; i < chapters.length; i += 1) {
    const chapterNo = chapters[i];
    try {
      const r = await exportChapter(book, chapterNo);
      console.log(
        `  ${book.bookNo}-${chapterNo}  절 ${r.verseCount}  단락 ${r.paragraphCount}`
        + `  people ${r.peopleCount}  place ${r.placeCount}  events ${r.eventCount}`
        + `${r.hasTitle ? '' : '  (title 없음)'}`,
      );
    } catch (error) {
      console.error(`  ${book.bookNo}-${chapterNo}  실패: ${error.message}`);
      failures.push(chapterNo);
    }

    if (i < chapters.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  if (failures.length) {
    console.error(`\n실패한 장: ${failures.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`\n완료 — ${OUT_DIR}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
