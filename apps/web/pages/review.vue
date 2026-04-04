<script setup lang="ts">
import type { ReflectionItem } from '~/composables/useBible';

const bible = useBible();
const auth = useAuth();

const reflections = ref<ReflectionItem[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const { data, pending, error, refresh } = await useAsyncData(
  'review-reflections',
  async () => {
    if (!auth.currentUser.value?.userNo) {
      return { ok: true, data: [] };
    }

    return await bible.listReflections({
      userNo: auth.currentUser.value.userNo,
      bookNo: 1,
      chapterNo: 1,
    });
  },
  {
    default: () => null as { ok: boolean; data: ReflectionItem[] } | null,
  },
);

const count = computed(() => data.value?.data.length || 0);

watch(
  data,
  () => {
    reflections.value = data.value?.data || [];
    loading.value = false;
    errorMessage.value = '';
  },
  { immediate: true },
);

watch(
  error,
  () => {
    if (error.value) {
      loading.value = false;
      errorMessage.value = error.value.message || 'Failed to load saved reflections.';
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="panel-card">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Review</p>
        <h1>Review saved reflections from Genesis 1</h1>
      </div>
      <NuxtLink class="mvp-chip-button" to="/read/1/1">Back to reading</NuxtLink>
    </div>

    <p class="muted">
      This page confirms that reflections saved on the reading page can be loaded again. For now it focuses on Genesis
      1 so the main MVP loop stays testable.
    </p>

    <div class="mvp-meta-list">
      <span class="mvp-meta-pill">Saved reflections {{ count }}</span>
      <span class="mvp-meta-pill">Chapter target: Genesis 1</span>
    </div>

    <p v-if="pending || loading" class="mvp-muted" style="margin-top: 1rem;">Loading saved reflections.</p>
    <p v-else-if="errorMessage" class="mvp-muted" style="margin-top: 1rem;">{{ errorMessage }}</p>

    <div v-else class="reflection-list" style="margin-top: 1rem;">
      <article v-for="item in reflections" :key="`${item.verseRange}-${item.updatedAt}`" class="reflection-card">
        <div class="reflection-head">
          <strong>{{ item.verseRange }}</strong>
          <span>{{ new Date(item.updatedAt).toLocaleString('ko-KR') }}</span>
        </div>
        <p>{{ item.text }}</p>
      </article>
      <p v-if="!reflections.length" class="muted">No saved reflection yet. Leave one on the reading page.</p>
    </div>

    <div class="badge-row" style="margin-top: 1rem;">
      <NuxtLink class="badge badge-link" to="/read/1/1">Read Genesis 1</NuxtLink>
      <NuxtLink class="badge badge-link" to="/sharing">Open sharing</NuxtLink>
      <button class="badge badge-link" type="button" @click="refresh()">Refresh</button>
    </div>
  </section>
</template>
