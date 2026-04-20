// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@tanstack/vue-query',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      publicApiBase: process.env.NUXT_PUBLIC_API_BASE_URL || '',
    },
  },

  imports: {
    presets: [
      {
        from: '@crypto-edge/shared',
        imports: ['Transaction', 'Wallet', 'Position', 'Asset', 'Catalyst', 'Alert'],
      },
    ],
  },
})