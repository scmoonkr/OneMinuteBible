// 대시보드 로그인 상태. 로그인 자체는 웹(/login)에서 하고, 웹이 남긴 쿠키(omb-*)를 함께 읽는다.
// 운영에서는 쿠키 도메인을 '.oneminutebible.co.kr' 로 맞춰 dashboard.* 에서도 보인다.

export type DashboardUser = {
  userNo: number;
  email?: string;
  nickname?: string;
  profileImage?: string;
};

type AuthPayload = {
  user: DashboardUser;
  tokens: { accessToken: string; refreshToken: string };
};

export function useDashboardAuth() {
  const config = useRuntimeConfig();
  const domain = config.public.cookieDomain as string;
  const options = { sameSite: 'lax' as const, path: '/', ...(domain ? { domain } : {}) };

  const token = useCookie<string | null>('omb-access-token', { ...options, default: () => null });
  const refreshToken = useCookie<string | null>('omb-refresh-token', { ...options, default: () => null });
  const user = useCookie<DashboardUser | null>('omb-auth-user', { ...options, default: () => null });
  const checked = useState('dashboard-auth-checked', () => false);

  const loggedIn = computed(() => Boolean(token.value && user.value));

  function setSession(payload: AuthPayload) {
    token.value = payload.tokens.accessToken;
    refreshToken.value = payload.tokens.refreshToken;
    user.value = payload.user;
  }

  // null 로 두면 useCookie 가 같은 domain 옵션으로 쿠키를 지운다.
  function clearSession() {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
  }

  async function refresh() {
    if (!refreshToken.value) return false;
    try {
      const res = await $fetch<{ data: AuthPayload }>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshToken.value },
      });
      setSession(res.data);
      return true;
    } catch {
      return false;
    }
  }

  // 쿠키의 토큰이 아직 유효한지 서버에 확인한다. 만료면 refresh 토큰으로 한 번 갱신한다.
  async function verify() {
    try {
      if (!token.value && !(await refresh())) {
        clearSession();
        return;
      }
      try {
        const res = await $fetch<{ data: DashboardUser }>('/api/auth/me', {
          headers: { Authorization: `Bearer ${token.value}` },
        });
        user.value = res.data;
      } catch {
        if (!(await refresh())) {
          clearSession();
          return;
        }
        const res = await $fetch<{ data: DashboardUser }>('/api/auth/me', {
          headers: { Authorization: `Bearer ${token.value}` },
        });
        user.value = res.data;
      }
    } catch {
      clearSession();
    } finally {
      checked.value = true;
    }
  }

  async function logout() {
    const snapshot = refreshToken.value;
    clearSession();
    if (snapshot) {
      await $fetch('/api/auth/logout', { method: 'POST', body: { refreshToken: snapshot } }).catch(() => null);
    }
  }

  // 로그인은 웹 화면에서 하고, 끝나면 지금 보던 대시보드 주소로 돌아온다.
  function loginUrl() {
    const back = typeof window !== 'undefined' ? window.location.href : '';
    return `${config.public.webBase}/login${back ? `?redirect=${encodeURIComponent(back)}` : ''}`;
  }

  const profileUrl = computed(() => `${config.public.webBase}/account/profile`);

  return { user, loggedIn, checked, verify, logout, loginUrl, profileUrl };
}
