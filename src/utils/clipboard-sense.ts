import type { Settings } from "~types/history"
import { CLIPBOARD_SENSE_CONSENT_VERSION } from "~utils/storage"

type ClipboardSenseSettings = Pick<
  Partial<Settings>,
  | "enableClipboardSense"
  | "clipboardSenseConsentVersion"
  | "clipboardSenseConsentEpoch"
>

type ClipboardSenseListenerControllerOptions = {
  listener: () => void
  addCopyListener: (listener: () => void) => void
  removeCopyListener: (listener: () => void) => void
}

export function isClipboardSenseEnabled(
  settings?: ClipboardSenseSettings | null,
  currentRevocationEpoch = 0
): boolean {
  const consentEpoch =
    typeof settings?.clipboardSenseConsentEpoch === "number" &&
    Number.isSafeInteger(settings.clipboardSenseConsentEpoch) &&
    settings.clipboardSenseConsentEpoch >= 0
      ? settings.clipboardSenseConsentEpoch
      : 0

  return (
    settings?.enableClipboardSense === true &&
    settings.clipboardSenseConsentVersion ===
      CLIPBOARD_SENSE_CONSENT_VERSION &&
    consentEpoch === currentRevocationEpoch
  )
}

function isNormalizedClipboardSenseEnabled(
  settings?: ClipboardSenseSettings | null
): boolean {
  return (
    settings?.enableClipboardSense === true &&
    settings.clipboardSenseConsentVersion === CLIPBOARD_SENSE_CONSENT_VERSION
  )
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
      setEnabled(isNormalizedClipboardSenseEnabled(settings))
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
