'use strict';

/**
 * biblehub 컬렉션의 {bookNo}-{chapterNo} 장에서 people / place / events 의 link 를
 * 모아, 그 link 에 해당하는 biblehub_topical 문서를 찾아
 * {BIBLEHUB}/topical/{slug}.json 으로 각각 저장한다.
 *
 *   node contents/script/save_topical.js --bookNo=n (--chapterNo=m | --from=n [--to=m])
 *
 *   node contents/script/save_topical.js --bookNo=1 --chapterNo=2      -> 창세기 2장
 *   node contents/script/save_topical.js --bookNo=1 --from=2 --to=5    -> 창세기 2~5장
 *   node contents/script/save_topical.js --bookNo=1 --from=2           -> 창세기 2장부터 끝까지
 *   node contents/script/save_topical.js 1 2                           -> 예전 방식(위치 인자)도 받는다
 *
 * bookNo 만으로는 돌지 않는다. chapterNo 나 from/to 중 하나는 반드시 있어야 한다.
 *
 * 저장 형식:
 *   {
 *     bookNo, chapterNo,
 *     link,      // biblehub_topical.link  (예: "t/the_lord_god.htm")
 *     title,     // biblehub_topical.title
 *     tid,       // biblehub_topical.tid
 *     slug,      // biblehub_topical.slug
 *     contents,  // biblehub_topical.contents["Topical Encyclopedia"]  ([{subject, content}])
 *   }
 *
 * - biblehub 장 문서의 link 는 "/topical/t/the_lord_god.htm" 형식이고
 *   biblehub_topical.link 는 "t/the_lord_god.htm" 형식이라 접두어 "/topical/" 를 벗겨 맞춘다.
 * - 같은 link 가 여러 건이면(중복) 대표 주제(root)를 우선한다.
 * - link 에서 뽑은 slug("/topical/c/creation_of_man.htm" -> "creation_of_man")가
 *   이미 contents.biblehubSlug 에 있으면(= 그 주제로 쓴 글이 있으면) 건너뛴다.
 *
 * 저장 위치는 루트 .env 의 BIBLEHUB 아래 topical/ 로 한다(미설정 시 contents/topical).
 * DB 접속은 루트 .env 의 MongoDB 설정을 server/src/config/env.js 와 같은 규칙으로 만든다.
 */

const fs = require('fs');
const path = require('path');

// mongodb 는 server 에만 설치돼 있으므로 그 경로에서 직접 불러온다.
const { MongoClient } = require(path.resolve(__dirname, '..', '..', 'server', 'node_modules', 'mongodb'));

// 권별 장 수(범위 검사용).
const { bibleTable } = require('../../docs/content/bible_table.js');

const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const DICTIONARY_KEY = 'Topical Encyclopedia';

