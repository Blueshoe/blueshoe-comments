<script setup lang="ts">
import type { ReactionKind } from '../../types/reaction'
import { REACTION_KINDS } from '../../types/reaction'

defineProps<{
  active?: ReactionKind[]
}>()

defineEmits<{
  select: [kind: ReactionKind]
}>()
</script>

<template>
  <div class="community-reactions__picker" role="listbox">
    <div class="community-reactions__picker-grid">
      <button
        v-for="item in REACTION_KINDS"
        :key="item.kind"
        type="button"
        class="community-reactions__option"
        :class="{ 'is-active': active?.includes(item.kind) }"
        @click="$emit('select', item.kind)"
      >
        {{ item.emoji }}
      </button>
    </div>
  </div>
</template>
