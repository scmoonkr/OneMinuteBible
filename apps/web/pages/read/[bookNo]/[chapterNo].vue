<script setup lang="ts">
import type { BibleChapter, BibleVerse, ReadingPaint, ReflectionItem } from '~/composables/useBible';
import { bibleBooks } from '~/data/bibleTable';

type PaletteItem = {
  category: string;
  category2: string;
  categories: string[];
  categoryEng: string;
  color: string;
  soft: string;
  eng: string;
};

const categoryPalette: PaletteItem[] = [
  { category: '가족', category2: '가족•우정', categories: ['가족', '우정'], categoryEng: 'family', color: '#CCCC00', soft: '#ffffba', eng: 'Family' },
  { category: '거짓', category2: '거짓•악행', categories: ['거짓', '악행'], categoryEng: 'evil', color: '#C0504D', soft: '#cab6a6', eng: 'Evil' },
  { category: '구원', category2: '구원•축복', categories: ['구원', '축복'], categoryEng: 'salvation', color: '#4F81BD', soft: '#cde3f7', eng: 'Salvation' },
  { category: '계명', category2: '계명•순종', categories: ['계명', '순종'], categoryEng: 'command', color: '#9BBB59', soft: '#f5fcd1', eng: 'Commandments' },
  { category: '모범', category2: '모범•증거', categories: ['모범', '증거'], categoryEng: 'outrech', color: '#FF99CC', soft: '#FF99CC', eng: 'Outreach' },
  { category: '범죄', category2: '범죄•위선', categories: ['범죄', '위선'], categoryEng: 'sin', color: '#3333FF', soft: '#babfc0', eng: 'Sin' },
  { category: '사랑', category2: '사랑•친절', categories: ['사랑', '친절'], categoryEng: 'love', color: '#008000', soft: '#d2e4bc', eng: 'Love' },
  { category: '삼위', category2: '삼위•임재', categories: ['삼위', '임재'], categoryEng: 'god', color: '#8064A2', soft: '#B6A6CA', eng: 'God' },
  { category: '서술', category2: '서술•역사', categories: ['서술', '역사'], categoryEng: 'history', color: '#8C8C8C', soft: '#EEEEEE', eng: 'History' },
  { category: '섬김', category2: '섬김•제자', categories: ['섬김', '제자'], categoryEng: 'disciple', color: '#FF5050', soft: '#f5c0ab', eng: 'Discipleship' },
  { category: '예언', category2: '성약•예언', categories: ['성약', '예언'], categoryEng: 'prophesy', color: '#CC9900', soft: '#cfad71', eng: 'Prophesy' },
  { category: '신앙', category2: '신앙•회개', categories: ['신앙', '회개'], categoryEng: 'faith', color: '#FF9966', soft: '#ffeac0', eng: 'Faith' },
];

const route = useRoute();
const router = useRouter();
const bible = useBible();
const auth = useAuth();
const identity = useReaderIdentity();

const bookNo = computed(() => Number(route.params.bookNo) || 1);
const chapterNo = computed(() => Number(route.params.chapterNo) || 1);
const readerId = computed(() => identity.readerId.value);
const currentBookMeta = computed(() => bibleBooks.find((item) => item.bookNo === bookNo.value) || bibleBooks[0]);
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
const savingReflection = ref(false);
const savingPaintKey = ref('');
const clearingPaints = ref(false);
const paints = ref<ReadingPaint[]>([]);
const reflections = ref<ReflectionItem[]>([]);
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

  while (end - start < 4 && start > 1) {
    start -= 1;
  }

  while (end - start < 4 && end < max) {
    end += 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});

const showLeadingEllipsis = computed(() => visibleChapterNumbers.value[0] > 1);
const showTrailingEllipsis = computed(() => visibleChapterNumbers.value[visibleChapterNumbers.value.length - 1] < maxChapterNo.value);

const paintMap = computed(() => {
  const map = new Map<number, ReadingPaint>();

  paints.value.forEach((paint) => {
    paint.verseIDs.forEach((verseId) => {
      map.set(verseId, paint);
    });
  });

  return map;
});

const selectedVerseIds = computed(() => {
  const verseIds = paints.value.flatMap((paint) => paint.verseIDs);
  return [...new Set(verseIds)].sort((left, right) => left - right);
});

const myReflections = computed(() => reflections.value.filter((item) => item.userId === readerId.value));
const sharingList = computed(() => (showAllSharing.value ? reflections.value : myReflections.value));
const latestMyReflection = computed(() => myReflections.value[0] || null);
const selectedVerseRange = computed(() => formatVerseRange(selectedVerseIds.value));

