export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001',
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
    },
  },
  compatibilityDate: '2026-04-03',
});
