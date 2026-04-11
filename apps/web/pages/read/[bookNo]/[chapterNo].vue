<script setup lang="ts">
import type { BibleChapter, BibleVerse, ReflectionItem, SelectedVerseItem } from '~/composables/useBible';
import { categoryPalette, findPaletteItem, type PaletteItem } from '~/data/categoryPalette';
import { bibleBooks } from '~/data/bibleTable';

const route = useRoute();
const router = useRouter();
const bible = useBible();
const auth = useAuth();

const bookNo = computed(() => Number(route.params.bookNo) || 1);
const chapterNo = computed(() => Number(route.params.chapterNo) || 1);
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
const copyingImageKey = ref('');
const copyingMessage = ref(false);
const savingReflection = ref(false);
const localSelectedVerseItems = ref<SelectedVerseItem[]>([]);
const reflections = ref<ReflectionItem[]>([]);
const selectedShareReflection = ref<ReflectionItem | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

type ShareVerseDetail = SelectedVerseItem & {
  label: string;
  palette: PaletteItem | null;
};

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
const selectedVerseItems = computed(() => localSelectedVerseItems.value);
const selectedVerseIds = computed(() => [...new Set(selectedVerseItems.value.map((item) => item.verseNo))].sort((a, b) => a - b));
const currentUserNo = computed(() => auth.currentUser.value?.userNo || 0);
const myReflections = computed(() => reflections.value.filter((item) => item.userNo === currentUserNo.value));
const sharingList = computed(() => (showAllSharing.value ? reflections.value : myReflections.value));
const latestMyReflection = computed(() => myReflections.value[0] || null);
const representativeVerseNo = ref<number | null>(null);

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

function formatRelativeTime(value?: string | null) {
  if (!value) return '';

  const targetTime = new Date(value).getTime();
  if (Number.isNaN(targetTime)) return '';

  const diffSeconds = Math.max(1, Math.floor((Date.now() - targetTime) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}초전`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}분전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 14) return `${diffDays}일전`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}주전`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}개월전`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}년전`;
}

function getReflectionDisplayName(item: ReflectionItem) {
  return item.nickname?.trim() || `#${item.userNo}`;
}

function getPaletteMetaBySourceCategory(sourceCategory?: string | null) {
  return findPaletteItem(sourceCategory);
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
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.soft || '#ffffff' : '#ffffff';
}

function getDisplayBorderColor(verse: BibleVerse) {
  if (showSourceCategories.value) {
    const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
    return sourceMeta?.color || 'rgba(80, 54, 29, 0.14)';
  }
  const savedPaint = getSavedPaint(verse);
  return savedPaint ? getPaletteMetaBySourceCategory(savedPaint.category)?.color || 'rgba(80, 54, 29, 0.14)' : 'rgba(80, 54, 29, 0.08)';
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
  const savedPaint = getSavedPaint(verse);
  if (!showSourceCategories.value) return savedPaint?.category || '';
  const sourceMeta = getPaletteMetaBySourceCategory(getSourceCategory(verse));
  return sourceMeta?.category || getSourceCategory(verse);
}

