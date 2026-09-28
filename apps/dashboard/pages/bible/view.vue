<script setup lang="ts">
import { findPaletteItem } from '@webdata/categoryPalette';

// vue/bible 의 /bible/rainbow 화면.
// 본문은 /api/bible/read, 인물·장소·사건은 /api/bible/biblehub, 낭독은 /api/bible/audio 에서 가져온다.

type Verse = { verseNo: number; verse: string; category: string; godSay: boolean };
type Paragraph = { paragraphNo: number; title: string; subject: string; verses: Verse[] };
type Chapter = { book: string; chapterNo: number; title: string; subject: string; excerpt: string; audio: string; paragraphs: Paragraph[] };
type HubItem = { title: string; slug?: string };
type Hub = { people: HubItem[]; place: HubItem[]; events: HubItem[] };

const config = useRuntimeConfig();
const { book, bookNo, chapterNo } = useChapterQuery();

// API 는 Vite 프록시(/api → 서버)로만 닿으므로 클라이언트에서만 부른다.
const { data, status, error } = useFetch<{ data: Chapter }>('/api/bible/read', {
  query: { bookNo, chapterNo },
  server: false,
});
const { data: hubData } = useFetch<{ data: Hub }>('/api/bible/biblehub', {
  query: { bookNo, chapterNo },
  server: false,
});

const chapter = computed(() => data.value?.data ?? null);

type Piece = { text: string; category: string; showCategory: boolean; say: boolean };
type Line = { subject: string; verses: { verseNo: number; pieces: Piece[] }[] };

// 단락 → 절 → 조각으로 묶는다.
// category 가 비어 있으면 앞 조각의 것을 이어 쓰고, 바뀔 때만 [category] 꼬리표를 붙인다.
const lines = computed<Line[]>(() => {
  let prevCategory = '';

  return (chapter.value?.paragraphs ?? []).map((p) => {
    const verses: Line['verses'] = [];

    for (const v of p.verses) {
      const text = (v.verse || '').trim();
      if (!text) continue;

      const category = v.category || prevCategory;
      const piece = { text, category, showCategory: Boolean(category) && category !== prevCategory, say: v.godSay };
      prevCategory = category;

      const last = verses[verses.length - 1];
      if (last?.verseNo === v.verseNo) last.pieces.push(piece);
      else verses.push({ verseNo: v.verseNo, pieces: [piece] });
    }

    return { subject: (p.subject || p.title || '').trim(), verses };
  });
});

function tagColor(category: string) {
  return findPaletteItem(category)?.soft || '#cab6a6';
}

// 낭독 파일은 장마다 있지 않다. 불러오기에 실패하면 플레이어를 숨긴다.
const audioFailed = ref(false);
watch([bookNo, chapterNo], () => { audioFailed.value = false; });
const audioSrc = computed(() => (chapter.value?.audio ? `/api/bible/audio/${bookNo.value}/${chapterNo.value}` : ''));

const HUB_GROUPS = [
  { key: 'people', label: '성경 속 인물이야기' },
  { key: 'place', label: '성경 속 지명이야기' },
  { key: 'events', label: '성경 속 사건이야기' },
] as const;

const hubGroups = computed(() =>
  HUB_GROUPS
    .map((g) => ({ ...g, items: hubData.value?.data?.[g.key] ?? [] }))
    .filter((g) => g.items.length),
);

// 연결된 글은 웹 앱(7711)의 /post/:slug 에 있다.
function postUrl(slug: string) {
  return `${config.public.webBase}/post/${encodeURIComponent(slug)}`;
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>#{{ bookNo }} {{ book.church }}</h1>
        <p class="page-desc">
          제{{ chapterNo }}장<template v-if="chapter?.subject">. {{ chapter.subject }}</template>
        </p>
      </div>
      <NuxtLink :to="{ path: '/bible/edit', query: { bookNo, chapterNo } }">
        <button class="edit-button">수정</button>
      </NuxtLink>
    </div>

    <ChapterPicker />

    <div class="layout">
      <div class="panel main">
        <CategoryLegend />

        <div v-if="status === 'idle' || status === 'pending'" class="state">불러오는 중…</div>
        <div v-else-if="error" class="state error">본문을 불러오지 못했습니다. ({{ error.statusCode || error.message }})</div>
        <div v-else-if="!chapter" class="state">본문이 없습니다.</div>
        <div v-else class="reading">
          <h2 v-if="chapter.subject">{{ chapter.chapterNo }}. {{ chapter.subject }}</h2>
          <p v-if="chapter.excerpt" class="excerpt">{{ chapter.excerpt }}</p>

          <section v-for="(line, i) in lines" :key="i" class="paragraph">
            <h3 v-if="line.subject">{{ line.subject }}</h3>
            <p>
              <template v-for="v in line.verses" :key="v.verseNo">
                <sup class="verse-no">{{ v.verseNo }}</sup>
                <template v-for="(piece, j) in v.pieces" :key="j">
                  <sub v-if="piece.showCategory" class="tag" :style="{ backgroundColor: tagColor(piece.category) }">[{{ piece.category }}]</sub>
                  <span class="piece" :class="{ say: piece.say }">{{ piece.text }}</span>
                </template>
              </template>
            </p>
          </section>
        </div>
      </div>

      <aside class="side">
        <div v-if="audioSrc && !audioFailed" class="panel">
          <audio :key="audioSrc" :src="audioSrc" controls preload="metadata" class="audio" @error="audioFailed = true" />
        </div>

        <div v-for="g in hubGroups" :key="g.key" class="panel hub">
          <h3>{{ g.label }} <small>{{ g.items.length }}</small></h3>
          <ul>
            <li v-for="(item, i) in g.items" :key="i">
              <a v-if="item.slug" :href="postUrl(item.slug)" target="_blank" rel="noopener">{{ item.title }}</a>
              <span v-else>{{ item.title }}</span>
            </li>
          </ul>
        </div>
        <div v-if="!hubGroups.length" class="panel empty">관련 콘텐츠가 없습니다.</div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.edit-button {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.reading {
  margin-top: 24px;
  font-size: 16px;
  line-height: 1.9;
}

.reading h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.excerpt {
  margin: 0 0 20px;
  padding: 12px 14px;
  background: #ececec;
  border-radius: 4px;
  font-size: 15px;
}

.paragraph {
  margin-top: 14px;
}

.paragraph h3 {
  margin: 0;
  font-size: 16px;
}

.paragraph p {
  margin: 0;
}

.verse-no {
  margin-left: 2px;
  font-size: 0.6em;
  color: var(--muted);
}

.tag {
  margin-left: 2px;
  padding: 0 3px;
  border-radius: 3px;
  font-size: 0.6em;
  font-weight: 700;
}

.piece {
  padding: 0 4px;
}

.piece.say {
  color: #e03131;
  font-weight: 700;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side .panel {
  padding: 16px;
}

.audio {
  width: 100%;
}

.hub h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.hub h3 small {
  color: var(--muted);
  font-weight: 400;
}

.hub ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
}

.hub a {
  color: var(--accent);
}

.empty {
  color: var(--muted);
}
</style>
