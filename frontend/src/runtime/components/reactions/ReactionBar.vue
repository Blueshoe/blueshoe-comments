<script setup lang="ts">
import type { ReactionKind, ReactionSummary } from '../../types/reaction'
import { computed, ref } from 'vue'
import { useClickOutside } from '../../composables/useClickOutside'
import { REACTION_KINDS, visibleReactionKinds } from '../../types/reaction'

const props = withDefaults(defineProps<{
  reactions: ReactionSummary
  addLabel: string
  align?: 'start' | 'center'
}>(), {
  align: 'center',
})

const emit = defineEmits<{
  toggle: [kind: ReactionKind]
}>()

const open = ref(false)
const triggerWrap = ref<HTMLElement | null>(null)

const activeKinds = computed(() => visibleReactionKinds(props.reactions.counts))

useClickOutside(triggerWrap, () => {
  open.value = false
}, {
  enabled: () => open.value,
})

function onToggle(kind: ReactionKind) {
  open.value = false
  emit('toggle', kind)
}
</script>

<template>
  <div
    class="page-reactions-row"
    :style="align === 'start' ? { justifyContent: 'flex-start' } : undefined"
  >
    <button
      v-for="item in activeKinds"
      :key="item.kind"
      type="button"
      class="page-reaction-pill"
      :class="{ active: reactions.active?.includes(item.kind) }"
      @click="onToggle(item.kind)"
    >
      <span aria-hidden="true">{{ item.emoji }}</span>
      <span>{{ reactions.counts?.[item.kind] || 0 }}</span>
    </button>

    <div ref="triggerWrap" class="page-reaction-trigger-wrap">
      <button
        type="button"
        class="page-reaction-trigger"
        :aria-label="addLabel"
        :aria-expanded="open"
        :title="addLabel"
        @click.stop="open = !open"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.2 9.4c.7 1 1.7 1.5 2.8 1.5s2.1-.5 2.8-1.5" stroke-linecap="round" />
          <circle cx="5.8" cy="6.4" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="10.2" cy="6.4" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <div v-if="open" class="page-reaction-picker" role="menu" :aria-label="addLabel">
        <div class="page-reaction-picker-grid">
          <button
            v-for="item in REACTION_KINDS"
            :key="item.kind"
            type="button"
            class="page-reaction-option"
            :class="{ active: reactions.active?.includes(item.kind) }"
            role="menuitem"
            :title="item.kind"
            @click="onToggle(item.kind)"
          >
            {{ item.emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
