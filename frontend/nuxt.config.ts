export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: false,
  devtools: { enabled: false },
  experimental: {
    appManifest: false,
  },
  app: {
    head: {
      title: '灵动 LingDrama',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'LingDrama AI-powered short drama production workspace' },
        { name: 'application-name', content: 'LingDrama AI Studio' },
        { name: 'theme-color', content: '#090d18' },
        { property: 'og:title', content: '灵动 LingDrama · AI Short Drama Studio' },
        { property: 'og:description', content: 'From story to final cut in one AI-native production workspace.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  vite: {
    server: {
      proxy: {
        '/api': { target: 'http://localhost:5679', changeOrigin: true },
        '/static': { target: 'http://localhost:5679', changeOrigin: true },
      },
    },
  },
  compatibilityDate: '2025-05-15',
})