const chapterStats = computed(() => {
  const paragraphs = chapter.value?.paragraphs || [];
  const allVerses = paragraphs.flatMap((paragraph) => paragraph.verses);
  const sayCount = allVerses.filter((verse) => verse.say).length;

  return [
    { label: '장 주제', value: chapter.value?.subject || '미정' },
    { label: '전체 장 수', value: `${maxChapterNo.value}장` },
    { label: '블록 수', value: `${paragraphs.length}개` },
    { label: '직접 말씀', value: `${sayCount}개` },
    { label: '내가 칠한 절', value: `${selectedVerseIds.value.length}개` },
  ];
});

const shareMessage = computed(() => {
  const tags = [...new Set(
    selectedVerseIds.value
      .map((verseId) => paintMap.value.get(verseId)?.category)
      .filter(Boolean)
      .map((category) => `#${category}`),
  )];
  const reflection = latestMyReflection.value?.text || '오늘 붙든 말씀을 한 줄로 적어 보세요.';

  return [
    `${chapter.value?.subject || chapterLabel.value}에서 붙든 한 줄`,
    selectedVerseRange.value ? `선택 범위: ${selectedVerseRange.value}` : '선택한 절이 아직 없습니다.',
    `나눔: ${reflection}`,
    ['#모줄성', `#${chapterBookShort.value}${chapterNo.value}`, ...tags].join(' '),
  ].join('\n');
});

function setToast(message: string) {
  toast.value = message;

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    if (toast.value === message) {
      toast.value = '';
    }
  }, 2400);
}

function getPaletteMetaBySourceCategory(sourceCategory?: string | null) {
  if (!sourceCategory) {
    return null;
  }

  return categoryPalette.find((item) => item.category === sourceCategory || item.categories.includes(sourceCategory)) || null;
}

function getSavedPaint(verseNo: number) {
  return paintMap.value.get(verseNo) || null;
}

function getSourceCategory(verse: BibleVerse) {
  return verse.categoryOriginal || verse.category || '';
}

function getDisplayBackground(verse: BibleVerse) {
  if (showSourceCategories.value) {
    const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
    return sourceMeta?.soft || '#ffffff';
  }

  const savedPaint = getSavedPaint(verse.verseNo);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.soft || '#fffdf8' : '#ffffff';
}

function getDisplayMarker(verse: BibleVerse) {
  if (showSourceCategories.value) {
    const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
    return sourceMeta?.color || '#d7cabc';
  }

  const savedPaint = getSavedPaint(verse.verseNo);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.color || '#d7cabc' : '#d7cabc';
}

function getDisplayCategoryLabel(verse: BibleVerse) {
  if (!showSourceCategories.value) {
    return '';
  }

  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
  return sourceMeta?.category2 || getSourceCategory(verse);
}

function getVerseTextColor(verse: BibleVerse) {
  return verse.say ? '#bf2d2d' : '#2f261d';
}

function navigateTo(targetBookNo: number, targetChapterNo: number) {
  const targetBook = bibleBooks.find((item) => item.bookNo === targetBookNo) || currentBookMeta.value;
  const nextChapter = Math.min(Math.max(targetChapterNo, 1), targetBook.chapter);
  router.push(`/read/${targetBook.bookNo}/${nextChapter}`);
}

function handleBookChange(event: Event) {
  const nextBookNo = Number((event.target as HTMLSelectElement).value);
  if (!nextBookNo) {
    return;
  }

  const nextBook = bibleBooks.find((item) => item.bookNo === nextBookNo);
  if (!nextBook) {
    return;
  }

  navigateTo(nextBookNo, Math.min(chapterNo.value, nextBook.chapter));
}

function moveToFirstChapter() {
  navigateTo(bookNo.value, 1);
}

function moveToPreviousChapter() {
  navigateTo(bookNo.value, chapterNo.value - 1);
}

function moveToNextChapter() {
  navigateTo(bookNo.value, chapterNo.value + 1);
}

function moveToLastChapter() {
  navigateTo(bookNo.value, maxChapterNo.value);
}

function submitChapterInput() {
  const nextChapterNo = Number(chapterInput.value);

  if (!Number.isInteger(nextChapterNo)) {
    setToast('장 번호를 숫자로 입력해 주세요.');
    chapterInput.value = String(chapterNo.value);
    return;
  }

  navigateTo(bookNo.value, nextChapterNo);
}

function handlePickCategory(category: string) {
  selectedCategory.value = category;
  if (showSourceCategories.value) {
    showSourceCategories.value = false;
  }
}

