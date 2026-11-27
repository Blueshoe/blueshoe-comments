import type { CommunityAppConfig } from '../types/theme'
import { defineNuxtPlugin, useAppConfig } from '#imports'
import { watch } from 'vue'

function applyThemeVars(theme: CommunityAppConfig['theme'] | undefined) {
  if (import.meta.server || typeof document === 'undefined' || !theme)
    return

  const root = document.documentElement
  const set = (name: string, value?: string) => {
    if (value)
      root.style.setProperty(name, value)
  }

  set('--community-accent', theme.accent)
  set('--community-bg', theme.bg)
  set('--community-color', theme.color)
  set('--community-radius', theme.radius)
  set('--community-font', theme.font)

  // Dark overrides applied when .dark is present via CSS using the same vars
  // plus optional dark-specific custom properties for apps that want them.
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
