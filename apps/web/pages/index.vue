<script setup lang="ts">
import heroImage from '~/assets/images/main.png';
import genesisImageA from '~/assets/images/genesis_1_1_2.png';
import genesisImageB from '~/assets/images/genesis_1_20_23.png';
import genesisImageC from '~/assets/images/genesis_1_26_28.png';

const shareCards = [
  {
    id: 'genesis-1-1-2',
    image: genesisImageA,
    nickname: 'rit**',
    reference: '창1:1-2',
    message: [
      '시작은 이미 하나님 안에서',
      '준비되어 있었습니다.',
      '내가 보지 못한 시간에도',
      '하나님은 일하고 계셨습니다.',
    ],
  },
  {
    id: 'genesis-1-20-23',
    image: genesisImageB,
    nickname: 'rit**',
    reference: '창1:20-23',
    message: [
      '하나님은 생명을 풍성히 채우시고',
      '번성하라 하셨습니다.',
      '내 삶도 채워진 은혜로',
      '흘려보내는 삶이 되어야 합니다.',
    ],
  },
  {
    id: 'genesis-1-26-28',
    image: genesisImageC,
    nickname: 'rit**',
    reference: '창1:26-28',
    message: [
      '하나님 형상대로 지음 받은 삶은',
      '존재 자체로 소중합니다.',
      '오늘도 맡기신 자리에서',
      '선한 다스림을 배웁니다.',
    ],
  },
];

const storySlides = [
  {
    id: 'slide-1',
    chapter: '1장',
    title: ['처음은', '누가 시작했을까요'],
  },
  {
    id: 'slide-2',
    chapter: '2장',
    title: ['아무것도 없던 곳에서', '무엇이 시작되었습니다'],
  },
  {
    id: 'slide-3',
    chapter: '3장',
    title: ['빛이 생기고', '어둠이 나뉘고'],
  },
  {
    id: 'slide-4',
    chapter: '4장',
    title: ['하늘과 땅이', '자리를 잡고'],
  },
  {
    id: 'slide-5',
    chapter: '5장',
    title: ['생명이', '하나씩 채워집니다'],
  },
  {
    id: 'slide-6',
    chapter: '6장',
    title: ['질서가', '조금씩 만들어집니다'],
  },
  {
    id: 'slide-7',
    chapter: '7장',
    title: ['그 마지막에', '사람이 놓입니다'],
  },
  {
    id: 'slide-8',
    chapter: '8장',
    title: ['지금 내 삶은', '누가 시작하고 있나요'],
    footer: ['함께 성경을 읽는 시온입니다 😊', '시온은 말씀으로 시작합니다'],
  },
];

const leftStorySlides = storySlides.filter((_, index) => index % 2 === 0);
const rightStorySlides = storySlides.filter((_, index) => index % 2 === 1);

function goRead() {
  return navigateTo('/read');
}

function goToVerse(reference: string) {
  const match = reference.match(/^창(\d+):/);
  const chapterNo = match?.[1] ?? '1';
  return navigateTo(`/read/1/${chapterNo}`);
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
      <div class="home-preview-list home-preview-list--shares">
        <div class="home-preview-heading">
          잠시 멈춤. 나눔
        </div>

        <button
          v-for="card in shareCards"
          :key="card.id"
          type="button"
          class="home-share-card"
          @click="goToVerse(card.reference)"
        >
          <img
            :src="card.image"
            :alt="card.reference"
            class="home-share-card-image"
          >

          <div class="home-share-card-meta">
            <strong>{{ card.nickname }}</strong>
            <span>{{ card.reference }}</span>
          </div>

          <div class="home-share-card-message">
            <p
              v-for="line in card.message"
              :key="`${card.id}-${line}`"
            >
              {{ line }}
            </p>
          </div>
        </button>
      </div>
    </section>

    <section class="home-story">
      <div class="home-story-grid">
        <HomeStorySlider :slides="leftStorySlides" :interval-ms="5000" />
        <HomeStorySlider :slides="rightStorySlides" :interval-ms="5000" />
      </div>
    </section>
  </div>
</template>
