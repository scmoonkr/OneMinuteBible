<script setup lang="ts">
import type { ReflectionItem } from '~/composables/useBible';

const bible = useBible();
const auth = useAuth();

const bookNo = ref(1);
const chapterNo = ref(1);
const chapterTitle = ref('창세기 1장');
const reflections = ref<ReflectionItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');

const totalVerses = computed(() =>
  reflections.value.reduce((sum, item) => sum + item.verseIDs.length, 0),
);

const lastUpdated = computed(() => {
  const latest = reflections.value[0]?.updatedAt;
  return latest ? formatRelativeTime(latest) : '아직 기록 없음';
});

watch(
  () => [bookNo.value, chapterNo.value, auth.currentUser.value?.userNo],
  async () => {
    await loadReview();
  },
  { immediate: true },
);

async function loadReview() {
  if (!auth.currentUser.value?.userNo) {
    reflections.value = [];
    errorMessage.value = '로그인 후 내가 남긴 묵상을 돌아볼 수 있습니다.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const [chapter, saved] = await Promise.all([
      bible.readChapter({ bookNo: bookNo.value, chapterNo: chapterNo.value }),
      bible.listReflections({
        userNo: auth.currentUser.value.userNo,
        bookNo: bookNo.value,
        chapterNo: chapterNo.value,
      }),
    ]);

    chapterTitle.value = `${chapter.data.book} ${chapter.data.chapterNo}장`;
    reflections.value = [...saved.data].sort((a, b) => (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  } catch (error) {
    reflections.value = [];
    errorMessage.value = error instanceof Error ? error.message : '돌아보기 데이터를 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
}

function moveChapter(delta: number) {
  chapterNo.value = Math.max(1, chapterNo.value + delta);
}

function openRead() {
  return navigateTo(`/read/${bookNo.value}/${chapterNo.value}`);
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));

  if (seconds < 60) return `${seconds}초전`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일전`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월전`;

  return `${Math.floor(days / 365)}년전`;
}
</script>

<template>
  <section class="review-page page-stack">
    <div class="review-hero">
      <p class="review-kicker">돌아보기</p>
      <h1 class="review-title">남겨둔 한 줄을 다시 읽으며 흐름을 확인합니다</h1>
      <p class="review-copy">
        읽기에서 남긴 표시와 한 줄 묵상은 시간이 지난 뒤 다시 읽을 때 더 또렷해집니다.
      </p>
    </div>

    <div class="review-toolbar">
      <div class="review-toolbar-group">
        <strong>{{ chapterTitle }}</strong>
        <span>내가 남긴 기록을 장 단위로 다시 봅니다.</span>
      </div>

      <div class="review-toolbar-actions">
        <button type="button" class="review-chip" @click="moveChapter(-1)">이전 장</button>
        <input v-model.number="chapterNo" type="number" min="1" class="review-input">
        <button type="button" class="review-chip" @click="moveChapter(1)">다음 장</button>
        <button type="button" class="review-chip review-chip--dark" @click="openRead">말씀으로</button>
      </div>
    </div>

    <div class="review-stats">
      <article class="review-stat-card">
        <strong>저장 개수</strong>
        <span>{{ reflections.length }}개</span>
      </article>

      <article class="review-stat-card">
        <strong>선택 구절</strong>
        <span>{{ totalVerses }}개</span>
      </article>

      <article class="review-stat-card">
        <strong>마지막 기록</strong>
        <span>{{ lastUpdated }}</span>
      </article>
    </div>

    <div v-if="loading" class="review-empty">돌아보기 기록을 불러오는 중입니다.</div>
    <div v-else-if="errorMessage" class="review-empty">{{ errorMessage }}</div>
    <div v-else-if="!reflections.length" class="review-empty">아직 이 장에 남긴 묵상이 없습니다.</div>

    <div v-else class="review-list">
      <article
        v-for="item in reflections"
        :key="item.rid || `${item.verseRange}-${item.updatedAt}`"
        class="review-card"
      >
        <div class="review-card-head">
          <strong>{{ item.nickname || `#${item.userNo}` }}</strong>
          <span>{{ item.verseRange }}</span>
        </div>

        <div class="review-card-sub">
          <span>{{ formatRelativeTime(item.updatedAt) }}</span>
          <span>{{ item.verseIDs.length }}개 구절</span>
        </div>

        <p class="review-card-text">{{ item.text }}</p>

        <div class="review-card-tags">
          <span
            v-for="verse in item.verseIDs"
            :key="`${item.rid}-${verse.verseNo}-${verse.verse}`"
            class="review-card-tag"
          >
            {{ verse.category }} {{ verse.verseNo }}절
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
