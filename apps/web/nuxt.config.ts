export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
    },
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:7710',
          changeOrigin: true,
        },
      },
    },
  },
  app: {
    head: {
      title: '모줄성',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          name: 'description',
          content: '읽고, 색칠하고, 한 줄 묵상으로 연결되는 모줄성 MVP',
        },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
        },
      ],
    },
  },
  compatibilityDate: '2026-04-03',
});
