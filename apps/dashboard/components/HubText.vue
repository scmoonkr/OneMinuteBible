<script setup lang="ts">
// biblehub 본문에 섞인 링크 표기 'Genesis 1:1'<'/genesis/1-1.htm'> 를 실제 링크로 바꿔 보여 준다.
// v-html 없이 조각으로 나눠 그리므로 원문에 HTML 이 섞여 있어도 안전하다.
const props = defineProps<{ text?: string }>();

const LINK = /'([^']+)'<'([^']+)'>/g;

const parts = computed(() => {
  const text = props.text || '';
  const out: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[1], href: biblehubUrl(m[2]) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
});
</script>

<template>
  <span class="hub-text"><template v-for="(p, i) in parts" :key="i"><a v-if="p.href" :href="p.href" target="_blank" rel="noopener">{{ p.text }}</a><template v-else>{{ p.text }}</template></template></span>
</template>

<style scoped>
.hub-text {
  white-space: pre-line;
}

a {
  color: var(--accent);
}
</style>
