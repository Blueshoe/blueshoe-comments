import antfu from '@antfu/eslint-config'
import withNuxt from './playground/.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    // Module runtime is Vue/Nuxt app code — `lib` forces explicit return types on every fn.
    type: 'app',
    formatters: {
      css: true,
      markdown: true,
    },
    rules: {
      'no-console': 'warn',
    },
  }),
)
