<script setup lang="ts">
import { topicExplorer, type TopicVerse } from '~/data/topicExplorer';

const selectedTopicId = ref(topicExplorer[0]?.id ?? '');
const shownVerseIds = ref<string[]>([]);
const selectedVerseId = ref('');
const showAll = ref(false);
const scoreMap = ref<Record<string, { score: number; recentScore: number }>>({});

const selectedTopic = computed(() =>
  topicExplorer.find((topic) => topic.id === selectedTopicId.value) ?? topicExplorer[0],
);

const rankedVerses = computed(() => {
  return [...selectedTopic.value.verses].sort((a, b) => getFinalWeight(b) - getFinalWeight(a));
});

const displayedVerses = computed(() => {
  if (showAll.value) {
    return rankedVerses.value;
  }

  if (shownVerseIds.value.length === 0) {
    return getTopicVerses({ category: selectedTopic.value.id, count: 3, seenVerseIds: [] });
  }

  return rankedVerses.value.filter((verse) => shownVerseIds.value.includes(verse.verseId));
});

const selectedVerse = computed(() =>
  displayedVerses.value.find((verse) => verse.verseId === selectedVerseId.value) ?? displayedVerses.value[0] ?? null,
);

watch(selectedTopicId, () => {
  const initial = getTopicVerses({ category: selectedTopic.value.id, count: 3, seenVerseIds: [] });
  shownVerseIds.value = initial.map((verse) => verse.verseId);
  selectedVerseId.value = initial[0]?.verseId ?? '';
  showAll.value = false;
}, { immediate: true });

function getFinalWeight(verse: TopicVerse) {
  const tracked = scoreMap.value[verse.verseId];
  return verse.baseWeight + (tracked?.score ?? verse.score) + (tracked?.recentScore ?? verse.recentScore);
}

function getTopicVerses({
  category,
  count,
  seenVerseIds,
}: {
  category: string
  count: number
  seenVerseIds: string[]
}) {
  const topic = topicExplorer.find((item) => item.id === category);

  if (!topic) {
    return [];
  }

  const pool = [...topic.verses].sort((a, b) => getFinalWeight(b) - getFinalWeight(a));
  let filteredPool = pool.filter((verse) => !seenVerseIds.includes(verse.verseId));

  if (filteredPool.length < count) {
    filteredPool = pool;
  }

  const anchors = filteredPool.filter((verse) => verse.isAnchor);
  const result: TopicVerse[] = [];

  const mainPick = (anchors[0] ?? filteredPool[0]);

  if (mainPick) {
    result.push(mainPick);
  }

  for (const verse of filteredPool) {
    if (result.length >= count) {
      break;
    }

    if (!result.some((item) => item.verseId === verse.verseId)) {
      result.push(verse);
    }
  }

  return result;
}

function selectTopic(topicId: string) {
  selectedTopicId.value = topicId;
}

function selectVerse(verseId: string) {
  selectedVerseId.value = verseId;
  updateVerseScore(verseId, 'read');
}

function handleMore() {
  const more = getTopicVerses({
    category: selectedTopic.value.id,
    count: Math.min(selectedTopic.value.verses.length, shownVerseIds.value.length + 3),
    seenVerseIds: shownVerseIds.value,
  });

  shownVerseIds.value = Array.from(new Set([...shownVerseIds.value, ...more.map((verse) => verse.verseId)]));
}

function handleShowAll() {
  showAll.value = true;
  shownVerseIds.value = rankedVerses.value.map((verse) => verse.verseId);
}

function updateVerseScore(verseId: string, actionType: 'read' | 'view_reflection' | 'write_reflection') {
  const current = scoreMap.value[verseId] ?? { score: 0, recentScore: 0 };

  if (actionType === 'read') {
    scoreMap.value[verseId] = { score: current.score + 1, recentScore: current.recentScore + 1 };
  }

  if (actionType === 'view_reflection') {
    scoreMap.value[verseId] = { score: current.score + 2, recentScore: current.recentScore + 2 };
  }

  if (actionType === 'write_reflection') {
    scoreMap.value[verseId] = { score: current.score + 3, recentScore: current.recentScore + 3 };
  }
}

function openReflection() {
  if (!selectedVerse.value) {
    return;
  }

  updateVerseScore(selectedVerse.value.verseId, 'view_reflection');
}

function startWriting() {
  if (!selectedVerse.value) {
    return;
  }

  updateVerseScore(selectedVerse.value.verseId, 'write_reflection');

  if (selectedVerse.value.readTarget) {
    navigateTo(`/read/${selectedVerse.value.readTarget.bookNo}/${selectedVerse.value.readTarget.chapterNo}`);
  }
}
</script>

<template>
  <section class="topics-page page-stack">
    <div class="topics-hero">
      <p class="topics-kicker">주제별 보기</p>
      <h1 class="topics-title">주제로 시작하고, 말씀으로 깊어지게 합니다</h1>
      <p class="topics-copy">
        처음에는 대표 구절 몇 개만 보여주고, 더 보기와 모두 보기로 확장하면서 묵상으로 이어지게 구성했습니다.
      </p>
    </div>

    <div class="topics-layout">
      <aside class="topics-sidebar">
        <h2>주제 선택</h2>
        <div class="topics-topic-list">
          <button
            v-for="topic in topicExplorer"
            :key="topic.id"
            type="button"
            class="topics-topic-button"
            :class="{ active: selectedTopicId === topic.id }"
            @click="selectTopic(topic.id)"
          >
            <strong>{{ topic.label }}</strong>
            <span>{{ topic.description }}</span>
          </button>
        </div>
      </aside>

      <div class="topics-main">
        <section class="topics-panel">
          <div class="topics-panel-head">
            <div>
              <h2>{{ selectedTopic.label }}</h2>
              <p>{{ selectedTopic.description }}</p>
            </div>

            <div class="topics-actions">
              <button type="button" class="topics-chip" @click="handleMore">더 보기</button>
              <button type="button" class="topics-chip" @click="handleShowAll">모두 보기</button>
            </div>
          </div>

          <div class="topics-verse-list">
            <button
              v-for="verse in displayedVerses"
              :key="verse.verseId"
              type="button"
              class="topics-verse-item"
              :class="{ active: selectedVerse?.verseId === verse.verseId }"
              @click="selectVerse(verse.verseId)"
            >
              <strong>{{ verse.book }} {{ verse.chapter }}:{{ verse.verse }}</strong>
              <span>{{ verse.text }}</span>
            </button>
          </div>
        </section>

        <section v-if="selectedVerse" class="topics-detail">
          <div class="topics-detail-head">
            <div>
              <p class="topics-detail-ref">{{ selectedVerse.book }} {{ selectedVerse.chapter }}:{{ selectedVerse.verse }}</p>
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
