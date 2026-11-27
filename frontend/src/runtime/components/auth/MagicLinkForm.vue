<script setup lang="ts">
defineProps<{
  email: string
  placeholder: string
  sendLabel: string
  sendingLabel: string
  sending?: boolean
  sentTo?: string
  sentMessage: string
  sentInstructions: string
}>()

const emit = defineEmits<{
  'update:email': [value: string]
  'submit': []
}>()
</script>

<template>
  <div>
    <template v-if="sentTo">
      <p class="community-auth__hint">
        {{ sentMessage }} <strong>{{ sentTo }}</strong>
      </p>
      <p class="community-auth__hint">
        {{ sentInstructions }}
      </p>
    </template>
    <template v-else>
      <input
        class="community-auth__field"
        type="email"
        :value="email"
        :placeholder="placeholder"
        @input="emit('update:email', ($event.target as HTMLInputElement).value)"
      >
      <button
        type="button"
        class="community-auth__submit"
        :disabled="sending || !email.trim()"
        @click="emit('submit')"
      >
        {{ sending ? sendingLabel : sendLabel }}
      </button>
    </template>
  </div>
</template>