function getSelectedCategoryLabel(verse: BibleVerse) {
  return getSavedPaint(verse)?.category || '';
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

function getParagraphNoForVerse(verseNo: number) {
  return chapter.value?.paragraphs.find((paragraph) => paragraph.verses.some((verse) => verse.verseNo === verseNo))?.paragraphNo || 1;
}

const selectedVerseRange = computed(() => formatVerseRange(selectedVerseIds.value));
const selectedVerseDetails = computed(() => (
  selectedVerseItems.value
    .map((item) => ({
      ...item,
      label: `${chapterBookShort.value}${chapterNo.value}:${item.verseNo}`,
      palette: getPaletteMetaBySourceCategory(item.category),
    }))
    .sort((left, right) => {
      if (left.verseNo !== right.verseNo) return left.verseNo - right.verseNo;
      return left.verse.localeCompare(right.verse, 'ko');
    })
));
const shareReflection = computed(() => selectedShareReflection.value);
const previewVerseDetails = computed<ShareVerseDetail[]>(() => {
  const sourceItems = selectedVerseItems.value.length
    ? selectedVerseItems.value
    : (shareReflection.value?.verseIDs || []);

  return sourceItems
    .map((item) => ({
      ...item,
      label: `${chapterBookShort.value}${chapterNo.value}:${item.verseNo}`,
      palette: getPaletteMetaBySourceCategory(item.category),
    }))
    .sort((left, right) => {
      if (left.verseNo !== right.verseNo) return left.verseNo - right.verseNo;
      return left.verse.localeCompare(right.verse, 'ko');
    });
});
const shareImageLabels = computed(() => (
  shareImagePageItems.value.length <= 1
    ? ['나눔카드 복사']
    : shareImagePageItems.value.map((_, index) => `카드${index + 1} 복사`)
));
const shareVerseRange = computed(() => {
  if (selectedVerseRange.value) return selectedVerseRange.value;
  return shareReflection.value?.verseRange || '';
});
const shareDateLabel = computed(() => {
  const rawDate = shareReflection.value?.updatedAt || shareReflection.value?.createdAt;
  const date = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\s/g, '');
});
const shareNicknameLabel = computed(() => {
  if (!shareReflection.value) return '';
  return getReflectionDisplayName(shareReflection.value);
});
const shareHashtags = computed(() => {
  const tags = ['#모줄성'];
  if (bookLabel.value) tags.push(`#${bookLabel.value}`);
  if (chapterLabel.value) tags.push(`#${chapterLabel.value.replace(/\s+/g, '')}`);
  return tags.join(' ');
});

const shareMessage = computed(() => {
  const reflection = shareReflection.value?.text || '';
  const metaText = [shareNicknameLabel.value, shareDateLabel.value].filter(Boolean).join(' ');
  return [
    `${metaText}    ${shareVerseRange.value}`.trim(),
    '',
    reflection,
    '',
    shareHashtags.value,
  ].join('\n');
});

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  const flushLine = () => {
    if (currentLine) lines.push(currentLine);
    currentLine = '';
  };

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (!currentLine) {
      let chunk = '';
      for (const char of word) {
        const nextChunk = `${chunk}${char}`;
        if (context.measureText(nextChunk).width <= maxWidth) {
          chunk = nextChunk;
        } else {
          if (chunk) lines.push(chunk);
          chunk = char;
        }
      }
      currentLine = chunk;
      return;
    }

    flushLine();
    currentLine = word;
  });

  flushLine();
  return lines.length ? lines : [''];
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

async function createShareImageBlob() {
  const items = previewVerseDetails.value;
  if (!items.length) return null;
  return createShareImageBlobForItems(items);
}

