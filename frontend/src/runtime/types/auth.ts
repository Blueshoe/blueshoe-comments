export interface CommunityUser {
  id: number
  name: string
  email: string
  is_team: boolean
}

export interface AuthProvider {
  id: string
  name: string
}

export interface OAuthSignal {
  type?: string
  error?: string
  ts?: number
}
