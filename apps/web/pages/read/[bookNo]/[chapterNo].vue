<script setup lang="ts">
import type { BibleChapter, BibleVerse, ReadingPaint, ReflectionItem, SelectedVerseItem } from '~/composables/useBible';
import { bibleBooks } from '~/data/bibleTable';

type PaletteItem = {
  category: string;
  categories: string[];
  color: string;
  soft: string;
};

const categoryPalette: PaletteItem[] = [
  { category: '가족', categories: ['가족', '우정'], color: '#CCCC00', soft: '#ffffba' },
  { category: '거짓', categories: ['거짓', '악행'], color: '#C0504D', soft: '#cab6a6' },
  { category: '구원', categories: ['구원', '축복'], color: '#4F81BD', soft: '#cde3f7' },
  { category: '계명', categories: ['계명', '순종'], color: '#9BBB59', soft: '#f5fcd1' },
  { category: '모범', categories: ['모범', '증거'], color: '#FF99CC', soft: '#ffd8eb' },
  { category: '범죄', categories: ['범죄', '위선'], color: '#3333FF', soft: '#babfc0' },
  { category: '사랑', categories: ['사랑', '친절'], color: '#008000', soft: '#d2e4bc' },
  { category: '삼위', categories: ['삼위', '임재'], color: '#8064A2', soft: '#B6A6CA' },
  { category: '서술', categories: ['서술', '역사'], color: '#8C8C8C', soft: '#EEEEEE' },
  { category: '섬김', categories: ['섬김', '제자'], color: '#FF5050', soft: '#f5c0ab' },
  { category: '예언', categories: ['성약', '예언'], color: '#CC9900', soft: '#cfad71' },
  { category: '신앙', categories: ['신앙', '회개'], color: '#FF9966', soft: '#ffeac0' },
];

const route = useRoute();
const bible = useBible();
const auth = useAuth();
const identity = useReaderIdentity();

const bookNo = computed(() => Number(route.params.bookNo) || 1);
const chapterNo = computed(() => Number(route.params.chapterNo) || 1);
const readerId = computed(() => identity.readerId.value);
const currentBookMeta = computed(() => bibleBooks.find((item) => item.bookNo === bookNo.value) || bibleBooks[0]);
const currentTestament = computed<'old' | 'new'>(() => currentBookMeta.value?.testament || 'old');
const testamentBooks = computed(() => bibleBooks.filter((item) => item.testament === currentTestament.value));
const bookLabel = computed(() => currentBookMeta.value?.church || chapter.value?.book || '창세기');
const chapterBookShort = computed(() => currentBookMeta.value?.churchKor || bookLabel.value.charAt(0) || '창');
const maxChapterNo = computed(() => currentBookMeta.value?.chapter || 1);
const chapterLabel = computed(() => `${bookLabel.value} ${chapterNo.value}장`);
const chapterInput = ref(String(chapterNo.value));
const selectedCategory = ref(categoryPalette[0].category);
const showSourceCategories = ref(false);
const showAllSharing = ref(false);
const reflectionText = ref('');
const toast = ref('');
const copyingMessage = ref(false);
const savingPaintKey = ref('');
const savingReflection = ref(false);
const clearingPaints = ref(false);
const paints = ref<ReadingPaint[]>([]);
const reflections = ref<ReflectionItem[]>([]);
const localSelectedVerseItems = ref<SelectedVerseItem[]>([]);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const { data, pending, error } = await useAsyncData(
  () => `bible-read-${bookNo.value}-${chapterNo.value}`,
  () => bible.readChapter({ bookNo: bookNo.value, chapterNo: chapterNo.value }),
  {
    watch: [bookNo, chapterNo],
    default: () => null as { ok: boolean; count: number; data: BibleChapter } | null,
  },
);

