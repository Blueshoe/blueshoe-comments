import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ReactionBatch, ReactionKind, ReactionTeaser } from '../types/reaction'
import { useAsyncData } from '#imports'
import { computed, toValue } from 'vue'
import { normalizeReactionCounts } from '../types/reaction'
import { useCommunityApi } from './useCommunityApi'

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseCommunityReactionBatchApi {
  data: Ref<ReactionBatch>
  pending: Ref<boolean>
  error: Ref<Error | null | undefined>
  refresh: () => Promise<void>
  status: Ref<AsyncStatus>
  batch: Ref<ReactionBatch>
}

export type UseCommunityReactionBatchReturn = UseCommunityReactionBatchApi & {
  then: (
    onFulfilled: (value: UseCommunityReactionBatchApi) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

function stableKey(slugs: string[]): string {
  return [...slugs].map(s => s.trim()).filter(Boolean).sort().join(',')
}

function toTeaser(raw: {
  comment_count?: number
  reactions?: Partial<Record<ReactionKind, number>>
  active_reactions?: ReactionKind[]
}): ReactionTeaser {
  return {
    comment_count: raw.comment_count || 0,
    reactions: normalizeReactionCounts(raw.reactions),
  }
}

/**
 * Batch teaser data for ToC / blog cards.
 * Strips visitor-specific `active_reactions` — host app owns presentation.
 */
export function useCommunityReactionBatch(
  slugs: MaybeRefOrGetter<string[] | string>,
): UseCommunityReactionBatchReturn {
  const { apiFetch } = useCommunityApi()

  const normalized = computed(() => {
    const value = toValue(slugs)
    const list = Array.isArray(value) ? value : value ? [value] : []
    return list.map(s => s.trim()).filter(Boolean).slice(0, 100)
  })

  const asyncData = useAsyncData(
    () => `community-reactions-batch:${stableKey(normalized.value)}`,
    async () => {
      if (normalized.value.length === 0)
        return {} as ReactionBatch
      const qs = encodeURIComponent(normalized.value.join(','))
      const raw = await apiFetch<Record<string, {
        comment_count?: number
        reactions?: Partial<Record<ReactionKind, number>>
        active_reactions?: ReactionKind[]
      }>>(`/api/reactions/batch/?thread_slug=${qs}`)

      const batch: ReactionBatch = {}
      // Keep host slug order (not API object-key order).
      for (const slug of normalized.value) {
        batch[slug] = raw?.[slug]
          ? toTeaser(raw[slug])
          : { comment_count: 0, reactions: {} }
      }
      return batch
    },
    {
      watch: [normalized],
      default: () => ({} as ReactionBatch),
      dedupe: 'defer',
    },
  )

  const { data, pending, error, refresh, status } = asyncData

  const api = {
    data,
    pending,
    error,
    refresh,
    status,
    batch: data,
  }

  // Awaitable for SSR — resolve to API object, not asyncData payload.
  return {
    ...api,
    then(
      onFulfilled: (value: UseCommunityReactionBatchApi) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(asyncData as PromiseLike<unknown>)
        .then(() => api)
        .then(onFulfilled, onRejected)
    },
  } as UseCommunityReactionBatchReturn
}
