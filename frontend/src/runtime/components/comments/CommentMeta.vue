<script setup lang="ts">
import type { CommunityTranslateFn } from '../../i18n'
import { computed } from 'vue'
import { formatRelativeTime } from '../../utils/time'

const props = defineProps<{
  authorName: string
  createdAt: string
  editedAt?: string | null
  isTeam?: boolean
  teamBadge: string
  editedLabel: string
  t: CommunityTranslateFn
}>()

const relative = computed(() => formatRelativeTime(props.createdAt, props.t))
</script>

<template>
  <div class="comment-header">
    <span class="comment-author">{{ authorName }}</span>
    <span v-if="isTeam" class="team-badge">{{ teamBadge }}</span>
    <span class="comment-header-spacer" />
    <span v-if="editedAt" class="comment-date">{{ editedLabel }}</span>
    <span class="comment-date">{{ relative }}</span>
  </div>
</template>
