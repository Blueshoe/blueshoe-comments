import type { OAuthSignal } from '../types/auth'

export const OAUTH_SIGNAL_KEY = 'blueshoe_oauth'

type OAuthSignalHandler = (data: OAuthSignal) => void

const oauthSignalHandlers = new Set<OAuthSignalHandler>()
let oauthSignalBusReady = false

function dispatchOAuthSignal(data: OAuthSignal) {
  for (const handler of oauthSignalHandlers) {
    try {
      handler(data)
    }
    catch {
      /* ignore */
    }
  }
}

function ensureOAuthSignalBus() {
  if (oauthSignalBusReady || typeof window === 'undefined')
    return

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as OAuthSignal | undefined
    if (data?.type !== 'oauth_success' && data?.type !== 'oauth_error')
      return
    dispatchOAuthSignal(data)
  })

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== OAUTH_SIGNAL_KEY || !event.newValue)
      return
    try {
      const data = JSON.parse(event.newValue) as OAuthSignal
      if (oauthSignalHandlers.size === 0)
        return
      try {
        localStorage.removeItem(OAUTH_SIGNAL_KEY)
      }
      catch {
        /* ignore */
      }
      dispatchOAuthSignal(data)
    }
    catch {
      /* ignore */
    }
  })

  try {
    const channel = new BroadcastChannel(OAUTH_SIGNAL_KEY)
    channel.addEventListener('message', (event: MessageEvent) => {
      dispatchOAuthSignal(event.data as OAuthSignal)
    })
  }
  catch {
    /* ignore */
  }

  oauthSignalBusReady = true
}

function consumePendingOAuthSignal(handler: OAuthSignalHandler) {
  try {
    const raw = localStorage.getItem(OAUTH_SIGNAL_KEY)
    if (!raw)
      return
    const data = JSON.parse(raw) as OAuthSignal
    localStorage.removeItem(OAUTH_SIGNAL_KEY)
    queueMicrotask(() => handler(data))
  }
  catch {
    /* ignore */
  }
}

export function subscribeOAuthSignals(handler: OAuthSignalHandler) {
  ensureOAuthSignalBus()
  oauthSignalHandlers.add(handler)
  consumePendingOAuthSignal(handler)
  return () => {
    oauthSignalHandlers.delete(handler)
  }
}
