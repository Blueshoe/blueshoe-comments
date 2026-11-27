<script setup lang="ts">
import type { CommunityComment } from '../types/comment'
import type { ReactionKind } from '../types/reaction'
import { computed, onMounted, ref, watch } from 'vue'
import { useCommentDraft } from '../composables/useCommentDraft'
import { useCommunityAuth } from '../composables/useCommunityAuth'
import { useCommunityComments } from '../composables/useCommunityComments'
import { useCommunityConfig } from '../composables/useCommunityConfig'
import { useCommunityReactions } from '../composables/useCommunityReactions'
import { useCommunityI18n } from '../i18n'
import { normalizeReactionSummary } from '../types/reaction'
import AuthPicker from './auth/AuthPicker.vue'
import CommentList from './comments/CommentList.vue'
import MarkdownEditor from './editor/MarkdownEditor.vue'
import Avatar from './shared/Avatar.vue'
import CocModal from './shared/CocModal.vue'
import OfflineState from './shared/OfflineState.vue'

const props = withDefaults(defineProps<{
  threadSlug: string
  comments?: CommunityComment[]
  lang?: string
  offline?: boolean
}>(), {
  comments: () => [],
  offline: false,
})

const emit = defineEmits<{
  'update:comments': [value: CommunityComment[]]
  'refresh': []
}>()

const { t, coc } = useCommunityI18n(props.lang)
const { apiBase } = useCommunityConfig()
const {
  data: fetchedComments,
  error: commentsError,
  status: commentsStatus,
  postComment,
  updateComment,
  deleteComment,
  refresh,
  ensureActiveReady: ensureCommentsActiveReady,
} = await useCommunityComments(() => props.threadSlug)
const {
  toggleReaction,
  ensureActiveReady: ensureReactionsActiveReady,
} = await useCommunityReactions(() => props.threadSlug)
const { currentUser, providers, fetchAuth, loginWith, requestMagicLink, logout } = useCommunityAuth()
const { loadDraft, saveDraft, clearDraft } = useCommentDraft(() => props.threadSlug)

// Prefer host props until comments asyncData resolves — default `[]` is truthy.
const localComments = computed(() => {
  if (commentsStatus.value === 'success' && fetchedComments.value)
    return fetchedComments.value
  return props.comments?.length ? props.comments : (fetchedComments.value || [])
})

const expanded = ref(false)
const commentBody = ref('')
const guestName = ref('')
const altchaPayload = ref('')
const isSubmitting = ref(false)
const showAuthPicker = ref(false)
const authTarget = ref<'comment' | 'reply'>('comment')
const showCoc = ref(false)
const activeReplyId = ref<number | null>(null)
const replyBody = ref('')
const editingId = ref<number | null>(null)
const editingBody = ref('')
const actionError = ref('')
const pendingDeleteId = ref<number | null>(null)
const isOffline = computed(() => props.offline || !!commentsError.value)

onMounted(() => {
  const draft = loadDraft()
  if (draft)
    commentBody.value = draft
  void fetchAuth()
})

watch(commentBody, (value) => {
  if (expanded.value)
    saveDraft(value)
})

const totalCount = computed(() =>
  localComments.value.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0),
)

const countLabel = computed(() =>
  totalCount.value === 1
    ? t('commentCountSingular')
    : t('commentCountPlural', { n: totalCount.value }),
)

const challengeUrl = computed(() => `${apiBase.value}/api/captcha/challenge`)
const canPostAsGuest = computed(() => !!altchaPayload.value && !isSubmitting.value)
const composerName = computed(() => currentUser.value?.name || t('youAvatar'))

async function syncFromServer() {
  try {
    await refresh()
    emit('refresh')
    emit('update:comments', localComments.value)
  }
  catch (err) {
    console.error(err)
  }
}

async function submitComment() {
  if (!commentBody.value.trim() || isSubmitting.value)
    return
  if (!currentUser.value && !altchaPayload.value) {
    showAuthPicker.value = true
    return
  }

  isSubmitting.value = true
  try {
    await postComment({
      body_markdown: commentBody.value,
      guest_name: currentUser.value ? undefined : guestName.value || undefined,
      altcha: currentUser.value ? undefined : altchaPayload.value || undefined,
    })
    commentBody.value = ''
    altchaPayload.value = ''
    guestName.value = ''
    expanded.value = false
    showAuthPicker.value = false
    clearDraft()
    await syncFromServer()
  }
  catch (err) {
    console.error(err)
    actionError.value = err instanceof Error ? err.message : 'Failed to post comment'
  }
  finally {
    isSubmitting.value = false
  }
}