const chapter = computed(() => data.value?.data ?? null);
const visibleChapterNumbers = computed(() => {
  const max = maxChapterNo.value;
  const current = Math.min(Math.max(chapterNo.value, 1), max);
  let start = Math.max(1, current - 2);
  let end = Math.min(max, current + 2);

  while (end - start < 4 && start > 1) start -= 1;
  while (end - start < 4 && end < max) end += 1;

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});
const showLeadingEllipsis = computed(() => visibleChapterNumbers.value[0] > 1);
const showTrailingEllipsis = computed(() => visibleChapterNumbers.value[visibleChapterNumbers.value.length - 1] < maxChapterNo.value);

function normalizeSelectedVerseItems(items: unknown): SelectedVerseItem[] {
  if (!Array.isArray(items)) return [];

  const normalized: SelectedVerseItem[] = [];

  items.forEach((item: any) => {
      const verseNo = Number(item?.verseNo);
      const category = String(item?.category || '').trim();
      const verse = String(item?.verse || '').trim();

      if (!Number.isInteger(verseNo) || verseNo < 1 || !category || !verse) {
        return;
      }

      normalized.push({
        verseNo,
        category,
        verse,
        godSay: item?.godSay === true,
      });
  });

  return normalized.filter((item, index, array) => {
    const key = `${item.verseNo}|${item.category}|${item.verse}|${item.godSay ? '1' : '0'}`;
    return array.findIndex((candidate) => `${candidate.verseNo}|${candidate.category}|${candidate.verse}|${candidate.godSay ? '1' : '0'}` === key) === index;
  });
}

const selectedVerseItems = computed(() => localSelectedVerseItems.value);
const selectedVerseIds = computed(() => [...new Set(selectedVerseItems.value.map((item) => item.verseNo))].sort((a, b) => a - b));
const myReflections = computed(() => reflections.value.filter((item) => item.userId === readerId.value));
const sharingList = computed(() => (showAllSharing.value ? reflections.value : myReflections.value));
const latestMyReflection = computed(() => myReflections.value[0] || null);

function getVerseItemKey(item: Pick<SelectedVerseItem, 'verseNo' | 'verse'> | Pick<BibleVerse, 'verseNo' | 'verse'>) {
  return `${item.verseNo}|${item.verse}`;
}

const paintMap = computed(() => {
  const map = new Map<string, SelectedVerseItem>();
  selectedVerseItems.value.forEach((item) => {
    map.set(getVerseItemKey(item), item);
  });
  return map;
});

function setToast(message: string) {
  toast.value = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toast.value === message) toast.value = '';
  }, 2400);
}

function getPaletteMetaBySourceCategory(sourceCategory?: string | null) {
  if (!sourceCategory) return null;
  return categoryPalette.find((item) => item.category === sourceCategory || item.categories.includes(sourceCategory)) || null;
}

function getSavedPaint(verse: BibleVerse) {
  return paintMap.value.get(getVerseItemKey(verse)) || null;
}

function getSourceCategory(verse: BibleVerse) {
  return verse.categoryOriginal || verse.category || '';
}

function getDisplayBackground(verse: BibleVerse) {
  if (showSourceCategories.value) {
    const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
    return sourceMeta?.soft || '#ffffff';
  }
  const savedPaint = getSavedPaint(verse);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.soft || '#fffdf8' : '#ffffff';
}

function getDisplayMarker(verse: BibleVerse) {
  if (showSourceCategories.value) {
    const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
    return sourceMeta?.color || '#d7cabc';
  }
  const savedPaint = getSavedPaint(verse);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.color || '#d7cabc' : '#d7cabc';
}

function getDisplayCategoryLabel(verse: BibleVerse) {
  if (!showSourceCategories.value) return '';
  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
  return sourceMeta?.category || getSourceCategory(verse);
}

function getVerseTextColor(verse: BibleVerse) {
  return verse.godSay || verse.say ? '#bf2d2d' : '#2f261d';
}

