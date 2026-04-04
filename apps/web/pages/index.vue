<script setup lang="ts">
import heroImage from '~/assets/images/main.png';

function goRead() {
  return navigateTo('/read');
}

function goToVerse(verseId: string) {
  return navigateTo(`/read?verse=${verseId}`);
}
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <img
        :src="heroImage"
        alt="Bible reading"
        class="home-hero-image"
      >
      <div class="home-hero-overlay" />

      <div class="home-hero-content">
        <h1 class="home-hero-title">
          읽고, 멈추고, 남겨보세요
        </h1>

        <p class="home-hero-copy">
          성경을 색으로 읽어보세요
        </p>

        <button
          type="button"
          class="home-hero-button"
          @click="goRead"
        >
          말씀 시작하기
        </button>
      </div>
    </section>

    <section class="home-flow">
      <div class="home-flow-board">
        <div class="home-flow-steps">
          <span class="home-flow-step home-flow-step--read">읽기</span>
          <span class="home-flow-step home-flow-step--pause">멈춤</span>
          <span class="home-flow-step home-flow-step--share">나눔</span>
        </div>

        <div class="home-flow-body">
          <p class="home-flow-copy">
            한 구절에서 멈추고<br>
            지금 떠오른 것을 남겨보세요
          </p>
        </div>
      </div>
    </section>

    <section class="home-preview">
      <div class="home-preview-list">
        <button
          type="button"
          class="home-preview-card"
          @click="goToVerse('JHN_3_16')"
        >
          <p class="home-preview-ref">요한복음 3:16</p>
          <p class="home-preview-text">
            “나는 아직 조건을 붙이고 있다”
          </p>
        </button>

        <button
          type="button"
          class="home-preview-card"
          @click="goToVerse('GEN_1_1')"
        >
          <p class="home-preview-ref">창세기 1:1</p>
          <p class="home-preview-text">
            “시작은 이미 시작되어 있었다”
          </p>
        </button>
      </div>
    </section>

    <section class="home-cta">
      <p class="home-cta-copy">
        이미 많은 사람들이 말씀 위에 나눔을 남기고 있습니다
      </p>

      <button
        type="button"
        class="home-cta-button"
        @click="goRead"
      >
        말씀 시작하기
      </button>
    </section>
  </div>
</template>
