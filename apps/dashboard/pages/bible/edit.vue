<script setup lang="ts">
import { categoryPalette, findPaletteItem } from '@webdata/categoryPalette';

// vue/bible 의 /bible/edit 화면.
// 장 주제·요약, 단락 주제·요약, 절 조각(카테고리·하나님 말씀·본문)을 고친다.

type Piece = { category: string; verse: string; say: boolean; merge?: boolean };
type Row = { verseNo: number; subject: string; excerpt: string; verses: Piece[]; open?: boolean };
type EditChapter = { bookNo: number; chapterNo: number; subject: string; excerpt: string; rows: Row[] };

const { book, bookNo, chapterNo } = useChapterQuery();

const form = ref<EditChapter | null>(null);
const snapshot = ref('');

const { status, error } = useFetch<{ data: EditChapter }>(() => `/api/bible/edit/${bookNo.value}/${chapterNo.value}`, {
  server: false,
  onResponse({ response }) {
    const data = response._data?.data as EditChapter | undefined;
    if (data) load(data);
  },
});

function load(data: EditChapter) {
  // 주제가 있는 절만 주제 입력칸을 연다.
  form.value = {
    ...data,
    rows: data.rows.map((r) => ({ ...r, open: Boolean(r.subject) })),
  };
  snapshot.value = serialize();
  message.value = null;
}

// 저장 요청 본문. 화면 전용 값(open, merge)은 빼고, 닫힌 주제는 지운다.
function payload() {
  const f = form.value!;
  return {
    subject: f.subject,
    excerpt: f.excerpt,
    rows: f.rows.map((r) => ({
      verseNo: r.verseNo,
      subject: r.open ? r.subject : '',
      excerpt: r.excerpt,
      verses: r.verses.map(({ category, verse, say }) => ({ category, verse, say })),
    })),
  };
}

function serialize() {
  return form.value ? JSON.stringify(payload()) : '';
}

// 실제로 바뀐 부분만 보낸다. 손대지 않은 절은 DB 에서도 그대로 둔다.
function changedPayload() {
  const now = payload();
  const before = JSON.parse(snapshot.value) as ReturnType<typeof payload>;
  const beforeRows = new Map(before.rows.map((r) => [r.verseNo, JSON.stringify(r)]));
  const body: Partial<ReturnType<typeof payload>> = {
    rows: now.rows.filter((r) => beforeRows.get(r.verseNo) !== JSON.stringify(r)),
  };
  if (now.subject !== before.subject || now.excerpt !== before.excerpt) {
    body.subject = now.subject;
    body.excerpt = now.excerpt;
  }
  return body;
}

const dirty = computed(() => Boolean(form.value) && serialize() !== snapshot.value);

// 저장하지 않은 채 다른 장으로 넘어가지 않게 확인한다.
onBeforeRouteUpdate(() => {
  if (dirty.value && !window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return false;
});
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('저장하지 않은 변경이 있습니다. 나갈까요?')) return false;
});

function color(category: string) {
  // 카테고리가 비어 있으면 눈에 띄게 빨간색 (원래 화면과 같음)
  if (!category) return '#ffb3b3';
  return findPaletteItem(category)?.soft || '#ffb3b3';
}

// ── 편집 동작 (원래 화면의 버튼들) ─────────────────────────────

// 색상표를 누르면 카테고리가 빈 조각을 모두 그 카테고리로 채운다.
function fillEmptyCategories(category: string) {
  for (const row of form.value?.rows ?? []) {
    for (const piece of row.verses) if (!piece.category) piece.category = category;
  }
}

// "v": 빈 카테고리를 바로 앞 조각의 것으로 채운다.
function copyPrevCategory(rowIndex: number, pieceIndex: number) {
  const rows = form.value!.rows;
  const piece = rows[rowIndex].verses[pieceIndex];
  piece.category = piece.category.replace('성약', '');
  if (piece.category) return;

  const prev = pieceIndex > 0
    ? rows[rowIndex].verses[pieceIndex - 1]
    : rows[rowIndex - 1]?.verses.at(-1);
  if (prev) piece.category = prev.category;
}

