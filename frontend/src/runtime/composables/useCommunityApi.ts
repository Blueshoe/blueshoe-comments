import { useCookie } from '#imports'
import { useCommunityConfig } from './useCommunityConfig'

const VID_COOKIE = 'community_vid'
const VID_STORAGE = 'community_vid'

export function useCommunityApi() {
  const { apiBase } = useCommunityConfig()
  // Cookie so SSR can send X-Visitor-Id (localStorage alone is client-only).
  const vidCookie = useCookie<string | null>(VID_COOKIE, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })

  function getVisitorId(): string {
    if (import.meta.server) {
      return (vidCookie.value || '').trim()
    }

    try {
      let vid = (vidCookie.value || localStorage.getItem(VID_STORAGE) || '').trim()
      if (!vid) {
        vid = crypto.randomUUID()
      }
      if (vidCookie.value !== vid)
        vidCookie.value = vid
      if (localStorage.getItem(VID_STORAGE) !== vid)
        localStorage.setItem(VID_STORAGE, vid)
      return vid
    }
    catch {
      return (vidCookie.value || '').trim()
    }
  }

  /** Ensure a visitor id exists on the client before anon reaction requests. */
  function ensureVisitorId(): string {
    return getVisitorId()
  }

  function headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra }
    const vid = getVisitorId()
    if (vid)
      h['X-Visitor-Id'] = vid
    return h
  }

  async function apiFetch<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const base = apiBase.value
    if (!base) {
      throw new Error('community.apiBase is not configured')
    }
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
    const extraHeaders
      = init.headers && typeof init.headers === 'object' && !(init.headers instanceof Headers)
        ? { ...(init.headers as Record<string, string>) }
        : {}

    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: headers(extraHeaders),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const error = new Error((err as { error?: string }).error || `HTTP ${res.status}`) as Error & {
        status?: number
        data?: unknown
      }
      error.status = res.status
      error.data = err
      throw error
    }
    if (res.status === 204)
      return undefined as T
    return (await res.json()) as T
  }

  return { apiBase, apiFetch, headers, getVisitorId, ensureVisitorId }
}
