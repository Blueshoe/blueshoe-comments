<script setup lang="ts">
import { computed } from 'vue'
import { getAvatarColor, getInitials } from '../../utils/avatar'

const props = withDefaults(defineProps<{
  name: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const initials = computed(() => getInitials(props.name))
const color = computed(() => getAvatarColor(props.name))
</script>

<template>
  <span
    class="avatar"
    :class="`avatar-${size}`"
    :style="{ background: color }"
    :title="name"
    aria-hidden="true"
  >
    {{ initials }}
  </span>
</template>
