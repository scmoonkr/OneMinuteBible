import { fileURLToPath } from 'node:url';

// /api/** 프록시는 server/api/[...path].ts (Nitro) 가 맡는다. dev·빌드 공통.

export default defineNuxtConfig({
  alias: {
    // 성경 목록 등 웹 앱과 같은 데이터를 그대로 쓴다.
    '@webdata': fileURLToPath(new URL('../web/data', import.meta.url)),
  },
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    public: {
      // 연결된 글(/post/:slug)을 여는 웹 앱 주소.
      webBase: process.env.NUXT_PUBLIC_WEB_BASE || 'http://localhost:7711',
    },
  },
  devServer: {
    port: 7712,
  },
  vite: {
    server: {
      // apps/web/data 를 dev 서버가 읽을 수 있게 한다.
      fs: {
        allow: [fileURLToPath(new URL('../..', import.meta.url))],
      },
    },
  },
  app: {
    head: {
      title: '모줄성 대시보드',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  compatibilityDate: '2026-04-03',
});
