<script setup lang="ts">
// 사이드바 하단 계정 영역. 웹 상단 메뉴 오른쪽의 로그인/아바타와 같은 동작.
// 로그인했으면 아바타 → [회원정보 수정, 로그아웃], 아니면 [로그인].
const auth = useDashboardAuth();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const name = computed(() => auth.user.value?.nickname || auth.user.value?.email || '회원');
const image = computed(() => auth.user.value?.profileImage?.trim() || '');
const initial = computed(() => name.value.trim().charAt(0).toUpperCase());

// 쿠키에 남은 토큰이 아직 유효한지 화면을 열 때 한 번 확인한다.
onMounted(() => {
  if (!auth.checked.value) auth.verify();
  document.addEventListener('click', onDocumentClick);
});
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

function onDocumentClick(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}

function login() {
  window.location.href = auth.loginUrl();
}

async function logout() {
  open.value = false;
  await auth.logout();
}
</script>

<template>
  <div ref="root" class="account">
    <!-- 서버 렌더링과 브라우저의 쿠키 판단이 어긋나지 않게 브라우저에서만 그린다. -->
    <ClientOnly>
      <template v-if="auth.loggedIn.value">
        <button type="button" class="trigger" :aria-expanded="open" aria-haspopup="menu" @click="open = !open">
          <span class="avatar">
            <img v-if="image" :src="image" alt="" />
            <template v-else>{{ initial }}</template>
          </span>
          <span class="name">{{ name }}</span>
          <span class="caret" aria-hidden="true">▴</span>
        </button>

        <div v-if="open" class="dropdown" role="menu">
          <a :href="auth.profileUrl.value" class="item" role="menuitem">회원정보 수정</a>
          <button type="button" class="item" role="menuitem" @click="logout">로그아웃</button>
        </div>
      </template>

      <button v-else type="button" class="login" @click="login">로그인</button>
    </ClientOnly>
  </div>
</template>

<style scoped>
.account {
  position: relative;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sidebar-text);
  text-align: left;
}

.trigger:hover {
  background: rgba(255, 255, 255, 0.06);
}

.avatar {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caret {
  font-size: 10px;
}

/* 사이드바 맨 아래에 있으므로 위로 펼친다. */
.dropdown {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 20;
  padding: 6px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  text-align: left;
}

.item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.login {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  background: transparent;
  color: #fff;
}

.login:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
