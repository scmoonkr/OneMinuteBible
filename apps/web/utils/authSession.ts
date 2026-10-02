// 로그인 쿠키·로그인 후 이동 경로 관련 공용 함수.

export const AUTH_COOKIE_NAMES = ['omb-access-token', 'omb-refresh-token', 'omb-auth-user'] as const;

// useCookie 옵션. domain 을 주면 그 도메인의 모든 하위 호스트(대시보드 포함)가 쿠키를 함께 쓴다.
export function authCookieOptions(domain?: string) {
  return {
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

// cookieDomain 을 켜기 전에 만들어진 "현재 호스트 전용" 쿠키를 도메인 쿠키로 옮긴다. (브라우저에서만)
//
// 같은 이름의 쿠키가 두 벌(호스트 전용 + 도메인) 있으면 브라우저가 오래된 호스트 전용 쿠키를
// 먼저 보내서, 로그아웃해도 옛 로그인이 남는 문제가 생긴다. 그래서 호스트 전용 쿠키는 늘 지운다.
// - 한 벌만 있으면: 그 값을 도메인 쿠키로 다시 쓰고 호스트 전용은 지운다 (로그인 유지)
// - 두 벌이면: 호스트 전용만 지운다 (남는 것은 도메인 쿠키)
export function migrateHostOnlyAuthCookies(domain?: string) {
  if (!domain || typeof document === 'undefined') return;

  const all = document.cookie.split(';').map((part) => part.trim()).filter(Boolean);

  for (const name of AUTH_COOKIE_NAMES) {
    const values = all
      .filter((part) => part.startsWith(`${name}=`))
      .map((part) => part.slice(name.length + 1));
    if (!values.length) continue;

    if (values.length === 1) {
      document.cookie = `${name}=${values[0]}; path=/; domain=${domain}; samesite=lax`;
    }
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  }
}

// /login?redirect= 값을 안전한 이동 대상으로 바꾼다. (오픈 리다이렉트 방지)
// - 같은 사이트의 절대경로("/account")
// - 대시보드 호스트의 절대 URL (dashboardBase 와 hostname 이 같을 때만)
// 그 밖에는 기본값으로.
export function resolveAuthRedirect(
  raw: unknown,
  dashboardBase: string,
  fallback = '/account',
): { path: string } | { external: string } {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !value) return { path: fallback };

  if (value.startsWith('/') && !value.startsWith('//')) return { path: value };

  try {
    const target = new URL(value);
    const allowed = new URL(dashboardBase);
    if (/^https?:$/.test(target.protocol) && target.hostname === allowed.hostname) {
      return { external: target.toString() };
    }
  } catch {
    // URL 이 아니면 기본값
  }
  return { path: fallback };
}

// 카카오 로그인은 카카오를 거쳐 /auth/kakao/callback 으로 돌아오므로,
// 떠나기 전에 redirect 를 기억해 두었다가 콜백에서 꺼내 쓴다.
const KAKAO_REDIRECT_KEY = 'omb-login-redirect';

export function rememberLoginRedirect(raw: unknown) {
  if (typeof sessionStorage === 'undefined') return;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    if (typeof value === 'string' && value) sessionStorage.setItem(KAKAO_REDIRECT_KEY, value);
    else sessionStorage.removeItem(KAKAO_REDIRECT_KEY);
  } catch {
    // 저장소를 못 쓰는 환경이면 기본 이동
  }
}

export function takeLoginRedirect(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(KAKAO_REDIRECT_KEY);
    sessionStorage.removeItem(KAKAO_REDIRECT_KEY);
    return value;
  } catch {
    return null;
  }
}
