import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ReactionKind, ReactionSummary } from '../types/reaction'
import { useAsyncData, useState } from '#imports'
import { computed, onMounted, toValue } from 'vue'
import { normalizeReactionSummary } from '../types/reaction'
import { useCommunityApi } from './useCommunityApi'

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseCommunityReactionsApi {
  data: Ref<ReactionSummary>
  pending: Ref<boolean>
  error: Ref<Error | null | undefined>
  refresh: () => Promise<void>
  status: Ref<AsyncStatus>
  reactions: Ref<ReactionSummary>
  toggleReaction: (
    kind: ReactionKind,
    commentId?: number | null,
  ) => Promise<{ action?: 'added' | 'removed' }>
  ensureActiveReady: () => Promise<void>
}

export type UseCommunityReactionsReturn = UseCommunityReactionsApi & {
  then: (
    onFulfilled: (value: UseCommunityReactionsApi) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

const empty: ReactionSummary = { counts: {}, active: [] }
const readyPromises = new Map<string, Promise<void>>()

function cloneSummary(summary: ReactionSummary | null | undefined): ReactionSummary {
  return normalizeReactionSummary(summary)
}

export function useCommunityReactions(
  slug: MaybeRefOrGetter<string>,
): UseCommunityReactionsReturn {
  const { apiFetch, getVisitorId, ensureVisitorId } = useCommunityApi()
  const threadSlug = computed(() => toValue(slug))
  const clientReady = useState<Record<string, boolean>>(
    'community-reactions-client-ready',
    () => ({}),
  )
  // True when SSR already had a visitor cookie (active from payload is trustworthy).
  const ssrHadVisitor = useState<Record<string, boolean>>(
    'community-reactions-ssr-visitor',
    () => ({}),
  )

  if (import.meta.server && threadSlug.value && getVisitorId()) {
    ssrHadVisitor.value = { ...ssrHadVisitor.value, [threadSlug.value]: true }
  }

  const asyncData = useAsyncData(
    () => `community-reactions:${threadSlug.value}`,
    async () => {
      if (!threadSlug.value)
        return { ...empty }
      const summary = await apiFetch<ReactionSummary>(
        `/api/reactions/?thread_slug=${encodeURIComponent(threadSlug.value)}`,
      )
      return normalizeReactionSummary(summary)
    },
    {
      watch: [threadSlug],
      default: () => ({ ...empty }),
      dedupe: 'defer',
    },
  )

  const { data, pending, error, refresh, status } = asyncData

  async function ensureActiveReady() {
    if (!import.meta.client)
      return
    const key = threadSlug.value
    if (!key)
      return
    if (clientReady.value[key])
      return

    ensureVisitorId()

    // SSR already sent X-Visitor-Id via cookie — payload `active` is correct.
    if (ssrHadVisitor.value[key]) {
      clientReady.value = { ...clientReady.value, [key]: true }
      return
    }

    if (!readyPromises.has(key)) {
      const run = refresh()
        .catch(() => undefined)
        .finally(() => {
          clientReady.value = { ...clientReady.value, [key]: true }
          readyPromises.delete(key)
        })
      readyPromises.set(key, run)
    }
    await readyPromises.get(key)
  }

  if (import.meta.client) {
    onMounted(() => {
      void ensureActiveReady()
    })
  }

  function applyLocalToggle(kind: ReactionKind, action: 'added' | 'removed') {
    const current = data.value || { ...empty }
    const counts = { ...current.counts }
    let active = [...(current.active || [])]
    if (action === 'added') {
      counts[kind] = (counts[kind] || 0) + 1
      if (!active.includes(kind))
        active.push(kind)
    }
    else {
      counts[kind] = Math.max(0, (counts[kind] || 1) - 1)
      if (counts[kind] === 0)
        delete counts[kind]
      active = active.filter(k => k !== kind)
    }
    data.value = normalizeReactionSummary({ counts, active })
  }

  async function toggleReaction(kind: ReactionKind, commentId: number | null = null) {
    // Wait until visitor id + active state are known — prevents wrong optimistic counts.
    await ensureActiveReady()

    const snapshot = cloneSummary(data.value)
    const optimisticAction: 'added' | 'removed' = snapshot.active.includes(kind)
      ? 'removed'
      : 'added'

    if (commentId === null)
      applyLocalToggle(kind, optimisticAction)

    try {
      const res = await apiFetch<{ action?: 'added' | 'removed' }>('/api/reactions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_slug: threadSlug.value,
          comment_id: commentId,
          kind,
        }),
      })

      if (commentId === null && (res?.action === 'added' || res?.action === 'removed')) {
        data.value = cloneSummary(snapshot)
        applyLocalToggle(kind, res.action)
        await refresh()
      }

      return res
    }
    catch (err) {
      if (commentId === null)
        data.value = snapshot
      throw err
    }
  }

  const api = {
    data,
    pending,
    error,
    refresh,
    status,
    reactions: data,
    toggleReaction,
    ensureActiveReady,
  }

  return {
    ...api,
    then(
      onFulfilled: (value: UseCommunityReactionsApi) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(asyncData as PromiseLike<unknown>)
        .then(() => api)
        .then(onFulfilled, onRejected)
    },
  } as UseCommunityReactionsReturn
}
