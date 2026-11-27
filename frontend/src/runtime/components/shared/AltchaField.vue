<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  challengeUrl: string
}>()

const emit = defineEmits<{
  verified: [payload: string]
  reset: []
}>()

const host = ref<HTMLElement | null>(null)

onMounted(async () => {
  if (import.meta.server)
    return
  await import('altcha')
  await import('altcha/altcha.css')

  const el = document.createElement('altcha-widget')
  el.setAttribute('challengeurl', props.challengeUrl)
  // Match Lit widget: solve in the background, no checkbox UI.
  el.setAttribute('display', 'invisible')
  el.setAttribute('auto', 'onload')
  el.addEventListener('verified', ((event: CustomEvent) => {
    const payload = (event.detail as { payload?: string })?.payload || ''
    if (payload)
      emit('verified', payload)
  }) as EventListener)
  el.addEventListener('reset', (() => emit('reset')) as EventListener)
  host.value?.appendChild(el)
})

onBeforeUnmount(() => {
  if (host.value)
    host.value.innerHTML = ''
})
</script>

<template>
  <ClientOnly>
    <div ref="host" class="community-altcha" />
  </ClientOnly>
</template>
