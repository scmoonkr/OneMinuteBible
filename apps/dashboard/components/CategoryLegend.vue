<script setup lang="ts">
import { categoryPalette } from '@webdata/categoryPalette';

// 범례에 함께 적는 영문명 (vue/bible 의 categoryColorTableBible.eng)
const ENGLISH: Record<string, string> = {
  가족: 'Family', 거짓: 'Evil', 구원: 'Salvation', 계명: 'Commandments',
  모범: 'Outreach', 범죄: 'Sin', 사랑: 'Love', 삼위: 'God',
  서술: 'History', 섬김: 'Discipleship', 예언: 'Prophesy', 신앙: 'Faith',
};

// selectable 이면 칸을 눌러 카테고리를 고를 수 있다. (편집 화면)
defineProps<{ selectable?: boolean }>();
const emit = defineEmits<{ select: [category: string] }>();
</script>

<template>
  <div class="legend">
    <component
      :is="selectable ? 'button' : 'div'"
      v-for="c in categoryPalette"
      :key="c.category"
      :type="selectable ? 'button' : undefined"
      class="cell"
      :class="{ selectable }"
      :style="{ backgroundColor: c.soft }"
      @click="selectable && emit('select', c.category)"
    >
      <strong>{{ c.category }}</strong>
      <small>{{ ENGLISH[c.category] }}</small>
    </component>
  </div>
</template>

<style scoped>
.legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 2px;
  border: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 0;
  font: inherit;
}

.cell.selectable {
  cursor: pointer;
}

.cell.selectable:hover {
  filter: brightness(0.93);
}

.cell strong {
  font-size: 13px;
  color: #333;
}

.cell small {
  font-size: 10px;
  font-style: italic;
  color: #666;
}
</style>
