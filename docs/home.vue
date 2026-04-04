<template>
  <div class="min-h-screen bg-[#FAFAF7] text-[#111111]">
    <!-- Header -->
    <header class="w-full border-b border-[#EAEAEA] bg-[#FAFAF7]/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div class="font-serif text-xl tracking-tight">
          모줄성
        </div>

        <nav class="hidden items-center gap-8 text-sm text-[#666666] md:flex">
          <a href="#" class="transition-colors hover:text-[#111111]">시작하기</a>
          <a href="#" class="transition-colors hover:text-[#111111]">말씀 펼쳐보기</a>
          <a href="#" class="transition-colors hover:text-[#111111]">주제로 보기</a>
          <a href="#" class="transition-colors hover:text-[#111111]">돌아보기</a>
        </nav>
      </div>
    </header>

    <main>
      <!-- Hero -->
      <section class="px-6 pb-24 pt-28 md:pb-32 md:pt-36">
        <div class="mx-auto max-w-3xl">
          <p class="mb-6 font-serif text-lg text-[#666666]">
            모줄성
          </p>

          <h1
            class="max-w-2xl font-serif text-4xl leading-[1.3] tracking-tight md:text-6xl"
          >
            오늘,<br />
            무엇이 보이셨나요?
          </h1>

          <p class="mt-8 max-w-xl text-base leading-7 text-[#666666] md:text-lg">
            한 구절에서 시작해
            전체 흐름으로 이어집니다.
          </p>

          <div class="mt-10">
            <button
              class="inline-flex items-center rounded-full border border-[#111111] px-6 py-3 text-sm transition hover:bg-[#111111] hover:text-white"
            >
              시작하기
            </button>
          </div>
        </div>
      </section>

      <!-- Flow -->
      <section class="px-6 py-24 md:py-32">
        <div class="mx-auto max-w-3xl">
          <div class="grid gap-6 md:grid-cols-4 md:gap-8">
            <div class="font-serif text-2xl md:text-3xl">읽고</div>
            <div class="font-serif text-2xl md:text-3xl">멈추고</div>
            <div class="font-serif text-2xl md:text-3xl">표시하고</div>
            <div class="font-serif text-2xl md:text-3xl">남겨보세요</div>
          </div>
        </div>
      </section>

      <!-- Reading Preview -->
      <section class="px-6 py-24 md:py-32">
        <div class="mx-auto max-w-3xl rounded-[32px] border border-[#EAEAEA] bg-white p-8 shadow-sm md:p-12">
          <p class="text-sm text-[#666666]">창세기 1장</p>

          <p class="mt-4 font-serif text-2xl leading-[1.5] md:text-3xl">
            혼돈 속에서<br />
            질서가 시작된다
          </p>

          <div class="my-8 h-px bg-[#EAEAEA]" />

          <p
            class="inline border-b-2 border-[#6BCB77] font-serif text-2xl leading-[1.7] md:text-3xl"
          >
            빛이 있으라 하시니
          </p>

          <div class="mt-10 flex flex-wrap gap-3">
            <button class="h-8 w-8 rounded-full bg-[#FF6B6B]" aria-label="사랑" />
            <button class="h-8 w-8 rounded-full bg-[#4D96FF]" aria-label="믿음" />
            <button class="h-8 w-8 rounded-full bg-[#6BCB77]" aria-label="순종" />
            <button class="h-8 w-8 rounded-full bg-[#FFD93D]" aria-label="회개" />
            <button class="h-8 w-8 rounded-full bg-[#B983FF]" aria-label="은혜" />
            <button class="h-8 w-8 rounded-full bg-[#FF9F45]" aria-label="소망" />
          </div>
        </div>
      </section>

      <!-- Reflection -->
      <section class="px-6 py-24 md:py-32">
        <div class="mx-auto max-w-3xl">
          <h2 class="font-serif text-3xl leading-[1.4] md:text-4xl">
            한 구절이면 충분합니다
          </h2>

          <div class="mt-10 max-w-xl">
            <input
              type="text"
              placeholder="무엇이 보였나요?"
              class="w-full border-0 border-b border-[#111111] bg-transparent px-0 py-3 text-lg placeholder:text-[#999999] focus:outline-none focus:ring-0"
            />
          </div>

          <p class="mt-8 max-w-xl font-serif text-2xl leading-[1.6] text-[#666666]">
            나는 지금<br />
            무엇을 보고 있는가
          </p>
        </div>
      </section>

      <!-- Social Hint -->
      <section class="px-6 py-24 md:py-32">
        <div class="mx-auto max-w-3xl">
          <div class="max-w-xl rounded-[28px] border border-[#EAEAEA] bg-white/70 p-8">
            <p class="text-sm text-[#666666]">
              다른 사람은<br />
              이렇게 보기도 했습니다
            </p>

            <p class="mt-6 font-serif text-2xl leading-[1.6] text-[#111111]/80">
              “어둠 속에서<br />
              시작된 질서”
            </p>
          </div>
        </div>
      </section>

      <!-- Workbook -->
      <section class="px-6 py-24 md:py-32">
        <div class="mx-auto max-w-3xl rounded-[32px] border border-[#EAEAEA] bg-white p-8 shadow-sm md:p-12">
          <h2 class="font-serif text-3xl leading-[1.5] md:text-4xl">
            말씀을<br />
            직접 써보세요
          </h2>

          <div class="mt-10">
            <button
              class="inline-flex items-center rounded-full border border-[#111111] px-6 py-3 text-sm transition hover:bg-[#111111] hover:text-white"
            >
              창세기 1장 PDF 다운로드
            </button>
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="px-6 pb-32 pt-24 md:pb-40 md:pt-32">
        <div class="mx-auto max-w-3xl text-center">
          <h2 class="font-serif text-3xl leading-[1.5] md:text-5xl">
            한 구절에서 시작해<br />
            전체로 이어집니다
          </h2>

          <div class="mt-10">
            <button
              class="inline-flex items-center rounded-full border border-[#111111] px-6 py-3 text-sm transition hover:bg-[#111111] hover:text-white"
            >
              지금 시작하기
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-[#EAEAEA] px-6 py-8">
      <div class="mx-auto max-w-6xl text-sm text-[#666666]">
        모줄성 · 한 구절에서 시작해 전체로 이어집니다
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// MVP landing page
</script>