<script setup lang="ts">
defineProps<{
  message: string
  retryLabel: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="status-card">
    <p>{{ message }}</p>
    <button type="button" class="submit-btn" @click="$emit('retry')">
      {{ retryLabel }}
    </button>
  </div>
</template>
