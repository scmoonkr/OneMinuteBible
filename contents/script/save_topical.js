'use strict';

/**
 * biblehub 컬렉션의 {bookNo}-{chapterNo} 장에서 people / place / events 의 link 를
 * 모아, 그 link 에 해당하는 biblehub_topical 문서를 찾아
 * {BIBLEHUB}/topical/{slug}.json 으로 각각 저장한다.
 *
 *   node contents/script/save_topical.js <bookNo> <chapterNo>
 *
 *   node contents/script/save_topical.js 1 2   -> 창세기 2장의 인물·장소·사건 주제
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
 *
 * 저장 위치는 루트 .env 의 BIBLEHUB 아래 topical/ 로 한다(미설정 시 contents/topical).
 * DB 접속은 루트 .env 의 MongoDB 설정을 server/src/config/env.js 와 같은 규칙으로 만든다.
 */

const fs = require('fs');
const path = require('path');

// mongodb 는 server 에만 설치돼 있으므로 그 경로에서 직접 불러온다.
const { MongoClient } = require(path.resolve(__dirname, '..', '..', 'server', 'node_modules', 'mongodb'));

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

// 파일명으로 쓸 slug 를 안전하게 만든다.
function safeSlug(value, fallback) {
  const source = String(value || fallback || '').trim();
  return source
    .replace(/[^\w가-힣.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    || 'topical';
}

async function main() {
  const [bookArg, chapterArg] = process.argv.slice(2);
  const bookNo = Number(bookArg);
  const chapterNo = Number(chapterArg);

  if (!Number.isInteger(bookNo) || !Number.isInteger(chapterNo)) {
    console.error('사용법: node contents/script/save_topical.js <bookNo> <chapterNo>');
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(buildMongoUri());
  await client.connect();

  try {
    const db = client.db(DB_NAME);

    const chapter = await db.collection('biblehub').findOne({ bookNo, chapterNo });
    if (!chapter) {
      console.error(`biblehub 컬렉션에 ${bookNo}-${chapterNo} 문서가 없습니다. (DB: ${DB_NAME})`);
      process.exitCode = 1;
      return;
    }

    // people / place / events 의 link 를 모두 모은다.
    const entries = [];
    for (const field of ['people', 'place', 'events']) {
      for (const item of chapter[field] || []) {
        if (item && item.link) entries.push({ ...item, source: field });
      }
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`${bookNo}-${chapterNo} (${chapter.book || ''}) — people/place/events 링크 ${entries.length}개`);

    const topicalCol = db.collection('biblehub_topical');
    const seen = new Set();
    const missing = [];
    let saved = 0;

    for (const entry of entries) {
      const topicalLink = toTopicalLink(entry.link);
      if (!topicalLink) continue;

      // 같은 link 가 여러 건이면 대표 주제(root)를 우선한다.
      const docs = await topicalCol
        .find({ link: topicalLink }, { projection: { _id: 0 } })
        .limit(5)
        .toArray();
      const topical = docs.find((d) => d.root) || docs[0];

      if (!topical) {
        missing.push(entry.link);
        continue;
      }

      const fallbackSlug = topicalLink.split('/').pop().replace(/\.htm$/i, '');
      const slug = safeSlug(topical.slug || entry.key, fallbackSlug);

      // 한 장 안에서 같은 주제가 여러 번 나오면 한 번만 저장한다.
      if (seen.has(slug)) continue;
      seen.add(slug);

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
      fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      saved += 1;
      console.log(`  ${slug}.json  (${entry.source}, tid ${topical.tid}, 섹션 ${contents.length})`);
    }

    console.log(`\n완료 — ${saved}개 저장 → ${OUT_DIR}`);
    if (missing.length) {
      console.error(`topical 없음 (${missing.length}): ${missing.join(', ')}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
