<script setup lang="ts">
// BibleHub Topical (biblehub_topical 컬렉션, 약 10만 건) 검색·열람.
// 웹 앱의 /backend/topical 에서 옮겨 왔다. API 는 CMS 의 /api/admin/topical (로그인 필요).

type TopicalRow = {
  tid: number;
  title: string;
  link: string;
  char: string;
  contentsCount: number;
  subtopicCount: number;
  relatedCount: number;
  concordanceCount: number;
};
type TopicalEntry = { subject?: string; content?: string };
type LinkRef = { title: string; link: string; key: string };
type TopicalDoc = {
  tid: number;
  title: string;
  link: string;
  contents?: Record<string, TopicalEntry[]>;
  related?: LinkRef[];
  subtopic?: LinkRef[];
  concordance?: unknown[];
};

const PAGE_SIZE = 50;

const query = ref('');
const char = ref('');
const skip = ref(0);

// ── 첫 글자 목록 ──
const { data: charData } = useFetch<{ items: { char: string; count: number }[] }>('/api/admin/topical/chars', {
  server: false,
  default: () => ({ items: [] }),
});
const chars = computed(() => charData.value?.items ?? []);

// ── 목록 ──
const { data, status, error } = useFetch<{ items: TopicalRow[]; total: number }>('/api/admin/topical', {
  query: computed(() => ({
    ...(query.value ? { q: query.value } : {}),
    ...(char.value ? { char: char.value } : {}),
    limit: PAGE_SIZE,
    skip: skip.value,
  })),
  server: false,
  default: () => ({ items: [], total: 0 }),
});
const items = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

// 검색어나 첫 글자가 바뀌면 첫 페이지로
watch([query, char], () => { skip.value = 0; });

