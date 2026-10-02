export default defineNuxtPlugin(async () => {
  const auth = useAuth();
  const config = useRuntimeConfig();

  // 쿠키 도메인을 켠 뒤 처음 열 때, 예전 "현재 호스트 전용" 로그인 쿠키를 도메인 쿠키로 옮긴다.
  migrateHostOnlyAuthCookies(config.public.cookieDomain as string);

  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    await auth.refreshSession().catch(() => null);
  }

  if (auth.token.value && !auth.currentUser.value) {
    await auth.fetchMe().catch(() => null);
  }
});
