export interface CommunityThemeDark {
  accent?: string
  bg?: string
  color?: string
  radius?: string
  font?: string
  /** Optional CTA/button font; defaults to the widget body font when unset. */
  buttonFont?: string
  /** Optional CTA/button font-weight (e.g. `500` or `bold`). */
  buttonFontWeight?: string | number
}

export interface CommunityThemeConfig {
  accent?: string
  bg?: string
  color?: string
  radius?: string
  font?: string
  /** Optional CTA/button font; defaults to the widget body font when unset. */
  buttonFont?: string
  /** Optional CTA/button font-weight (e.g. `500` or `bold`). */
  buttonFontWeight?: string | number
  dark?: CommunityThemeDark
}

export interface CommunityAppConfig {
  theme?: CommunityThemeConfig
}
