const AVATAR_COLORS = [
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#3b82f6',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#6366f1',
  '#14b8a6',
]

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0)
    return '?'
  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
