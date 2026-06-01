import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useCallback, useEffect, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type { MessageRequest, MessageResponse } from "~types/messages"
import {
  detectType,
  isSensitive,
  isSensitiveDomain,
  TYPE_LABELS,
  type ClipboardType
} from "~utils/clipboard-detect"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "contextai-clipboard-host"

type ToastState = {
  visible: boolean
  text: string
  type: ClipboardType
  pageUrl: string
}

type ClipboardToastPayload = {
  text: string
  type: ClipboardType
  pageUrl: string
}

function isTopFrame(): boolean {
  try {
    return window.top === window
  } catch {
    return false
  }
}

function ClipboardToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    text: "",
    type: "other",
    pageUrl: ""
  })

  const showToast = useCallback((payload: ClipboardToastPayload) => {
    setToast({ visible: true, ...payload })
  }, [])

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>

    const showAndScheduleHide = (payload: ClipboardToastPayload) => {
      showToast(payload)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(
        () => setToast((prev) => ({ ...prev, visible: false })),
        3000
      )
    }

    const handleCopy = async () => {
      // 检查设置是否启用剪贴板感知
      const settings = await getSettings()
      if (!settings.enableClipboardSense) return

      // 检查是否是敏感页面
      if (isSensitiveDomain(window.location.href)) return

      // 获取剪贴板内容（copy 事件发生时 selection 即为剪贴板内容）
      const text = window.getSelection()?.toString().trim() ?? ""
      if (!text || text.length < 5) return

      // 敏感内容过滤
      if (isSensitive(text)) return

      const type = detectType(text)
      if (type === "other") return

      const payload = { text, type, pageUrl: window.location.href }
      if (isTopFrame()) {
        showAndScheduleHide(payload)
        return
      }

      chrome.runtime.sendMessage(
        {
          action: "REQUEST_CLIPBOARD_TOAST",
          payload
        },
        (response?: MessageResponse) => {
          const runtimeError = chrome.runtime.lastError
          if (runtimeError) {
            console.warn("[Aviso] Clipboard toast request failed", {
              frameUrl: window.location.href,
              error: runtimeError.message
            })
            return
          }

          if (response && !response.success) {
            console.warn("[Aviso] Clipboard toast request was rejected", {
              frameUrl: window.location.href,
              error: response.error
            })
          }
        }
      )
    }

    const handleMessage = (
      request: MessageRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (request.action !== "SHOW_CLIPBOARD_TOAST") return
      showAndScheduleHide(request.payload)
      sendResponse({ success: true })
    }

    document.addEventListener("copy", handleCopy)
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      document.removeEventListener("copy", handleCopy)
      chrome.runtime.onMessage.removeListener(handleMessage)
      clearTimeout(hideTimer)
    }
  }, [showToast])

  const handleSendToAI = () => {
    setToast((prev) => ({ ...prev, visible: false }))
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    logTiming("trigger", requestId, timing, {
      trigger: "clipboard",
      operation: "explain",
      selectionChars: toast.text.length
    })

    chrome.runtime.sendMessage({
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "clipboard",
        operation: "explain",
        selectionText: toast.text,
        pageUrl: toast.pageUrl || window.location.href,
        timing
      }
    })
  }

  if (!toast.visible) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: aviso.darkSurface,
        border: `1px solid ${aviso.darkLine}`,
        borderRadius: "12px",
        padding: "11px 12px 11px 14px",
        boxShadow: "0 12px 32px -12px oklch(0.2 0.02 155 / .45)",
        fontFamily: aviso.font,
        color: aviso.darkText,
        fontSize: "13.5px",
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        gap: "11px",
        maxWidth: "min(330px, calc(100vw - 32px))",
        overflow: "hidden",
        animation: "slide-in 0.2s ease-out",
        ...visuallyStable
      }}>
      <AvisoMark size={20} style={{ color: aviso.sage400 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontWeight: 600 }}>
          已复制 {TYPE_LABELS[toast.type]}
        </strong>
        {toast.text.length > 20 && (
          <span
            style={{
              color: aviso.darkText3,
              display: "block",
              fontSize: "11.5px",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            "{toast.text.slice(0, 20)}…"
          </span>
        )}
      </span>
      <button
        onClick={handleSendToAI}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `color-mix(in oklab, ${aviso.sage400} 16%, transparent)`,
          border: "none",
          borderRadius: "8px",
          color: aviso.sage300,
          padding: "5px 9px",
          fontFamily: aviso.font,
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}>
        <AvisoIcon name="send" size={14} />
        发给 AI
      </button>
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: "100%",
          background: aviso.sage400,
          transformOrigin: "left",
          animation: "timer 3s linear forwards"
        }}
      />
      <style>{`
        @keyframes slide-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes timer {
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}

export default ClipboardToast
