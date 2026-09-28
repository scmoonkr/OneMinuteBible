<script setup lang="ts">
const router = useRouter();
const { book } = useConfessionQuery();

// API 는 Vite 프록시(/api → 서버)로만 닿으므로 클라이언트에서만 부른다.
const { data: books } = useFetch<{ data: { book: string; count: number }[] }>('/api/confession/books', {
  server: false,
});

const { data, status, error } = useFetch<{ data: ConfessionListItem[] }>('/api/confession', {
  query: { book },
  server: false,
});

const rows = computed(() => data.value?.data ?? []);

function selectBook(value: string) {
  router.replace({ query: { book: value } });
}
</script>

<template>
  <div>
    <h1>Confession</h1>
    <p class="page-desc">신앙고백·요리문답 목록</p>

    <div class="toolbar">
      <button
        v-for="b in books?.data ?? []"
        :key="b.book"
        class="book-tab"
        :class="{ active: b.book === book }"
        @click="selectBook(b.book)"
      >
        {{ b.book }} <small>{{ b.count }}</small>
      </button>
    </div>

    <div class="panel">
      <div v-if="status === 'idle' || status === 'pending'" class="state">불러오는 중…</div>
      <div v-else-if="error" class="state error">{{ apiErrorMessage(error) }}</div>
      <div v-else-if="!rows.length" class="state">문답이 없습니다.</div>
      <ul v-else class="list">
        <li v-for="row in rows" :key="row.questionNo">
          <span class="week">제{{ row.week || 1 }}주</span>
          <NuxtLink :to="{ path: '/confession/view', query: { book: row.book, questionNo: row.questionNo } }" class="subject">
            {{ row.subject || `제${row.questionNo}문답` }}
          </NuxtLink>
          <span v-if="row.daily" class="days">
            <span v-for="d in CONTEMPLATION_DAYS" :key="d.key">{{ d.label }}</span>
          </span>
          <NuxtLink :to="{ path: '/confession/edit', query: { book: row.book, questionNo: row.questionNo } }" class="edit">
            Edit
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.book-tab.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.book-tab small {
  color: var(--muted);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.list li:last-child {
  border-bottom: 0;
}

.week {
  width: 52px;
  flex-shrink: 0;
  color: var(--accent);
  font-weight: 600;
}

.subject {
  flex: 1;
  min-width: 200px;
}

.subject:hover {
  color: var(--accent);
}

.days {
  display: flex;
  gap: 4px;
}

.days span {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--accent);
  font-size: 12px;
}

.edit {
  color: var(--muted);
  font-size: 12px;
}

.edit:hover {
  color: var(--accent);
}
</style>
