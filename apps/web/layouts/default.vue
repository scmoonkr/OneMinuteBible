<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="page-shell">
      <slot />
    </main>
  </div>
</template>
