<script setup lang="ts">
const { books, bookNo, chapterNo, chapters } = useChapterQuery();
</script>

<template>
  <div class="toolbar">
    <select v-model.number="bookNo">
      <option v-for="b in books" :key="b.bookNo" :value="b.bookNo">{{ b.church }}</option>
    </select>
    <button :disabled="chapterNo <= 1" @click="chapterNo -= 1">‹</button>
    <select v-model.number="chapterNo">
      <option v-for="c in chapters" :key="c" :value="c">{{ c }}장</option>
    </select>
    <button :disabled="chapterNo >= chapters.length" @click="chapterNo += 1">›</button>
  </div>
</template>
