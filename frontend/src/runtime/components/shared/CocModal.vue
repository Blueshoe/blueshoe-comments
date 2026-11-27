<script setup lang="ts">
import type { CodeOfConductContent } from '../../coc/code-of-conduct'

defineProps<{
  content: CodeOfConductContent
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="community-root" data-community-theme>
      <div class="modal-overlay" @click="emit('close')">
        <div class="modal-card" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h4>{{ content.title }} – {{ content.subtitle }}</h4>
            <button type="button" class="close-icon" aria-label="Close" @click="emit('close')">
              ✕
            </button>
          </div>
          <div class="modal-content">
            <h5>{{ content.valuesTitle }}</h5>
            <p>{{ content.values }}</p>

            <h5>{{ content.behaviorTitle }}</h5>
            <ul>
              <li v-for="(item, i) in content.behaviors" :key="`b-${i}`">
                {{ item }}
              </li>
            </ul>

            <h5>{{ content.moderationTitle }}</h5>
            <ul>
              <li v-for="(item, i) in content.removalReasons" :key="`r-${i}`">
                {{ item }}
              </li>
            </ul>

            <h5>{{ content.positiveTitle }}</h5>
            <ul>
              <li v-for="(item, i) in content.positives" :key="`p-${i}`">
                {{ item }}
              </li>
            </ul>

            <h5>{{ content.contactTitle }}</h5>
            <p>{{ content.contactText }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="submit-btn" @click="emit('close')">
              {{ content.closeBtn }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
