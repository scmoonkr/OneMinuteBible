<script setup lang="ts">
const route = useRoute();
const auth = useAuth();

const mainMenus = [
  { label: 'Home', to: '/' },
  { label: '말씀으로', to: '/read' },
  { label: '말씀 펼쳐보기', to: '/bible' },
  { label: '주제별 보기', to: '/topics' },
  { label: '돌아보기', to: '/review' },
];

const isAuthenticated = computed(() => Boolean(auth.currentUser.value?.userNo || auth.token.value));
const displayName = computed(() => auth.currentUser.value?.nickname || auth.currentUser.value?.email || 'Guest');

const accountMenuOpen = ref(false);
const mobileMenuOpen = ref(false);

function isMenuActive(path: string) {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path === path || route.path.startsWith(`${path}/`);
}

watch(
  () => route.fullPath,
  () => {
    accountMenuOpen.value = false;
    mobileMenuOpen.value = false;
  },
);

async function handleLogout() {
  await auth.clearSession();
  accountMenuOpen.value = false;
  mobileMenuOpen.value = false;
  await navigateTo('/');
}
</script>

<template>
  <header class="site-header" :class="{ 'is-mobile-open': mobileMenuOpen }">
    <div class="site-brand">
      <NuxtLink to="/">OneMinuteBible</NuxtLink>
    </div>

    <button
      type="button"
      class="site-mobile-toggle"
      :aria-label="mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
      @click="mobileMenuOpen = !mobileMenuOpen"
    >
      <span v-if="!mobileMenuOpen">☰</span>
      <span v-else>✕</span>
    </button>

    <nav class="site-nav">
      <NuxtLink
        v-for="menu in mainMenus"
        :key="menu.to"
        :to="menu.to"
        :class="['nav-link', { active: isMenuActive(menu.to) }]"
      >
        {{ menu.label }}
      </NuxtLink>
    </nav>

    <nav class="site-account">
      <template v-if="isAuthenticated">
        <div class="site-account-menu">
          <button
            type="button"
            class="account-link account-trigger"
            @click="accountMenuOpen = !accountMenuOpen"
          >
            {{ displayName }}
          </button>

          <div v-if="accountMenuOpen" class="account-dropdown">
            <NuxtLink class="account-dropdown-link" to="/account/profile">회원정보 수정</NuxtLink>
            <NuxtLink class="account-dropdown-link" to="/account">마이 페이지</NuxtLink>
            <button type="button" class="account-dropdown-link" @click="handleLogout">로그아웃</button>
          </div>
        </div>
      </template>

      <template v-else>
        <NuxtLink class="account-link" to="/login">로그인</NuxtLink>
      </template>
    </nav>

    <div v-if="mobileMenuOpen" class="site-mobile-panel">
      <nav class="site-mobile-nav">
        <NuxtLink
          v-for="menu in mainMenus"
          :key="`mobile-${menu.to}`"
          :to="menu.to"
          :class="['nav-link', { active: isMenuActive(menu.to) }]"
        >
          {{ menu.label }}
        </NuxtLink>
      </nav>

      <div class="site-mobile-account">
        <template v-if="isAuthenticated">
          <button
            type="button"
            class="account-link account-trigger"
            @click="accountMenuOpen = !accountMenuOpen"
          >
            {{ displayName }}
          </button>

          <div v-if="accountMenuOpen" class="account-dropdown account-dropdown--mobile">
            <NuxtLink class="account-dropdown-link" to="/account/profile">회원정보 수정</NuxtLink>
            <NuxtLink class="account-dropdown-link" to="/account">마이 페이지</NuxtLink>
            <button type="button" class="account-dropdown-link" @click="handleLogout">로그아웃</button>
          </div>
        </template>

        <template v-else>
          <NuxtLink class="account-link" to="/login">로그인</NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
