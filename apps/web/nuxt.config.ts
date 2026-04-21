// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: 'node-server',
  },

  runtimeConfig: {
    public: {
      publicApiBase: process.env.NUXT_PUBLIC_API_BASE_URL || '',
    },
  },
})