function getShareLayout(items: ShareVerseDetail[]) {
  const width = 1080;
  const height = 1350;
  const layoutPresets = [
    { outerPadding: 56, topMetaSize: 22, messageSize: 64, messageLineHeight: 94, verseLabelSize: 16, verseBodySize: 18, verseLineHeight: 24, verseGap: 16, cardPaddingX: 20, cardPaddingY: 16, borderRadius: 5, hashtagSize: 28, sectionGap: 28, messageTopMargin: 44, messageBottomMargin: 32, verseTopMargin: 22 },
    { outerPadding: 48, topMetaSize: 20, messageSize: 56, messageLineHeight: 82, verseLabelSize: 15, verseBodySize: 17, verseLineHeight: 22, verseGap: 14, cardPaddingX: 18, cardPaddingY: 15, borderRadius: 5, hashtagSize: 26, sectionGap: 24, messageTopMargin: 38, messageBottomMargin: 28, verseTopMargin: 20 },
    { outerPadding: 40, topMetaSize: 18, messageSize: 50, messageLineHeight: 74, verseLabelSize: 14, verseBodySize: 16, verseLineHeight: 21, verseGap: 12, cardPaddingX: 16, cardPaddingY: 14, borderRadius: 5, hashtagSize: 24, sectionGap: 20, messageTopMargin: 32, messageBottomMargin: 24, verseTopMargin: 18 },
    { outerPadding: 32, topMetaSize: 17, messageSize: 44, messageLineHeight: 64, verseLabelSize: 13, verseBodySize: 15, verseLineHeight: 20, verseGap: 10, cardPaddingX: 14, cardPaddingY: 12, borderRadius: 5, hashtagSize: 22, sectionGap: 18, messageTopMargin: 26, messageBottomMargin: 20, verseTopMargin: 16 },
  ] as const;

  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return null;

  const fittedLayout = layoutPresets
    .map((preset) => {
      const contentWidth = width - preset.outerPadding * 2;
      const messageFont = `700 ${preset.messageSize}px "Noto Sans KR", sans-serif`;
      const verseBodyFont = `500 ${preset.verseBodySize}px "Noto Sans KR", sans-serif`;
      const verseLabelFont = `700 ${preset.verseLabelSize}px "Noto Sans KR", sans-serif`;
      measure.font = messageFont;
      const messageLines = wrapCanvasText(measure, shareReflection.value?.text || '', contentWidth);

      const cardLayouts = items.map((item) => {
        measure.font = verseBodyFont;
        const categoryText = `[${item.category}] `;
        measure.font = verseLabelFont;
        const categoryWidth = measure.measureText(categoryText).width;
        measure.font = `700 ${Math.max(11, preset.verseLabelSize - 2)}px "Noto Sans KR", sans-serif`;
        const verseNoWidth = measure.measureText(String(item.verseNo)).width;
        measure.font = verseBodyFont;
        const verseLines = wrapCanvasText(measure, item.verse, Math.max(140, contentWidth - preset.cardPaddingX * 2 - categoryWidth - verseNoWidth));
        const cardHeight = preset.cardPaddingY * 2 + verseLines.length * preset.verseLineHeight;
        return { item, verseLines, cardHeight, categoryText };
      });

      const metaHeight = preset.topMetaSize;
      const messageHeight = messageLines.length * preset.messageLineHeight;
      const hashtagHeight = preset.hashtagSize;
      const cardsHeight = cardLayouts.reduce((sum, entry) => sum + entry.cardHeight, 0)
        + preset.verseGap * Math.max(0, cardLayouts.length - 1);
      const totalHeight = preset.outerPadding * 2
        + metaHeight
        + preset.sectionGap
        + preset.messageTopMargin
        + messageHeight
        + preset.messageBottomMargin
        + preset.sectionGap
        + preset.verseTopMargin
        + cardsHeight
        + preset.sectionGap
        + hashtagHeight;

      return {
        preset,
        messageFont,
        verseBodyFont,
        verseLabelFont,
        messageLines,
        cardLayouts,
        totalHeight,
      };
    })
    .find((entry) => entry.totalHeight <= height)
    || (() => {
      const preset = layoutPresets[layoutPresets.length - 1];
      const contentWidth = width - preset.outerPadding * 2;
      const messageFont = `700 ${preset.messageSize}px "Noto Sans KR", sans-serif`;
      const verseBodyFont = `500 ${preset.verseBodySize}px "Noto Sans KR", sans-serif`;
      const verseLabelFont = `700 ${preset.verseLabelSize}px "Noto Sans KR", sans-serif`;
      measure.font = messageFont;
      const messageLines = wrapCanvasText(measure, shareReflection.value?.text || '', contentWidth);
      const cardLayouts = items.map((item) => {
        measure.font = verseBodyFont;
        const categoryText = `[${item.category}] `;
        measure.font = verseLabelFont;
        const categoryWidth = measure.measureText(categoryText).width;
        measure.font = `700 ${Math.max(11, preset.verseLabelSize - 2)}px "Noto Sans KR", sans-serif`;
        const verseNoWidth = measure.measureText(String(item.verseNo)).width;
        measure.font = verseBodyFont;
        const verseLines = wrapCanvasText(measure, item.verse, Math.max(140, contentWidth - preset.cardPaddingX * 2 - categoryWidth - verseNoWidth));
        const cardHeight = preset.cardPaddingY * 2 + verseLines.length * preset.verseLineHeight;
        return { item, verseLines, cardHeight, categoryText };
      });
      const metaHeight = preset.topMetaSize;
      const messageHeight = messageLines.length * preset.messageLineHeight;
      const hashtagHeight = preset.hashtagSize;
      const cardsHeight = cardLayouts.reduce((sum, entry) => sum + entry.cardHeight, 0)
        + preset.verseGap * Math.max(0, cardLayouts.length - 1);
      const totalHeight = preset.outerPadding * 2
        + metaHeight
        + preset.sectionGap
        + preset.messageTopMargin
        + messageHeight
        + preset.messageBottomMargin
        + preset.sectionGap
        + preset.verseTopMargin
        + cardsHeight
        + preset.sectionGap
        + hashtagHeight;

      return { preset, messageFont, verseBodyFont, verseLabelFont, messageLines, cardLayouts, totalHeight };
    })();

  return {
    width,
    height,
    ...fittedLayout,
  };
}

