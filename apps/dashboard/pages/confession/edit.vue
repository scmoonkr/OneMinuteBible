<script setup lang="ts">
const router = useRouter();
const { book, questionNo } = useConfessionQuery();

type Form = {
  week: number;
  title: string;
  subject: string;
  question: string;
  answer: string;
  summary: string;
  questionEng: string;
  answerEng: string;
  checkText: string; // 점검 질문: 한 줄에 하나
  contemplation: Record<string, string>;
};

const form = ref<Form | null>(null);
const original = ref<Confession | null>(null);

const { status, error } = useFetch<{ data: Confession }>(() => confessionPath(book.value, questionNo.value), {
  server: false,
  onResponse({ response }) {
    const c = response._data?.data as Confession | undefined;
    if (!c) return;
    original.value = c;
    form.value = {
      week: c.week || 1,
      title: c.title || '',
      subject: c.subject || '',
      question: c.question || '',
      answer: c.answer || '',
      summary: c.summary || '',
      questionEng: c.questionEng || '',
      answerEng: c.answerEng || '',
      checkText: (c.check ?? []).join('\n'),
      contemplation: Object.fromEntries(CONTEMPLATION_DAYS.map((d) => [d.key, c.contemplation?.[d.key] || ''])),
    };
  },
});

// 영어 문답은 웨스트민스터에만 있어서, 원래 값이 있을 때만 입력칸을 보여 준다.
const hasEnglish = computed(() => Boolean(original.value?.questionEng || original.value?.answerEng));

const saving = ref(false);
const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null);
const confirmDelete = ref(false);

async function save() {
  if (!form.value) return;
  saving.value = true;
  message.value = null;

  const f = form.value;
  const body: Record<string, unknown> = {
    week: Number(f.week),
    title: f.title,
    subject: f.subject,
    question: f.question,
    answer: f.answer,
    summary: f.summary,
    check: f.checkText.split('\n').map((s) => s.trim()).filter(Boolean),
  };
  if (hasEnglish.value) {
    body.questionEng = f.questionEng;
    body.answerEng = f.answerEng;
  }
  // 묵상이 원래 없던 문답에 빈 객체를 새로 만들지 않는다.
  if (original.value?.contemplation || Object.values(f.contemplation).some((v) => v.trim())) {
    body.contemplation = f.contemplation;
  }

  try {
    await $fetch(confessionPath(book.value, questionNo.value), { method: 'PATCH', body });
    message.value = { type: 'ok', text: '저장했습니다.' };
  } catch (e) {
    message.value = { type: 'error', text: apiErrorMessage(e) };
  } finally {
    saving.value = false;
  }
}

async function remove() {
  saving.value = true;
  message.value = null;
  try {
    await $fetch(confessionPath(book.value, questionNo.value), { method: 'DELETE' });
    router.push({ path: '/confession', query: { book: book.value } });
  } catch (e) {
    message.value = { type: 'error', text: apiErrorMessage(e) };
    confirmDelete.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h1>Edit · {{ book }} 제{{ questionNo }}문답</h1>
        <p class="page-desc">
          <NuxtLink :to="{ path: '/confession/view', query: { book, questionNo } }">← 보기로 돌아가기</NuxtLink>
        </p>
      </div>
      <div v-if="form" class="actions">
        <span v-if="message" class="message" :class="message.type">{{ message.text }}</span>
        <template v-if="confirmDelete">
          <span class="message error">정말 삭제할까요?</span>
          <button :disabled="saving" @click="confirmDelete = false">취소</button>
          <button class="danger" :disabled="saving" @click="remove">삭제</button>
        </template>
        <button v-else :disabled="saving" @click="confirmDelete = true">삭제</button>
        <button class="primary" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</button>
      </div>
    </div>

    <div v-if="status === 'idle' || status === 'pending'" class="panel state">불러오는 중…</div>
    <div v-else-if="error" class="panel state error">
      {{ error.statusCode === 404 ? '해당 문답이 없습니다.' : apiErrorMessage(error) }}
    </div>
    <form v-else-if="form" class="panel fields" @submit.prevent="save">
      <div class="row">
        <label class="narrow">주차 <input v-model.number="form.week" type="number" min="1" /></label>
        <label class="grow">주차 제목 <input v-model="form.title" /></label>
      </div>
      <label>문답 제목 (subject) <input v-model="form.subject" /></label>
      <label>질문 <textarea v-model="form.question" rows="2" /></label>
      <label>
        답변 <small>괄호 안 성경 근거 "(롬 3:20)" 는 보기 화면에서 숨겨집니다.</small>
        <textarea v-model="form.answer" rows="4" />
      </label>
      <template v-if="hasEnglish">
        <label>Question (English) <textarea v-model="form.questionEng" rows="2" /></label>
        <label>Answer (English) <textarea v-model="form.answerEng" rows="3" /></label>
      </template>
      <label>해설 (summary) <textarea v-model="form.summary" rows="12" /></label>
      <label>점검 질문 <small>한 줄에 하나</small> <textarea v-model="form.checkText" rows="6" /></label>

      <fieldset>
        <legend>오늘의 묵상</legend>
        <div class="days">
          <label v-for="d in CONTEMPLATION_DAYS" :key="d.key">
            {{ d.label }}요일
            <textarea v-model="form.contemplation[d.key]" rows="8" />
          </label>
        </div>
      </fieldset>

      <p v-if="original?.bible?.length" class="note">
        성경 구절({{ original.bible.length }}묶음)은 성경 본문에서 만든 값이라 여기서는 수정하지 않습니다.
      </p>
    </form>
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
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.danger {
  border-color: #c92a2a;
  background: #c92a2a;
  color: #fff;
}

.message {
  font-size: 13px;
}

.message.ok {
  color: #2b8a3e;
}

.message.error {
  color: #c92a2a;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
  font-size: 13px;
}

label small {
  color: var(--muted);
  font-weight: 400;
}

input,
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.6;
}

input:focus,
textarea:focus {
  outline: 2px solid var(--accent-soft);
  border-color: var(--accent);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.narrow {
  width: 100px;
}

.grow {
  flex: 1;
  min-width: 200px;
}

fieldset {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
}

legend {
  padding: 0 6px;
  font-weight: 600;
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.note {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
