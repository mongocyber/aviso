import type { Settings } from "~types/history"

type ClipboardSenseSettings = Pick<Partial<Settings>, "enableClipboardSense">

type ClipboardSenseListenerControllerOptions = {
  listener: () => void
  addCopyListener: (listener: () => void) => void
  removeCopyListener: (listener: () => void) => void
}

export function isClipboardSenseEnabled(
  settings?: ClipboardSenseSettings | null
): boolean {
  return settings?.enableClipboardSense === true
}

export function createClipboardSenseListenerController({
  listener,
  addCopyListener,
  removeCopyListener
}: ClipboardSenseListenerControllerOptions) {
  let active = false
  let disposed = false

  const setEnabled = (enabled: boolean) => {
    if (disposed) return
    if (enabled === active) return

    active = enabled
    if (enabled) {
      addCopyListener(listener)
    } else {
      removeCopyListener(listener)
    }
  }

  return {
    applySettings(settings?: ClipboardSenseSettings | null) {
      setEnabled(isClipboardSenseEnabled(settings))
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (active) {
        active = false
        removeCopyListener(listener)
      }
    }
  }
}
