<script setup lang="ts">
// vue/bible 의 /bible/editHub 화면.
// 장을 열면 biblehub 영문 장 요약을 번역용 JSON 으로 클립보드에 복사한다 →
// LLM 번역 결과(JSON)를 jsonKor 에 붙여넣으면 줄마다 채워진다 →
// 저장하면 장 주제·요약과 단락 주제·요약으로 들어가고 다음 장으로 넘어간다.

type HubParagraph = { title: string; verseFrom: number; verseTo: number; themes: string };
type HubSource = {
  bookNo: number;
  chapterNo: number;
  title: string | null;
  excerpt: string;
  paragraphs: HubParagraph[];
  prayer: { title?: string; themes?: string }[];
  discussion: string[];
  biblehubUrl: string;
  [key: string]: unknown;
};

// 화면 한 줄: 0번은 장 전체, 나머지는 biblehub 단락.
type Line = { verseNo: number; english: string; englishThemes: string; subject: string; themes: string };

const router = useRouter();
const { book, bookNo, chapterNo, chapters } = useChapterQuery();

const lines = ref<Line[]>([]);
const excerptKor = ref('');
const jsonKor = ref('');
const parseError = ref('');
const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null);
const busy = ref(false);

const { data: sourceData, status, error } = useFetch<{ data: HubSource }>(
  () => `/api/bible/hub/${bookNo.value}/${chapterNo.value}`,
  { server: false },
);
const source = computed(() => sourceData.value?.data ?? null);

// 장이 바뀌면 줄을 새로 만들고 한글 칸은 비운다 (원래 화면과 같음).
watch(source, (src) => {
  if (!src || src.bookNo !== bookNo.value || src.chapterNo !== chapterNo.value) return;

  lines.value = [
    { verseNo: 0, english: src.title || '', englishThemes: src.excerpt, subject: '', themes: '' },
    ...src.paragraphs.map((p) => ({
      verseNo: Number(p.verseFrom),
      english: p.title,
      englishThemes: p.themes,
      subject: '',
      themes: '',
    })),
  ];
  excerptKor.value = '';
  jsonKor.value = '';
  parseError.value = '';

  // 원래 화면처럼 장을 열면 번역용 JSON 을 바로 클립보드에 넣는다.
  copy('번역용 원문', jsonForTranslation(), true);
}, { immediate: true });

const dirty = computed(() =>
  Boolean(excerptKor.value.trim()) || lines.value.some((l) => l.subject.trim() || l.themes.trim()),
);

onBeforeRouteUpdate(() => {
  if (dirty.value && !busy.value && !window.confirm('저장하지 않은 번역이 있습니다. 이동할까요?')) return false;
});
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('저장하지 않은 번역이 있습니다. 나갈까요?')) return false;
});

// ── 영문 원문 ──────────────────────────────────────────────────

// 왼쪽 위 칸: biblehub 단락 원본 (0번에 장 제목·요약)
const jsonEng = computed(() => {
  const src = source.value;
  if (!src) return '';
  return JSON.stringify([{ verseFrom: 0, title: src.title, excerpt: src.excerpt }, ...src.paragraphs]);
});

// 번역 요청용: [{ bookNo, chapterNo, verseNo, subject, excerpt }]
function jsonForTranslation() {
  const src = source.value;
  if (!src) return '';
  return JSON.stringify(lines.value.map((l) => ({
    bookNo: src.bookNo,
    chapterNo: src.chapterNo,
    verseNo: l.verseNo,
    subject: l.english,
    excerpt: l.englishThemes,
  })));
}

async function copy(label: string, text: string, quiet = false) {
  try {
    await navigator.clipboard.writeText(text);
    message.value = { type: 'ok', text: `${label} 복사됨` };
  } catch {
    // 자동 복사는 브라우저가 막을 수 있다. 그때는 조용히 넘어간다.
    if (!quiet) message.value = { type: 'error', text: '복사하지 못했습니다. (브라우저 권한 확인)' };
  }
}

function copyPrayer() {
  const src = source.value!;
  const value = {
    paragraphs: JSON.parse(jsonForTranslation()),
    pray: (src.prayer ?? []).map((p) => [p.title, p.themes].filter(Boolean).join(' - ')),
    question: src.discussion ?? [],
  };
  copy('기도질문', JSON.stringify(value));
}

