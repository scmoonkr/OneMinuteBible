export type BibleVerse = {
  verse: string;
  verseNo: number;
  category?: string;
  categoryOriginal?: string;
  say?: boolean;
  godSay?: boolean;
};

export type BibleParagraph = {
  paragraphNo: number;
  verseNo: number;
  startVerse: number;
  endVerse: number;
  subject: string;
  summary: string;
  excerpt?: string;
  verses: BibleVerse[];
};

export type BibleChapter = {
  book: string;
  bookNo: number;
  chapterNo: number;
  subject: string;
  excerpt: string;
  audio?: string;
  paragraphs: BibleParagraph[];
};

export type BibleReadResponse = {
  ok: boolean;
  count: number;
  data: BibleChapter;
};

export type ReadingPaint = {
  userId: string;
  bookNo: number;
  chapterNo: number;
  paragraphNo: number;
  verseRange: string;
  verseIDs: number[];
  category: string;
  updatedAt: string;
};

export type ReflectionItem = {
  userId: string;
  bookNo: number;
  chapterNo: number;
  paragraphNo: number;
  verseRange: string;
  verseIDs: number[];
  text: string;
  mine: boolean;
  updatedAt: string;
  createdAt: string;
};

type ReadChapterParams = {
  bookNo: number;
  chapterNo: number;
};

export function useBible() {
  const config = useRuntimeConfig();

  async function readChapter(params: ReadChapterParams) {
    return await $fetch<BibleReadResponse>(`${config.public.apiBase}/api/bible/read`, {
      query: params,
    });
  }

  async function listReadingPaints(query: {
    userId: string;
    bookNo: number;
    chapterNo: number;
  }) {
    return await $fetch<{ ok: boolean; data: ReadingPaint[] }>(
      `${config.public.apiBase}/api/reading-paints`,
      { query },
    );
  }

  async function saveReadingPaint(body: ReadingPaint) {
    return await $fetch<{ ok: boolean; data: ReadingPaint }>(
      `${config.public.apiBase}/api/reading-paints`,
      {
        method: 'POST',
        body,
      },
    );
  }

  async function clearReadingPaints(query: {
    userId: string;
    bookNo: number;
    chapterNo: number;
  }) {
    return await $fetch<{ ok: boolean; data: { deletedCount: number } }>(
      `${config.public.apiBase}/api/reading-paints`,
      {
        method: 'DELETE',
        query,
      },
    );
  }

  async function listReflections(query: {
    userId?: string;
    bookNo: number;
    chapterNo: number;
    paragraphNo?: number;
    mine?: boolean;
  }) {
    return await $fetch<{ ok: boolean; data: ReflectionItem[] }>(
      `${config.public.apiBase}/api/reflections`,
      { query },
    );
  }

  async function saveReflection(body: ReflectionItem) {
    return await $fetch<{ ok: boolean; data: ReflectionItem }>(
      `${config.public.apiBase}/api/reflections`,
      {
        method: 'POST',
        body,
      },
    );
  }

  return {
    readChapter,
    listReadingPaints,
    saveReadingPaint,
    clearReadingPaints,
    listReflections,
    saveReflection,
  };
}
