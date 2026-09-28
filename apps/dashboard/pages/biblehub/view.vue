<script setup lang="ts">
// biblehub.com/chaptersummaries/<book>/<chapter>.htm 과 같은 구성으로 biblehub DB 한 장을 보여 준다.
// 원문 데이터: /api/bible/hub/:bookNo/:chapterNo (biblehub 컬렉션)
// 오른쪽 위 "모줄성 연결 글"은 /api/bible/biblehub (인물·장소·사건과 이어진 글)

type LinkItem = { title: string; link?: string; key?: string; themes?: string };
type TextItem = { title?: string; themes?: string };
type Paragraph = { title: string; verseFrom: number; verseTo: number; themes: string };
type Hub = {
  bookNo: number;
  chapterNo: number;
  bookEnglish: string;
  title: string | null;
  excerpt: string;
  paragraphs: Paragraph[];
  summary: TextItem[];
  themes: LinkItem[];
  topics: LinkItem[];
  people: LinkItem[];
  place: LinkItem[];
  events: LinkItem[];
  scripture: LinkItem[];
  teaching: LinkItem[];
  practical: LinkItem[];
  lessons: TextItem[];
  prayer: TextItem[];
  question: string[];
  discussion: string[];
  footnotes?: string[];
  biblehubUrl: string;
};
type Linked = { title: string; slug?: string };

const config = useRuntimeConfig();
const { book, bookNo, chapterNo } = useChapterQuery();

const { data, status, error } = useFetch<{ data: Hub }>(
  () => `/api/bible/hub/${bookNo.value}/${chapterNo.value}`,
  { server: false },
);
const { data: linkedData } = useFetch<{ data: { people: Linked[]; place: Linked[]; events: Linked[] } }>(
  '/api/bible/biblehub',
  { query: { bookNo, chapterNo }, server: false },
);

const hub = computed(() => data.value?.data ?? null);
const ref_ = computed(() => `${hub.value?.bookEnglish || ''} ${chapterNo.value}`.trim());

// 링크 목록 섹션들 (biblehub 페이지 순서)
const linkSections = computed(() => {
  const h = hub.value;
  if (!h) return [];
  return [
    { id: 'themes', label: 'Themes', items: h.themes },
    { id: 'topics', label: 'Topics', items: h.topics },
    { id: 'people', label: 'People', items: h.people },
    { id: 'places', label: 'Places', items: h.place },
    { id: 'events', label: 'Events', items: h.events },
    { id: 'scripture', label: 'Connections to Additional Scriptures', items: h.scripture },
    { id: 'teaching', label: 'Teaching Points', items: h.teaching },
    { id: 'practical', label: 'Practical Application', items: h.practical },
  ].filter((s) => s.items?.length);
});

// 목차
const toc = computed(() => {
  const h = hub.value;
  if (!h) return [];
  return [
    h.paragraphs?.length && { id: 'summary', label: 'Summary' },
    h.summary?.length && { id: 'notes', label: 'Chapter Notes' },
    ...linkSections.value.map((s) => ({ id: s.id, label: s.label })),
    h.lessons?.length && { id: 'lessons', label: `Lessons from ${ref_.value}` },
    h.prayer?.length && { id: 'prayer', label: 'Prayer Points' },
    h.question?.length && { id: 'questions', label: 'Answering Tough Questions' },
    h.discussion?.length && { id: 'discussion', label: 'Bible Study Discussion Questions' },
    h.footnotes?.length && { id: 'footnotes', label: 'Footnotes' },
  ].filter(Boolean) as { id: string; label: string }[];
});

// 기도 제목: 제목 없이 앞 항목과 같은 문장이 반복되는 원본이 있어 겹치는 것은 뺀다.
const prayers = computed(() => {
  const seen = new Set<string>();
  return (hub.value?.prayer ?? []).filter((p) => {
    const key = `${p.title || ''}|${p.themes || ''}`;
    if (!p.themes && !p.title) return false;
    if (seen.has(p.themes || key)) return false;
    seen.add(p.themes || key);
    return true;
  });
});

// 원본 토론 질문 끝에 붙어 있는 사이트 문구는 뺀다.
const discussion = computed(() =>
  (hub.value?.discussion ?? []).filter((q) => !/^Bible Hub Chapter Summaries/i.test(q)),
);

const linkedGroups = computed(() => {
  const d = linkedData.value?.data;
  return [
    { key: 'people', label: '인물', items: d?.people ?? [] },
    { key: 'place', label: '장소', items: d?.place ?? [] },
    { key: 'events', label: '사건', items: d?.events ?? [] },
  ].filter((g) => g.items.some((i) => i.slug));
});

function postUrl(slug: string) {
  return `${config.public.webBase}/post/${encodeURIComponent(slug)}`;
}

function verseRange(p: Paragraph) {
  return p.verseTo && p.verseTo !== p.verseFrom ? `${p.verseFrom}–${p.verseTo}` : `${p.verseFrom}`;
}
</script>