function copyAll() {
  const { title1, excerpt1, footnotes, paragraphs1, biblehubUrl, bookEnglish, ...rest } = source.value!;
  copy('전체', JSON.stringify(rest));
}

// ── 번역 결과 붙여넣기 ─────────────────────────────────────────
// 형식: [{ bookNo, chapterNo, verseNo, subject, summary, excerpt }, ...]  (0번이 장 전체)

function readKorean(): any[] | null {
  parseError.value = '';
  const text = jsonKor.value.trim();
  if (!text) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parseError.value = 'JSON 형식이 아닙니다.';
    return null;
  }
  if (!Array.isArray(parsed)) {
    parseError.value = '배열([...]) 이어야 합니다.';
    return null;
  }
  if (parsed[0]?.bookNo !== undefined && Number(parsed[0].bookNo) !== bookNo.value) {
    parseError.value = `bookNo 가 다릅니다: 지금 ${bookNo.value}, 붙여넣은 값 ${parsed[0].bookNo}`;
    return null;
  }
  return parsed;
}

function fill(line: Line, item: any) {
  line.subject = String(item.subject ?? '').trim();
  line.themes = String(item.summary ?? item.excerpt ?? '').replace(/\n/g, '|').trim();
}

// 붙여넣으면 바로: 줄 수가 같아야 순서대로 채운다.
function applyKorean() {
  const parsed = readKorean();
  if (!parsed) return;
  if (parsed.length !== lines.value.length) {
    parseError.value = `줄 수가 다릅니다: 원문 ${lines.value.length}줄, 번역 ${parsed.length}줄 — Parsing 버튼은 절 번호로 맞춰 채웁니다.`;
    return;
  }
  parsed.forEach((item, i) => fill(lines.value[i], item));
  excerptKor.value = String(parsed[0].excerpt ?? '').trim();
}

// Parsing 버튼: 줄 수가 달라도 절 번호(verseNo)가 같은 줄끼리 채운다.
function parseByVerse() {
  const parsed = readKorean();
  if (!parsed) return;

  let matched = 0;
  for (const item of parsed) {
    const line = lines.value.find((l) => l.verseNo === Number(item.verseNo));
    if (!line) continue;
    fill(line, item);
    if (line.verseNo === 0) excerptKor.value = String(item.excerpt ?? '').trim();
    matched += 1;
  }
  parseError.value = matched === parsed.length ? '' : `${parsed.length}줄 중 ${matched}줄만 절 번호가 맞았습니다.`;
}

// ── 저장 ───────────────────────────────────────────────────────

const missingSubjects = computed(() => lines.value.filter((l) => l.verseNo > 0 && !l.subject.trim()).length);

async function save() {
  if (!lines.value.length) return;
  if (missingSubjects.value) {
    message.value = { type: 'error', text: `단락 주제가 빈 줄이 ${missingSubjects.value}개 있습니다.` };
    return;
  }
  busy.value = true;
  message.value = null;

  const [chapter, ...paragraphs] = lines.value;
  try {
    await $fetch(`/api/bible/edit/${bookNo.value}/${chapterNo.value}/paragraphs`, {
      method: 'PATCH',
      body: {
        subject: chapter.subject,
        excerpt: excerptKor.value,
        paragraphs: paragraphs.map((l) => ({ verseNo: l.verseNo, subject: l.subject, excerpt: l.themes })),
      },
    });

    // 원래 화면처럼 저장하면 다음 장으로 넘어간다. (한글 칸이 비워지므로 확인 없이 이동)
    const saved = `${book.value.church} ${chapterNo.value}장 저장했습니다.`;
    lines.value.forEach((l) => { l.subject = ''; l.themes = ''; });
    excerptKor.value = '';
    if (chapterNo.value < chapters.value.length) {
      await router.replace({ query: { bookNo: bookNo.value, chapterNo: chapterNo.value + 1 } });
    }
    message.value = { type: 'ok', text: saved };
  } catch (e) {
    message.value = { type: 'error', text: apiErrorMessage(e) };
  } finally {
    busy.value = false;
  }
}

