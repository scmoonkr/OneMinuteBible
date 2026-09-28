export type ConfessionBible = {
  context: string;
  bibles: string;
  verses: { index: string; verse: string }[];
  error?: boolean;
};

export type Contemplation = Partial<Record<(typeof CONTEMPLATION_DAYS)[number]['key'], string>>;

export type Confession = {
  book: string;
  questionNo: number;
  week: number;
  title?: string;
  subject: string;
  question: string;
  answer: string;
  summary: string;
  questionEng?: string;
  answerEng?: string;
  check?: string[];
  contemplation?: Contemplation;
  bible?: ConfessionBible[];
  daily: boolean;
};

export type ConfessionListItem = Pick<Confession, 'book' | 'questionNo' | 'week' | 'title' | 'subject' | 'question' | 'daily'>;

export const CONTEMPLATION_DAYS = [
  { key: 'monday', label: '월' },
  { key: 'tuesday', label: '화' },
  { key: 'wednesday', label: '수' },
  { key: 'thursday', label: '목' },
  { key: 'friday', label: '금' },
  { key: 'saturday', label: '토' },
] as const;

export const DEFAULT_CONFESSION_BOOK = '하이델베르크신앙고백';

// 404 가 "데이터 없음"인지 "서버에 경로 자체가 없음"(재시작 안 한 옛 서버)인지 가른다.
// 우리 API 는 404 도 JSON { ok:false, message } 로 주고, Express 기본 404 는 HTML 이다.
export function isMissingRoute(error: any) {
  const status = error?.statusCode || error?.status;
  return status === 404 && typeof error?.data?.message !== 'string';
}

// 답변 본문에 섞인 성경 근거 "(롬 3:20; 7:7)" 를 걷어 낸다.
export function stripReferences(text = '') {
  return text.replace(/\([^)]*\)/g, '');
}

// 목록·상세·편집 화면이 함께 쓰는 book/questionNo 쿼리.
export function useConfessionQuery() {
  const route = useRoute();

  const book = computed(() => String(route.query.book || DEFAULT_CONFESSION_BOOK));
  const questionNo = computed(() => Number(route.query.questionNo) || 1);

  return { book, questionNo };
}

export function confessionPath(book: string, questionNo: number) {
  return `/api/confession/${encodeURIComponent(book)}/${questionNo}`;
}

// 서버 오류 메시지를 한 줄로 만든다.
export function apiErrorMessage(error: any) {
  const status = error?.statusCode || error?.status;
  if (status === 401) return '로그인이 필요합니다. 웹(7711)에서 로그인한 뒤 다시 시도하세요.';
  if (status === 403) return '권한이 없습니다. (manager 이상)';
  if (isMissingRoute(error)) return '서버에 이 API 가 없습니다. 서버(pnpm run dev:server)를 재시작하세요.';
  return error?.data?.message || error?.message || '요청에 실패했습니다.';
}