function formatVerseRange(verseIds: number[]) {
  if (!verseIds.length) {
    return '';
  }

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

function formatSingleVerseRange(verseNo: number) {
  return `${chapterBookShort.value}${chapterNo.value}:${verseNo}`;
}

function getParagraphNoForVerse(verseNo: number) {
  return chapter.value?.paragraphs.find((paragraph) => paragraph.verses.some((verse) => verse.verseNo === verseNo))?.paragraphNo || 1;
}

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
}

async function handleVerseClick(paragraphNo: number, verseNo: number) {
  savingPaintKey.value = `${paragraphNo}:${verseNo}`;

  try {
    await bible.saveReadingPaint({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      paragraphNo,
      verseRange: formatSingleVerseRange(verseNo),
      verseIDs: [verseNo],
      category: selectedCategory.value,
      updatedAt: new Date().toISOString(),
    });
    await loadChapterState();
    setToast(`${verseNo}절을 ${selectedCategory.value}로 저장했습니다.`);
  } catch (error: any) {
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
    reflectionText.value = '';
    await loadChapterState();
    setToast('현재 창에서 내가 선택한 색칠을 지웠습니다.');
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '현재 창 초기화 중 오류가 발생했습니다.');
  } finally {
    clearingPaints.value = false;
  }
}

