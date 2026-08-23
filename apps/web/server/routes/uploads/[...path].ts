import { proxyRequest } from 'h3';

// CMS 미디어 파일(/uploads/**) 프록시.
//
// DB 의 media.paths.original 은 '/uploads/...' 형태(오리진 없는 절대경로)라
// 브라우저는 이 Nuxt 오리진으로 요청한다. 실제 파일은 API 서버가
// UPLOAD_DIR 을 정적 서빙하므로 그쪽으로 넘겨준다.
//
// 바이너리를 그대로 흘려보내야 하므로 h3 의 proxyRequest 를 쓴다.
// (server/api/[...path].ts 처럼 응답을 파싱하면 이미지가 깨진다.)
export default defineEventHandler(async (event) => {
  const targetBase = process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:7710';
  const requestUrl = getRequestURL(event);
  const targetUrl = new URL(requestUrl.pathname + requestUrl.search, targetBase);

  return proxyRequest(event, targetUrl.toString());
});
