<script setup lang="ts">
import { categoryPalette, type PaletteItem } from '~/data/categoryPalette';
import { type TopicVerseItem, useBible } from '~/composables/useBible';
import { bibleBooks } from '~/data/bibleTable';

const { listTopicVerses, recordTopicVerseAction } = useBible();
const auth = useAuth();

const selectedTopicId = ref(categoryPalette.find((item) => item.category === '사랑')?.category ?? categoryPalette[0]?.category ?? '');
const selectedVerseId = ref('');
const showAll = ref(false);
const loading = ref(false);
const topicVerseMap = ref<Record<string, TopicVerseItem[]>>({});

const topicSidebarItems = computed(() =>
  categoryPalette.map((item) => ({
    id: item.category,
    label: item.category,
    description: item.description,
    color: item.color,
  })),
);

const selectedTopicMeta = computed<PaletteItem | null>(() =>
  categoryPalette.find((item) => item.category === selectedTopicId.value) ?? categoryPalette[0] ?? null,
);

const activeTopicData = computed(() => topicVerseMap.value[selectedTopicId.value] ?? []);

const displayedVerses = computed(() => {
  if (showAll.value) {
    return activeTopicData.value;
  }

  return activeTopicData.value.slice(0, 3);
});

const selectedVerse = computed(() =>
  displayedVerses.value.find((verse) => verse.verseId === selectedVerseId.value) ?? displayedVerses.value[0] ?? null,
);

watch(selectedTopicId, async (category) => {
  showAll.value = false;
  selectedVerseId.value = '';

  if (!category) {
    return;
  }

  if (topicVerseMap.value[category]) {
    selectedVerseId.value = topicVerseMap.value[category]?.[0]?.verseId ?? '';
    return;
  }

  loading.value = true;

  try {
    const response = await listTopicVerses({ category });
    response.data = response.data.map((data) => {
      const book = bibleBooks.find((item) => item.bookNo === data.bookNo);
      return {
        ...data,
        book: book?.church || data.book,
      };
    });

    topicVerseMap.value = {
      ...topicVerseMap.value,
      [category]: response.data ?? [],
    };
    selectedVerseId.value = response.data?.[0]?.verseId ?? '';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

async function recordAction(verse: TopicVerseItem | null, actionType: 'read' | 'view_reflection' | 'write_reflection') {
  const userNo = auth.currentUser.value?.userNo;
  if (!verse || !userNo) {
    return;
  }

  try {
    await recordTopicVerseAction({
      userNo,
      verseId: verse.verseId,
      bookNo: verse.bookNo,
      chapterNo: verse.chapterNo,
      verseNo: verse.verseNo,
      mainCategory: verse.mainCategory,
      actionType,
    });
  } catch {
    // Keep reading flow resilient even if score logging fails.
  }
}

function selectTopic(topicId: string) {
  selectedTopicId.value = topicId;
}

async function selectVerse(verseId: string) {
  selectedVerseId.value = verseId;
  const verse = displayedVerses.value.find((item) => item.verseId === verseId) ?? null;
  await recordAction(verse, 'read');
}

function handleMore() {
  showAll.value = true;
}

async function openReflection() {
  if (!selectedVerse.value) {
    return;
  }

  await recordAction(selectedVerse.value, 'view_reflection');
}

async function startWriting() {
  if (!selectedVerse.value) {
    return;
  }

  await recordAction(selectedVerse.value, 'write_reflection');

  if (selectedVerse.value.readTarget) {
    navigateTo(`/read/${selectedVerse.value.readTarget.bookNo}/${selectedVerse.value.readTarget.chapterNo}`);
  }
}
</script>

<template>
  <section class="topics-page page-stack">
    <div class="topics-hero">
      <p class="topics-kicker">주제별 보기</p>
      <h1 class="topics-title">어디서 시작할까요</h1>
      <p class="topics-copy">
        주제 하나로 지금 마음에 닿는 말씀을 펼쳐보세요.
      </p>
    </div>

    <div class="topics-layout">
      <aside class="topics-sidebar">
        <h2>주제 선택</h2>
        <div class="topics-topic-list">
          <button
            v-for="topic in topicSidebarItems"
            :key="topic.id"
            type="button"
            class="topics-topic-button"
            :class="{ active: selectedTopicId === topic.id }"
            @click="selectTopic(topic.id)"
          >
            <strong class="topics-topic-title" :style="{ color: topic.color }">
              <span class="topics-topic-dot" :style="{ backgroundColor: topic.color }" />
              {{ topic.label }}
            </strong>
            <span>{{ topic.description }}</span>
          </button>
        </div>
      </aside>

      <div class="topics-main">
        <section class="topics-panel">
          <div class="topics-panel-head">
            <div>
              <h2>{{ selectedTopicMeta?.category }}</h2>
              <p>{{ selectedTopicMeta?.description }}</p>
            </div>

            <div class="topics-actions">
              <button type="button" class="topics-chip" :disabled="!activeTopicData.length || showAll" @click="handleMore">더 보기</button>
            </div>
          </div>

          <div v-if="loading" class="topics-verse-list">
            <p class="topics-empty">불러오는 중입니다.</p>
          </div>
          <div v-else-if="displayedVerses.length" class="topics-verse-list">
            <button
              v-for="verse in displayedVerses"
              :key="verse.verseId"
              type="button"
              class="topics-verse-item"
              :class="{ active: selectedVerse?.verseId === verse.verseId }"
              @click="selectVerse(verse.verseId)"
            >
              <strong>{{ verse.book }} {{ verse.chapterNo }}:{{ verse.verseNo }}</strong>
              <span>{{ verse.text }}</span>
            </button>
          </div>

          <div v-else class="topics-verse-list">
            <p class="topics-empty">이 주제의 본문은 아직 준비 중입니다.</p>
          </div>
        </section>

        <section v-if="selectedVerse" class="topics-detail">
          <div class="topics-detail-head">
            <div>
              <p class="topics-detail-ref">{{ selectedVerse.book }} {{ selectedVerse.chapterNo }}:{{ selectedVerse.verseNo }}</p>
              <h3>{{ selectedVerse.mainCategory }}</h3>
            </div>

            <div class="topics-actions">
              <button type="button" class="topics-chip" @click="openReflection">나눔 보기</button>
              <button type="button" class="topics-chip topics-chip--dark" @click="startWriting">묵상 시작</button>
            </div>
          </div>

          <p class="topics-detail-text">{{ selectedVerse.text }}</p>

          <div class="topics-tags">
            <span
              v-for="tag in selectedVerse.subCategories"
              :key="tag"
              class="topics-tag"
            >
              {{ tag }}
            </span>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
