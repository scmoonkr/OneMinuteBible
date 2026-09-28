import { bibleBooks } from '@webdata/bibleTable';

// 권·장 선택을 URL 쿼리(?bookNo=&chapterNo=)에 담아 새로고침·공유해도 유지되게 한다.
// vue/bible 의 /bible/rainbow?book=&chapter= 링크도 그대로 받는다.
export function useChapterQuery() {
  const route = useRoute();
  const router = useRouter();

  // 바꿀 때는 옛 이름(book/chapter)을 지워 새 이름만 남긴다.
  const replace = (query: Record<string, unknown>) => {
    const { book: _b, chapter: _c, ...rest } = route.query;
    router.replace({ query: { ...rest, ...query } as any });
  };

  const bookNo = computed<number>({
    get: () => Number(route.query.bookNo ?? route.query.book) || bibleBooks[0].bookNo,
    set: (value) => replace({ bookNo: value, chapterNo: 1 }),
  });

  const book = computed(() => bibleBooks.find((b) => b.bookNo === bookNo.value) ?? bibleBooks[0]);

  const chapterNo = computed<number>({
    get: () => {
      const value = Number(route.query.chapterNo ?? route.query.chapter) || 1;
      return Math.min(Math.max(value, 1), book.value.chapter);
    },
    set: (value) => replace({ bookNo: bookNo.value, chapterNo: value }),
  });

  const chapters = computed(() => Array.from({ length: book.value.chapter }, (_, i) => i + 1));

  return { books: bibleBooks, book, bookNo, chapterNo, chapters };
}
