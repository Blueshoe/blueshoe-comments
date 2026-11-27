import type { AuthProvider, CommunityUser } from '../types/auth'
import { useState } from '#imports'
import { onBeforeUnmount, onMounted } from 'vue'
import { subscribeOAuthSignals } from '../utils/oauth-signal'
import { useCommunityApi } from './useCommunityApi'

export function useCommunityAuth() {
  const { apiBase, apiFetch } = useCommunityApi()
  const currentUser = useState<CommunityUser | null>('community-current-user', () => null)
  const providers = useState<AuthProvider[]>('community-auth-providers', () => [])
  const ready = useState('community-auth-ready', () => false)

  let unsubscribe: (() => void) | null = null
  let authPopup: Window | null = null
  let oauthLoginSettled = false

  async function fetchAuth() {
    try {
      const [providersRes, sessionRes] = await Promise.all([
        apiFetch<{ providers?: AuthProvider[] } | AuthProvider[]>('/api/auth/providers/'),
        apiFetch<{ user?: CommunityUser | null } | CommunityUser | null>('/api/auth/session/'),
      ])
      const list = Array.isArray(providersRes)
        ? providersRes
        : (providersRes as { providers?: AuthProvider[] }).providers || []
      // Stable UI order — Django SocialApp queryset order can vary by site/admin.
      const preferred = ['github', 'google', 'linkedin_oauth2', 'email_link']
      providers.value = [...list].sort((a, b) => {
        const ia = preferred.indexOf(a.id)
        const ib = preferred.indexOf(b.id)
        return (ia === -1 ? preferred.length : ia) - (ib === -1 ? preferred.length : ib)
      })
      const user = (sessionRes as { user?: CommunityUser | null })?.user ?? (sessionRes as CommunityUser | null)
      currentUser.value = user && typeof user === 'object' && 'id' in user ? user : null
    }
    catch {
      currentUser.value = null
    }
    finally {
      ready.value = true
    }
  }

  function closeAuthPopup() {
    try {
      authPopup?.close()
    }
    catch {
      /* ignore */
    }
    authPopup = null
  }

  async function refreshAuthAfterOAuth() {
    await fetchAuth()
    closeAuthPopup()
  }

  function handleOAuthSignal() {
    if (oauthLoginSettled)
      return
    oauthLoginSettled = true
    void refreshAuthAfterOAuth()
  }

  function ensureOAuthSubscription() {
    if (import.meta.server || unsubscribe)
      return
    unsubscribe = subscribeOAuthSignals(() => handleOAuthSignal())
  }

  function loginWith(providerId: string) {
    if (import.meta.server || !apiBase.value)
      return
    ensureOAuthSubscription()
    oauthLoginSettled = false
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth-callback.html`)
    const authUrl = `${apiBase.value}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${callbackUrl}&process=login`
    authPopup = window.open(authUrl, 'auth-popup', 'width=600,height=700,scrollbars=yes')
    return authPopup
  }

  function loginWithRedirect(providerId: string) {
    if (import.meta.server || !apiBase.value)
      return
    const directCallback = encodeURIComponent(window.location.href)
    window.location.href = `${apiBase.value}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${directCallback}&process=login`
  }

  async function requestMagicLink(email: string) {
    await apiFetch('/api/auth/magic-link/request/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        next_url: typeof window !== 'undefined' ? window.location.href : '/',
      }),
    })
  }

  async function logout() {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    currentUser.value = null
  }

  if (import.meta.client) {
    onMounted(() => {
      ensureOAuthSubscription()
      if (!ready.value)
        void fetchAuth()
    })
    onBeforeUnmount(() => {
      unsubscribe?.()
      unsubscribe = null
      closeAuthPopup()
    })
  }

  return {
    currentUser,
    providers,
    ready,
    fetchAuth,
    loginWith,
    loginWithRedirect,
    requestMagicLink,
    logout,
  }
}