function moveToChapter(targetBookNo: number, targetChapterNo: number) {
  const targetBook = bibleBooks.find((item) => item.bookNo === targetBookNo) || currentBookMeta.value;
  const nextChapter = Math.min(Math.max(targetChapterNo, 1), targetBook.chapter);
  return navigateTo(`/read/${targetBook.bookNo}/${nextChapter}`);
}

function moveToTestament(testament: 'old' | 'new') {
  const nextBook = bibleBooks.find((item) => item.testament === testament) || bibleBooks[0];
  return moveToChapter(nextBook.bookNo, 1);
}

function handleBookChange(event: Event) {
  const nextBookNo = Number((event.target as HTMLSelectElement).value);
  if (!Number.isInteger(nextBookNo)) return;
  moveToChapter(nextBookNo, 1);
}

function getParagraphNoForVerse(verseNo: number) {
  return chapter.value?.paragraphs.find((paragraph) => paragraph.verses.some((verse) => verse.verseNo === verseNo))?.paragraphNo || 1;
}

function moveToFirstChapter() { moveToChapter(bookNo.value, 1); }
function moveToPreviousChapter() { moveToChapter(bookNo.value, chapterNo.value - 1); }
function moveToNextChapter() { moveToChapter(bookNo.value, chapterNo.value + 1); }
function moveToLastChapter() { moveToChapter(bookNo.value, maxChapterNo.value); }

function submitChapterInput() {
  const nextChapterNo = Number(chapterInput.value);
  if (!Number.isInteger(nextChapterNo)) {
    setToast('장 번호를 숫자로 입력해 주세요.');
    chapterInput.value = String(chapterNo.value);
    return;
  }
  moveToChapter(bookNo.value, nextChapterNo);
}

function handlePickCategory(category: string) {
  selectedCategory.value = category;
  if (showSourceCategories.value) showSourceCategories.value = false;
}

function formatVerseRange(verseIds: number[]) {
  if (!verseIds.length) return '';
  const sorted = [...new Set(verseIds)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === end + 1) {
      end = current;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = current;
      end = current;
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return `${chapterBookShort.value}${chapterNo.value}:${ranges.join(',')}`;
}

const selectedVerseRange = computed(() => formatVerseRange(selectedVerseIds.value));

const shareMessage = computed(() => {
  const reflection = latestMyReflection.value?.text || reflectionText.value.trim() || '오늘 붙든 말씀을 한 줄로 적어 보세요.';
  return [
    selectedVerseRange.value || `${chapterBookShort.value}${chapterNo.value}`,
    reflection,
    `#모줄성 #${bookLabel.value}`,
  ].join('\n');
});

async function loadChapterState() {
  auth.syncSession();
  identity.ensureGuestId();

  if (!chapter.value) {
    paints.value = [];
    reflections.value = [];
    return;
  }

  const [paintResponse, reflectionResponse] = await Promise.all([
    bible.listReadingPaints({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
    }),
    bible.listReflections({
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
    }),
  ]);

  paints.value = paintResponse.data;
  reflections.value = reflectionResponse.data;
  localSelectedVerseItems.value = normalizeSelectedVerseItems(paintResponse.data[0]?.verseIDs);
}

function buildNextSelectedItems(verse: BibleVerse) {
  const key = getVerseItemKey(verse);
  const existingItem = paintMap.value.get(key);

  if (existingItem) {
    if (existingItem.category === selectedCategory.value) {
      return selectedVerseItems.value.filter((item) => getVerseItemKey(item) !== key);
    }

    return selectedVerseItems.value.map((item) => {
      if (getVerseItemKey(item) !== key) {
        return item;
      }

      return {
        ...item,
        category: selectedCategory.value,
        godSay: verse.godSay === true || verse.say === true,
      };
    });
  }

  return [
    ...selectedVerseItems.value,
    {
      verseNo: verse.verseNo,
      category: selectedCategory.value,
      verse: verse.verse,
      godSay: verse.godSay === true || verse.say === true,
    },
  ];
}

async function handleVerseClick(verse: BibleVerse) {
  savingPaintKey.value = getVerseItemKey(verse);
  const previousSelectedItems = [...selectedVerseItems.value];

  try {
    const nextSelectedItems = buildNextSelectedItems(verse);
    localSelectedVerseItems.value = nextSelectedItems;

    if (!nextSelectedItems.length) {
      await bible.clearReadingPaints({
        userId: readerId.value,
        bookNo: bookNo.value,
        chapterNo: chapterNo.value,
      });
      paints.value = [];
      localSelectedVerseItems.value = [];
      setToast('선택한 성경을 비웠습니다.');
      return;
    }

    const response = await bible.saveReadingPaint({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      verseRange: formatVerseRange(nextSelectedItems.map((item) => item.verseNo)),
      verseIDs: nextSelectedItems,
      updatedAt: new Date().toISOString(),
    });

    paints.value = [response.data];
    localSelectedVerseItems.value = normalizeSelectedVerseItems(response.data?.verseIDs);
    setToast(`${verse.verseNo}절 선택을 저장했습니다.`);
  } catch (error: any) {
    localSelectedVerseItems.value = previousSelectedItems;
    setToast(error?.data?.message || error?.message || '색칠 저장 중 오류가 발생했습니다.');
  } finally {
    savingPaintKey.value = '';
  }
}

async function resetCurrentChapter() {
  clearingPaints.value = true;
  try {
    await bible.clearReadingPaints({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
    });
    paints.value = [];
    localSelectedVerseItems.value = [];
    reflectionText.value = '';
    setToast('현재 창에서 내가 선택한 색칠을 지웠습니다.');
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '현재 창 초기화 중 오류가 발생했습니다.');
  } finally {
    clearingPaints.value = false;
  }
}

