// 이미 로그인한 사람이 로그인/가입 화면에 오면 돌려보낸다.
// /login?redirect= 가 있으면(대시보드 등) 그쪽으로, 없으면 계정 허브로.
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  const config = useRuntimeConfig();

  auth.syncSession();

  if (!auth.token.value && auth.refreshToken.value) {
    try {
      await auth.refreshSession();
    } catch (error) {
      return;
    }
  }

  if (!auth.token.value) {
    return;
  }

  if (!auth.currentUser.value) {
    try {
      await auth.fetchMe();
    } catch (error) {
      return;
    }
  }

  const target = resolveAuthRedirect(to.query.redirect, config.public.dashboardBase as string);
  if ('external' in target) {
    return navigateTo(target.external, { external: true });
  }
  return navigateTo(target.path);
});