// ── .env 파싱(의존성 없이) ───────────────────────────────────────────────────
function parseEnvFile(file) {
  const env = {};
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

// process.env 가 우선(셸에서 덮어쓸 수 있도록).
const ENV = { ...parseEnvFile(ENV_PATH), ...process.env };

const DB_NAME = ENV.MONGODB_DB || 'OneMinuteBible';

// server/src/config/env.js 와 같은 방식으로 URI 를 만든다.
function buildMongoUri() {
  if (ENV.MONGODB_URI) return ENV.MONGODB_URI;

  const host = ENV.MONGODB_ADDR || '127.0.0.1:27017';
  const user = encodeURIComponent(ENV.MONGO_USERNAME || '');
  const pass = encodeURIComponent(ENV.MONGO_PWD || '');
  const auth = user && pass ? `${user}:${pass}@` : '';

  const params = new URLSearchParams();
  if (ENV.MONGODB_AUTH_SOURCE) params.set('authSource', ENV.MONGODB_AUTH_SOURCE);
  if (ENV.MONGODB_DIRECT_CONNECTION) params.set('directConnection', ENV.MONGODB_DIRECT_CONNECTION);

  const qs = params.toString();
  return `mongodb://${auth}${host}/${DB_NAME}${qs ? `?${qs}` : ''}`;
}

// ── 저장 위치: {BIBLEHUB}/topical (미설정 시 contents/topical) ─────────────────
const biblehubRoot = (ENV.BIBLEHUB || '').trim();
const OUT_DIR = biblehubRoot
  ? path.join(biblehubRoot, 'topical')
  : path.resolve(__dirname, '..', 'topical');

// biblehub 장의 "/topical/t/the_lord_god.htm" -> biblehub_topical 의 "t/the_lord_god.htm"
function toTopicalLink(link) {
  return String(link || '').replace(/^\/topical\//, '').replace(/^\//, '');
}

// biblehub 장의 link 에서 slug 만 뽑는다.
//   "/topical/c/creation_of_man.htm" -> "creation_of_man"
function linkToSlug(link) {
  const file = toTopicalLink(link).split('/').pop() || '';
  return file.replace(/[.]htm$/i, '');
}

// 파일명으로 쓸 slug 를 안전하게 만든다.
function safeSlug(value, fallback) {
  const source = String(value || fallback || '').trim();
  return source
    .replace(/[^\w가-힣.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    || 'topical';
}

// ── 인자 ─────────────────────────────────────────────────────────────────────
// --bookNo=1 처럼 값이 붙은 것은 opts 로, 나머지는 위치 인자로 나눈다.
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

function usage() {
  console.error('사용법: node contents/script/save_topical.js --bookNo=n (--chapterNo=m | --from=n [--to=m])');
  console.error('  --bookNo=n     docs/content/bible_table.js 기준 (구약 1~46, 신약 50~76)');
  console.error('  --chapterNo=m  한 장만');
  console.error('  --from=n --to=m  n~m 장 (--to 를 빼면 마지막 장까지)');
  console.error('  bookNo 만으로는 돌지 않는다. chapterNo 나 from/to 중 하나는 있어야 한다.');
  console.error('');
  console.error('예) node contents/script/save_topical.js --bookNo=1 --chapterNo=2');
  console.error('    node contents/script/save_topical.js --bookNo=1 --from=2 --to=5');
}

// 정수 인자를 검사해 숫자로 바꾼다. 값이 없으면 undefined.
function parseInt1(value, name, max) {
  if (value === undefined || value === true) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || (max !== undefined && n > max)) {
    const range = max === undefined ? '1 이상' : `1 ~ ${max}`;
    throw new Error(`${name} 은 ${range} 의 정수여야 합니다 (받은 값: ${value}).`);
  }
  return n;
}

// 인자를 읽어 { bookNo, chapters } 로 만든다. 잘못되면 Error 를 던진다.
function resolveTarget(argv) {
  const { opts, positional } = parseArgv(argv);

  const bookNo = parseInt1(opts.bookNo ?? positional[0], '--bookNo');
  if (bookNo === undefined) throw new Error('--bookNo 가 필요합니다.');

  const book = bibleTable.find((b) => b.bookNo === bookNo);
  if (!book) throw new Error(`bookNo ${bookNo} 를 bible_table 에서 찾지 못했습니다.`);

  const maxChapter = book.chapter;
  const chapterNo = parseInt1(opts.chapterNo ?? positional[1], '--chapterNo', maxChapter);
  const from = parseInt1(opts.from, '--from', maxChapter);
  const to = parseInt1(opts.to, '--to', maxChapter);

  if (chapterNo !== undefined) {
    if (from !== undefined || to !== undefined) {
      throw new Error('--chapterNo 와 --from/--to 는 함께 쓸 수 없습니다.');
    }
    return { book, chapters: [chapterNo] };
  }

  // chapterNo 가 없으면 범위가 있어야 한다. bookNo 만으로는 돌지 않는다.
  if (from === undefined && to === undefined) {
    throw new Error('--chapterNo 나 --from/--to 중 하나는 있어야 합니다.');
  }

  const start = from ?? 1;
  const stop = to ?? maxChapter;
  if (start > stop) throw new Error(`--from(${start}) 이 --to(${stop}) 보다 큽니다.`);

  return { book, chapters: Array.from({ length: stop - start + 1 }, (_, i) => start + i) };
}

// ── 장 하나 처리 ─────────────────────────────────────────────────────────────
// seen/skipped/missing 은 실행 전체에서 공유한다. 여러 장에 같은 주제가 나와도
// 파일은 한 번만 쓰고, 요약도 한 번만 나오게 하기 위해서다.
async function saveChapterTopics(db, bookNo, chapterNo, ctx) {
  const chapter = await db.collection('biblehub').findOne({ bookNo, chapterNo });
  if (!chapter) {
    ctx.noChapter.push(`${bookNo}-${chapterNo}`);
    return 0;
  }

  // people / place / events 의 link 를 모두 모은다.
  const entries = [];
  for (const field of ['people', 'place', 'events']) {
    for (const item of chapter[field] || []) {
      if (item && item.link) entries.push({ ...item, source: field });
    }
  }

  console.log(`${bookNo}-${chapterNo} (${chapter.book || ''}) — people/place/events 링크 ${entries.length}개`);

  const topicalCol = db.collection('biblehub_topical');
  let saved = 0;

  for (const entry of entries) {
    const topicalLink = toTopicalLink(entry.link);
    if (!topicalLink) continue;

    // link 에서 뽑은 slug 가 contents.biblehubSlug 에 있으면 건너뛴다.
    const linkSlug = linkToSlug(entry.link).toLowerCase();
    if (linkSlug && ctx.written.has(linkSlug)) {
      ctx.skipped.push(linkSlug);
      continue;
    }

    // 같은 link 가 여러 건이면 대표 주제(root)를 우선한다.
    const docs = await topicalCol
      .find({ link: topicalLink }, { projection: { _id: 0 } })
      .limit(5)
      .toArray();
    const topical = docs.find((d) => d.root) || docs[0];

    if (!topical) {
      ctx.missing.push(entry.link);
      continue;
    }

    const fallbackSlug = topicalLink.split('/').pop().replace(/\.htm$/i, '');
    const slug = safeSlug(topical.slug || entry.key, fallbackSlug);

    // 같은 주제가 여러 번 나오면 한 번만 저장한다.
    if (ctx.seen.has(slug)) continue;
    ctx.seen.add(slug);

    const contents = (topical.contents || {})[DICTIONARY_KEY] || [];
    const payload = {
      bookNo,
      chapterNo,
      link: topical.link,
      title: topical.title,
      tid: topical.tid,
      slug,
      contents,
    };

    const file = path.join(OUT_DIR, `${slug}.json`);
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}
`, 'utf8');
    saved += 1;
    console.log(`  ${slug}.json  (${entry.source}, tid ${topical.tid}, 섹션 ${contents.length})`);
  }

  return saved;
}

async function main() {
  let target;
  try {
    target = resolveTarget(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('');
    usage();
    process.exitCode = 1;
    return;
  }

  const { book, chapters } = target;

  const client = new MongoClient(buildMongoUri());
  await client.connect();

  try {
    const db = client.db(DB_NAME);

    // 이미 글이 있는 주제는 다시 내보내지 않는다.
    const ctx = {
      written: new Set(
        (await db.collection('contents').distinct('biblehubSlug', {
          biblehubSlug: { $type: 'string', $ne: '' },
        })).map((x) => String(x).trim().toLowerCase()),
      ),
      seen: new Set(),
      skipped: [],
      missing: [],
      noChapter: [],
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const range = chapters.length > 1
      ? ` (${chapters[0]}~${chapters[chapters.length - 1]}장)`
      : ` (${chapters[0]}장)`;
    console.log(`${book.english} (${book.church || book.catholic}) — ${chapters.length}개 장${range}`);
    console.log(`글이 있는 biblehubSlug ${ctx.written.size}개는 제외합니다.
`);

    let saved = 0;
    for (const chapterNo of chapters) {
      saved += await saveChapterTopics(db, book.bookNo, chapterNo, ctx);
    }

    console.log(`
완료 — ${saved}개 저장 → ${OUT_DIR}`);
    if (ctx.skipped.length) {
      const uniq = [...new Set(ctx.skipped)];
      console.log(`글이 있어 제외 (${uniq.length}): ${uniq.join(', ')}`);
    }
    if (ctx.noChapter.length) {
      console.error(`biblehub 에 없는 장 (${ctx.noChapter.length}): ${ctx.noChapter.join(', ')}`);
    }
    if (ctx.missing.length) {
      const uniq = [...new Set(ctx.missing)];
      console.error(`topical 없음 (${uniq.length}): ${uniq.join(', ')}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
