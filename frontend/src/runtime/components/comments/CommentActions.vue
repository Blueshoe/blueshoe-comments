<script setup lang="ts">
defineProps<{
  canEdit?: boolean
  replyLabel: string
  editLabel: string
  deleteLabel: string
  deleting?: boolean
}>()

defineEmits<{
  reply: []
  edit: []
  delete: []
}>()
</script>

<template>
  <div class="community-comments__actions">
    <button type="button" class="community-comments__action" @click="$emit('reply')">
      {{ replyLabel }}
    </button>
    <button
      v-if="canEdit"
      type="button"
      class="community-comments__action"
      @click="$emit('edit')"
    >
      {{ editLabel }}
    </button>
    <button
      v-if="canEdit"
      type="button"
      class="community-comments__action"
      :disabled="deleting"
      @click="$emit('delete')"
    >
      {{ deleting ? deleteLabel : deleteLabel }}
    </button>
  </div>
</template>
