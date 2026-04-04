<script setup lang="ts">
const route = useRoute();
const auth = useAuth();

const mainMenus = [
  { label: 'Home', to: '/' },
  { label: 'Read', to: '/read' },
  { label: 'Themes', to: '/themes' },
  { label: 'Review', to: '/review' },
  { label: 'Sharing', to: '/sharing' },
];

const isAuthenticated = computed(() => Boolean(auth.currentUser.value?.userId || auth.token.value));
const displayName = computed(() => auth.currentUser.value?.nickname || auth.currentUser.value?.email || 'Guest');

function isMenuActive(path: string) {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>

<template>
  <header class="site-header">
    <div class="site-brand">
      <NuxtLink to="/">OneMinuteBible</NuxtLink>
      <p>Current MVP: read Genesis 1-3, mark verses, and save one short reflection.</p>
    </div>

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
        <span class="account-link account-chip">{{ displayName }}</span>
        <NuxtLink class="account-link" to="/account">Account</NuxtLink>
      </template>
      <template v-else>
        <NuxtLink class="account-link" to="/login">Log in</NuxtLink>
        <NuxtLink class="account-link" to="/signup">Sign up</NuxtLink>
      </template>
    </nav>
  </header>
</template>
