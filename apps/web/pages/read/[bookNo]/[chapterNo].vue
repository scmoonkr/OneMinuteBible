<script setup lang="ts">
import type { BibleChapter, BibleVerse, ReadingPaint, ReflectionItem } from '~/composables/useBible';

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

const sampleSharing = {
  1: [
    { userName: '소은', verseRange: '창세기 1:3', text: '빛은 상황보다 먼저 온 말씀이라고 느꼈어요.' },
    { userName: '민호', verseRange: '창세기 1:26-28', text: '형상대로 지음 받았다는 말이 오늘 제 정체성을 붙들어 줬어요.' },
  ],
  2: [
    { userName: '유진', verseRange: '창세기 2:3', text: '안식은 멈춤이 아니라 하나님이 기뻐하신 질서에 머무는 것 같아요.' },
  ],
  3: [
    { userName: '지안', verseRange: '창세기 3:9', text: '네가 어디 있느냐는 정죄보다 찾으시는 질문처럼 다가왔어요.' },
  ],
};

const route = useRoute();
const router = useRouter();
const bible = useBible();
const auth = useAuth();
const identity = useReaderIdentity();

const bookNo = computed(() => Number(route.params.bookNo) || 1);
const chapterNo = computed(() => Number(route.params.chapterNo) || 1);
const readerId = computed(() => identity.readerId.value);
const selectedCategory = ref(categoryPalette[0].category);
const showCategory = ref(false);
const showAllSharing = ref(false);
const reflectionText = ref('');
const toast = ref('');
const copyingMessage = ref(false);
const savingReflection = ref(false);
const savingPaintKey = ref('');
const selectedVerseIds = ref<number[]>([]);
const paints = ref<ReadingPaint[]>([]);
const reflections = ref<ReflectionItem[]>([]);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const chapterButtons = [1, 2, 3];

const { data, pending, error, refresh } = await useAsyncData(
  () => `bible-read-${bookNo.value}-${chapterNo.value}`,
  () => bible.readChapter({ bookNo: bookNo.value, chapterNo: chapterNo.value }),
  {
    watch: [bookNo, chapterNo],
    default: () => null as { ok: boolean; count: number; data: BibleChapter } | null,
  },
);

const chapter = computed(() => data.value?.data ?? null);
const chapterRangeLabel = computed(() => `창세기 ${chapterNo.value}`);

const paintMap = computed(() => {
  const map = new Map<number, ReadingPaint>();

  paints.value.forEach((paint) => {
    paint.verseIDs.forEach((verseId) => {
      map.set(verseId, paint);
    });
  });

  return map;
});

const chapterStats = computed(() => {
  const paragraphs = chapter.value?.paragraphs || [];
  const allVerses = paragraphs.flatMap((paragraph) => paragraph.verses);
  const sayCount = allVerses.filter((verse) => verse.say).length;

  return [
    { label: '장 주제', value: chapter.value?.subject || '미정' },
    { label: '블록 수', value: `${paragraphs.length}개` },
    { label: '직접 말씀', value: `${sayCount}개` },
    { label: '내가 칠한 절', value: `${paintMap.value.size}개` },
  ];
});

const sharingList = computed(() => {
  const mine = reflections.value.map((item) => ({
    userName: '내 묵상',
    verseRange: item.verseRange,
    text: item.text,
    mine: true,
    updatedAt: item.updatedAt,
  }));
  const others = (sampleSharing[chapterNo.value as 1 | 2 | 3] || []).map((item, index) => ({
    ...item,
    mine: false,
    updatedAt: `${index}`,
  }));

  return showAllSharing.value ? [...mine, ...others] : mine;
});

const shareMessage = computed(() => {
  const tags = [...new Set(
    selectedVerseIds.value
      .map((verseId) => paintMap.value.get(verseId)?.category)
      .filter(Boolean)
      .map((category) => `#${category}`),
  )];
  const reflection = reflections.value[0]?.text || '오늘 붙든 말씀을 한 줄로 적어 보세요.';

  return [
    `${chapter.value?.subject || `창세기 ${chapterNo.value}장`}에서 붙든 한 줄`,
    selectedVerseRange.value ? `선택 범위: ${selectedVerseRange.value}` : '선택한 절이 아직 없습니다.',
    `나눔: ${reflection}`,
    ['#모줄성', `#창세기${chapterNo.value}장`, ...tags].join(' '),
  ].join('\n');
});

