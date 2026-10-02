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
    parseError.value = looksLikeCsv(text)
      ? 'CSV 형식입니다. CSV 버튼을 누르면 JSON 으로 바꿔 채웁니다.'
      : 'JSON 형식이 아닙니다.';
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

// ── CSV 붙여넣기 ───────────────────────────────────────────────
// 형식(첫 줄 머리글, 탭 또는 쉼표 구분):
//   chapter  verseStart  title  message
// verseStart 0 은 장 전체(제목 = 장 주제, message = 장 요약), 나머지는 단락.
// CSV 버튼을 누르면 위 형식을 번역 JSON 으로 바꿔 모달로 보여 준다. (아래 줄에는 적용하지 않음)

const CSV_COLUMNS = ['chapter', 'verseStart', 'title', 'message'] as const;

function looksLikeCsv(text: string) {
  const head = text.split(/\r?\n/, 1)[0].toLowerCase();
  return head.includes('versestart') && head.includes('title');
}

// 따옴표("...")로 감싼 칸 안의 구분자·줄바꿈·"" 를 처리하는 작은 CSV/TSV 파서.
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function csvToJson() {
  parseError.value = '';
  const text = jsonKor.value.trim();
  if (!text) {
    parseError.value = 'jsonKor 칸에 CSV 를 붙여 넣으세요.';
    return;
  }

  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const [header, ...body] = parseDelimited(text, delimiter);
  const index = Object.fromEntries(
    CSV_COLUMNS.map((name) => [name, header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase())]),
  ) as Record<(typeof CSV_COLUMNS)[number], number>;

  const missing = CSV_COLUMNS.filter((name) => index[name] < 0);
  if (missing.length) {
    parseError.value = `머리글에 ${missing.join(', ')} 이(가) 없습니다. (chapter, verseStart, title, message)`;
    return;
  }

  const cell = (row: string[], name: (typeof CSV_COLUMNS)[number]) => (row[index[name]] ?? '').trim();

  if (!body.length) {
    parseError.value = 'CSV 에 머리글 말고 내용 줄이 없습니다.';
    return;
  }

  // 여러 장이 섞여 있어도 모두 담는다. chapter 가 비어 있으면 지금 장으로 본다.
  // 책 번호는 CSV 에 없으므로 지금 고른 책을 쓴다. (모달에서 고쳐 저장할 수 있다)
  const json = body.map((row) => {
    const verseNo = Number(cell(row, 'verseStart'));
    const item: Record<string, unknown> = {
      bookNo: bookNo.value,
      chapterNo: Number(cell(row, 'chapter')) || chapterNo.value,
      verseNo,
      subject: cell(row, 'title'),
    };
    // 장 전체(0)의 message 는 장 요약(excerpt), 단락은 단락 요약(summary)
    item[verseNo === 0 ? 'excerpt' : 'summary'] = cell(row, 'message');
    return item;
  });

  openJsonModal(JSON.stringify(json, null, 2));
}

// ── CSV 변환 결과 모달: 확인·복사하거나, JSON 의 위치대로 저장한다 ─────────

const csvModal = ref<{ json: string } | null>(null);
const csvCopied = ref(false);
const modalSaving = ref(false);
const modalResult = ref<{ type: 'ok' | 'error'; text: string } | null>(null);

function openJsonModal(json: string) {
  csvModal.value = { json };
  csvCopied.value = false;
  modalResult.value = null;
}

// 모달 JSON 을 읽어 저장할 항목으로 바꾼다. 형식이 틀리면 이유를 돌려준다.
const modalItems = computed<{ items: any[] } | { error: string }>(() => {
  if (!csvModal.value) return { items: [] };
  let parsed: any;
  try {
    parsed = JSON.parse(csvModal.value.json);
  } catch {
    return { error: 'JSON 형식이 아닙니다.' };
  }
  if (!Array.isArray(parsed) || !parsed.length) return { error: '배열([...])에 한 줄 이상 있어야 합니다.' };
  return { items: parsed };
});

// 모달 머리에 보여 줄 요약: 몇 줄, 어느 책·장
const modalSummary = computed(() => {
  const value = modalItems.value;
  if ('error' in value) return value.error;
  const chapters = [...new Set(value.items.map((i) => `${i.bookNo}:${i.chapterNo}`))];
  const books = [...new Set(value.items.map((i) => i.bookNo))];
  const chapterNos = [...new Set(value.items.map((i) => Number(i.chapterNo)))].sort((a, b) => a - b);
  const range = chapterNos.length > 1 ? `${chapterNos[0]}~${chapterNos.at(-1)}장` : `${chapterNos[0]}장`;
  return `${value.items.length}줄 · 책 ${books.join(', ')} · ${chapters.length}개 장(${range})`;
});

async function copyCsvJson() {
  if (!csvModal.value) return;
  try {
    await navigator.clipboard.writeText(csvModal.value.json);
    csvCopied.value = true;
  } catch {
    modalResult.value = { type: 'error', text: '복사하지 못했습니다. (브라우저 권한 확인)' };
  }
}

