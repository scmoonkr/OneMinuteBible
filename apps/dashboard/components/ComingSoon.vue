<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
    <p v-if="description" class="page-desc">{{ description }}</p>
    <div class="panel state">준비 중인 화면입니다.</div>
  </div>
</template>
