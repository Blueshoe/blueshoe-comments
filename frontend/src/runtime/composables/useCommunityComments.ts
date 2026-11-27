import type { MaybeRefOrGetter, Ref } from 'vue'
import type { CommunityComment, CreateCommentPayload } from '../types/comment'
import { useAsyncData, useState } from '#imports'
import { computed, onMounted, toValue } from 'vue'
import { normalizeReactionSummary } from '../types/reaction'
import { useCommunityApi } from './useCommunityApi'

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseCommunityCommentsApi {
  data: Ref<CommunityComment[]>
  pending: Ref<boolean>
  error: Ref<Error | null | undefined>
  refresh: () => Promise<void>
  status: Ref<AsyncStatus>
  comments: Ref<CommunityComment[]>
  postComment: (
    payload: Omit<CreateCommentPayload, 'thread_slug'> & { thread_slug?: string },
  ) => Promise<CommunityComment>
  updateComment: (commentId: number, bodyMarkdown: string) => Promise<CommunityComment>
  deleteComment: (commentId: number) => Promise<void>
  ensureActiveReady: () => Promise<void>
}

export type UseCommunityCommentsReturn = UseCommunityCommentsApi & {
  then: (
    onFulfilled: (value: UseCommunityCommentsApi) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

function normalizeComment(comment: CommunityComment): CommunityComment {
  return {
    ...comment,
    reactions: normalizeReactionSummary(comment.reactions),
    replies: (comment.replies || []).map(normalizeComment),
  }
}

const readyPromises = new Map<string, Promise<void>>()

export function useCommunityComments(
  slug: MaybeRefOrGetter<string>,
): UseCommunityCommentsReturn {
  const { apiFetch, getVisitorId, ensureVisitorId } = useCommunityApi()
  const threadSlug = computed(() => toValue(slug))
  const clientReady = useState<Record<string, boolean>>(
    'community-comments-client-ready',
    () => ({}),
  )
  const ssrHadVisitor = useState<Record<string, boolean>>(
    'community-comments-ssr-visitor',
    () => ({}),
  )

  if (import.meta.server && threadSlug.value && getVisitorId()) {
    ssrHadVisitor.value = { ...ssrHadVisitor.value, [threadSlug.value]: true }
  }

  const asyncData = useAsyncData(
    () => `community-comments:${threadSlug.value}`,
    async () => {
      if (!threadSlug.value)
        return [] as CommunityComment[]
      const list = await apiFetch<CommunityComment[]>(
        `/api/comments/?thread_slug=${encodeURIComponent(threadSlug.value)}`,
      )
      return (list || []).map(normalizeComment)
    },
    {
      watch: [threadSlug],
      default: () => [] as CommunityComment[],
      dedupe: 'defer',
    },
  )

  const { data, pending, error, refresh, status } = asyncData

  async function ensureActiveReady() {
    if (!import.meta.client)
      return
    const key = threadSlug.value
    if (!key || clientReady.value[key])
      return

    ensureVisitorId()

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

  async function postComment(payload: Omit<CreateCommentPayload, 'thread_slug'> & { thread_slug?: string }) {
    const body: CreateCommentPayload = {
      ...payload,
      thread_slug: payload.thread_slug || threadSlug.value,
    }
    const created = await apiFetch<CommunityComment>('/api/comments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await refresh()
    return created
  }

  async function updateComment(commentId: number, bodyMarkdown: string) {
    const updated = await apiFetch<CommunityComment>(`/api/comments/${commentId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body_markdown: bodyMarkdown }),
    })
    await refresh()
    return updated
  }

  async function deleteComment(commentId: number) {
    await apiFetch<void>(`/api/comments/${commentId}/`, { method: 'DELETE' })
    await refresh()
  }

  const api = {
    data,
    pending,
    error,
    refresh,
    status,
    comments: data,
    postComment,
    updateComment,
    deleteComment,
    ensureActiveReady,
  }

  // Awaitable for SSR blocking — must resolve to `api` (with methods), not the payload.
  return {
    ...api,
    then(
      onFulfilled: (value: UseCommunityCommentsApi) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(asyncData as PromiseLike<unknown>)
        .then(() => api)
        .then(onFulfilled, onRejected)
    },
  } as UseCommunityCommentsReturn
}
