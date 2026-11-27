import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export function useCommentDraft(slug: MaybeRefOrGetter<string>) {
  const threadSlug = computed(() => toValue(slug))
  const storageKey = computed(() => `comment-draft:${threadSlug.value}`)

  function loadDraft(): string {
    if (import.meta.server || typeof localStorage === 'undefined')
      return ''
    try {
      return localStorage.getItem(storageKey.value) || ''
    }
    catch {
      return ''
    }
  }

  function saveDraft(text: string) {
    if (import.meta.server || typeof localStorage === 'undefined')
      return
    try {
      if (!text) {
        localStorage.removeItem(storageKey.value)
      }
      else {
        localStorage.setItem(storageKey.value, text)
      }
    }
    catch {
      /* ignore */
    }
  }

  function clearDraft() {
    saveDraft('')
  }

  return { loadDraft, saveDraft, clearDraft }
}
