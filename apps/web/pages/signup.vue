<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const auth = useAuth();
const router = useRouter();

const form = reactive({
  nickname: '',
  email: '',
  password: '',
});
const errorMessage = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await auth.signup(form);
    await router.push('/account');
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || '회원가입 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel-card">
    <h1>회원가입</h1>
    <p class="muted">닉네임, 이메일, 비밀번호로 바로 가입하는 기본 흐름입니다.</p>

    <div class="auth-form">
      <label>
        닉네임
        <input v-model="form.nickname" type="text" />
      </label>
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
          {{ loading ? '가입 중' : '회원가입' }}
        </button>
      </div>
      <p v-if="errorMessage" class="muted">{{ errorMessage }}</p>
    </div>
  </section>
</template>