const shareImagePageItems = computed(() => {
  const items = previewVerseDetails.value;
  if (!items.length) return [];

  const layout = getShareLayout(items);
  if (!layout) return [];

  const maxContentHeight = layout.height - layout.preset.outerPadding * 2;
  const staticHeight = layout.preset.topMetaSize
    + layout.preset.sectionGap
    + layout.preset.messageTopMargin
    + layout.messageLines.length * layout.preset.messageLineHeight
    + layout.preset.messageBottomMargin
    + layout.preset.sectionGap
    + layout.preset.verseTopMargin
    + layout.preset.sectionGap
    + layout.preset.hashtagSize;
  const maxCardsHeight = Math.max(0, maxContentHeight - staticHeight);
  const pages: typeof items[] = [];
  let currentPage: typeof items = [];
  let currentHeight = 0;

  layout.cardLayouts.forEach(({ item, cardHeight }, index) => {
    const nextHeight = currentPage.length === 0
      ? cardHeight
      : currentHeight + layout.preset.verseGap + cardHeight;

    if (currentPage.length > 0 && nextHeight > maxCardsHeight) {
      pages.push(currentPage);
      currentPage = [item];
      currentHeight = cardHeight;
      return;
    }

    currentPage.push(item);
    currentHeight = currentPage.length === 1
      ? cardHeight
      : currentHeight + layout.preset.verseGap + cardHeight;

    if (index === layout.cardLayouts.length - 1 && currentPage.length) {
      pages.push(currentPage);
    }
  });

  return pages;
});

