<script setup lang="ts">
import type { CommunityTranslateFn } from '../../i18n'
import type { CommunityComment } from '../../types/comment'
import type { ReactionKind } from '../../types/reaction'
import CommentItem from './CommentItem.vue'

defineProps<{
  comments: CommunityComment[]
  t: CommunityTranslateFn
  activeReplyId?: number | null
}>()

defineEmits<{
  reply: [comment: CommunityComment]
  edit: [comment: CommunityComment]
  delete: [comment: CommunityComment]
  reaction: [commentId: number, kind: ReactionKind]
}>()
</script>

<template>
  <div class="comment-list">
    <CommentItem
      v-for="comment in comments"
      :key="comment.id"
      :comment="comment"
      :t="t"
      :allow-reply="true"
      :active-reply-id="activeReplyId"
      @reply="$emit('reply', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @reaction="(id, kind) => $emit('reaction', id, kind)"
    >
      <template #reply-editor="slotProps">
        <slot name="reply-editor" v-bind="slotProps" />
      </template>
    </CommentItem>
  </div>
</template>
