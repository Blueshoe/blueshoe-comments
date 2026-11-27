import { useRuntimeConfig } from '#imports'
import { computed } from 'vue'

export function useCommunityConfig() {
  const config = useRuntimeConfig()
  const apiBase = computed(() => {
    const base = (config.public.community as { apiBase?: string } | undefined)?.apiBase || ''
    return base.replace(/\/$/, '')
  })

  return { apiBase }
}
