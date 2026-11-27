export interface CommunityThemeDark {
  accent?: string
  bg?: string
  color?: string
  radius?: string
  font?: string
}

export interface CommunityThemeConfig {
  accent?: string
  bg?: string
  color?: string
  radius?: string
  font?: string
  dark?: CommunityThemeDark
}

export interface CommunityAppConfig {
  theme?: CommunityThemeConfig
}
