import type { CommunityAppConfig } from '../types/theme'
import { defineNuxtPlugin, useAppConfig } from '#imports'
import { watch } from 'vue'

function applyThemeVars(theme: CommunityAppConfig['theme'] | undefined) {
  if (import.meta.server || typeof document === 'undefined' || !theme)
    return

  const root = document.documentElement
  const set = (name: string, value?: string | number) => {
    if (value === undefined || value === null || value === '')
      return
    root.style.setProperty(name, String(value))
  }

  set('--community-accent', theme.accent)
  set('--community-bg', theme.bg)
  set('--community-color', theme.color)
  set('--community-radius', theme.radius)
  set('--community-font', theme.font)
  set('--community-button-font', theme.buttonFont)
  set('--community-button-font-weight', theme.buttonFontWeight)

  // Dark overrides — always set button-*dark so CSS can use var() without `inherit` fallback
  // (lightningcss minify rejects `var(--x, inherit)`).
  set('--community-button-font-dark', theme.dark?.buttonFont || theme.buttonFont || 'inherit')
  set(
    '--community-button-font-weight-dark',
    theme.dark?.buttonFontWeight ?? theme.buttonFontWeight ?? 600,
  )

  if (theme.dark) {
    set('--community-accent-dark', theme.dark.accent || theme.accent)
    set('--community-bg-dark', theme.dark.bg || theme.bg)
    set('--community-color-dark', theme.dark.color || theme.color)
  }
}

export default defineNuxtPlugin(() => {
  const appConfig = useAppConfig() as { community?: CommunityAppConfig }

  applyThemeVars(appConfig.community?.theme)

  if (import.meta.client) {
    watch(
      () => appConfig.community?.theme,
      theme => applyThemeVars(theme),
      { deep: true },
    )
  }
})