const selectedVerseRange = computed(() => formatVerseRange(selectedVerseIds.value));

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
  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));

  if (showCategory.value && sourceMeta) {
    return sourceMeta.soft;
  }

  const savedPaint = getSavedPaint(verse.verseNo);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.soft || '#fffdf8' : '#ffffff';
}

function getDisplayMarker(verse: BibleVerse) {
  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));

  if (showCategory.value && sourceMeta) {
    return sourceMeta.color;
  }

  const savedPaint = getSavedPaint(verse.verseNo);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.color || '#d7cabc' : '#d7cabc';
}

function getDisplayCategoryLabel(verse: BibleVerse) {
  if (!showCategory.value) {
    return '';
  }

  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
  return sourceMeta?.category2 || getSourceCategory(verse);
}

function getVerseTextColor(verse: BibleVerse) {
  return verse.say ? '#bf2d2d' : '#2f261d';
}

function handlePickCategory(category: string) {
  selectedCategory.value = category;
  if (showCategory.value) {
    showCategory.value = false;
  }
}

function toggleVerseSelection(verseNo: number) {
  if (selectedVerseIds.value.includes(verseNo)) {
    selectedVerseIds.value = selectedVerseIds.value.filter((value) => value !== verseNo);
    return;
  }

  selectedVerseIds.value = [...selectedVerseIds.value, verseNo].sort((a, b) => a - b);
}

function resetCurrentChapter() {
  selectedVerseIds.value = [];
  reflectionText.value = '';
  setToast('현재 장 선택을 초기화했습니다.');
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
  return `${chapterRangeLabel.value}:${ranges.join(',')}`;
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
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      mine: true,
    }),
  ]);

  paints.value = paintResponse.data;
  reflections.value = reflectionResponse.data;
}