function toggleAuthPicker(target: 'comment' | 'reply') {
  if (showAuthPicker.value && authTarget.value === target) {
    showAuthPicker.value = false
    return
  }
  authTarget.value = target
  showAuthPicker.value = true
}

function requestSubmit() {
  if (!currentUser.value) {
    toggleAuthPicker('comment')
    return
  }
  void submitComment()
}

function requestReplySubmit(parentId: number) {
  if (!replyBody.value.trim() || isSubmitting.value)
    return
  if (!currentUser.value) {
    toggleAuthPicker('reply')
    return
  }
  void submitReply(parentId)
}

function onPostGuest() {
  if (authTarget.value === 'reply' && activeReplyId.value != null) {
    void submitReply(activeReplyId.value)
    return
  }
  void submitComment()
}

async function submitReply(parentId: number) {
  if (!replyBody.value.trim() || isSubmitting.value)
    return
  if (!currentUser.value && !altchaPayload.value) {
    authTarget.value = 'reply'
    showAuthPicker.value = true
    return
  }

  isSubmitting.value = true
  try {
    await postComment({
      parent_id: parentId,
      body_markdown: replyBody.value,
      guest_name: currentUser.value ? undefined : guestName.value || undefined,
      altcha: currentUser.value ? undefined : altchaPayload.value || undefined,
    })
    replyBody.value = ''
    activeReplyId.value = null
    altchaPayload.value = ''
    guestName.value = ''
    showAuthPicker.value = false
    await syncFromServer()
  }
  catch (err) {
    console.error(err)
    actionError.value = err instanceof Error ? err.message : 'Failed to post reply'
  }
  finally {
    isSubmitting.value = false
  }
}

async function onDelete(comment: CommunityComment) {
  if (pendingDeleteId.value !== comment.id) {
    pendingDeleteId.value = comment.id
    return
  }
  pendingDeleteId.value = null
  try {
    await deleteComment(comment.id)
    await syncFromServer()
  }
  catch (err) {
    console.error(err)
    actionError.value = err instanceof Error ? err.message : 'Failed to delete comment'
  }
}

async function onEdit(comment: CommunityComment) {
  editingId.value = comment.id
  editingBody.value = comment.raw_markdown || ''
}

async function saveEdit() {
  if (editingId.value == null || !editingBody.value.trim())
    return
  try {
    await updateComment(editingId.value, editingBody.value)
    editingId.value = null
    editingBody.value = ''
    await syncFromServer()
  }
  catch (err) {
    console.error(err)
  }
}

function mapCommentTree(
  list: CommunityComment[],
  commentId: number,
  update: (comment: CommunityComment) => CommunityComment,
): CommunityComment[] {
  return list.map((comment) => {
    if (comment.id === commentId)
      return update(comment)
    if (!comment.replies?.length)
      return comment
    return { ...comment, replies: mapCommentTree(comment.replies, commentId, update) }
  })
}

function patchCommentReaction(commentId: number, kind: ReactionKind, action: 'added' | 'removed') {
  const list = fetchedComments.value
  if (!list?.length)
    return

  fetchedComments.value = mapCommentTree(list, commentId, (comment) => {
    const counts = { ...(comment.reactions?.counts || {}) }
    let active = [...(comment.reactions?.active || [])]
    if (action === 'added') {
      counts[kind] = (counts[kind] || 0) + 1
      if (!active.includes(kind))
        active.push(kind)
    }
    else {
      counts[kind] = Math.max(0, (counts[kind] || 1) - 1)
      if (counts[kind] === 0)
        delete counts[kind]
      active = active.filter(k => k !== kind)
    }
    return { ...comment, reactions: normalizeReactionSummary({ counts, active }) }
  })
}

function restoreCommentReactions(
  commentId: number,
  reactions: CommunityComment['reactions'],
) {
  const list = fetchedComments.value
  if (!list?.length)
    return
  fetchedComments.value = mapCommentTree(list, commentId, comment => ({
    ...comment,
    reactions: normalizeReactionSummary(reactions),
  }))
}

function findComment(commentId: number): CommunityComment | undefined {
  for (const comment of localComments.value) {
    if (comment.id === commentId)
      return comment
    const reply = comment.replies?.find(r => r.id === commentId)
    if (reply)
      return reply
  }
  return undefined
}

