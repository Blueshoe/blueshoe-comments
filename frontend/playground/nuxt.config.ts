export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@nuxt/eslint',
  ],
  community: {
    apiBase: 'https://community.example.com',
  },
  eslint: {
    config: {
      // Compose with @antfu/eslint-config in eslint.config.mjs
      standalone: false,
    },
  },
  devtools: { enabled: false },
})
