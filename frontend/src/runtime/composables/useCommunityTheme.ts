import type { CommunityAppConfig, CommunityThemeConfig } from '../types/theme'
import { useAppConfig } from '#imports'
import { computed } from 'vue'

export function useCommunityTheme() {
  const appConfig = useAppConfig() as { community?: CommunityAppConfig }
  const theme = computed<CommunityThemeConfig>(() => appConfig.community?.theme || {})

  function cssVars(mode: 'light' | 'dark' = 'light'): Record<string, string> {
    const t = theme.value
    const dark = t.dark || {}
    const source = mode === 'dark'
      ? {
          accent: dark.accent || t.accent,
          bg: dark.bg || t.bg,
          color: dark.color || t.color,
          radius: dark.radius || t.radius,
          font: dark.font || t.font,
          buttonFont: dark.buttonFont || t.buttonFont,
          buttonFontWeight: dark.buttonFontWeight ?? t.buttonFontWeight,
        }
      : t

    const vars: Record<string, string> = {}
    if (source.accent)
      vars['--community-accent'] = source.accent
    if (source.bg)
      vars['--community-bg'] = source.bg
    if (source.color)
      vars['--community-color'] = source.color
    if (source.radius)
      vars['--community-radius'] = source.radius
    if (source.font)
      vars['--community-font'] = source.font
    if (source.buttonFont)
      vars['--community-button-font'] = source.buttonFont
    if (source.buttonFontWeight !== undefined && source.buttonFontWeight !== null && source.buttonFontWeight !== '')
      vars['--community-button-font-weight'] = String(source.buttonFontWeight)
    return vars
  }

  return { theme, cssVars }
}