async function createShareImageBlobForItems(items: ShareVerseDetail[]) {
  const layout = getShareLayout(items);
  if (!layout) return null;

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = Math.min(layout.height, layout.totalHeight);

  const context = canvas.getContext('2d');
  if (!context) return null;

  const {
    width,
    preset,
    messageFont,
    verseBodyFont,
    verseLabelFont,
    messageLines,
    cardLayouts,
    totalHeight,
  } = layout;
  const actualHeight = Math.min(layout.height, totalHeight);

  context.fillStyle = '#f7f0e5';
  context.fillRect(0, 0, width, actualHeight);

  let currentY = preset.outerPadding;
  const contentWidth = width - preset.outerPadding * 2;

  context.textBaseline = 'top';
  context.font = `600 ${preset.topMetaSize}px "Noto Sans KR", sans-serif`;
  context.fillStyle = '#7b6758';
  context.textAlign = 'left';
  context.fillText([shareNicknameLabel.value, shareDateLabel.value].filter(Boolean).join(' '), preset.outerPadding, currentY);
  context.textAlign = 'right';
  context.fillStyle = '#4a3426';
  context.fillText(shareVerseRange.value, width - preset.outerPadding, currentY);

  currentY += preset.topMetaSize + preset.sectionGap;
  currentY += preset.messageTopMargin;

  context.textAlign = 'center';
  context.font = messageFont;
  context.fillStyle = '#9d4f2c';
  messageLines.forEach((line) => {
    context.fillText(line, width / 2, currentY);
    currentY += preset.messageLineHeight;
  });

  currentY += preset.messageBottomMargin;
  currentY += preset.sectionGap;
  currentY += preset.verseTopMargin;
  context.textAlign = 'left';

  cardLayouts.forEach(({ item, verseLines, cardHeight, categoryText }) => {
    const x = preset.outerPadding;
    const y = currentY;
    const cardWidth = contentWidth;

    drawRoundedRect(context, x, y, cardWidth, cardHeight, preset.borderRadius);
    context.fillStyle = item.palette?.soft || '#fffaf4';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = item.palette?.color || '#d7cabc';
    context.stroke();

    const startX = x + preset.cardPaddingX;
    let lineY = y + preset.cardPaddingY;

    context.font = verseLabelFont;
    context.fillStyle = '#7b6758';
    context.fillText(categoryText, startX, lineY);
    const categoryWidth = context.measureText(categoryText).width;
    context.font = `700 ${Math.max(11, preset.verseLabelSize - 2)}px "Noto Sans KR", sans-serif`;
    context.fillStyle = '#bf2d2d';
    context.fillText(String(item.verseNo), startX + categoryWidth, lineY - 4);
    const verseStartX = startX + categoryWidth + context.measureText(String(item.verseNo)).width + 4;
    context.font = verseBodyFont;
    lineY += 1;
    verseLines.forEach((line) => {
      context.fillStyle = item.godSay ? '#bf2d2d' : '#2f261d';
      context.fillText(line, verseStartX, lineY);
      lineY += preset.verseLineHeight;
    });

    currentY += cardHeight + preset.verseGap;
  });

  currentY += preset.sectionGap - preset.verseGap;

  context.font = `700 ${preset.hashtagSize}px "Noto Sans KR", sans-serif`;
  context.fillStyle = '#9d4f2c';
  context.textAlign = 'left';
  context.fillText(shareHashtags.value, preset.outerPadding, currentY);

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function loadChapterState() {
  const reflectionResponse = await bible.listReflections({
    bookNo: bookNo.value,
    chapterNo: chapterNo.value,
  });

  reflections.value = reflectionResponse.data;
}

function buildNextSelectedItems(verse: BibleVerse) {
  const key = getVerseItemKey(verse);
  const existingItem = paintMap.value.get(key);

  if (existingItem) {
    if (existingItem.category === selectedCategory.value) {
      return selectedVerseItems.value.filter((item) => getVerseItemKey(item) !== key);
    }

    return selectedVerseItems.value.map((item) => {
      if (getVerseItemKey(item) !== key) return item;
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

function handleVerseClick(verse: BibleVerse) {
  localSelectedVerseItems.value = buildNextSelectedItems(verse);
}

watch(selectedVerseIds, (ids) => {
  if (!ids.length) {
    representativeVerseNo.value = null;
    return;
  }

  if (!representativeVerseNo.value || !ids.includes(representativeVerseNo.value)) {
    representativeVerseNo.value = ids[0];
  }
}, { immediate: true });

function selectRepresentativeVerse(verseNo: number) {
  representativeVerseNo.value = verseNo;
}

function resetCurrentChapter() {
  localSelectedVerseItems.value = [];
  reflectionText.value = '';
  representativeVerseNo.value = null;
  setToast('현재 창에서 선택한 내용을 지웠습니다.');
}

function applyReflectionSelection(item: ReflectionItem) {
  localSelectedVerseItems.value = item.verseIDs || [];
  reflectionText.value = item.text || '';
  representativeVerseNo.value = item.mainVerseNo || item.verseIDs?.[0]?.verseNo || null;
  selectedShareReflection.value = item;
  if (showSourceCategories.value) showSourceCategories.value = false;
}

async function submitReflection() {
  auth.syncSession();

  if (auth.currentUser.value?.userNo && !auth.currentUser.value.nickname) {
    try {
      await auth.fetchMe();
    } catch {
      // Keep save flow going; server also backfills nickname by userNo.
    }
  }

  if (!auth.currentUser.value?.userNo || !auth.token.value) {
    const redirect = encodeURIComponent(route.fullPath);
    await router.push(`/login?redirect=${redirect}`);
    return;
  }

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
      rid: shareReflection.value?.rid,
      userNo: auth.currentUser.value.userNo,
      nickname: auth.currentUser.value.nickname,
      bookNo: bookNo.value,
      chapterNo: chapterNo.value,
      paragraphNo: getParagraphNoForVerse(representativeVerseNo.value || selectedVerseItems.value[0]?.verseNo || 1),
      mainVerseNo: representativeVerseNo.value || selectedVerseItems.value[0]?.verseNo || 1,
      verseRange: selectedVerseRange.value,
      verseIDs: selectedVerseItems.value,
      text: reflectionText.value.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    reflections.value = [response.data, ...reflections.value.filter((item) => !(item.userNo === response.data.userNo && item.verseRange === response.data.verseRange))];
    selectedShareReflection.value = response.data;
    setToast('한 구절 나눔을 저장했습니다.');
  } catch (error: any) {
    setToast(error?.data?.message || error?.message || '한 구절 나눔 저장 중 오류가 발생했습니다.');
  } finally {
    savingReflection.value = false;
  }
}

async function copyShareMessage() {
  copyingMessage.value = true;
  try {
    if (!shareReflection.value) {
      setToast('한 구절 나눔을 저장한 뒤 공유할 수 있습니다.');
      return;
    }
    await navigator.clipboard.writeText(shareMessage.value);
    setToast('한 구절 나눔을 복사했습니다.');
  } catch {
    setToast('한 구절 나눔을 복사하지 못했습니다.');
  } finally {
    copyingMessage.value = false;
  }
}

async function copyShareImage(pageIndex?: number) {
  const copyKey = pageIndex === undefined ? 'single' : `page-${pageIndex}`;
  copyingImageKey.value = copyKey;
  try {
    if (!shareReflection.value) {
      setToast('한줄나누기를 저장한 뒤 공유할 수 있습니다.');
      return;
    }
    const pageItems = pageIndex === undefined
      ? previewVerseDetails.value
      : shareImagePageItems.value[pageIndex] || [];
    const imageBlob = await createShareImageBlobForItems(pageItems);

    if (!imageBlob) {
      setToast('복사할 이미지가 없습니다.');
      return;
    }

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setToast('현재 브라우저에서는 이미지 복사를 지원하지 않습니다.');
      return;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': imageBlob,
      }),
    ]);
    setToast('공유 이미지를 복사했습니다.');
  } catch {
    setToast('이미지 복사에 실패했습니다.');
  } finally {
    copyingImageKey.value = '';
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
  representativeVerseNo.value = null;
    localSelectedVerseItems.value = [];
    selectedShareReflection.value = null;
    chapterInput.value = String(chapterNo.value);
    await loadChapterState();
  },
  { immediate: true },
);
</script>

