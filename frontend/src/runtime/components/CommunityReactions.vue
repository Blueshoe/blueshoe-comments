<script setup lang="ts">
import type { ReactionKind, ReactionSummary } from '../types/reaction'
import { computed } from 'vue'
import { useCommunityReactions } from '../composables/useCommunityReactions'
import { useCommunityI18n } from '../i18n'
import ReactionBar from './reactions/ReactionBar.vue'

const props = withDefaults(defineProps<{
  threadSlug: string
  reactions?: ReactionSummary
  lang?: string
}>(), {
  reactions: undefined,
})

const emit = defineEmits<{
  'update:reactions': [value: ReactionSummary]
  'toggle': [kind: ReactionKind]
}>()

const { t } = useCommunityI18n(props.lang)
const {
  data: fetched,
  pending,
  error,
  status,
  toggleReaction,
} = await useCommunityReactions(() => props.threadSlug)

const empty: ReactionSummary = { counts: {}, active: [] }
// Prefer host props until the shared asyncData has resolved — default `{}` is truthy
// and would otherwise hide SSR/prop counts during the first paint / refresh.
const local = computed<ReactionSummary>(() => {
  if (status.value === 'success' && fetched.value)
    return fetched.value
  return props.reactions || fetched.value || empty
})

const total = computed(() =>
  Object.values(local.value.counts || {}).reduce((sum, n) => sum + (n || 0), 0),
)

const summaryLabel = computed(() =>
  total.value === 1
    ? t('reactionCountSingular')
    : t('reactionCountPlural', { n: total.value }),
)

async function onToggle(kind: ReactionKind) {
  emit('toggle', kind)
  try {
    await toggleReaction(kind, null)
    emit('update:reactions', local.value)
  }
  catch (err) {
    console.error('Failed to toggle reaction', err)
  }
}

const isOffline = computed(() => !!error.value && !pending.value)
</script>

<template>
  <div class="community-root" data-community-theme>
    <div class="page-reactions">
      <p
        v-if="isOffline"
        class="widget-alert"
        role="status"
      >
        {{ t('offlineMessage') }}
      </p>
      <template v-else>
        <div v-if="total > 0" class="page-reactions-summary">
          {{ summaryLabel }}
        </div>
        <ReactionBar
          :reactions="local"
          :add-label="t('addReaction')"
          @toggle="onToggle"
        />
      </template>
    </div>
  </div>
</template>
