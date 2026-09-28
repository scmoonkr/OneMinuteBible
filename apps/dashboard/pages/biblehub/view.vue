<script setup lang="ts">
type Item = { title: string; slug?: string };
type BiblehubChapter = { people: Item[]; place: Item[]; events: Item[] };

const { book, bookNo, chapterNo } = useChapterQuery();

const { data, status, error } = useFetch<{ data: BiblehubChapter }>('/api/bible/biblehub', {
  query: { bookNo, chapterNo },
  server: false,
});

const groups = computed(() => {
  const d = data.value?.data;
  return [
    { key: 'people', label: '인물', items: d?.people ?? [] },
    { key: 'place', label: '장소', items: d?.place ?? [] },
    { key: 'events', label: '사건', items: d?.events ?? [] },
  ];
});
</script>

<template>
  <div>
    <h1>BibleHub · View</h1>
    <p class="page-desc">{{ book.church }} {{ chapterNo }}장의 인물·장소·사건 (연결된 글이 있으면 글 제목)</p>

    <ChapterPicker />

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">
      불러오지 못했습니다. ({{ error.statusCode || error.message }})
    </div>
    <div v-else class="groups">
      <div v-for="g in groups" :key="g.key" class="panel">
        <h3>{{ g.label }} <small>{{ g.items.length }}</small></h3>
        <p v-if="!g.items.length" class="empty">없음</p>
        <ul v-else>
          <li v-for="(item, i) in g.items" :key="i">
            {{ item.title }}
            <span v-if="item.slug" class="linked">글 연결됨</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

h3 small {
  color: var(--muted);
  font-weight: 400;
}

ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
}

.empty {
  margin: 0;
  color: var(--muted);
}

.linked {
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
}
</style>
