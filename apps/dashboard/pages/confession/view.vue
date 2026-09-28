<script setup lang="ts">
const { book, questionNo } = useConfessionQuery();

const { data, status, error } = useFetch<{ data: Confession }>(() => confessionPath(book.value, questionNo.value), {
  server: false,
});

const item = computed(() => data.value?.data ?? null);

// 요일별 묵상 중 내용이 있는 것만.
const contemplations = computed(() =>
  CONTEMPLATION_DAYS
    .map((d) => ({ ...d, text: item.value?.contemplation?.[d.key] || '' }))
    .filter((d) => d.text.trim()),
);

const copied = ref('');
async function copy(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = label;
  } catch {
    copied.value = '복사 실패';
  }
  setTimeout(() => { copied.value = ''; }, 1500);
}

// 문답 전체를 마크다운으로 복사한다. (원래 화면의 첫 번째 복사 버튼)
function copyMarkdown() {
  const c = item.value!;
  let str = `## ${c.book} ##\n`;
  str += `### ${c.questionNo}문답: ${c.question} ###\n`;
  str += '```\n' + stripReferences(c.answer) + '\n```\n';
  str += `${c.summary}\n\n---\n`;
  for (const b of c.bible ?? []) {
    str += `##### ${b.context} #####\n\`\`\`\n`;
    for (const v of b.verses ?? []) str += `${v.index || ''} ${v.verse || ''}\n`;
    str += '```\n';
  }
  copy('마크다운', str);
}

// 문답 핵심 필드를 JSON 으로 복사한다. (원래 화면의 두 번째 복사 버튼)
function copyJson() {
  const c = item.value!;
  const value = {
    book: c.book,
    questionNo: c.questionNo,
    question: c.question,
    answer: c.answer,
    summary: c.summary,
    contemplation: c.contemplation,
  };
  copy('JSON', JSON.stringify(value, null, 2));
}

function copyDay(day: { label: string; text: string }) {
  const c = item.value!;
  const value = {
    book: `${c.book} 제${c.questionNo}문답: 오늘의 묵상 - ${day.label}요일`,
    question: c.question,
    contemplation: day.text,
  };
  copy(`${day.label}요일`, JSON.stringify(value, null, 2));
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>{{ book }} 제{{ questionNo }}문답</h1>
        <p class="page-desc">
          <NuxtLink :to="{ path: '/confession', query: { book } }">← 목록</NuxtLink>
        </p>
      </div>
      <div class="actions">
        <NuxtLink :to="{ path: '/confession/view', query: { book, questionNo: questionNo - 1 } }">
          <button :disabled="questionNo <= 1">‹ 이전</button>
        </NuxtLink>
        <NuxtLink :to="{ path: '/confession/view', query: { book, questionNo: questionNo + 1 } }">
          <button>다음 ›</button>
        </NuxtLink>
        <NuxtLink :to="{ path: '/confession/edit', query: { book, questionNo } }">
          <button class="primary">수정</button>
        </NuxtLink>
      </div>
    </div>

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">
      {{ error.statusCode === 404 ? '해당 문답이 없습니다.' : apiErrorMessage(error) }}
    </div>
    <div v-else-if="item" class="panel body">
      <p v-if="item.title" class="muted">{{ item.title }}</p>
      <h2>{{ item.subject }}</h2>

      <div class="question">
        <strong>문답: {{ item.question }}</strong>
        <span class="copy-buttons">
          <button title="마크다운으로 복사" @click="copyMarkdown">MD 복사</button>
          <button title="JSON 으로 복사" @click="copyJson">JSON 복사</button>
          <span v-if="copied" class="copied">{{ copied }} 복사됨</span>
        </span>
      </div>
      <blockquote>{{ stripReferences(item.answer) }}</blockquote>

      <template v-if="item.questionEng || item.answerEng">
        <p class="eng"><strong>Q.</strong> {{ item.questionEng }}</p>
        <p class="eng"><strong>A.</strong> {{ item.answerEng }}</p>
      </template>

      <div v-if="item.summary" class="summary">{{ item.summary }}</div>

      <section v-if="item.bible?.length" class="bible">
        <h3>성경 구절</h3>
        <div v-for="(b, i) in item.bible" :key="i" class="bible-group">
          <p class="context">
            {{ b.context }} <span class="refs">({{ b.bibles }})</span>
            <span v-if="b.error" class="warn">일부 구절을 찾지 못함</span>
          </p>
          <blockquote>
            <div v-for="(v, j) in b.verses" :key="j" class="verse">
              <b>{{ v.index }}</b> {{ v.verse }}
            </div>
          </blockquote>
        </div>
      </section>

      <section v-if="item.check?.length" class="check">
        <h3>점검 질문</h3>
        <ol>
          <li v-for="(q, i) in item.check" :key="i">{{ q.replace(/^\d+\.\s*/, '') }}</li>
        </ol>
      </section>

      <section v-if="contemplations.length">
        <h3>오늘의 묵상</h3>
        <div class="days">
          <div v-for="d in contemplations" :key="d.key" class="day">
            <button class="day-head" title="이 요일 묵상을 JSON 으로 복사" @click="copyDay(d)">{{ d.label }}요일</button>
            <div class="day-text">{{ d.text }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.page-desc a {
  color: var(--accent);
}

.actions {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.body {
  line-height: 1.8;
  font-size: 15px;
}

.muted {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

h2 {
  margin: 4px 0 20px;
  font-size: 20px;
}

h3 {
  margin: 32px 0 10px;
  font-size: 16px;
}

.question {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.copy-buttons {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.copy-buttons button {
  padding: 2px 8px;
  font-size: 12px;
}

.copied {
  color: var(--accent);
  font-size: 12px;
}

blockquote {
  margin: 10px 0;
  padding: 14px 18px;
  border-left: 4px solid var(--line);
  background: var(--bg);
  white-space: pre-wrap;
}

.eng {
  margin: 4px 0;
  color: var(--muted);
  font-size: 14px;
}

.summary {
  margin-top: 20px;
  white-space: pre-wrap;
}

.context {
  margin: 18px 0 4px;
  font-weight: 600;
}

.refs {
  color: var(--accent);
  font-weight: 400;
}

.warn {
  margin-left: 6px;
  color: #c92a2a;
  font-size: 12px;
  font-weight: 400;
}

.verse b {
  margin-right: 4px;
}

.check ol {
  margin: 0;
  padding-left: 22px;
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.day {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.day-head {
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: var(--bg);
  font-weight: 600;
  text-align: left;
}

.day-text {
  max-height: 420px;
  overflow-y: auto;
  padding: 12px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.7;
}
</style>
