<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { renderMarkdownPreview } from '../../utils/markdown'
import FormatToolbar from './FormatToolbar.vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  switchToPreviewLabel: string
  switchToMarkdownLabel: string
  formatToggleTitle: string
  previewEmpty: string
  submitLabel: string
  submittingLabel: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()

const mode = ref<'write' | 'preview'>('write')
const textarea = ref<HTMLTextAreaElement | null>(null)
const showFormatting = ref(false)

const previewHtml = computed(() => renderMarkdownPreview(props.modelValue))
const switchLabel = computed(() =>
  mode.value === 'write' ? props.switchToPreviewLabel : props.switchToMarkdownLabel,
)

function toggleFormatting() {
  showFormatting.value = !showFormatting.value
}

function switchMode() {
  mode.value = mode.value === 'write' ? 'preview' : 'write'
}

function insertFormat(before: string, after: string, placeholder: string) {
  mode.value = 'write'
  nextTick(() => {
    const el = textarea.value
    if (!el) {
      emit('update:modelValue', `${props.modelValue}${before}${placeholder}${after}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const current = el.value
    const selected = current.substring(start, end) || placeholder
    const replacement = `${before}${selected}${after}`
    const nextValue = current.substring(0, start) + replacement + current.substring(end)
    emit('update:modelValue', nextValue)
    nextTick(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  })
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    emit('submit')
  }
}
</script>

<template>
  <div class="editor-body">
    <FormatToolbar
      v-if="showFormatting"
      :mode="mode"
      :switch-label="switchLabel"
      @format="insertFormat"
      @switch-mode="switchMode"
    />

    <textarea
      v-if="mode === 'write'"
      ref="textarea"
      class="editor-textarea"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="onKeydown"
    />
    <div v-else class="editor-preview">
      <div v-if="modelValue" class="comment-body" v-html="previewHtml" />
      <span v-else style="color: #94a3b8">{{ previewEmpty }}</span>
    </div>
  </div>

  <div class="editor-footer">
    <div class="editor-footer-left">
      <button
        type="button"
        class="format-toggle"
        :class="{ active: showFormatting }"
        :title="formatToggleTitle"
        :aria-label="formatToggleTitle"
        :aria-pressed="showFormatting"
        @click="toggleFormatting"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="currentColor">
          <path
            d="M19.68 17.061c-.08.595-.695.991-1.254.771-.594-.233-.857-.517-.857-.517-.221-.207-.365-.424-.434-.65h-.025c-.266.368-.655.673-1.168.914-.512.24-1.074.36-1.686.36-.594 0-1.124-.117-1.588-.353a2.647 2.647 0 01-1.083-.977 2.613 2.613 0 01-.386-1.406c0-.555.15-1.043.454-1.465.303-.422.756-.75 1.359-.985.603-.234 1.346-.353 2.229-.353h1.546v-.407c0-.465-.126-.861-.378-1.189-.252-.328-.704-.492-1.355-.492-.42 0-.872.073-1.36.221-.193.059-.387.115-.571.173a.848.848 0 01-1.045-.505c-.166-.43.033-.928.463-1.093.247-.094.517-.181.812-.258a7.618 7.618 0 011.757-.25c1.122-.027 1.947.171 2.475.591.499.396.807.827.926 1.291.119.465.179.957.179 1.479v2.956c0 .368.04.646.119.832 0 0 .05.18.353.338a.962.962 0 01.518.974Zm-4.07-.892a2.29 2.29 0 00.91-.629c.247-.28.37-.618.37-1.015v-.68h-1.648c-.634 0-1.146.104-1.537.314-.391.209-.586.538-.586.985 0 .379.139.679.417.9.277.221.625.331 1.044.331.329 0 .672-.069 1.032-.208l-.001.002Zm-5.924 1.732a.916.916 0 01-.886-.66l-1.003-3.562H3.489l-.983 3.56a.915.915 0 01-.886.662c-.608 0-1.05-.568-.885-1.14L4.69 2.954a.991.991 0 01.956-.706c.444 0 .834.288.956.705L10.57 16.76c.165.573-.276 1.141-.885 1.141Zm-4.01-12.2h-.06l-1.742 6.371h3.56L5.677 5.7Z"
          />
        </svg>
      </button>
      <slot name="footer-left" />
    </div>

    <slot name="submit-wrap">
      <div class="editor-submit">
        <button
          type="button"
          class="pill-btn pill-btn-primary"
          :disabled="submitting || !modelValue.trim()"
          @click="emit('submit')"
        >
          {{ submitting ? submittingLabel : submitLabel }}
        </button>
      </div>
    </slot>
  </div>
</template>
