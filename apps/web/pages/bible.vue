<script setup lang="ts">
import { bibleExplorer } from '~/data/bibleExplorer';

const route = useRoute();
const router = useRouter();

const testamentId = computed(() => {
  const value = route.query.testament;
  return typeof value === 'string' ? value : '';
});

const groupId = computed(() => {
  const value = route.query.group;
  return typeof value === 'string' ? value : '';
});

const bookId = computed(() => {
  const value = route.query.book;
  return typeof value === 'string' ? value : '';
});

const selectedTestament = computed(() =>
  bibleExplorer.find((item) => item.id === testamentId.value) ?? null,
);

const selectedGroup = computed(() =>
  selectedTestament.value?.groups.find((item) => item.id === groupId.value) ?? null,
);

const selectedBook = computed(() =>
  selectedGroup.value?.books.find((item) => item.id === bookId.value) ?? null,
);

const currentItems = computed(() => {
  if (!selectedTestament.value) {
    return bibleExplorer.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      level: 'testament' as const,
    }));
  }

  if (!selectedGroup.value) {
    return selectedTestament.value.groups.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      level: 'group' as const,
    }));
  }

  if (!selectedBook.value) {
    return selectedGroup.value.books.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      level: 'book' as const,
    }));
  }

  return selectedBook.value.stories.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: '이 이야기 흐름으로 읽기를 이어갑니다.',
    level: 'story' as const,
  }));
});

const breadcrumb = computed(() => [
  { label: '말씀 펼쳐보기', active: !selectedTestament.value, step: 'root' as const },
  ...(selectedTestament.value ? [{ label: selectedTestament.value.title, active: !selectedGroup.value, step: 'testament' as const }] : []),
  ...(selectedGroup.value ? [{ label: selectedGroup.value.title, active: !selectedBook.value, step: 'group' as const }] : []),
  ...(selectedBook.value ? [{ label: selectedBook.value.title, active: true, step: 'book' as const }] : []),
]);

const sectionTitle = computed(() => {
  if (!selectedTestament.value) {
    return '구약과 신약 중 어디에서 시작할지 골라보세요';
  }

  if (!selectedGroup.value) {
    return `${selectedTestament.value.title} 안의 큰 흐름입니다`;
  }

  if (!selectedBook.value) {
    return `${selectedGroup.value.title} 안에서 책을 고르세요`;
  }

  return `${selectedBook.value.title} 안의 이야기입니다`;
});

const sectionCopy = computed(() => {
  if (!selectedTestament.value) {
    return '성경을 순서가 아니라 흐름으로 펼쳐 읽기 위한 첫 단계입니다.';
  }

  if (!selectedGroup.value) {
    return selectedTestament.value.subtitle;
  }

  if (!selectedBook.value) {
    return selectedGroup.value.subtitle;
  }

  return selectedBook.value.subtitle;
});

function updateQuery(next: Record<string, string | undefined>) {
  return router.push({
    path: '/bible',
    query: {
      testament: next.testament,
      group: next.group,
      book: next.book,
    },
  });
}

function selectItem(item: { id: string; level: 'testament' | 'group' | 'book' | 'story' }) {
  if (item.level === 'testament') {
    return updateQuery({ testament: item.id, group: undefined, book: undefined });
  }

  if (item.level === 'group') {
    return updateQuery({ testament: testamentId.value, group: item.id, book: undefined });
  }

  if (item.level === 'book') {
    return updateQuery({ testament: testamentId.value, group: groupId.value, book: item.id });
  }

  if (selectedBook.value?.readTarget) {
    return navigateTo(`/read/${selectedBook.value.readTarget.bookNo}/${selectedBook.value.readTarget.chapterNo}`);
  }

  return null;
}

function moveTo(step: 'root' | 'testament' | 'group' | 'book') {
  if (step === 'root') {
    return updateQuery({ testament: undefined, group: undefined, book: undefined });
  }

  if (step === 'testament') {
    return updateQuery({ testament: testamentId.value, group: undefined, book: undefined });
  }

  if (step === 'group') {
    return updateQuery({ testament: testamentId.value, group: groupId.value, book: undefined });
  }

  return null;
}
</script>

<template>
  <section class="bible-explorer page-stack">
    <div class="bible-explorer-hero">
      <p class="bible-explorer-kicker">말씀 펼쳐보기</p>
      <h1 class="bible-explorer-title">성경을 목차보다 흐름으로 펼쳐 읽습니다</h1>
      <p class="bible-explorer-copy">
        큰 묶음에서 책으로, 책에서 이야기로 내려가며 지금 읽고 싶은 흐름을 찾도록 구성했습니다.
      </p>
    </div>

    <div class="bible-explorer-breadcrumb">
      <button
        v-for="item in breadcrumb"
        :key="item.label"
        type="button"
        class="bible-explorer-crumb"
        :class="{ active: item.active }"
        @click="moveTo(item.step)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="bible-explorer-panel">
      <div class="bible-explorer-panel-head">
        <div>
          <h2>{{ sectionTitle }}</h2>
          <p>{{ sectionCopy }}</p>
        </div>

        <NuxtLink class="bible-explorer-read-link" to="/read/1/1">
          바로 읽기
        </NuxtLink>
      </div>

      <div class="bible-explorer-grid">
        <button
          v-for="item in currentItems"
          :key="item.id"
          type="button"
          class="bible-explorer-card"
          @click="selectItem(item)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.subtitle }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
