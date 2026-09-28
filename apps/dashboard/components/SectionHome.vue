<script setup lang="ts">
// 섹션 첫 화면: 하위 메뉴(View/Edit)로 가는 카드.
const props = defineProps<{ sectionKey: string }>();

const section = computed(() => menuSections.find((s) => s.key === props.sectionKey)!);
</script>

<template>
  <div>
    <h1>{{ section.label }}</h1>
    <p class="page-desc">{{ section.description }}</p>

    <div class="cards">
      <NuxtLink v-for="item in section.children" :key="item.to" :to="item.to" class="panel card">
        <strong>{{ item.label }}</strong>
        <span>{{ item.to }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card:hover {
  border-color: var(--accent);
}

.card span {
  color: var(--muted);
  font-size: 12px;
}
</style>