async function submitReflection() {
  if (!selectedVerseItems.value.length) {
    setToast('선택한 성경절이 없습니다.');
    return;
  }

  if (!reflectionText.value.trim()) {
    setToast('한 줄 나눔을 입력해 주세요.');
    return;
  }

  savingReflection.value = true;

  try {
    const response = await bible.saveReflection({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      paragraphNo: getParagraphNoForVerse(selectedVerseItems.value[0]?.verseNo || 1),
      verseRange: selectedVerseRange.value,
      verseIDs: selectedVerseItems.value,
      text: reflectionText.value.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    reflections.value = [response.data, ...reflections.value];
    reflectionText.value = '';
    setToast('한줄나누기를 저장했습니다.');
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '한줄나누기 저장 중 오류가 발생했습니다.');
  } finally {
    savingReflection.value = false;
  }
}

async function copyShareMessage() {
  copyingMessage.value = true;
  try {
    await navigator.clipboard.writeText(shareMessage.value);
    setToast('SNS 공유 문구를 복사했습니다.');
  } catch {
    setToast('공유 문구를 복사하지 못했습니다.');
  } finally {
    copyingMessage.value = false;
  }
}

watch(
  () => [bookNo.value, chapterNo.value, chapter.value?.paragraphs?.length],
  async () => {
    if (!chapter.value) {
      chapterInput.value = String(chapterNo.value);
      return;
    }

    showSourceCategories.value = false;
    showAllSharing.value = false;
    reflectionText.value = '';
    chapterInput.value = String(chapterNo.value);
    await loadChapterState();
  },
  { immediate: true },
);
</script>

<template>
  <div class="reading-page">
    <section class="mvp-card mvp-main">
      <section class="mvp-hero">
        <div class="mvp-reading-nav">
          <div class="mvp-reading-nav-row">
            <div class="mvp-testament-tabs">
              <button type="button" :class="['mvp-toolbar-button', { active: currentTestament === 'old' }]" @click="moveToTestament('old')">구약</button>
              <button type="button" :class="['mvp-toolbar-button', { active: currentTestament === 'new' }]" @click="moveToTestament('new')">신약</button>
            </div>

            <label class="mvp-nav-field mvp-nav-field--select">
              <span>성경 선택</span>
              <select class="mvp-nav-select mvp-nav-select--short" :value="bookNo" @change="handleBookChange">
                <option v-for="book in testamentBooks" :key="book.bookNo" :value="book.bookNo">
                  {{ book.church }}
                </option>
              </select>
            </label>
          </div>

          <div class="mvp-reading-nav-row mvp-reading-nav-row--chapter">
            <span class="mvp-nav-label">장선택</span>
            <div class="mvp-chapter-pager">
              <button type="button" class="mvp-toolbar-button mvp-icon-button" :disabled="chapterNo <= 1" @click="moveToFirstChapter()"><i class="fa-solid fa-angles-left" /></button>
              <button type="button" class="mvp-toolbar-button mvp-icon-button" :disabled="chapterNo <= 1" @click="moveToPreviousChapter()"><i class="fa-solid fa-angle-left" /></button>
              <span v-if="showLeadingEllipsis" class="mvp-nav-ellipsis">...</span>
              <button
                v-for="chapterItem in visibleChapterNumbers"
                :key="chapterItem"
                type="button"
                :class="['mvp-chip-button', { active: chapterItem === chapterNo }]"
                @click="moveToChapter(bookNo, chapterItem)"
              >
                {{ chapterItem }}
              </button>
              <span v-if="showTrailingEllipsis" class="mvp-nav-ellipsis">...</span>
              <button type="button" class="mvp-toolbar-button mvp-icon-button" :disabled="chapterNo >= maxChapterNo" @click="moveToNextChapter()"><i class="fa-solid fa-angle-right" /></button>
              <button type="button" class="mvp-toolbar-button mvp-icon-button" :disabled="chapterNo >= maxChapterNo" @click="moveToLastChapter()"><i class="fa-solid fa-angles-right" /></button>
            </div>

            <div class="mvp-nav-input-wrap">
              <label class="mvp-nav-field mvp-nav-field--inline">
                <span>장입력</span>
                <input v-model="chapterInput" class="mvp-nav-input" inputmode="numeric" @keyup.enter="submitChapterInput()" />
              </label>
              <button type="button" class="mvp-toolbar-button active" @click="submitChapterInput()">이동</button>
            </div>
          </div>
        </div>

        <div class="mvp-hero-grid">
          <div>
            <h1 class="mvp-title">{{ chapterLabel }}</h1>
          </div>

          <div class="mvp-hero-summary">
            <h2>{{ chapter?.subject || '장 주제 미정' }}</h2>
            <p>{{ chapter?.excerpt || '장 요약 데이터가 아직 없습니다.' }}</p>
          </div>
        </div>
      </section>

      <section class="mvp-section">
        <div class="mvp-section-header">
          <h2>12 Color Table</h2>
        </div>

        <div class="mvp-toolbar">
          <div class="mvp-toolbar-actions">
            <button type="button" :class="['mvp-toolbar-button', { active: showSourceCategories }]" @click="showSourceCategories = !showSourceCategories">
              {{ showSourceCategories ? '내 선택 보기' : '카테고리 보기' }}
            </button>
            <button type="button" class="mvp-toolbar-button" :disabled="clearingPaints" @click="resetCurrentChapter()">
              {{ clearingPaints ? '초기화 중' : '현재창초기화' }}
            </button>
          </div>

          <div class="mvp-palette">
            <button
              v-for="item in categoryPalette"
              :key="item.category"
              type="button"
              :class="['mvp-palette-item', { active: selectedCategory === item.category }]"
              :style="{
                background: item.soft,
                borderColor: item.color,
                color: selectedCategory === item.category ? '#1f1711' : '#4b3c30',
                boxShadow: selectedCategory === item.category ? `inset 0 0 0 2px ${item.color}` : 'none',
              }"
              @click="handlePickCategory(item.category)"
            >
              <strong>{{ item.category }}</strong>
            </button>
          </div>
        </div>
      </section>

      <section class="mvp-section">
        <div class="mvp-section-header">
          <h2>블록 읽기</h2>
        </div>

        <p v-if="pending" class="mvp-muted">본문을 불러오는 중입니다.</p>
        <p v-else-if="error" class="mvp-muted">{{ error.message }}</p>

        <div v-else-if="chapter" class="mvp-paragraphs">
          <article v-for="paragraph in chapter.paragraphs" :key="paragraph.paragraphNo" class="mvp-paragraph-card">
            <p class="mvp-block-index">블록 {{ paragraph.paragraphNo }}</p>
            <h3 class="mvp-block-title">{{ paragraph.subject || '블록 주제 없음' }}</h3>
            <div class="mvp-block-summary">{{ paragraph.summary || paragraph.excerpt || '문단 요약이 아직 없습니다.' }}</div>

            <div class="mvp-segments">
              <button
                v-for="verse in paragraph.verses"
                :key="`${paragraph.paragraphNo}-${verse.verseNo}-${verse.verse}`"
                type="button"
                :class="['segment', { painted: Boolean(getSavedPaint(verse)), say: verse.godSay || verse.say }]"
                :style="{ background: getDisplayBackground(verse) }"
                @click="handleVerseClick(verse)"
              >
                <span class="mvp-segment-mark" :style="{ background: getDisplayMarker(verse) }" />
                <span class="mvp-segment-text" :style="{ color: getVerseTextColor(verse) }">{{ verse.verse }}</span>
                <span class="mvp-segment-meta">
                  <template v-if="getDisplayCategoryLabel(verse)">
                    {{ getDisplayCategoryLabel(verse) }} ·
                  </template>
                  {{ chapterBookShort }}{{ chapterNo }}:{{ verse.verseNo }}
                  <template v-if="verse.godSay || verse.say"> · 직접 말씀</template>
                  <template v-if="savingPaintKey === getVerseItemKey(verse)"> · 저장 중</template>
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>

    <aside class="mvp-card mvp-sidebar">
      <section class="mvp-sidebar-block">
        <h2>한줄나누기</h2>
        <textarea
          v-model="reflectionText"
          class="mvp-textarea"
          placeholder="내가 선택한 성경절을 붙들고 한 줄 나눔을 적어 주세요."
        />
        <div class="mvp-selected-range">{{ selectedVerseRange || '선택한 구절이 없습니다.' }}</div>
        <div class="mvp-toolbar-actions">
          <button type="button" class="mvp-toolbar-button active" :disabled="savingReflection" @click="submitReflection()">
            {{ savingReflection ? '저장 중' : '한줄나누기저장' }}
          </button>
          <button type="button" :class="['mvp-toolbar-button', { active: showAllSharing }]" @click="showAllSharing = !showAllSharing">
            {{ showAllSharing ? '나눔감추기' : '나눔보기' }}
          </button>
        </div>
        <p v-if="toast" class="mvp-muted">{{ toast }}</p>
        <div class="mvp-sharing-list">
          <article v-for="item in sharingList" :key="`${item.userId}-${item.verseRange}-${item.updatedAt}`" class="mvp-sharing-item">
            <strong>{{ item.userId === readerId ? '내 나눔' : item.userId }}</strong>
            <span>{{ item.verseRange }}</span>
            <p>{{ item.text }}</p>
          </article>
          <p v-if="!sharingList.length" class="mvp-muted">아직 저장된 나눔이 없습니다.</p>
        </div>
      </section>

      <section class="mvp-sidebar-block">
        <h2>SNS 공유 준비</h2>
        <div class="mvp-toolbar-actions">
          <button type="button" class="mvp-toolbar-button active" :disabled="copyingMessage" @click="copyShareMessage()">
            {{ copyingMessage ? '복사 중' : 'SNS 공유 문구 복사' }}
          </button>
        </div>
        <pre class="mvp-share-preview">{{ shareMessage }}</pre>
      </section>
    </aside>
  </div>
</template>
