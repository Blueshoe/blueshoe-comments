<script setup lang="ts">
import type { AuthProvider } from '../../types/auth'
import { ref } from 'vue'
import { useClickOutside } from '../../composables/useClickOutside'
import AltchaField from '../shared/AltchaField.vue'

defineProps<{
  providers: AuthProvider[]
  title: string
  guestLabel: string
  postAsGuestLabel: string
  guestNameLabel: string
  guestNamePlaceholder: string
  guestName: string
  challengeUrl: string
  canPostAsGuest: boolean
  emailPlaceholder: string
  sendMagicLinkLabel: string
  sendingMagicLinkLabel: string
  magicLinkSentMessage: string
  magicLinkSentInstructions: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'provider': [id: string]
  'update:guestName': [value: string]
  'verified': [payload: string]
  'resetCaptcha': []
  'postGuest': []
  'magicLink': [email: string]
  'close': []
}>()

const root = ref<HTMLElement | null>(null)
const mode = ref<'providers' | 'guest' | 'email'>('providers')
const email = ref('')
const sending = ref(false)
const sentTo = ref('')

// Match Lit: ignore clicks on the picker itself and the submit-wrap (Comment button).
useClickOutside(root, () => emit('close'), {
  ignoreSelector: '.submit-wrap',
})

function selectProvider(id: string) {
  if (id === 'email_link') {
    mode.value = 'email'
    return
  }
  emit('provider', id)
}

function selectGuest() {
  mode.value = 'guest'
}

async function sendMagicLink() {
  if (!email.value.trim() || sending.value)
    return
  sending.value = true
  try {
    emit('magicLink', email.value.trim())
    sentTo.value = email.value.trim()
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <div ref="root" class="auth-picker" role="dialog" :aria-label="title">
    <p class="auth-picker-title">
      {{ title }}
    </p>

    <div class="auth-picker-providers">
      <template v-for="provider in providers" :key="provider.id">
        <button
          v-if="provider.id === 'email_link'"
          type="button"
          class="auth-provider-btn"
          :class="{ active: mode === 'email' }"
          :title="provider.name"
          :aria-label="provider.name"
          @click="selectProvider('email_link')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
            />
          </svg>
        </button>
        <button
          v-else
          type="button"
          class="auth-provider-btn"
          :title="provider.name"
          :aria-label="provider.name"
          @click="selectProvider(provider.id)"
        >
          <svg v-if="provider.id === 'github'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M12 2C6.477 2 2 6.586 2 12.253c0 4.537 2.865 8.383 6.839 9.743.5.094.682-.222.682-.493 0-.243-.01-1.05-.014-1.905-2.782.618-3.369-1.21-3.369-1.21-.454-1.179-1.11-1.492-1.11-1.492-.908-.636.069-.623.069-.623 1.004.072 1.532 1.055 1.532 1.055.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.259-4.555-1.14-4.555-5.077 0-1.122.39-2.04 1.03-2.76-.103-.26-.447-1.302.098-2.714 0 0 .84-.275 2.75 1.053A9.35 9.35 0 0 1 12 6.844a9.35 9.35 0 0 1 2.504.345c1.909-1.328 2.748-1.053 2.748-1.053.547 1.412.203 2.454.1 2.714.64.72 1.028 1.638 1.028 2.76 0 3.947-2.339 4.815-4.566 5.068.359.317.679.943.679 1.901 0 1.372-.012 2.477-.012 2.814 0 .273.18.592.688.491C19.138 20.633 22 16.787 22 12.253 22 6.586 17.523 2 12 2z"
            />
          </svg>
          <svg v-else-if="provider.id === 'google'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <svg v-else-if="provider.id.includes('linkedin')" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="#0A66C2"
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"
            />
          </svg>
          <svg v-else-if="provider.id.includes('twitter')" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.995-9.14L1.254 2.25H8.08l4.713 5.71zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </svg>
          <span v-else>{{ provider.name.slice(0, 1).toUpperCase() }}</span>
        </button>
      </template>

      <button
        type="button"
        class="auth-guest-btn"
        :class="{ active: mode === 'guest' }"
        @click="selectGuest"
      >
        {{ guestLabel }}
      </button>
    </div>

    <div v-if="mode === 'guest'" class="auth-picker-panel">
      <input
        class="name-input"
        type="text"
        :value="guestName"
        :placeholder="guestNamePlaceholder"
        :aria-label="guestNameLabel"
        @input="emit('update:guestName', ($event.target as HTMLInputElement).value)"
      >
      <AltchaField
        :challenge-url="challengeUrl"
        @verified="emit('verified', $event)"
        @reset="emit('resetCaptcha')"
      />
      <button
        type="button"
        class="submit-btn"
        :disabled="!canPostAsGuest || submitting"
        @click="emit('postGuest')"
      >
        {{ submitting ? '…' : postAsGuestLabel }}
      </button>
    </div>

    <div v-else-if="mode === 'email'" class="auth-picker-panel">
      <input
        v-model="email"
        class="magic-email-input"
        type="email"
        :placeholder="emailPlaceholder"
        @keydown.enter.prevent="sendMagicLink"
      >
      <button
        type="button"
        class="submit-btn"
        :disabled="!email.trim() || sending"
        @click="sendMagicLink"
      >
        {{ sending ? sendingMagicLinkLabel : sendMagicLinkLabel }}
      </button>
      <div v-if="sentTo" class="magic-sent-banner">
        <span>{{ magicLinkSentMessage }} {{ sentTo }}. {{ magicLinkSentInstructions }}</span>
        <button type="button" class="close-banner-btn" @click="sentTo = ''">
          ×
        </button>
      </div>
    </div>
  </div>
</template>
