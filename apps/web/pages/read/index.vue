<script setup lang="ts">
import { mvpGenesisChapters } from '~/composables/useMvpContent';
</script>

<template>
  <section class="panel-card page-stack">
    <div class="mvp-section-header">
      <div>
        <p class="mvp-eyebrow">Read</p>
        <h1>Enter the Genesis reading loop</h1>
      </div>
      <NuxtLink class="mvp-chip-button" to="/review">Review notes</NuxtLink>
    </div>

    <p class="muted">
      The active reading flow currently covers Genesis chapters 1 through 3. Pick a chapter, mark verses with a
      theme, and leave one short reflection.
    </p>

    <section class="info-grid">
      <article v-for="chapter in mvpGenesisChapters" :key="chapter.chapterNo" class="info-card">
        <h2>Genesis {{ chapter.chapterNo }}</h2>
        <p>{{ chapter.title }}</p>
        <p class="muted">{{ chapter.focus }}</p>
        <div class="badge-row">
          <NuxtLink class="badge badge-link" :to="`/read/1/${chapter.chapterNo}`">Read this chapter</NuxtLink>
        </div>
      </article>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <h2>Before you start</h2>
        <ul class="flat-list">
          <li>Choose what you can justify first instead of searching for a perfect answer.</li>
          <li>Marking even one verse is enough.</li>
          <li>One short reflection line is enough for this sprint.</li>
        </ul>
      </article>

      <article class="panel-card">
        <h2>Next destinations</h2>
        <div class="badge-row">
          <NuxtLink class="badge badge-link" to="/themes">Browse themes</NuxtLink>
          <NuxtLink class="badge badge-link" to="/sharing">Open sharing</NuxtLink>
          <NuxtLink class="badge badge-link" to="/workbook">Open workbook</NuxtLink>
        </div>
      </article>
    </section>
  </section>
</template>
