<script setup lang="ts">
// vue/bible 의 옛 주소(/bible/rainbow?book=&chapter=)를 새 화면으로 넘긴다.
definePageMeta({
  redirect: (to) => ({ path: '/bible/view', query: to.query }),
});
</script>

<template>
  <div />
</template>
