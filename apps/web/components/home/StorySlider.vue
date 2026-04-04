<script setup lang="ts">
type StorySlide = {
  id: string
  chapter: string
  title: string[]
  footer?: string[]
}

const props = withDefaults(defineProps<{
  slides: StorySlide[]
  intervalMs?: number
}>(), {
  intervalMs: 5000,
});

const currentPage = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const pageCount = computed(() => Math.ceil(props.slides.length / 2));
const pagedSlides = computed(() => {
  const pages: StorySlide[][] = [];

  for (let index = 0; index < props.slides.length; index += 2) {
    pages.push(props.slides.slice(index, index + 2));
  }

  return pages;
});

function stopAutoSlide() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startAutoSlide() {
  stopAutoSlide();

  if (pageCount.value <= 1) {
    return;
  }

  timer = setInterval(() => {
    goToPage(currentPage.value + 1);
  }, props.intervalMs);
}

function goToPage(index: number) {
  if (pageCount.value === 0) {
    return;
  }

  currentPage.value = (index + pageCount.value) % pageCount.value;
}

function goPrev() {
  goToPage(currentPage.value - 1);
  startAutoSlide();
}

function goNext() {
  goToPage(currentPage.value + 1);
  startAutoSlide();
}

watch(pageCount, () => {
  if (currentPage.value >= pageCount.value) {
    currentPage.value = 0;
  }

  startAutoSlide();
});

onMounted(() => {
  startAutoSlide();
});

onBeforeUnmount(() => {
  stopAutoSlide();
});
</script>

<template>
  <div class="story-slider">
    <button
      type="button"
      class="story-slider-arrow story-slider-arrow--left"
      aria-label="이전 슬라이드"
      @click="goPrev"
    >
      <span aria-hidden="true">&lsaquo;</span>
    </button>

    <div class="story-slider-viewport">
      <div
        class="story-slider-track"
        :style="{ transform: `translateX(-${currentPage * 100}%)` }"
      >
        <div
          v-for="(page, pageIndex) in pagedSlides"
          :key="`story-page-${pageIndex}`"
          class="story-slider-page"
        >
          <article
            v-for="slide in page"
            :key="slide.id"
            class="story-slider-card"
          >
            <img
              src="/Images/card1.png"
              alt=""
              class="story-slider-card-bg"
            >

            <div class="story-slider-card-overlay">
              <span class="story-slider-card-chapter">
                [{{ slide.chapter }}]
              </span>

              <h2 class="story-slider-card-title">
                <span
                  v-for="line in slide.title"
                  :key="`${slide.id}-${line}`"
                >
                  {{ line }}
                </span>
              </h2>

              <p
                v-if="slide.footer"
                class="story-slider-card-footer"
              >
                <span
                  v-for="line in slide.footer"
                  :key="`${slide.id}-${line}`"
                >
                  {{ line }}
                </span>
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="story-slider-arrow story-slider-arrow--right"
      aria-label="다음 슬라이드"
      @click="goNext"
    >
      <span aria-hidden="true">&rsaquo;</span>
    </button>

    <div class="story-slider-dots">
      <button
        v-for="pageIndex in pageCount"
        :key="`story-dot-${pageIndex}`"
        type="button"
        class="story-slider-dot"
        :class="{ 'is-active': currentPage === pageIndex - 1 }"
        :aria-label="`${pageIndex}번째 슬라이드로 이동`"
        @click="goToPage(pageIndex - 1)"
      />
    </div>
  </div>
</template>
