import { getRequestURL, proxyRequest } from 'h3';

// /api/** 를 API 서버(server/ 의 Express, 기본 7710)로 넘긴다. 대상은 NUXT_API_PROXY_TARGET.
// proxyRequest 는 상태 코드·헤더(쿠키)·본문을 그대로 넘기고 스트리밍한다.
// ($fetch.raw 로 넘기면 API 의 404·401 같은 응답이 예외가 되어 모두 500 으로 바뀌었다)
export default defineEventHandler((event) => {
  const target = process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:7710';
  const url = getRequestURL(event);
  return proxyRequest(event, new URL(url.pathname + url.search, target).toString());
});