async function onReaction(commentId: number, kind: ReactionKind) {
  // Resolve visitor + correct `active` before optimistic UI (avoids wrong +/-).
  await Promise.all([ensureCommentsActiveReady(), ensureReactionsActiveReady()])

  const target = findComment(commentId)
  const snapshot = {
    counts: { ...(target?.reactions?.counts || {}) },
    active: [...(target?.reactions?.active || [])] as ReactionKind[],
  }
  const wasActive = snapshot.active.includes(kind)
  patchCommentReaction(commentId, kind, wasActive ? 'removed' : 'added')

  try {
    const res = await toggleReaction(kind, commentId)
    if (res?.action === 'added' || res?.action === 'removed') {
      restoreCommentReactions(commentId, snapshot)
      patchCommentReaction(commentId, kind, res.action)
    }
    await syncFromServer()
  }
  catch (err) {
    console.error(err)
    restoreCommentReactions(commentId, snapshot)
    await syncFromServer()
  }
}

function onReply(comment: CommunityComment) {
  activeReplyId.value = activeReplyId.value === comment.id ? null : comment.id
  replyBody.value = ''
  showAuthPicker.value = false
}
</script>

<template>
  <section class="community-root" data-community-theme>
    <OfflineState
      v-if="isOffline"
      :message="t('offlineMessage')"
      :retry-label="t('retry')"
      @retry="syncFromServer"
    />

    <div v-else class="comments-widget">
      <div class="comments-section">
        <div class="widget-header">
          <h3>{{ t('discussionTitle') }}</h3>
          <p class="widget-subtitle">
            {{ t('discussionSubtitle') }}
          </p>
          <p v-if="actionError" class="widget-subtitle" role="alert">
            {{ actionError }}
            <button type="button" class="logout-btn" @click="actionError = ''">
              ×
            </button>
          </p>
          <p v-if="pendingDeleteId != null" class="widget-subtitle" role="status">
            {{ t('deleteConfirm') }}
            <button type="button" class="logout-btn" @click="pendingDeleteId = null">
              {{ t('cancelBtn') }}
            </button>
          </p>
        </div>

        <div class="composer-slot">
          <button
            v-if="!expanded"
            type="button"
            class="composer-collapsed"
            @click="expanded = true"
          >
            <Avatar :name="composerName" size="md" />
            <span
              class="composer-collapsed-placeholder"
              :class="{ 'has-draft': !!commentBody }"
            >
              {{ commentBody || t('placeholder') }}
            </span>
          </button>

          <div v-else class="editor-box">
            <MarkdownEditor
              v-model="commentBody"
              :placeholder="t('placeholder')"
              :switch-to-preview-label="t('switchToPreview')"
              :switch-to-markdown-label="t('switchToMarkdown')"
              :format-toggle-title="t('formatToggleTitle')"
              :preview-empty="t('previewEmpty')"
              :submit-label="t('submitBtn')"
              :submitting-label="t('submittingBtn')"
              :submitting="isSubmitting"
              @submit="requestSubmit"
            >
              <template #footer-left>
                <button type="button" class="coc-link" @click="showCoc = true">
                  {{ t('cocLink') }}
                </button>
              </template>
              <template #submit-wrap>
                <div class="editor-submit">
                  <span v-if="currentUser" class="footer-user">
                    <strong>{{ currentUser.name }}</strong>
                    <span v-if="currentUser.is_team" class="team-badge">{{ t('teamBadge') }}</span>
                    <button type="button" class="logout-btn" @click="logout">
                      {{ t('logoutBtn') }}
                    </button>
                  </span>
                  <button
                    type="button"
                    class="pill-btn pill-btn-cancel"
                    @click="expanded = false; showAuthPicker = false"
                  >
                    {{ t('cancelBtn') }}
                  </button>
                  <div class="submit-wrap">
                    <button
                      type="button"
                      class="pill-btn pill-btn-primary"
                      :disabled="isSubmitting || !commentBody.trim()"
                      @click="requestSubmit"
                    >
                      {{ isSubmitting ? t('submittingBtn') : t('submitBtn') }}
                    </button>
                    <AuthPicker
                      v-if="showAuthPicker && authTarget === 'comment' && !currentUser"
                      :providers="providers"
                      :title="t('signInToPost')"
                      :guest-label="t('continueAsGuest')"
                      :post-as-guest-label="t('postAsGuest')"
                      :guest-name-label="t('guestNameLabel')"
                      :guest-name-placeholder="t('guestNamePlaceholder')"
                      :guest-name="guestName"
                      :challenge-url="challengeUrl"
                      :can-post-as-guest="canPostAsGuest"
                      :submitting="isSubmitting"
                      :email-placeholder="t('emailLinkPlaceholder')"
                      :send-magic-link-label="t('sendMagicLinkBtn')"
                      :sending-magic-link-label="t('sendingMagicLinkBtn')"
                      :magic-link-sent-message="t('magicLinkSentMessage')"
                      :magic-link-sent-instructions="t('magicLinkSentInstructions')"
                      @update:guest-name="guestName = $event"
                      @provider="loginWith"
                      @verified="altchaPayload = $event"
                      @reset-captcha="altchaPayload = ''"
                      @post-guest="onPostGuest"
                      @magic-link="(email) => requestMagicLink(email)"
                      @close="showAuthPicker = false"
                    />
                  </div>
                </div>
              </template>
            </MarkdownEditor>
          </div>
        </div>

        <div class="comments-meta">
          <span class="comments-count">{{ countLabel }}</span>
        </div>

        <CommentList
          :comments="localComments"
          :t="t"
          :active-reply-id="activeReplyId"
          @reply="onReply"
          @edit="onEdit"
          @delete="onDelete"
          @reaction="onReaction"
        >
          <template #reply-editor="{ comment }">
            <h6>{{ t('replyingTo') }} <strong>{{ comment.author_name }}</strong></h6>
            <MarkdownEditor
              v-model="replyBody"
              :placeholder="t('replyPlaceholder')"
              :switch-to-preview-label="t('switchToPreview')"
              :switch-to-markdown-label="t('switchToMarkdown')"
              :format-toggle-title="t('formatToggleTitle')"
              :preview-empty="t('previewEmpty')"
              :submit-label="t('postReplyBtn')"
              :submitting-label="t('submittingBtn')"
              :submitting="isSubmitting"
              @submit="requestReplySubmit(comment.id)"
            >
              <template #submit-wrap>
                <div class="reply-actions">
                  <button
                    type="button"
                    class="cancel-btn"
                    @click="activeReplyId = null; showAuthPicker = false"
                  >
                    {{ t('cancelBtn') }}
                  </button>
                  <div class="submit-wrap">
                    <button
                      type="button"
                      class="submit-btn"
                      :disabled="isSubmitting || !replyBody.trim()"
                      @click="requestReplySubmit(comment.id)"
                    >
                      {{ isSubmitting ? t('submittingBtn') : t('postReplyBtn') }}
                    </button>
                    <AuthPicker
                      v-if="showAuthPicker && authTarget === 'reply' && !currentUser"
                      :providers="providers"
                      :title="t('signInToPost')"
                      :guest-label="t('continueAsGuest')"
                      :post-as-guest-label="t('postAsGuest')"
                      :guest-name-label="t('guestNameLabel')"
                      :guest-name-placeholder="t('guestNamePlaceholder')"
                      :guest-name="guestName"
                      :challenge-url="challengeUrl"
                      :can-post-as-guest="canPostAsGuest"
                      :submitting="isSubmitting"
                      :email-placeholder="t('emailLinkPlaceholder')"
                      :send-magic-link-label="t('sendMagicLinkBtn')"
                      :sending-magic-link-label="t('sendingMagicLinkBtn')"
                      :magic-link-sent-message="t('magicLinkSentMessage')"
                      :magic-link-sent-instructions="t('magicLinkSentInstructions')"
                      @update:guest-name="guestName = $event"
                      @provider="loginWith"
                      @verified="altchaPayload = $event"
                      @reset-captcha="altchaPayload = ''"
                      @post-guest="onPostGuest"
                      @magic-link="(email) => requestMagicLink(email)"
                      @close="showAuthPicker = false"
                    />
                  </div>
                </div>
              </template>
            </MarkdownEditor>
          </template>
        </CommentList>

        <div v-if="editingId != null" class="revision-editor" style="margin-top: 0.75rem;">
          <MarkdownEditor
            v-model="editingBody"
            :placeholder="t('placeholder')"
            :switch-to-preview-label="t('switchToPreview')"
            :switch-to-markdown-label="t('switchToMarkdown')"
            :format-toggle-title="t('formatToggleTitle')"
            :preview-empty="t('previewEmpty')"
            :submit-label="t('saveRevisionBtn')"
            :submitting-label="t('savingRevisionBtn')"
            @submit="saveEdit"
          >
            <template #submit-wrap>
              <div class="revision-actions">
                <button type="button" class="cancel-btn" @click="editingId = null">
                  {{ t('cancelRevisionBtn') }}
                </button>
                <button type="button" class="submit-btn" @click="saveEdit">
                  {{ t('saveRevisionBtn') }}
                </button>
              </div>
            </template>
          </MarkdownEditor>
        </div>
      </div>
    </div>

    <CocModal v-if="showCoc" :content="coc()" @close="showCoc = false" />
  </section>
</template>