async function submitReflection() {
  if (!selectedVerseIds.value.length || !selectedVerseRange.value || !reflectionText.value.trim()) {
    setToast('선택한 절과 한 줄 나눔을 입력해 주세요.');
    return;
  }

  savingReflection.value = true;

  try {
    await bible.saveReflection({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      paragraphNo: getParagraphNoForVerse(selectedVerseIds.value[0]),
      verseRange: selectedVerseRange.value,
      verseIDs: selectedVerseIds.value,
      text: reflectionText.value.trim(),
      mine: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    reflectionText.value = '';
    await loadChapterState();
    setToast(`한 줄 나눔을 저장했습니다. ${selectedVerseRange.value}`);
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '한 줄 나눔 저장 중 오류가 발생했습니다.');
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
            <label class="mvp-nav-field">
              <span>성경선택</span>
              <select class="mvp-nav-select" :value="bookNo" @change="handleBookChange">
                <option v-for="book in bibleBooks" :key="book.bookNo" :value="book.bookNo">
                  {{ book.church }}
                </option>
              </select>
            </label>

            <div class="mvp-nav-book-meta">
              <span class="mvp-meta-pill">{{ currentBookMeta.churchKor }}</span>
              <span class="mvp-meta-pill">전체 {{ maxChapterNo }}장</span>
              <span class="mvp-meta-pill">DB: Bible</span>
            </div>
          </div>

          <div class="mvp-reading-nav-row mvp-reading-nav-row--chapter">
            <span class="mvp-nav-label">장선택</span>
            <div class="mvp-chapter-pager">
              <button type="button" class="mvp-toolbar-button" :disabled="chapterNo <= 1" @click="moveToFirstChapter()">&lt;&lt;</button>
              <button type="button" class="mvp-toolbar-button" :disabled="chapterNo <= 1" @click="moveToPreviousChapter()">&lt;</button>
              <span v-if="showLeadingEllipsis" class="mvp-nav-ellipsis">...</span>
              <button
                v-for="chapterItem in visibleChapterNumbers"
                :key="chapterItem"
                type="button"
                :class="['mvp-chip-button', { active: chapterItem === chapterNo }]"
                @click="navigateTo(bookNo, chapterItem)"
              >
                {{ chapterItem }}
              </button>
              <span v-if="showTrailingEllipsis" class="mvp-nav-ellipsis">...</span>
              <button type="button" class="mvp-toolbar-button" :disabled="chapterNo >= maxChapterNo" @click="moveToNextChapter()">&gt;</button>
              <button type="button" class="mvp-toolbar-button" :disabled="chapterNo >= maxChapterNo" @click="moveToLastChapter()">&gt;&gt;</button>
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
            <p class="mvp-eyebrow">One Minute Bible Reading MVP</p>
            <p class="mvp-deck">원본 `bible_edit` 블록은 유지하고, 내가 고른 카테고리와 한 줄 나눔은 따로 저장합니다.</p>
            <h1 class="mvp-title">{{ chapterLabel }}</h1>
            <div class="mvp-meta-list">
              <span class="mvp-meta-pill">책 {{ currentBookMeta.bookNo }}</span>
              <span class="mvp-meta-pill">장 {{ chapterNo }}</span>
              <span class="mvp-meta-pill">블록 {{ chapter?.paragraphs?.length || 0 }}개</span>
              <span class="mvp-meta-pill">내가 칠한 절 {{ selectedVerseIds.length }}개</span>
            </div>
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
          <p>위에서 주제를 고르고 아래 성경 절을 누르면 해당 배경색으로 저장됩니다.</p>
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
              :style="selectedCategory === item.category ? { background: '#4a3426', color: '#fff7ef', borderColor: '#4a3426' } : undefined"
              @click="handlePickCategory(item.category)"
            >
              <span class="mvp-palette-dot" :style="{ background: item.soft }" />
              <span>
                <strong>{{ item.category2 }}</strong>
                <small>{{ item.eng }}</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="mvp-section">
        <div class="mvp-section-header">
          <h2>블록 읽기</h2>
          <p>블록은 `paragraph` 기준입니다. 직접 말씀(`say: true`)은 빨간 글자만 적용됩니다.</p>
        </div>

        <p v-if="pending" class="mvp-muted">본문을 불러오는 중입니다.</p>
        <p v-else-if="error" class="mvp-muted">{{ error.message }}</p>

        <div v-else-if="chapter" class="mvp-paragraphs">
          <article v-for="paragraph in chapter.paragraphs" :key="paragraph.paragraphNo" class="mvp-paragraph-card">
            <p class="mvp-block-index">블록 {{ paragraph.paragraphNo }}</p>
            <h3 class="mvp-block-title">{{ paragraph.subject || '블록 주제 없음' }}</h3>
            <div class="mvp-block-summary">
              {{ paragraph.excerpt || paragraph.summary || '문단 요약이 아직 없습니다.' }}
            </div>

            <div class="mvp-segments">
              <button
                v-for="verse in paragraph.verses"
                :key="`${paragraph.paragraphNo}-${verse.verseNo}-${verse.verse}`"
                type="button"
                :class="['segment', { painted: Boolean(getSavedPaint(verse.verseNo)), say: verse.say }]"
                :style="{ background: getDisplayBackground(verse) }"
                @click="handleVerseClick(paragraph.paragraphNo, verse.verseNo)"
              >
                <span class="mvp-segment-mark" :style="{ background: getDisplayMarker(verse) }" />
                <span class="mvp-segment-text" :style="{ color: getVerseTextColor(verse) }">{{ verse.verse }}</span>
                <span class="mvp-segment-meta">
                  <template v-if="getDisplayCategoryLabel(verse)">
                    {{ getDisplayCategoryLabel(verse) }} ·
                  </template>
                  {{ chapterBookShort }}{{ chapterNo }}:{{ verse.verseNo }}
                  <template v-if="verse.say"> · 직접 말씀</template>
                  <template v-if="savingPaintKey === `${paragraph.paragraphNo}:${verse.verseNo}`"> · 저장 중</template>
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>

    <aside class="mvp-card mvp-sidebar">
      <section class="mvp-sidebar-block">
        <p class="mvp-eyebrow">Legend</p>
        <h2>카테고리 색</h2>
        <p class="mvp-muted">`카테고리 보기`를 눌렀을 때만 서버에서 받은 원래 category가 드러납니다.</p>
        <div class="mvp-legend">
          <div v-for="item in categoryPalette" :key="item.category" class="mvp-legend-item">
            <span class="mvp-legend-dot" :style="{ background: item.soft }" />
            <span>{{ item.category2 }}</span>
          </div>
        </div>
      </section>

      <section class="mvp-sidebar-block">
        <p class="mvp-eyebrow">Chapter View</p>
        <div class="mvp-stats">
          <div v-for="stat in chapterStats" :key="stat.label" class="mvp-stat">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </div>
        </div>
      </section>

      <section class="mvp-sidebar-block">
        <p class="mvp-eyebrow">Sharing</p>
        <h2>한줄나누기</h2>
        <textarea
          v-model="reflectionText"
          class="mvp-textarea"
          placeholder="내가 선택한 성경절을 붙들고 한 줄 나눔을 적어 주세요."
        />
        <div class="mvp-toolbar-actions">
          <button type="button" class="mvp-toolbar-button active" :disabled="savingReflection" @click="submitReflection()">
            {{ savingReflection ? '저장 중' : '한줄나누기' }}
          </button>
          <button type="button" :class="['mvp-toolbar-button', { active: showAllSharing }]" @click="showAllSharing = !showAllSharing">
            {{ showAllSharing ? '내 것만 보기' : '나눔' }}
          </button>
        </div>
        <div class="mvp-selected-range">{{ selectedVerseRange || '선택한 절이 아직 없습니다.' }}</div>
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
        <p class="mvp-eyebrow">Share</p>
        <h2>SNS 공유 준비</h2>
        <p class="mvp-muted">내가 선택한 절 범위와 최근 나눔 내용을 함께 복사합니다.</p>
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