// Enter: 커서 위치에서 조각을 둘로 나눈다. 뒤쪽 조각은 같은 카테고리·say 를 이어받는다.
function splitPiece(rowIndex: number, pieceIndex: number, event: KeyboardEvent) {
  const input = event.target as HTMLInputElement;
  const pieces = form.value!.rows[rowIndex].verses;
  const piece = pieces[pieceIndex];
  const at = input.selectionStart ?? piece.verse.length;

  const after = piece.verse.slice(at).trim();
  piece.verse = piece.verse.slice(0, at).trim();
  pieces.splice(pieceIndex + 1, 0, { category: piece.category, say: piece.say, verse: after });

  nextTick(() => {
    const next = document.querySelector<HTMLInputElement>(`[data-piece="${rowIndex}-${pieceIndex + 1}"]`);
    next?.focus();
    next?.setSelectionRange(0, 0);
  });
}

// 합치기: 체크한 조각들을 첫 체크 조각 하나로 합친다.
function mergePieces(rowIndex: number) {
  const row = form.value!.rows[rowIndex];
  const first = row.verses.findIndex((p) => p.merge);
  if (first < 0) return;

  row.verses[first].verse = row.verses.filter((p) => p.merge).map((p) => p.verse.trim()).join(' ');
  row.verses[first].merge = false;
  row.verses = row.verses.filter((p) => !p.merge);
}

function removePiece(rowIndex: number, pieceIndex: number) {
  const row = form.value!.rows[rowIndex];
  if (row.verses.length > 1) row.verses.splice(pieceIndex, 1);
}

// 절 번호 버튼: 이 절에서 새 단락(주제)을 시작한다.
function openSubject(row: Row) {
  row.open = true;
}

function closeSubject(row: Row) {
  row.open = false;
  row.subject = '';
}

// ── 저장 ───────────────────────────────────────────────────────

const saving = ref(false);
const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null);

// 저장 후 다시 고치기 시작하면 "저장했습니다" 대신 "변경됨"을 보여 준다.
watch(dirty, (value) => {
  if (value && message.value?.type === 'ok') message.value = null;
});

async function save() {
  if (!form.value) return;
  saving.value = true;
  message.value = null;

  try {
    const res = await $fetch<{ data: { modified: number; chapter: EditChapter } }>(
      `/api/bible/edit/${bookNo.value}/${chapterNo.value}`,
      { method: 'PATCH', body: changedPayload() },
    );
    load(res.data.chapter);
    message.value = { type: 'ok', text: `저장했습니다. (${res.data.modified}행 변경)` };
  } catch (e) {
    message.value = { type: 'error', text: apiErrorMessage(e) };
  } finally {
    saving.value = false;
  }
}

