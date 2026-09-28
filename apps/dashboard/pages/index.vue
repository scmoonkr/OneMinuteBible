<template>
  <div>
    <h1>Dashboard</h1>
    <p class="page-desc">관리할 콘텐츠를 고르세요.</p>

    <div class="cards">
      <div v-for="section in menuSections" :key="section.key" class="panel card">
        <NuxtLink :to="section.to" class="title">{{ section.label }}</NuxtLink>
        <p>{{ section.description }}</p>
        <div class="links">
          <NuxtLink v-for="item in section.children" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.card p {
  margin: 6px 0 14px;
  color: var(--muted);
}

.links {
  display: flex;
  gap: 8px;
}

.links a {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
}
</style>
