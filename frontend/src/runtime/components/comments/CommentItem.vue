<script setup lang="ts">
import type { CommunityTranslateFn } from '../../i18n'
import type { CommunityComment } from '../../types/comment'
import type { ReactionKind } from '../../types/reaction'
import { computed } from 'vue'
import ReactionBar from '../reactions/ReactionBar.vue'
import Avatar from '../shared/Avatar.vue'
import CommentMeta from './CommentMeta.vue'
import CommentPendingNotice from './CommentPendingNotice.vue'

const props = defineProps<{
  comment: CommunityComment
  t: CommunityTranslateFn
  allowReply?: boolean
  activeReplyId?: number | null
}>()

const emit = defineEmits<{
  reply: [comment: CommunityComment]
  edit: [comment: CommunityComment]
  delete: [comment: CommunityComment]
  reaction: [commentId: number, kind: ReactionKind]
}>()

const showReplyEditor = computed(() =>
  props.allowReply && props.activeReplyId != null && props.activeReplyId === props.comment.id,
)
</script>

<template>
  <div
    :id="`comment-${comment.id}`"
    class="comment-row"
    :class="{ 'is-reply': !allowReply }"
  >
    <Avatar :name="comment.author_name" :size="allowReply ? 'md' : 'sm'" />
    <div class="comment-main">
      <div class="comment-card">
        <CommentMeta
          :author-name="comment.author_name"
          :created-at="comment.created_at"
          :edited-at="comment.edited_at"
          :is-team="comment.is_team"
          :team-badge="t('teamBadge')"
          :edited-label="t('editedLabel')"
          :t="t"
        />
        <CommentPendingNotice
          v-if="comment.status && comment.status !== 'approved'"
          :title="t('pendingReviewTitle')"
          :notice="t('pendingReviewNotice')"
          :reason-label="t('assessmentReasonLabel')"
          :reason="comment.moderation_reason"
        />
        <div class="comment-body" v-html="comment.body_html" />
      </div>

      <div v-if="comment.status === 'approved'" class="reactions-bar">
        <ReactionBar
          :reactions="comment.reactions || { counts: {}, active: [] }"
          :add-label="t('addReaction')"
          align="start"
          @toggle="(kind) => emit('reaction', comment.id, kind)"
        />
        <template v-if="allowReply">
          <span class="reactions-sep" aria-hidden="true" />
          <button type="button" class="reply-action-btn" @click="emit('reply', comment)">
            {{ t('replyBtn') }}
          </button>
        </template>
        <button
          v-if="comment.can_edit"
          type="button"
          class="reply-action-btn"
          @click="emit('edit', comment)"
        >
          {{ t('editBtn') }}
        </button>
        <button
          v-if="comment.can_edit"
          type="button"
          class="reply-action-btn"
          @click="emit('delete', comment)"
        >
          {{ t('deleteBtn') }}
        </button>
      </div>

      <div v-if="showReplyEditor" class="inline-reply-box">
        <slot name="reply-editor" :comment="comment" />
      </div>

      <div v-if="allowReply && comment.replies?.length" class="replies-list">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :t="t"
          :allow-reply="false"
          @reply="emit('reply', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @reaction="(id, kind) => emit('reaction', id, kind)"
        />
      </div>
    </div>
  </div>
</template>
