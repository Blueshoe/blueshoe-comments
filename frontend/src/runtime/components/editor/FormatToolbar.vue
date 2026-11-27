<script setup lang="ts">
import { FORMAT_BUTTONS } from '../../utils/markdown'

defineProps<{
  mode: 'write' | 'preview'
  switchLabel: string
}>()

defineEmits<{
  format: [before: string, after: string, placeholder: string]
  switchMode: []
}>()

const labels: Record<string, string> = {
  bold: 'Bold',
  italic: 'Italic',
  code: 'Inline Code',
  codeBlock: 'Code Block',
  link: 'Link',
  quote: 'Quote',
}
</script>

<template>
  <div class="editor-toolbar">
    <div v-if="mode === 'write'" class="toolbar-buttons">
      <button
        v-for="item in FORMAT_BUTTONS"
        :key="item.key"
        type="button"
        class="toolbar-btn"
        :title="labels[item.key] || item.key"
        @click="$emit('format', item.before, item.after, item.placeholder)"
      >
        <strong v-if="item.key === 'bold'">B</strong>
        <em v-else-if="item.key === 'italic'">I</em>
        <template v-else-if="item.key === 'code'">
          &lt;/&gt;
        </template>
        <template v-else-if="item.key === 'codeBlock'">
          { }
        </template>
        <template v-else-if="item.key === 'link'">
          🔗
        </template>
        <template v-else>
          ”
        </template>
      </button>
    </div>
    <div v-else />
    <button type="button" class="mode-switch-btn" @click="$emit('switchMode')">
      {{ switchLabel }}
    </button>
  </div>
</template>
