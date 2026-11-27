import type { CommunityTranslateFn } from '../i18n'

export function formatRelativeTime(iso: string, t: CommunityTranslateFn): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1)
    return t('relativeJustNow')
  if (minutes < 60)
    return t('relativeMinutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return t('relativeHours', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 30)
    return t('relativeDays', { n: days })
  return date.toLocaleDateString()
}
