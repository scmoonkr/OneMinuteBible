<script setup lang="ts">
import { mvpGenesisChapters } from '~/composables/useMvpContent';

const flowWords = ['읽고', '멈추고', '표시하고', '돌아보기'];

const themeDots = [
  { color: '#ff6b6b', label: '사랑' },
  { color: '#4d96ff', label: '믿음' },
  { color: '#6bcb77', label: '질서' },
  { color: '#ffd93d', label: '빛' },
  { color: '#b983ff', label: '언약' },
  { color: '#ff9f45', label: '부르심' },
];
</script>

<template>
  <div class="landing-page">
    <section class="landing-hero">
      <p class="landing-kicker">Modul Reading</p>
      <h1 class="landing-title">
        한 구절에서 시작해,<br>
        전체 흐름으로 이어집니다.
      </h1>
      <p class="landing-copy">
        홈 화면은 레퍼런스의 미니멀한 톤을 따르되, 실제로 구현된 기능 흐름에 맞춰 읽기, 색칠, 묵상 저장, 돌아보기로
        바로 이어지도록 구성했습니다.
      </p>
      <div class="landing-actions">
        <NuxtLink class="landing-button primary" to="/read">읽기 시작</NuxtLink>
        <NuxtLink class="landing-button" to="/about">모줄성 소개</NuxtLink>
      </div>
    </section>

    <section class="landing-flow">
      <div class="landing-flow-grid">
        <div v-for="word in flowWords" :key="word" class="landing-flow-word">{{ word }}</div>
      </div>
    </section>

    <section class="landing-preview">
      <div class="landing-preview-card">
        <p class="landing-section-label">창세기 1장</p>
        <p class="landing-preview-title">
          빛이 불릴 때,<br>
          읽기의 질서도 시작됩니다
        </p>
        <div class="landing-divider" />
        <p class="landing-highlight">빛이 있으라.</p>
        <div class="landing-dot-row">
          <span
            v-for="dot in themeDots"
            :key="dot.label"
            class="landing-dot"
            :style="{ background: dot.color }"
            :aria-label="dot.label"
          />
        </div>
      </div>
    </section>

    <section class="landing-reflection">
      <h2 class="landing-subtitle">한 구절이면 충분합니다.</h2>
      <div class="landing-input-wrap">
        <input type="text" placeholder="오늘 무엇이 가장 남았나요?" class="landing-input">
      </div>
      <p class="landing-quote">
        읽기는 설명보다 먼저 시작되고,<br>
        묵상은 한 줄에서 다시 붙잡힙니다.
      </p>
    </section>

    <section class="landing-note">
      <div class="landing-note-card">
        <p class="landing-note-copy">
          나눔과 리뷰 화면에서
          지금 저장한 묵상을 다시 확인할 수 있습니다.
        </p>
        <div class="landing-actions">
          <NuxtLink class="landing-button" to="/review">돌아보기</NuxtLink>
          <NuxtLink class="landing-button" to="/sharing">나눔 보기</NuxtLink>
        </div>
      </div>
    </section>

    <section class="landing-workbook">
      <div class="landing-preview-card">
        <h2 class="landing-subtitle">손으로도 따라가 보세요.</h2>
        <p class="landing-copy compact">
          주제 테이블, 워크북, 계정 화면까지 연결되어 있어서 읽기 이후의 흐름도 바로 이어서 확인할 수 있습니다.
        </p>
        <div class="landing-actions">
          <NuxtLink class="landing-button primary" to="/workbook">워크북 열기</NuxtLink>
          <NuxtLink class="landing-button" to="/themes">주제 보기</NuxtLink>
          <NuxtLink class="landing-button" to="/account">계정 허브</NuxtLink>
        </div>
      </div>
    </section>

    <section class="landing-flow">
      <div class="landing-preview-card">
        <p class="landing-section-label">현재 구현된 동선</p>
        <div class="step-list">
          <div v-for="chapter in mvpGenesisChapters" :key="chapter.chapterNo" class="step-item">
            <strong>창세기 {{ chapter.chapterNo }}장 · {{ chapter.title }}</strong>
            <span>{{ chapter.focus }}</span>
          </div>
        </div>
        <div class="landing-actions">
          <NuxtLink class="landing-button" to="/read">읽기 선택</NuxtLink>
          <NuxtLink class="landing-button" to="/login">로그인</NuxtLink>
          <NuxtLink class="landing-button" to="/signup">회원가입</NuxtLink>
        </div>
      </div>
    </section>

    <section class="landing-final">
      <h2 class="landing-title small">
        한 구절에서 시작해,<br>
        다시 전체로 돌아가세요.
      </h2>
      <div class="landing-actions centered">
        <NuxtLink class="landing-button primary" to="/read">지금 시작</NuxtLink>
      </div>
    </section>
  </div>
</template>
