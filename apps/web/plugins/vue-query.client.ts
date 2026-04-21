import { VueQueryPlugin } from '@tanstack/vue-query'
import type { Plugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin)
})