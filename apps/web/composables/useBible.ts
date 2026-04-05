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

export type BibleChapterSummary = {
  bookNo: number;
  chapterNo: number;
  subject: string;
};

export type SelectedVerseItem = {
  verseNo: number;
  category: string;
  verse: string;
  godSay?: boolean;
};

export type ReadingPaint = {
  userNo: number;
  bookNo: number;
  chapterNo: number;
  verseRange: string;
  verseIDs: SelectedVerseItem[];
  text?: string;
  updatedAt: string;
  createdAt?: string;
};

export type ReflectionItem = {
  rid?: string;
  userNo: number;
  nickname?: string;
  bookNo: number;
  chapterNo: number;
  paragraphNo: number;
  verseRange: string;
  verseIDs: SelectedVerseItem[];
  text: string;
  updatedAt: string;
  createdAt: string;
  mine?: boolean;
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

  async function listBookChapters(query: { bookNo: number }) {
    return await $fetch<{ ok: boolean; data: BibleChapterSummary[] }>(
      `${config.public.apiBase}/api/bible/chapters`,
      { query },
    );
  }

  async function listReflections(query: {
    userNo?: number;
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
    listBookChapters,
    listReflections,
    saveReflection,
  };
}