function revert() {
  if (snapshot.value && form.value) {
    load({ ...JSON.parse(snapshot.value), bookNo: form.value.bookNo, chapterNo: form.value.chapterNo });
  }
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>#{{ bookNo }} {{ book.church }} 제{{ chapterNo }}장 · Edit</h1>
        <p class="page-desc">
          <NuxtLink :to="{ path: '/bible/view', query: { bookNo, chapterNo } }">← 읽기 화면</NuxtLink>
        </p>
      </div>
      <div v-if="form" class="actions">
        <span v-if="message" class="message" :class="message.type">{{ message.text }}</span>
        <span v-else-if="dirty" class="message dirty">변경됨</span>
        <button :disabled="saving || !dirty" @click="revert">되돌리기</button>
        <button class="primary" :disabled="saving || !dirty" @click="save">{{ saving ? '저장 중…' : '저장' }}</button>
      </div>
    </div>

    <ChapterPicker />

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">본문을 불러오지 못했습니다. ({{ error.statusCode || error.message }})</div>
    <template v-else-if="form">
      <!-- 장 주제·요약 (verseNo 0) -->
      <div class="panel chapter-info">
        <label>장 주제 <input v-model="form.subject" placeholder="주제" /></label>
        <label>장 요약 <textarea v-model="form.excerpt" rows="4" placeholder="요약" /></label>
      </div>

      <div class="panel">
        <CategoryLegend selectable @select="fillEmptyCategories" />
        <p class="hint">
          색상표를 누르면 카테고리가 빈 조각을 모두 채웁니다 · <b>v</b> 앞 조각 카테고리 복사 ·
          <b>말씀</b> 하나님 말씀(빨강) · 본문에서 <kbd>Enter</kbd> 조각 나누기 · 체크 후 <b>합치기</b> ·
          절 번호를 누르면 그 절에서 새 단락 주제를 시작합니다.
        </p>

        <div v-for="(row, ri) in form.rows" :key="row.verseNo" class="row">
          <div v-if="row.open" class="subject">
            <input v-model="row.subject" class="subject-input" placeholder="단락 주제" />
            <input v-model="row.excerpt" class="excerpt-input" placeholder="단락 요약" />
            <button type="button" class="icon" title="단락 주제 지우기" @click="closeSubject(row)">×</button>
          </div>

          <div class="verse">
            <button type="button" class="verse-no" title="이 절에서 새 단락 시작" @click="openSubject(row)">{{ row.verseNo }}</button>

            <div class="pieces">
              <div v-for="(piece, pi) in row.verses" :key="pi" class="piece">
                <button type="button" class="icon" title="앞 조각 카테고리 복사" @click="copyPrevCategory(ri, pi)">v</button>
                <select v-model="piece.category" class="category" :style="{ backgroundColor: color(piece.category) }">
                  <option value="">—</option>
                  <option v-for="c in categoryPalette" :key="c.category" :value="c.category">{{ c.category }}</option>
                </select>
                <label class="check" title="하나님 말씀"><input v-model="piece.say" type="checkbox" /> 말씀</label>
                <input
                  v-model="piece.verse"
                  class="text"
                  :class="{ say: piece.say }"
                  :style="{ backgroundColor: color(piece.category) }"
                  :data-piece="`${ri}-${pi}`"
                  @keydown.enter.prevent="splitPiece(ri, pi, $event)"
                />
                <label class="check" title="합칠 조각"><input v-model="piece.merge" type="checkbox" /></label>
                <button v-if="pi === 0" type="button" class="merge" @click="mergePieces(ri)">합치기</button>
                <button v-else type="button" class="icon" title="조각 삭제" @click="removePiece(ri, pi)">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.page-desc a {
  color: var(--accent);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
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

.message.dirty {
  color: #e67700;
}

input,
textarea {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 5px;
  font: inherit;
}

.chapter-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.chapter-info label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.chapter-info input,
.chapter-info textarea {
  font-size: 14px;
  font-weight: 400;
}

.hint {
  margin: 10px 0 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

kbd {
  padding: 0 4px;
  border: 1px solid var(--line);
  border-radius: 3px;
  font-size: 11px;
}

.row {
  margin-top: 6px;
}

.subject {
  display: flex;
  gap: 6px;
  margin: 18px 0 4px;
}

.subject-input {
  flex: 0 0 32%;
  font-weight: 700;
}

.excerpt-input {
  flex: 1;
}

.verse {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.verse-no {
  width: 44px;
  flex-shrink: 0;
  margin-top: 2px;
  background: #ffe8cc;
  color: #7a5a3a;
}

.pieces {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.piece {
  display: flex;
  gap: 6px;
  align-items: center;
}

.icon {
  width: 26px;
  flex-shrink: 0;
  padding: 6px 0;
  color: var(--muted);
}

.category {
  width: 72px;
  flex-shrink: 0;
  padding: 6px 4px;
}

.check {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  white-space: nowrap;
}

.check input {
  width: auto;
}

.text {
  flex: 1;
  min-width: 0;
}

.text.say {
  color: #e03131;
  font-weight: 700;
}

.merge {
  flex-shrink: 0;
  padding: 6px 8px;
  font-size: 12px;
}
</style>