// JSON 의 bookNo/chapterNo/verseNo 마다 subject, summary 를 저장한다. (지금 장과 무관)
async function saveModalJson() {
  const value = modalItems.value;
  if ('error' in value) {
    modalResult.value = { type: 'error', text: value.error };
    return;
  }
  modalSaving.value = true;
  modalResult.value = null;
  try {
    const res = await $fetch<{ data: { count: number; chapters: number; modified: number } }>('/api/bible/excerpts', {
      method: 'PATCH',
      body: { items: value.items },
    });
    const d = res.data;
    modalResult.value = { type: 'ok', text: `${d.chapters}개 장 ${d.count}줄 저장했습니다. (실제로 바뀐 행 ${d.modified}개)` };
  } catch (e) {
    modalResult.value = { type: 'error', text: apiErrorMessage(e) };
  } finally {
    modalSaving.value = false;
  }
}

function onModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !modalSaving.value) csvModal.value = null;
}
onMounted(() => window.addEventListener('keydown', onModalKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onModalKeydown));

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
        <textarea :value="jsonEng" rows="7" readonly placeholder="jsonEng" title="클릭하면 번역용 JSON 을 복사합니다" @click="copy('번역용 원문', jsonForTranslation())" />
        <div class="col">
          <textarea v-model="jsonKor" rows="7" placeholder="jsonKor (JSON 또는 CSV: chapter / verseStart / title / message)" @input="applyKorean" />
          <small v-if="parseError" class="parse-error">{{ parseError }}</small>
        </div>
        <div class="buttons">
          <button class="btn indigo" :disabled="busy" @click="save">저장</button>
          <button class="btn orange" @click="parseByVerse">Parsing</button>
          <button class="btn indigo" :disabled="busy" @click="enableAudio">Audio</button>
          <button class="btn orange" title="chapter / verseStart / title / message 형식을 JSON 으로 바꿔 보여 줍니다" @click="csvToJson">CSV</button>
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

    <!-- CSV → JSON 변환 결과 -->
    <div v-if="csvModal" class="modal-backdrop" @click="!modalSaving && (csvModal = null)">
      <div class="modal" role="dialog" aria-label="CSV 변환 결과" @click.stop>
        <div class="modal-head">
          <strong>CSV → JSON <small>{{ modalSummary }}</small></strong>
          <button type="button" class="modal-close" aria-label="닫기" :disabled="modalSaving" @click="csvModal = null">×</button>
        </div>
        <p class="modal-note">
          저장하면 지금 보는 장과 상관없이, 각 줄의 <code>bookNo · chapterNo · verseNo</code> 위치에
          <code>subject</code>(주제)와 <code>summary</code>(요약, verseNo 0 은 <code>excerpt</code>)를 저장합니다.
          다른 절의 단락 나누기는 그대로 둡니다. 저장 전에 아래 JSON 을 고칠 수 있습니다.
        </p>
        <textarea id="csv-modal-json" v-model="csvModal.json" class="modal-json" spellcheck="false" />
        <div class="modal-foot">
          <span v-if="modalResult" class="modal-result" :class="modalResult.type">{{ modalResult.text }}</span>
          <button type="button" class="btn orange" @click="copyCsvJson">{{ csvCopied ? '복사됨 ✓' : '복사' }}</button>
          <button type="button" class="btn save" :disabled="modalSaving || 'error' in modalItems" @click="saveModalJson">
            {{ modalSaving ? '저장 중…' : '저장' }}
          </button>
          <button type="button" class="btn indigo" :disabled="modalSaving" @click="csvModal = null">닫기</button>
        </div>
      </div>
    </div>
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

/* 버튼 칸 높이를 옆 textarea 높이에 맞춰 나눠 가진다. */
.buttons .btn {
  flex: 1;
}

.block > textarea {
  height: 100%;
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

/* ── CSV 변환 결과 모달 ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 20, 30, 0.45);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 860px);
  max-height: calc(100vh - 40px);
  padding: 18px 20px;
  border-radius: 10px;
  background: var(--panel);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.modal-head small {
  margin-left: 6px;
  color: var(--muted);
  font-weight: 400;
}

.modal-close {
  padding: 0 6px;
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 1;
}

.modal-note {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
}

.modal-json {
  flex: 1;
  min-height: 360px;
  font-family: ui-monospace, Consolas, 'D2Coding', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.modal-foot {
  align-items: center;
}

.modal-foot .btn {
  width: auto;
  padding: 8px 18px;
}

.btn.save {
  background: var(--accent);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.modal-result {
  margin-right: auto;
  font-size: 13px;
}

.modal-result.ok {
  color: #2b8a3e;
}

.modal-result.error {
  color: #c92a2a;
}

.modal-note code {
  font-size: 12px;
}
</style>
