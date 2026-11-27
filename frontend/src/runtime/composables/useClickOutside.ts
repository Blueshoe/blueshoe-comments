import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Close on pointerdown outside `root` (capture phase, like Lit widget).
 * Clicks that hit any element matching `ignoreSelector` are ignored.
 */
export function useClickOutside(
  root: Ref<HTMLElement | null | undefined>,
  onOutside: () => void,
  options?: {
    enabled?: Ref<boolean> | (() => boolean)
    ignoreSelector?: string
  },
) {
  function isEnabled() {
    if (!options?.enabled)
      return true
    return typeof options.enabled === 'function'
      ? options.enabled()
      : options.enabled.value
  }

  function onPointerDown(event: PointerEvent) {
    if (!isEnabled())
      return
    const el = root.value
    if (!el)
      return

    const path = event.composedPath()
    if (path.includes(el))
      return

    if (options?.ignoreSelector) {
      const hitIgnore = path.some(
        node => node instanceof Element && node.closest(options.ignoreSelector!),
      )
      if (hitIgnore)
        return
    }

    onOutside()
  }

  onMounted(() => {
    document.addEventListener('pointerdown', onPointerDown, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown, true)
  })
}