async function handleVerseClick(paragraphNo: number, verseNo: number) {
  toggleVerseSelection(verseNo);
  savingPaintKey.value = `${paragraphNo}:${verseNo}`;

  try {
    await bible.saveReadingPaint({
      userId: readerId.value,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      paragraphNo,
      verseRange: formatVerseRange([verseNo]),
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

async function submitReflection() {
  if (!selectedVerseIds.value.length || !selectedVerseRange.value || !reflectionText.value.trim()) {
    setToast('구절을 선택하고 한 줄 묵상을 입력해 주세요.');
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
    setToast(`선택 범위 저장: ${selectedVerseRange.value}`);
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '묵상 저장 중 오류가 발생했습니다.');
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
      return;
    }

    showCategory.value = false;
    showAllSharing.value = false;
    reflectionText.value = '';
    selectedVerseIds.value = [];
    await loadChapterState();
  },
  { immediate: true },
);
</script>

<template>
  <div class="reading-page">
    <section class="mvp-card mvp-main">
      <section class="mvp-hero">
        <div class="mvp-hero-grid">
          <div>
            <p class="mvp-eyebrow">One Minute Bible Reading MVP</p>
            <p class="mvp-deck">Bottom-up: 구절에서 시작해 블록과 장으로 올라갑니다. Top-down: 장과 블록을 먼저 보고 구절로 내려갑니다.</p>
            <h1 class="mvp-title">{{ chapterLabel }}</h1>
            <div class="mvp-meta-list">
              <span class="mvp-meta-pill">책 {{ chapter?.bookNo || bookNo }}</span>
              <span class="mvp-meta-pill">장 {{ chapter?.chapterNo || chapterNo }}</span>
              <span class="mvp-meta-pill">블록 {{ chapter?.paragraphs?.length || 0 }}개</span>
              <span class="mvp-meta-pill">내가 칠한 절 {{ selectedVerseIds.length }}개</span>
            </div>
          </div>

          <div class="mvp-hero-summary">
            <h2>{{ chapter?.subject || '장 주제 미정' }}</h2>
            <p>{{ chapter?.excerpt || '장 요약 데이터가 아직 없습니다.' }}</p>
            <div class="mvp-chapters">
              <button
                v-for="chapterItem in chapterButtons"
                :key="chapterItem"
                type="button"
                :class="['mvp-chip-button', { active: chapterItem === chapterNo }]"
                @click="router.push(`/read/${bookNo}/${chapterItem}`)"
              >
                창세기 {{ chapterItem }}장
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="mvp-section">
        <div class="mvp-section-header">
          <h2>12 Color Table</h2>
          <p>색을 먼저 고르고, 아래 절을 누르면 그 category로 칠해집니다.</p>
        </div>

        <div class="mvp-toolbar">
          <div class="mvp-toolbar-actions">
            <button type="button" :class="['mvp-toolbar-button', { active: showCategory }]" @click="showCategory = !showCategory">
              {{ showCategory ? '카테고리 숨기기' : '카테고리 보기' }}
            </button>
            <button type="button" class="mvp-toolbar-button" @click="resetCurrentChapter()">현재 장 선택 초기화</button>
            <button type="button" class="mvp-toolbar-button" @click="refreshChapter()">다시 불러오기</button>
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
          <p>기본 상태에서는 카테고리와 배경색을 숨기고, 직접 말씀은 red로만 강조합니다.</p>
        </div>

        <p v-if="pending" class="mvp-muted">본문을 불러오는 중입니다.</p>
        <p v-else-if="error" class="mvp-muted">{{ error.message }}</p>

        <div v-else-if="chapter" class="mvp-paragraphs">
          <article v-for="paragraph in chapter.paragraphs" :key="paragraph.paragraphNo" class="mvp-paragraph-card">
            <p class="mvp-block-index">블록 {{ paragraph.paragraphNo }}</p>
            <h3 class="mvp-block-title">{{ paragraph.subject || '블록 주제 없음' }}</h3>
            <div class="mvp-block-summary">
              {{ paragraph.summary || '문단 요약이 아직 없습니다.' }}
            </div>

            <div class="mvp-segments">
              <button
                v-for="verse in paragraph.verses"
                :key="`${paragraph.paragraphNo}-${verse.verseNo}-${verse.verse}`"
                type="button"
                :class="['segment', { painted: Boolean(getSavedPaint(verse.verseNo)), 'selected-target': selectedVerseIds.includes(verse.verseNo), say: verse.say }]"
                :style="{ background: getDisplayBackground(verse) }"
                @click="handleVerseClick(paragraph.paragraphNo, verse.verseNo)"
              >
                <span class="mvp-segment-mark" :style="{ background: getDisplayMarker(verse) }" />
                <span class="mvp-segment-text" :style="{ color: getVerseTextColor(verse) }">{{ verse.verse }}</span>
                <span class="mvp-segment-meta">
                  <template v-if="getDisplayCategoryLabel(verse)">
                    {{ getDisplayCategoryLabel(verse) }} ·
                  </template>
                  창세기 {{ chapterNo }}:{{ verse.verseNo }}
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
        <p class="mvp-muted">`카테고리 보기`를 눌렀을 때만 원래 category와 배경색이 드러납니다.</p>
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
        <h2>한 줄 나누기</h2>
        <textarea
          v-model="reflectionText"
          class="mvp-textarea"
          placeholder="이 장에서 지금 무엇이 보였나요?"
        />
        <div class="mvp-toolbar-actions">
          <button type="button" class="mvp-toolbar-button active" :disabled="savingReflection" @click="submitReflection()">
            {{ savingReflection ? '저장 중' : '한 줄 나누기' }}
          </button>
          <button type="button" :class="['mvp-toolbar-button', { active: showAllSharing }]" @click="showAllSharing = !showAllSharing">
            {{ showAllSharing ? '내 나눔만 보기' : '나눔' }}
          </button>
        </div>
        <div class="mvp-selected-range">{{ selectedVerseRange || '선택한 절이 아직 없습니다.' }}</div>
        <p v-if="toast" class="mvp-muted">{{ toast }}</p>
        <div class="mvp-sharing-list">
          <article v-for="item in sharingList" :key="`${item.userName}-${item.verseRange}-${item.updatedAt}`" class="mvp-sharing-item">
            <strong>{{ item.mine ? '내 묵상' : item.userName }}</strong>
            <span>{{ item.verseRange }}</span>
            <p>{{ item.text }}</p>
          </article>
          <p v-if="!sharingList.length" class="mvp-muted">아직 저장된 나눔이 없습니다.</p>
        </div>
      </section>

      <section class="mvp-sidebar-block">
        <p class="mvp-eyebrow">Share</p>
        <h2>SNS 공유 준비</h2>
        <p class="mvp-muted">선택한 절 범위와 나눔 내용, 태그를 포함합니다.</p>
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
