<script setup lang="ts">
import { bibleExplorer, findBibleBookMeta } from '~/data/bibleExplorer';

const route = useRoute();
const router = useRouter();

const testamentType = computed(() => {
  const value = route.query.testament;
  return typeof value === 'string' ? value : '';
});

const groupLabel = computed(() => {
  const value = route.query.group;
  return typeof value === 'string' ? value : '';
});

const selectedTestament = computed(() =>
  bibleExplorer.find((item) => item.type === testamentType.value) ?? null,
);

const selectedGroup = computed(() =>
  selectedTestament.value?.groups.find((item) => item.label === groupLabel.value) ?? null,
);

const breadcrumb = computed(() => [
  { label: '말씀 펼쳐보기', step: 'root' as const, active: !selectedTestament.value },
  ...(selectedTestament.value ? [{ label: selectedTestament.value.label, step: 'testament' as const, active: !selectedGroup.value }] : []),
  ...(selectedGroup.value ? [{ label: selectedGroup.value.label, step: 'group' as const, active: true }] : []),
]);

const sectionTitle = computed(() => {
  if (!selectedTestament.value) return '구약과 신약 중 어디에서 시작할지 골라보세요';
  if (!selectedGroup.value) return `${selectedTestament.value.label}의 흐름을 펼쳐봅니다`;
  return `${selectedGroup.value.label}에서 읽고 싶은 책을 골라보세요`;
});

const sectionCopy = computed(() => {
  if (!selectedTestament.value) {
    return '성경을 목차보다 흐름으로 펼쳐 읽을 수 있도록 큰 묶음부터 책까지 자연스럽게 따라가도록 구성했습니다.';
  }

  if (!selectedGroup.value) return selectedTestament.value.description;
  return selectedGroup.value.description;
});

const currentItems = computed(() => {
  if (!selectedTestament.value) {
    return bibleExplorer.map((item) => ({
      key: item.type,
      title: item.label,
      description: item.description,
      level: 'testament' as const,
    }));
  }

  if (!selectedGroup.value) {
    return selectedTestament.value.groups.map((item) => ({
      key: `${selectedTestament.value?.type}-${item.label}`,
      title: item.label,
      description: item.description,
      level: 'group' as const,
    }));
  }

  return selectedGroup.value.books.map((item) => ({
    key: `${selectedGroup.value?.label}-${item.book}`,
    title: item.book,
    description: item.description,
    level: 'book' as const,
  }));
});

function updateQuery(next: { testament?: string; group?: string }) {
  return router.push({
    path: '/bible',
    query: {
      testament: next.testament,
      group: next.group,
    },
  });
}

function selectItem(item: { title: string; level: 'testament' | 'group' | 'book' }) {
  if (item.level === 'testament') {
    const next = bibleExplorer.find((entry) => entry.label === item.title);
    return updateQuery({ testament: next?.type, group: undefined });
  }

  if (item.level === 'group') {
    return updateQuery({ testament: testamentType.value, group: item.title });
  }

  const bookMeta = findBibleBookMeta(item.title);
  if (!bookMeta) return null;
  return navigateTo(`/read/${bookMeta.bookNo}/1`);
}

function moveTo(step: 'root' | 'testament' | 'group') {
  if (step === 'root') {
    return updateQuery({ testament: undefined, group: undefined });
  }

  if (step === 'testament') {
    return updateQuery({ testament: testamentType.value, group: undefined });
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
        시작과 약속, 예수와 복음, 기다림과 회복의 흐름 안에서 책을 고르고 바로 읽기로 이어집니다.
      </p>
    </div>

    <div class="bible-explorer-breadcrumb">
      <button
        v-for="item in breadcrumb"
        :key="`${item.step}-${item.label}`"
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
          :key="item.key"
          type="button"
          class="bible-explorer-card"
          @click="selectItem(item)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
