<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const auth = useAuth();
const identity = useReaderIdentity();

await callOnce(async () => {
  await auth.fetchMe().catch(() => null);
});

const user = computed(() => auth.currentUser.value);
const joinedAt = computed(() => {
  if (!user.value?.createdAt) {
    return 'No record';
  }

  return new Date(user.value.createdAt).toLocaleDateString('ko-KR');
});
</script>

<template>
  <section class="page-stack">
    <section class="panel-card">
      <div class="mvp-section-header">
        <div>
          <p class="mvp-eyebrow">Profile</p>
          <h1>Inspect the current reading account</h1>
        </div>
        <NuxtLink class="mvp-chip-button" to="/account">Account hub</NuxtLink>
      </div>

      <p class="muted">
        There is no profile update endpoint yet, so this page is intentionally read-only. It groups the authenticated
        user data and reader identity in one place.
      </p>

      <div class="info-grid">
        <article class="info-card">
          <h2>Basic profile</h2>
          <div class="detail-list">
            <div class="detail-row">
              <span>Nickname</span>
              <strong>{{ user?.nickname || '-' }}</strong>
            </div>
            <div class="detail-row">
              <span>Email</span>
              <strong>{{ user?.email || '-' }}</strong>
            </div>
            <div class="detail-row">
              <span>Joined</span>
              <strong>{{ joinedAt }}</strong>
            </div>
          </div>
        </article>

        <article class="info-card">
          <h2>Session details</h2>
          <div class="detail-list">
            <div class="detail-row">
              <span>readerId</span>
              <strong>{{ identity.readerId }}</strong>
            </div>
            <div class="detail-row">
              <span>Session state</span>
              <strong>{{ identity.isAuthenticated ? 'Authenticated' : 'Guest' }}</strong>
            </div>
            <div class="detail-row">
              <span>Roles</span>
              <strong>{{ user?.roles?.join(', ') || 'user' }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <h2>Available actions</h2>
        <div class="badge-row">
          <NuxtLink class="badge badge-link" to="/account/security">Change password</NuxtLink>
          <NuxtLink class="badge badge-link" to="/review">Open review</NuxtLink>
          <NuxtLink class="badge badge-link" to="/read/1/1">Continue reading</NuxtLink>
        </div>
      </article>

      <article class="panel-card">
        <h2>Deferred profile work</h2>
        <ul class="flat-list">
          <li>Profile editing</li>
          <li>Profile image upload</li>
          <li>Public profile page</li>
        </ul>
      </article>
    </section>
  </section>
</template>
