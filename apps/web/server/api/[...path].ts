import { getRequestURL, proxyRequest } from 'h3';

export default defineEventHandler(async (event) => {
  const targetBase = process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:7710';
  const requestUrl = getRequestURL(event);
  const targetUrl = new URL(requestUrl.pathname + requestUrl.search, targetBase);

  return proxyRequest(event, targetUrl.toString());
});
