<script setup lang="ts">
import AltchaField from '../shared/AltchaField.vue'

defineProps<{
  guestName: string
  nameLabel: string
  postLabel: string
  canSubmit: boolean
  challengeUrl: string
}>()

const emit = defineEmits<{
  'update:guestName': [value: string]
  'verified': [payload: string]
  'reset': []
  'submit': []
}>()
</script>

<template>
  <div>
    <label class="community-auth__hint">{{ nameLabel }}</label>
    <input
      class="community-auth__field"
      type="text"
      :value="guestName"
      @input="emit('update:guestName', ($event.target as HTMLInputElement).value)"
    >
    <AltchaField
      :challenge-url="challengeUrl"
      @verified="emit('verified', $event)"
      @reset="emit('reset')"
    />
    <button
      type="button"
      class="community-auth__submit"
      :disabled="!canSubmit"
      @click="emit('submit')"
    >
      {{ postLabel }}
    </button>
  </div>
</template>
