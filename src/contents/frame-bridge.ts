import type { PlasmoCSConfig } from "plasmo"

import type { MessageResponse } from "~types/messages"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_start"
}

function isTopFrame(): boolean {
  try {
    return window.top === window
  } catch {
    return false
  }
}

function isCommandPaletteShortcut(e: KeyboardEvent): boolean {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  return (
    e.shiftKey &&
    !e.altKey &&
    e.code === "Space" &&
    (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey)
  )
}

function requestTopFrameCommandPalette() {
  chrome.runtime.sendMessage(
    { action: "REQUEST_OPEN_COMMAND_PALETTE" },
    (response?: MessageResponse) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        console.warn("[Aviso] Failed to request command palette from iframe", {
          frameUrl: window.location.href,
          error: runtimeError.message
        })
        return
      }

      if (response && !response.success) {
        console.warn("[Aviso] Command palette request from iframe failed", {
          frameUrl: window.location.href,
          error: response.error
        })
      }
    }
  )
}

if (!isTopFrame()) {
  document.addEventListener(
    "keydown",
    (e) => {
      if (!isCommandPaletteShortcut(e) || e.repeat) return
      e.preventDefault()
      e.stopPropagation()
      requestTopFrameCommandPalette()
    },
    true
  )
}
