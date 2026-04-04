<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});
const errorMessage = ref('');
const loading = ref(false);
const kakaoMessage = ref('');

async function submit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await auth.login(form);
    await router.push('/account');
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || '로그인 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
}

async function openKakao() {
  try {
    const result = await auth.getKakaoAuthorizeUrl();
    if (result.ok && result.url) {
      await navigateTo(result.url, { external: true });
      return;
    }
    kakaoMessage.value = result.message || '카카오 설정이 비어 있습니다.';
  } catch (error: any) {
    kakaoMessage.value = error?.data?.message || error?.message || '카카오 로그인 준비 중 오류가 발생했습니다.';
  }
}
</script>

<template>
  <section class="panel-card">
    <h1>로그인</h1>
    <p class="muted">이메일 로그인과 카카오 로그인 흐름을 사용할 수 있습니다.</p>

    <div class="auth-form">
      <label>
        이메일
        <input v-model="form.email" type="email" />
      </label>
      <label>
        비밀번호
        <input v-model="form.password" type="password" />
      </label>
      <div class="badge-row">
        <button class="primary-button" type="button" :disabled="loading" @click="submit()">
          {{ loading ? '로그인 중' : '로그인' }}
        </button>
        <button class="ghost-button" type="button" @click="openKakao()">카카오 로그인</button>
      </div>
      <div class="badge-row">
        <NuxtLink class="ghost-button" to="/signup">회원가입</NuxtLink>
        <NuxtLink class="ghost-button" to="/forgot-password">비밀번호 찾기</NuxtLink>
      </div>
      <p v-if="errorMessage" class="muted">{{ errorMessage }}</p>
      <p v-if="kakaoMessage" class="muted">{{ kakaoMessage }}</p>
    </div>
  </section>
</template>
