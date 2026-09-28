import { getRequestURL, proxyRequest } from 'h3';

// /api/** 를 API 서버(server/ 의 Express, 기본 7710)로 넘긴다.
// dev 와 빌드(.output) 모두 이 경로를 탄다. 대상은 NUXT_API_PROXY_TARGET 로 바꾼다.
// proxyRequest 는 상태 코드·헤더(쿠키)·본문을 그대로 넘기고 스트리밍하므로
// 4xx 응답, 로그인 쿠키, mp3 Range 요청(/api/bible/audio)이 모두 원래대로 동작한다.
export default defineEventHandler((event) => {
  const target = process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:7710';
  const url = getRequestURL(event);
  return proxyRequest(event, new URL(url.pathname + url.search, target).toString());
});