// ── 페이지네이션: 현재 페이지를 가운데 두고 최대 5개 번호 ──
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
const currentPage = computed(() => Math.floor(skip.value / PAGE_SIZE) + 1);
const pageWindow = computed(() => {
  const size = 5;
  let start = Math.max(1, currentPage.value - Math.floor(size / 2));
  const end = Math.min(totalPages.value, start + size - 1);
  start = Math.max(1, end - size + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return { pages, hasLeft: start > 1, hasRight: end < totalPages.value };
});
function goPage(n: number) {
  skip.value = (Math.min(Math.max(1, n), totalPages.value) - 1) * PAGE_SIZE;
}

// ── 상세 (드로어) ──
const drawerOpen = ref(false);
const drawerTid = ref<number | null>(null);
const detail = ref<TopicalDoc | null>(null);
const detailPending = ref(false);

const sourceUrl = computed(() => (detail.value?.link ? `https://biblehub.com/topical/${detail.value.link}` : ''));

async function load(url: string, fallbackTid: number | null, keepOnError = false) {
  detailPending.value = true;
  if (!keepOnError) detail.value = null;
  try {
    const res = await $fetch<{ item: TopicalDoc }>(url);
    detail.value = res.item;
    drawerTid.value = res.item?.tid ?? fallbackTid;
  } catch {
    // 수집되지 않은 주제일 수 있다. (링크 이동이면 기존 화면을 유지)
    if (!keepOnError) detail.value = null;
  } finally {
    detailPending.value = false;
  }
}

function openDetail(row: TopicalRow) {
  drawerTid.value = row.tid;
  drawerOpen.value = true;
  load(`/api/admin/topical/${row.tid}`, row.tid);
}

// subtopic / related 의 link 는 "/topical/g/god.htm" 형태. 드로어를 닫지 않고 그 주제로 바꾼다.
function openByLink(link: string) {
  const [c, name] = link.replace(/^\/topical\//, '').replace(/\.htm$/, '').split('/');
  if (!c || !name) return;
  load(`/api/admin/topical/${c}/${encodeURIComponent(name)}`, null, true);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') drawerOpen.value = false;
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// ── 복사: title 과 "Topical Encyclopedia" 섹션만 JSON 으로 ──
const copied = ref(false);
async function copyTopical() {
  if (!detail.value) return;
  const text = JSON.stringify({
    title: detail.value.title,
    'contents.Topical Encyclopedia': detail.value.contents?.['Topical Encyclopedia'] ?? [],
  });
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch {
    // 권한이 없으면 복사 표시를 하지 않는다.
  }
}
watch(detail, () => { copied.value = false; });

// content 는 마크다운 링크가 섞인 평문이다. HTML 특수문자를 먼저 escape 한 뒤
// [본문](/genesis/1.htm) 만 biblehub 링크로 바꾼다.
function renderContent(raw?: string) {
  if (!raw) return '';
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const url = /^https?:/i.test(href) ? href : `https://biblehub.com${href}`;
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  });
}

function concordanceText(c: unknown) {
  if (typeof c === 'string') return c;
  return (c as { title?: string })?.title || JSON.stringify(c);
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>BibleHub Topical</h1>
        <p class="page-desc">
          biblehub.com/topical 주제 사전<template v-if="total"> · {{ total.toLocaleString() }}건</template>
        </p>
      </div>
      <input v-model.trim="query" type="search" class="search" placeholder="title 검색 (예: God)" />
    </div>

    <!-- 첫 글자로 추리기. 수집된 글자만 버튼으로 만든다. -->
    <div class="chars">
      <button type="button" class="char" :class="{ active: !char }" @click="char = ''">All</button>
      <button
        v-for="c in chars"
        :key="c.char"
        type="button"
        class="char"
        :class="{ active: char === c.char }"
        :title="`${c.count.toLocaleString()}건`"
        @click="char = c.char"
      >{{ c.char.toUpperCase() }}</button>
    </div>

    <div class="panel">
      <div v-if="status === 'idle' || status === 'pending'" class="state">불러오는 중…</div>
      <div v-else-if="error" class="state error">{{ apiErrorMessage(error) }}</div>
      <div v-else-if="!items.length" class="state">결과가 없습니다.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>tid</th>
              <th>title</th>
              <th class="num">contents</th>
              <th class="num">subtopics</th>
              <th class="num">related</th>
              <th class="num">concordance</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in items"
              :key="row.tid"
              :class="{ current: drawerOpen && drawerTid === row.tid }"
              @click="openDetail(row)"
            >
              <td class="muted">{{ row.tid }}</td>
              <td><strong>{{ row.title }}</strong></td>
              <td class="num">{{ row.contentsCount }}</td>
              <td class="num">{{ row.subtopicCount }}</td>
              <td class="num">{{ row.relatedCount }}</td>
              <td class="num">{{ row.concordanceCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > PAGE_SIZE" class="pager">
        <button :disabled="currentPage === 1" aria-label="처음" @click="goPage(1)">«</button>
        <button :disabled="currentPage === 1" aria-label="이전" @click="goPage(currentPage - 1)">‹</button>
        <span v-if="pageWindow.hasLeft" class="ellipsis">…</span>
        <button v-for="p in pageWindow.pages" :key="p" :class="{ active: p === currentPage }" @click="goPage(p)">{{ p }}</button>
        <span v-if="pageWindow.hasRight" class="ellipsis">…</span>
        <button :disabled="currentPage === totalPages" aria-label="다음" @click="goPage(currentPage + 1)">›</button>
        <button :disabled="currentPage === totalPages" aria-label="마지막" @click="goPage(totalPages)">»</button>
      </div>
    </div>

    <!-- ── Drawer: biblehub.com/topical 과 같은 형식으로 상세 ── -->
    <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false">
      <div class="drawer" @click.stop>
        <div class="drawer-head">
          <strong>{{ detail?.title || '…' }}</strong>
          <button v-if="detail" class="copy" title="title + Topical Encyclopedia 를 JSON 으로 복사" @click="copyTopical">
            {{ copied ? '복사됨 ✓' : 'JSON 복사' }}
          </button>
          <button class="close" aria-label="닫기" @click="drawerOpen = false">×</button>
        </div>

        <div v-if="detailPending" class="state">불러오는 중…</div>
        <p v-else-if="!detail" class="state">주제를 불러오지 못했습니다.</p>

        <div v-else class="doc">
          <a :href="sourceUrl" target="_blank" rel="noopener" class="source">{{ sourceUrl }}</a>

          <div class="doc-body">
            <!-- 본문 (3/4): 사전별 섹션 -->
            <div class="doc-main">
              <section v-for="(entries, dict) in detail.contents || {}" :key="dict" class="dict">
                <h3>{{ dict }}</h3>
                <div v-for="(e, i) in entries" :key="i" class="entry">
                  <h4 v-if="e.subject">{{ e.subject }}</h4>
                  <p v-html="renderContent(e.content)"></p>
                </div>
              </section>
            </div>

            <!-- 사이드바 (1/4): concordance · subtopics · related -->
            <aside class="doc-aside">
              <section v-if="detail.concordance?.length" class="links">
                <h3>Concordance <small>{{ detail.concordance.length }}</small></h3>
                <ul>
                  <li v-for="(c, i) in detail.concordance" :key="i">{{ concordanceText(c) }}</li>
                </ul>
              </section>
              <section v-if="detail.subtopic?.length" class="links">
                <h3>Subtopics <small>{{ detail.subtopic.length }}</small></h3>
                <ul>
                  <li v-for="s in detail.subtopic" :key="s.link"><a href="#" @click.prevent="openByLink(s.link)">{{ s.title }}</a></li>
                </ul>
              </section>
              <section v-if="detail.related?.length" class="links">
                <h3>Related <small>{{ detail.related.length }}</small></h3>
                <ul>
                  <li v-for="r in detail.related" :key="r.link"><a href="#" @click.prevent="openByLink(r.link)">{{ r.title }}</a></li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.search {
  min-width: 240px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

.chars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 14px;
}

.char {
  min-width: 30px;
  padding: 4px 7px;
  color: var(--muted);
  font-size: 12px;
}

.char.active {
  border-color: var(--text);
  background: var(--text);
  color: #fff;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

th {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover,
tbody tr.current {
  background: var(--accent-soft);
}

.num {
  text-align: right;
  white-space: nowrap;
}

.muted {
  color: var(--muted);
}

.pager {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
}

.pager button {
  min-width: 34px;
}

.pager button.active {
  border-color: var(--text);
  background: var(--text);
  color: #fff;
  font-weight: 700;
}

.ellipsis {
  color: var(--muted);
}

/* ── Drawer ── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 20, 30, 0.35);
}

.drawer {
  width: min(100%, 1280px);
  height: 100%;
  overflow-y: auto;
  padding: 20px 28px 40px;
  background: var(--panel);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
}

.drawer-head {
  position: sticky;
  top: -20px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -20px -28px 14px;
  padding: 16px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  font-size: 18px;
}

.copy {
  margin-right: auto;
  padding: 3px 8px;
  font-size: 12px;
}

.close {
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 1;
}

.source {
  display: inline-block;
  margin-bottom: 18px;
  color: var(--muted);
  font-size: 12px;
  word-break: break-all;
}

.doc-body {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 28px;
  align-items: start;
}

.doc-main,
.doc-aside {
  min-width: 0;
}

.doc-aside {
  position: sticky;
  top: 60px;
  padding-left: 20px;
  border-left: 1px solid var(--line);
}

.dict {
  margin-bottom: 26px;
}

.dict h3 {
  margin: 0 0 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
}

.entry {
  margin-bottom: 14px;
}

.entry h4 {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 13px;
}

.entry p {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-line;
}

.entry :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}

.links {
  margin-bottom: 24px;
}

.links h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.links h3 small {
  color: var(--muted);
  font-weight: 400;
}

.links ul {
  display: grid;
  gap: 4px;
  max-height: 320px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.links li,
.links a {
  color: var(--muted);
  font-size: 13px;
}

.links a:hover {
  color: var(--accent);
  text-decoration: underline;
}

@media (max-width: 1080px) {
  .doc-body {
    grid-template-columns: 1fr;
  }

  .doc-aside {
    position: static;
    padding: 18px 0 0;
    border-top: 1px solid var(--line);
    border-left: 0;
  }
}
</style>