<template>
  <div>
    <div class="head">
      <ChapterPicker />
      <NuxtLink :to="{ path: '/biblehub/edit', query: { bookNo, chapterNo } }">
        <button class="edit-button">번역 편집 (editHub)</button>
      </NuxtLink>
    </div>

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">
      <template v-if="isMissingRoute(error)">{{ apiErrorMessage(error) }}</template>
      <template v-else-if="error.statusCode === 404">이 장의 biblehub 원문이 없습니다.</template>
      <template v-else>불러오지 못했습니다. ({{ error.statusCode || error.message }})</template>
    </div>

    <article v-else-if="hub" class="panel doc">
      <header>
        <p class="eyebrow">{{ ref_ }} · {{ book.church }} {{ chapterNo }}장 · Chapter Summary</p>
        <h1>{{ hub.title || ref_ }}</h1>
        <a v-if="hub.biblehubUrl" :href="hub.biblehubUrl" target="_blank" rel="noopener" class="source">biblehub.com 원문 ↗</a>
      </header>

      <p v-if="hub.excerpt" class="lead"><HubText :text="hub.excerpt" /></p>

      <nav v-if="toc.length > 1" class="toc">
        <a v-for="t in toc" :key="t.id" :href="`#${t.id}`">{{ t.label }}</a>
      </nav>

      <aside v-if="linkedGroups.length" class="linked">
        <strong>모줄성 연결 글</strong>
        <div v-for="g in linkedGroups" :key="g.key">
          <span class="linked-label">{{ g.label }}</span>
          <template v-for="(item, i) in g.items" :key="i">
            <a v-if="item.slug" :href="postUrl(item.slug)" target="_blank" rel="noopener">{{ item.title }}</a>
          </template>
        </div>
      </aside>

      <section v-if="hub.paragraphs?.length" id="summary">
        <div v-for="(p, i) in hub.paragraphs" :key="i" class="paragraph">
          <h3>{{ p.title }} <small>({{ ref_ }}:{{ verseRange(p) }})</small></h3>
          <p><HubText :text="p.themes" /></p>
        </div>
      </section>

      <section v-if="hub.summary?.length" id="notes">
        <h2>Chapter Notes</h2>
        <div v-for="(s, i) in hub.summary" :key="i" class="note">
          <h3 v-if="s.title">{{ s.title }}</h3>
          <p><HubText :text="s.themes" /></p>
        </div>
      </section>

      <section v-for="s in linkSections" :id="s.id" :key="s.id">
        <h2>{{ s.label }}</h2>
        <ul class="link-list">
          <li v-for="(item, i) in s.items" :key="i">
            <a v-if="item.link" :href="biblehubUrl(item.link)" target="_blank" rel="noopener">{{ item.title }}</a>
            <span v-else>{{ item.title }}</span>
            <span v-if="item.themes" class="item-themes"> — <HubText :text="item.themes" /></span>
          </li>
        </ul>
      </section>

      <section v-if="hub.lessons?.length" id="lessons">
        <h2>Lessons from {{ ref_ }}</h2>
        <div v-for="(l, i) in hub.lessons" :key="i" class="note">
          <h3>{{ i + 1 }}. {{ l.title }}</h3>
          <p><HubText :text="l.themes" /></p>
        </div>
      </section>

      <section v-if="prayers.length" id="prayer">
        <h2>Prayer Points</h2>
        <ul>
          <li v-for="(p, i) in prayers" :key="i">
            <strong v-if="p.title">{{ p.title }}</strong><template v-if="p.title && p.themes"> — </template><HubText :text="p.themes" />
          </li>
        </ul>
      </section>

      <section v-if="hub.question?.length" id="questions">
        <h2>Answering Tough Questions</h2>
        <ol>
          <li v-for="(q, i) in hub.question" :key="i"><HubText :text="q" /></li>
        </ol>
      </section>

      <section v-if="discussion.length" id="discussion">
        <h2>Bible Study Discussion Questions</h2>
        <ol>
          <li v-for="(q, i) in discussion" :key="i"><HubText :text="q" /></li>
        </ol>
      </section>

      <section v-if="hub.footnotes?.length" id="footnotes" class="footnotes">
        <h2>Footnotes</h2>
        <p v-for="(f, i) in hub.footnotes" :key="i">{{ f }}</p>
      </section>
    </article>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.edit-button {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.doc {
  max-width: 900px;
  padding: 32px 40px;
  font-family: Georgia, 'Times New Roman', 'Noto Serif KR', serif;
  font-size: 16px;
  line-height: 1.75;
  color: #222;
}

@media (max-width: 720px) {
  .doc {
    padding: 20px;
  }
}

.eyebrow {
  margin: 0;
  color: var(--muted);
  font-family: system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 0.02em;
}

h1 {
  margin: 4px 0 2px;
  font-size: 30px;
  line-height: 1.25;
}

.source {
  color: var(--accent);
  font-family: system-ui, sans-serif;
  font-size: 12px;
}

.lead {
  margin: 18px 0;
  font-size: 17px;
  font-style: italic;
}

.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 18px 0 8px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  font-family: system-ui, sans-serif;
  font-size: 13px;
}

.toc a,
.link-list a,
.linked a {
  color: var(--accent);
}

.linked {
  margin: 14px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.9;
}

.linked div a {
  margin-right: 10px;
}

.linked-label {
  margin-right: 8px;
  color: var(--muted);
}

section {
  margin-top: 28px;
  scroll-margin-top: 16px;
}

h2 {
  margin: 0 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--line);
  font-size: 21px;
}

h3 {
  margin: 16px 0 4px;
  font-size: 17px;
}

h3 small {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
}

p {
  margin: 0 0 8px;
}

ul,
ol {
  margin: 0;
  padding-left: 22px;
}

li {
  margin: 4px 0;
}

.item-themes {
  color: #444;
}

.footnotes p {
  color: var(--muted);
  font-size: 13px;
}
</style>
