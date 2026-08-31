'use strict';

/**
 * topical/LLM 에 있는 LLM 생성 글(json)을 contents 컬렉션에 글(post)로 넣고,
 * 넣은 파일은 topical/LLM/done 으로 옮긴다.
 *
 *   node contents/script/import_post.js                 -> LLM 폴더의 json 전부
 *   node contents/script/import_post.js --slug=eden     -> eden.json 만
 *   node contents/script/import_post.js --limit=5       -> 앞에서부터 5개만
 *
 *   --slug=<slug>   {slug}.json 만 넣는다. 쉼표로 나누거나 여러 번 써도 된다.
 *                   (--slug=eden,adam  /  --slug=eden --slug=adam)
 *   --limit=<n>     n 개까지만 넣는다(이름순).
 *   --draft         status 를 draft 로 넣는다(기본은 published)
 *   --force         같은 biblehubSlug 의 글이 이미 있어도 새로 만든다
 *   --dry           DB 에 쓰지 않고 무엇을 넣을지만 보여준다(파일도 옮기지 않는다)
 *
 * 입력 json 형식(topical/LLM/eden.json):
 *   {
 *     "slug":       "eden",              // biblehub 주제 slug -> contents.biblehubSlug
 *     "title":      "에덴 — ...",         // 글 제목 (글 slug 는 제목에서 자동 생성)
 *     "subtitle":   "동산의 지리와 ...",   // meta.subtitle
 *     "excerpt":    "...",               // summary
 *     "contents":   "...",               // markdown 본문
 *     "categories": ["성경이야기", ...],   // 이름으로 찾고 없으면 만든다
 *     "tags":       ["에덴", ...]          // 이름으로 찾고 없으면 만든다
 *   }
 *
 * 저장은 CMS 의 createContent() 를 그대로 쓴다. 백엔드에서 글을 쓴 것과 같은
 * 문서(html/blocks/plainText/searchText, slug 중복 회피)가 만들어진다.
 *
 * 위치는 save_topical.js 와 같게 루트 .env 의 BIBLEHUB 아래 topical/ 로 본다
 * (미설정 시 contents/topical).
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const SERVER_SRC = path.resolve(__dirname, '..', '..', 'server', 'src');

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

const ENV = { ...parseEnvFile(ENV_PATH), ...process.env };

// ── 입력/완료 폴더 ───────────────────────────────────────────────────────────
const biblehubRoot = (ENV.BIBLEHUB || '').trim();
const TOPICAL_DIR = biblehubRoot
  ? path.join(biblehubRoot, 'topical')
  : path.resolve(__dirname, '..', 'topical');
const IN_DIR = path.join(TOPICAL_DIR, 'LLM');
const DONE_DIR = path.join(IN_DIR, 'done');

// server 쪽 모듈은 ESM 이라 동적 import 로 불러온다.
// 윈도우 절대경로는 file:// URL 로 바꿔야 한다.
const esm = (rel) => import(pathToFileURL(path.join(SERVER_SRC, rel)).href);

// ── 인자 ─────────────────────────────────────────────────────────────────────
// --draft 처럼 값 없는 것은 flags 에, --limit=5 처럼 값 있는 것은 opts 에 담는다.
// 이름만 그냥 적어도(예: `import_post.js eden`) --slug 와 같게 본다.
function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  const slugs = [];

  const addSlugs = (value) => {
    for (const part of String(value).split(',')) {
      const name = part.trim().replace(/\.json$/i, '');
      if (name) slugs.push(name);
    }
  };

  for (const a of argv) {
    if (!a.startsWith('--')) { addSlugs(a); continue; }

    const [key, ...rest] = a.slice(2).split('=');
    if (!rest.length) { flags.add(key); continue; }

    const value = rest.join('=');
    if (key === 'slug') addSlugs(value);
    else opts[key] = value;
  }

  return { flags, opts, slugs: [...new Set(slugs)] };
}

// 넣을 파일 목록. --slug 를 주면 그것만, 없으면 폴더의 json 전부(이름순).
// --limit=n 은 둘 중 어느 쪽이든 앞에서 n 개로 자른다.
function listInputFiles(slugs, limit) {
  let files;

  if (slugs.length) {
    files = slugs.map((n) => path.join(IN_DIR, `${n}.json`));
  } else if (!fs.existsSync(IN_DIR)) {
    files = [];
  } else {
    files = fs.readdirSync(IN_DIR)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .sort()
      .map((f) => path.join(IN_DIR, f));
  }

  return Number.isFinite(limit) ? files.slice(0, limit) : files;
}

// users.roles 는 ["admin"] 형태와 [{ role: "admin" }] 형태가 섞여 있다.
function rolesOf(user) {
  return (user?.roles || [])
    .map((r) => (typeof r === 'string' ? r : r?.role))
    .filter(Boolean);
}

// 글쓴이. .env 의 POST_AUTHOR_ID 가 있으면 그것, 없으면 admin > super > manager 순으로 찾는다.
async function resolveAuthorId(db) {
  const fromEnv = (ENV.POST_AUTHOR_ID || '').trim();
  if (fromEnv) return fromEnv;

  const users = await db.collection('users')
    .find({ isDeleted: { $ne: true } }, { projection: { roles: 1 } })
    .toArray();

  for (const want of ['admin', 'super', 'manager']) {
    const hit = users.find((u) => rolesOf(u).includes(want));
    if (hit) return String(hit._id);
  }
  return null;
}

// 카테고리 이름 -> id. 이름이 겹치는 카테고리가 있어서 slug 로 먼저 맞추고,
// 그 다음 이름으로 맞추고, 그래도 없으면 새로 만든다.
async function resolveCategoryIds(names, authorId, categoriesApi, dryRun) {
  const { listCategories, createCategory, nameToSlug } = categoriesApi;
  const clean = [...new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean))];
  if (!clean.length) return { ids: [], created: [] };

  let all = await listCategories();
  const ids = [];
  const created = [];

  for (const name of clean) {
    const slug = nameToSlug(name);
    const hit = all.find((c) => c.slug === slug) || all.find((c) => c.name === name);
    if (hit) {
      ids.push(hit.id);
      continue;
    }

    created.push(name);
    if (dryRun) continue;

    const made = await createCategory({ name }, authorId);
    all = [...all, made];
    ids.push(made.id);
  }

  return { ids, created };
}

async function main() {
  const { flags, opts, slugs } = parseArgs(process.argv.slice(2));
  const dryRun = flags.has('dry');
  const status = flags.has('draft') ? 'draft' : 'published';
  const force = flags.has('force');

  let limit;
  if (opts.limit !== undefined) {
    limit = Number(opts.limit);
    if (!Number.isInteger(limit) || limit < 1) {
      console.error(`--limit 은 1 이상의 정수여야 합니다: ${opts.limit}`);
      process.exitCode = 1;
      return;
    }
  }

  const files = listInputFiles(slugs, limit);
  if (!files.length) {
    console.error(`넣을 json 이 없습니다: ${IN_DIR}`);
    process.exitCode = 1;
    return;
  }

  const [{ connectToDatabase, closeDatabase }, contentsApi, tagsApi, categoriesApi] = await Promise.all([
    esm('config/db.js'),
    esm('modules/cms/contents-service.mjs'),
    esm('modules/cms/tags-service.mjs'),
    esm('modules/cms/categories-service.mjs'),
  ]);

  const db = await connectToDatabase();

  try {
    const authorId = await resolveAuthorId(db);
    const scope = slugs.length ? ` · slug=${slugs.join(',')}` : '';
    const capped = limit ? ` · limit=${limit}` : '';
    console.log(`입력 ${IN_DIR}`);
    console.log(`대상 ${files.length}개${scope}${capped} · status=${status}${dryRun ? ' · dry-run' : ''} · authorId=${authorId || '(없음)'}\n`);

    const done = [];
    const skipped = [];
    const failed = [];

    for (const file of files) {
      const base = path.basename(file, '.json');

      let json;
      try {
        json = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        failed.push(`${base}: 읽기/파싱 실패 — ${error.message}`);
        continue;
      }

      const title = String(json.title || '').trim();
      const markdown = String(json.contents || '').trim();
      // 파일 안의 slug 는 글 slug 가 아니라 biblehub 주제 slug 다.
      // 글 slug 는 createContent 가 제목에서 만든다.
      const biblehubSlug = String(json.slug || base).trim();

      if (!title || !markdown) {
        failed.push(`${base}: title 또는 contents 가 비어 있습니다.`);
        continue;
      }

      // 같은 주제로 쓴 글이 이미 있으면 건너뛴다(--force 면 그대로 진행).
      if (!force && biblehubSlug) {
        const exists = await db.collection('contents').findOne(
          {
            biblehubSlug,
            contentType: 'post',
            isDeleted: { $ne: true },
            status: { $ne: 'deleted' },
          },
          { projection: { slug: 1 } },
        );
        if (exists) {
          skipped.push(`${base}: 이미 글이 있음 (/post/${exists.slug})`);
          continue;
        }
      }

      const { ids: categoryIds, created: newCats } = await resolveCategoryIds(
        json.categories, authorId, categoriesApi, dryRun,
      );
      const tagIds = dryRun ? [] : await tagsApi.findOrCreateTagsByNames(json.tags, authorId);

      if (dryRun) {
        console.log(`  [dry] ${base}`);
        console.log(`        title        ${title}`);
        console.log(`        slug         ${contentsApi.titleToSlug(title)}`);
        console.log(`        biblehubSlug ${biblehubSlug}`);
        console.log(`        categories   ${(json.categories || []).join(', ') || '—'}${newCats.length ? ` (신규: ${newCats.join(', ')})` : ''}`);
        console.log(`        tags         ${(json.tags || []).join(', ') || '—'}`);
        continue;
      }

      let post;
      try {
        post = await contentsApi.createContent({
          contentType: 'post',
          title,
          summary: String(json.excerpt || '').trim(),
          markdown,
          biblehubSlug,
          categoryIds,
          tagIds,
          status,
          visibility: 'public',
          accessLevel: 'public',
          // 백엔드에서 만든 글과 같은 기본 meta.
          // subtitle 은 문서에 따로 둘 자리가 없어 meta 에 넣는다.
          meta: {
            subtitle: String(json.subtitle || '').trim(),
            showEyebrow: true,
            bannerTextColor: 'white',
            featured: false,
          },
        }, authorId);
      } catch (error) {
        failed.push(`${base}: 저장 실패 — ${error.message}`);
        continue;
      }

      // 넣은 파일은 done 으로 옮긴다. 같은 이름이 있으면 덮어쓴다.
      fs.mkdirSync(DONE_DIR, { recursive: true });
      const target = path.join(DONE_DIR, path.basename(file));
      fs.rmSync(target, { force: true });
      fs.renameSync(file, target);

      done.push(base);
      console.log(`  ${base}.json -> /post/${post.slug}  (${biblehubSlug}, 카테고리 ${categoryIds.length}, 태그 ${tagIds.length})`);
      if (newCats.length) console.log(`      새 카테고리: ${newCats.join(', ')}`);
    }

    console.log(`\n완료 — ${done.length}개 저장${dryRun ? '' : ` → done: ${DONE_DIR}`}`);
    if (skipped.length) {
      console.log(`건너뜀 (${skipped.length}):`);
      for (const s of skipped) console.log(`  ${s}`);
    }
    if (failed.length) {
      console.error(`실패 (${failed.length}):`);
      for (const f of failed) console.error(`  ${f}`);
      process.exitCode = 1;
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
