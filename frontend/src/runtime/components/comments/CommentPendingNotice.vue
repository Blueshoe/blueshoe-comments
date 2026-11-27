<script setup lang="ts">
defineProps<{
  title: string
  notice: string
  reasonLabel: string
  reason?: string
}>()
</script>

<template>
  <div class="pending-review-box">
    <div class="pending-review-header">
      <span>⏳ {{ title }}</span>
    </div>
    <p class="pending-review-notice">
      {{ notice }}
    </p>
    <div v-if="reason" class="pending-review-reason">
      <strong>{{ reasonLabel }}</strong> {{ reason }}
    </div>
  </div>
</template>
