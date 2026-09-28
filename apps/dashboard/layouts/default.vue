<script setup lang="ts">
const route = useRoute();

// /bible/view 에서 Bible 섹션도 함께 강조되도록 섹션은 접두어로 판정한다.
const inSection = (to: string) => route.path === to || route.path.startsWith(`${to}/`);
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <NuxtLink to="/" class="brand">모줄성 Dashboard</NuxtLink>

      <nav>
        <div v-for="section in menuSections" :key="section.key" class="section">
          <NuxtLink
            :to="section.to"
            class="section-link"
            :class="{ active: inSection(section.to) }"
          >
            {{ section.label }}
          </NuxtLink>
          <NuxtLink
            v-for="item in section.children"
            :key="item.to"
            :to="item.to"
            class="child-link"
            :class="{ active: route.path === item.to }"
          >
            {{ item.label }}
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--sidebar);
  color: var(--sidebar-text);
  padding: 20px 12px;
}

.brand {
  display: block;
  padding: 0 10px 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.section {
  margin-bottom: 14px;
}

.section-link,
.child-link {
  display: block;
  border-radius: 6px;
  padding: 7px 10px;
}

.section-link {
  font-weight: 600;
}

.child-link {
  padding-left: 24px;
  font-size: 13px;
}

.section-link:hover,
.child-link:hover {
  background: rgba(255, 255, 255, 0.06);
}

.section-link.active {
  color: #fff;
}

.child-link.active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.content {
  flex: 1;
  min-width: 0;
  padding: 32px;
}

@media (max-width: 720px) {
  .shell {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
  }

  .content {
    padding: 20px 16px;
  }
}
</style>