<template>
  <div class="reading-page">
    <section class="mvp-card mvp-main">
      <section class="mvp-section mvp-sticky-controls">
        <div class="mvp-reading-nav">
          <div class="mvp-reading-nav-row mvp-reading-nav-row--top">
            <div class="mvp-reading-nav-left">
              <div class="mvp-testament-tabs">
                <button type="button" :class="['mvp-toolbar-button', { active: currentTestament === 'old' }]" @click="moveToTestament('old')">구약</button>
                <button type="button" :class="['mvp-toolbar-button', { active: currentTestament === 'new' }]" @click="moveToTestament('new')">신약</button>
              </div>

              <label class="mvp-nav-field mvp-nav-field--select">
                <select class="mvp-nav-select mvp-nav-select--short" :value="bookNo" @change="handleBookChange">
                  <option v-for="book in testamentBooks" :key="book.bookNo" :value="book.bookNo">
                    {{ book.church }}
                  </option>
                </select>
              </label>
            </div>

            <div class="mvp-reading-nav-right">
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
                <label class="mvp-nav-field mvp-nav-field--inline mvp-nav-field--input">
                  <input v-model="chapterInput" class="mvp-nav-input mvp-nav-input--compact" inputmode="numeric" @keyup.enter="submitChapterInput()" />
                  <button type="button" class="mvp-nav-input-action" aria-label="장 이동" @click="submitChapterInput()">
                    <i class="fa-solid fa-paper-plane" />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <!-- <div class="mvp-toolbar mvp-toolbar--hero"> -->
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

            <div class="mvp-toolbar-actions mvp-toolbar-actions--hero">
              <button type="button" :class="['mvp-toolbar-button', { active: showSourceCategories }]" @click="showSourceCategories = !showSourceCategories">
                {{ showSourceCategories ? '내 선택 보기' : '카테고리 보기' }}
              </button>
              <button type="button" class="mvp-toolbar-button" @click="resetCurrentChapter()">선택 초기화</button>
            </div>
          <!-- </div> -->
        </div>
      </section>

      <section class="mvp-hero">
        <div class="mvp-hero-grid">
          <div style="display: flex; flex-wrap: wrap; gap: 0.65rem;">
            <h2 class="mvp-title">{{ chapterLabel }}</h2>
            <h4 class="mvp-block-title">장별 주제</h4>
          </div>

          <div class="mvp-hero-summary">
            <h4>{{ chapter?.subject || '장 주제 미정' }}</h4>
            <!-- <p>{{ chapter?.excerpt || '장 요약 데이터가 아직 없습니다.' }}</p> -->
          </div>
        </div>
      </section>

      <section class="mvp-section">
        <p v-if="pending" class="mvp-muted">본문을 불러오는 중입니다.</p>
        <p v-else-if="error" class="mvp-muted">{{ error.message }}</p>

        <div v-else-if="chapter" class="mvp-paragraphs">
          <article v-for="paragraph in chapter.paragraphs" :key="paragraph.paragraphNo" class="mvp-paragraph-card">
            <h4 class="mvp-block-title">{{ paragraph.subject || '블록 주제 없음' }}</h4>

            <div class="mvp-segments">
              <button
                v-for="verse in paragraph.verses"
                :key="`${paragraph.paragraphNo}-${verse.verseNo}-${verse.verse}`"
                type="button"
                :class="['segment', { painted: Boolean(getSavedPaint(verse)), say: verse.godSay || verse.say }]"
                :style="{ background: getDisplayBackground(verse), borderColor: getDisplayBorderColor(verse) }"
                @click="handleVerseClick(verse)"
              >
                <span v-if="getSelectedCategoryLabel(verse)" class="mvp-segment-picked">
                  <span class="mvp-segment-picked-category">[{{ getSelectedCategoryLabel(verse) }}]</span>
                  <sup class="mvp-segment-picked-no">{{ verse.verseNo }}</sup>
                  <span class="mvp-segment-picked-text" :style="{ color: getVerseTextColor(verse) }">{{ verse.verse }}</span>
                </span>
                <span v-else class="mvp-segment-plain">
                  <sup class="mvp-segment-picked-no">{{ verse.verseNo }}</sup>
                  <span class="mvp-segment-picked-text" :style="{ color: getVerseTextColor(verse) }">{{ verse.verse }}</span>
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>

    <aside class="mvp-card mvp-sidebar">
      <section class="mvp-sidebar-block">
        <h3>한 구절 나눔</h3>
        <div class="mvp-selected-range mvp-selected-range--compact">
          <p class="mvp-selected-range-title">마음에 남은 구절을 눌러보세요</p>
          <div class="mvp-selected-verse-chips">
            <button
              v-for="verseNo in selectedVerseIds"
              :key="verseNo"
              type="button"
              :class="['mvp-selected-verse-chip', { active: representativeVerseNo === verseNo }]"
              @click="selectRepresentativeVerse(verseNo)"
            >
              {{ verseNo }}절
            </button>
            <span v-if="!selectedVerseIds.length" class="mvp-muted">선택한 구절이 아직 없습니다.</span>
          </div>
        </div>
        <textarea
          v-model="reflectionText"
          class="mvp-textarea"
          placeholder="내가 선택한 성경절을 붙들고 한 줄 나눔을 적어 주세요."
        />
        <!-- <div class="mvp-selected-range">{{ selectedVerseRange || '선택한 구절이 없습니다.' }}</div> -->
        <div class="mvp-toolbar-actions">
          <button type="button" class="mvp-toolbar-button active" :disabled="savingReflection" @click="submitReflection()">
            {{ savingReflection ? '저장 중' : '한 구절 나눔 저장' }}
          </button>
          <button type="button" :class="['mvp-toolbar-button', { active: showAllSharing }]" @click="showAllSharing = !showAllSharing">
            {{ showAllSharing ? '나눔감추기' : '나눔전체 보기' }}
          </button>
        </div>
        <p v-if="toast" class="mvp-muted">{{ toast }}</p>
      </section>

      <section class="mvp-sidebar-block">
        <div class="mvp-sharing-list">
          <article
            v-for="item in sharingList"
            :key="`${item.userNo}-${item.verseRange}-${item.updatedAt}`"
            class="mvp-sharing-item"
            @click="applyReflectionSelection(item)"
          >
            <div class="mvp-sharing-head">
              <span><strong>{{ getReflectionDisplayName(item) }}</strong> {{ formatRelativeTime(item.updatedAt) }}</span>
              <span>{{ item.verseRange }}</span>
            </div>
            <p class="mvp-sharing-message">{{ item.text }}</p>
          </article>
          <p v-if="!sharingList.length" class="mvp-muted">아직 저장된 나눔이 없습니다.</p>
        </div>
      </section>

      <section class="mvp-sidebar-block">
        <h3>지금 말씀 나눠보기</h3>
        <div class="mvp-toolbar-actions">
          <button
            v-for="(label, index) in shareImageLabels"
            :key="label"
            type="button"
            class="mvp-toolbar-button active"
            :disabled="copyingImageKey !== '' || !shareReflection"
            @click="copyShareImage(shareImageLabels.length === 1 ? undefined : index)"
          >
            {{ copyingImageKey === (shareImageLabels.length === 1 ? 'single' : `page-${index}`) ? '복사 중' : label }}
          </button>
          <button type="button" class="mvp-toolbar-button active" :disabled="copyingMessage || !shareReflection" @click="copyShareMessage()">
            {{ copyingMessage ? '복사 중' : '나눔문장 복사' }}
          </button>
        </div>
        <div class="mvp-share-card">
          <div class="mvp-share-card-meta">
            <span>{{ [shareNicknameLabel, shareDateLabel].filter(Boolean).join(' ') }}</span>
            <strong>{{ shareVerseRange }}</strong>
          </div>
          <p class="mvp-share-card-message">{{ shareReflection?.text || '' }}</p>
          <div class="mvp-share-card-verses mvp-share-card-verses--compact">
            <div
              v-for="item in previewVerseDetails"
              :key="`${item.label}-${item.category}-${item.verse}`"
              class="mvp-share-card-verse"
              :style="{ background: item.palette?.soft || '#ffffff', borderColor: item.palette?.color || '#d7cabc' }"
            >
              <p class="mvp-share-card-verse-line">
                <span class="mvp-share-card-verse-category">[{{ item.category }}]</span>
                <sup class="mvp-share-card-verse-no">{{ item.verseNo }}</sup>
                <span class="mvp-share-card-verse-text" :style="{ color: item.godSay ? '#bf2d2d' : '#2f261d' }">{{ item.verse }}</span>
              </p>
            </div>
            <p v-if="!previewVerseDetails.length" class="mvp-muted"></p>
          </div>
          <div class="mvp-share-copy-text">
            <strong v-if="shareReflection">{{ shareHashtags }}</strong>
          </div>
        </div>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.mvp-share-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.mvp-share-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.78rem;
  color: #7b6758;
}

.mvp-share-card-meta strong {
  color: #3a271b;
  text-align: right;
}

.mvp-share-card-message {
  margin: 1.8rem 0 1.25rem;
  font-size: 1.35rem;
  line-height: 1.65;
  font-weight: 700;
  color: #9d4f2c;
  text-align: center;
}

.mvp-share-card-verses--compact {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.85rem;
}

.mvp-share-card-verse {
  padding: 0.85rem 0.9rem;
  border: 1px solid #d7cabc;
  border-radius: 5px;
}

.mvp-share-card-verse-line {
  display: flex;
  align-items: flex-start;
  gap: 0.18rem;
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.mvp-share-card-verse-category {
  color: #7b6758;
  font-size: 0.82rem;
  white-space: nowrap;
}

.mvp-share-card-verse-no {
  color: #bf2d2d;
  font-size: 0.68rem;
  line-height: 1;
  top: 0.05rem;
}

.mvp-share-card-verse-text {
  font-size: 0.88rem;
}

.mvp-share-copy-text strong {
  display: block;
  color: #9d4f2c;
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>