async function enableAudio() {
  busy.value = true;
  message.value = null;
  try {
    await $fetch(`/api/bible/edit/${bookNo.value}/${chapterNo.value}/audio`, { method: 'PATCH' });
    message.value = { type: 'ok', text: '낭독(Audio)을 연결했습니다.' };
  } catch (e: any) {
    message.value = { type: 'error', text: e?.statusCode === 404 ? '이 장의 낭독 파일이 없습니다.' : apiErrorMessage(e) };
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <ChapterPicker />

    <div class="title-bar">
      <h1>
        {{ book.church }}[{{ bookNo }}]<template v-if="source?.title">. {{ source.title }}</template> 제{{ chapterNo }}장
        <a v-if="source?.biblehubUrl" :href="source.biblehubUrl" target="_blank" rel="noopener" class="hub-link" title="biblehub 원문">🔗</a>
      </h1>
      <span v-if="message" class="message" :class="message.type">{{ message.text }}</span>
    </div>

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">
      <template v-if="isMissingRoute(error)">{{ apiErrorMessage(error) }}</template>
      <template v-else-if="error.statusCode === 404">이 장의 biblehub 원문이 없습니다.</template>
      <template v-else>불러오지 못했습니다. ({{ error.statusCode || error.message }})</template>
    </div>
    <template v-else-if="source && lines.length">
      <!-- jsonEng | jsonKor | 저장·Parsing·Audio -->
      <div class="block">
        <textarea :value="jsonEng" rows="5" readonly placeholder="jsonEng" title="클릭하면 번역용 JSON 을 복사합니다" @click="copy('번역용 원문', jsonForTranslation())" />
        <div class="col">
          <textarea v-model="jsonKor" rows="5" placeholder="jsonKor" @input="applyKorean" />
          <small v-if="parseError" class="parse-error">{{ parseError }}</small>
        </div>
        <div class="buttons">
          <button class="btn indigo" :disabled="busy" @click="save">저장</button>
          <button class="btn orange" @click="parseByVerse">Parsing</button>
          <button class="btn indigo" :disabled="busy" @click="enableAudio">Audio</button>
        </div>
      </div>

      <!-- excerptEng | excerptKor | 기도질문·전체복사 -->
      <div class="block">
        <textarea :value="source.excerpt" rows="3" readonly placeholder="excerptEng" />
        <textarea v-model="excerptKor" rows="3" placeholder="excerptKor" />
        <div class="buttons">
          <button class="btn indigo" @click="copyPrayer">기도질문</button>
          <button class="btn orange" @click="copyAll">전체복사</button>
        </div>
      </div>

      <!-- 절 | 원문 제목 | 한글 주제 | 한글 요약 -->
      <div class="lines">
        <div v-for="(line, i) in lines" :key="i" class="line">
          <span class="no">{{ line.verseNo }}</span>
          <input :value="line.english" readonly :title="line.englishThemes" />
          <input v-model="line.subject" placeholder="절" />
          <input v-if="line.verseNo > 0" v-model="line.themes" placeholder="themes" />
          <input v-else v-model="excerptKor" placeholder="themes (= excerptKor)" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.title-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 14px;
}

.title-bar h1 {
  margin: 0;
  font-size: 20px;
}

.hub-link {
  margin-left: 6px;
  font-size: 15px;
  text-decoration: none;
}

.message {
  font-size: 13px;
}

.message.ok {
  color: #2b8a3e;
}

.message.error {
  color: #c92a2a;
}

input,
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 0;
  background: #fff;
  font: inherit;
  font-size: 15px;
  line-height: 1.6;
}

textarea[readonly],
input[readonly] {
  color: #374151;
}

.block {
  display: grid;
  grid-template-columns: 1fr 1fr 72px;
  gap: 12px;
  margin-bottom: 12px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.col textarea {
  flex: 1;
}

.parse-error {
  color: #c92a2a;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  width: 100%;
  padding: 8px 0;
  border: 0;
  border-radius: 0;
  color: #fff;
  font-size: 13px;
}

.btn.indigo {
  background: #a5b4fc;
}

.btn.orange {
  background: #fdba74;
}

.btn:hover:not(:disabled) {
  filter: brightness(0.93);
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.line {
  display: grid;
  grid-template-columns: 42px 150px 196px 1fr;
  gap: 12px;
  align-items: center;
}

.line input {
  height: 54px;
}

.no {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  margin-top: 12px;
  background: #fed7aa;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 900px) {
  .block {
    grid-template-columns: 1fr;
  }

  .buttons {
    flex-direction: row;
  }

  .line {
    grid-template-columns: 42px 1fr;
  }
}
</style>
