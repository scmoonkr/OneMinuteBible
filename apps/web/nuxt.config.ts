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
      title: '모줄성 - 1분 성경',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          name: 'description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'og:title',
          content: '모줄성 - 1분 성경',
        },
        {
          property: 'og:description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          property: 'og:image',
          content: '/Images/mojulseong.png',
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: '모줄성 - 1분 성경',
        },
        {
          name: 'twitter:description',
          content: '말씀을 읽고, 구절을 선택하고, 한 줄 묵상으로 나누는 모줄성 성경 읽기 서비스입니다.',
        },
        {
          name: 'twitter:image',
          content: '/Images/mojulseong.png',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: '/Images/mojulseong_logo_only.png',
        },
        {
          rel: 'apple-touch-icon',
          href: '/Images/mojulseong_logo_only.png',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
        },
      ],
    },
  },
  compatibilityDate: '2026-04-03',
});
