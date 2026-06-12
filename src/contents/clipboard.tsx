import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useCallback, useEffect, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type { MessageRequest, MessageResponse } from "~types/messages"
import {
  detectType,
  isSensitive,
  isSensitiveDomain,
  type ClipboardType
} from "~utils/clipboard-detect"
import { useSyncedAvisoLanguage, type I18nKey } from "~utils/i18n"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "aviso-clipboard-host"

type ToastState = {
  visible: boolean
  mode: "clipboard" | "copy-context"
  text: string
  type: ClipboardType
  pageUrl: string
  status: "success" | "failure"
  message: string
  detail?: string
}

type ClipboardToastPayload = {
  text: string
  type: ClipboardType
  pageUrl: string
}

type CopyContextToastPayload = {
  status: "success" | "failure"
  message: string
  detail?: string
}

function isTopFrame(): boolean {
  try {
    return window.top === window
  } catch {
    return false
  }
}

function ClipboardToast() {
  const { t } = useSyncedAvisoLanguage()
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    mode: "clipboard",
    text: "",
    type: "other",
    pageUrl: "",
    status: "success",
    message: ""
  })

  const showClipboardToast = useCallback((payload: ClipboardToastPayload) => {
    setToast({
      visible: true,
      mode: "clipboard",
      status: "success",
      message: "",
      detail: undefined,
      ...payload
    })
  }, [])

  const showCopyContextToast = useCallback(
    (payload: CopyContextToastPayload) => {
      setToast({
        visible: true,
        mode: "copy-context",
        text: "",
        type: "other",
        pageUrl: "",
        ...payload
      })
    },
    []
  )

  const requestCopyContextToast = useCallback(
    (payload: CopyContextToastPayload) => {
      chrome.runtime.sendMessage({
        action: "REQUEST_COPY_CONTEXT_TOAST",
        payload
      })
    },
    []
  )

  const showCopyContextToastThroughBackground = useCallback(
    (payload: CopyContextToastPayload) => {
      requestCopyContextToast(payload)
    },
    [requestCopyContextToast]
  )

  const writeCurrentContextToClipboard = useCallback(
    async (text: string): Promise<MessageResponse> => {
      try {
        await writeTextToClipboard(text)
        showCopyContextToastThroughBackground({
          status: "success",
          message: t("toast.copyContextSuccess"),
          detail: t("toast.copyContextSuccessDetail")
        })
        return { success: true }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        showCopyContextToastThroughBackground({
          status: "failure",
          message: t("toast.copyFailure"),
          detail: t("toast.copyFailureDetail")
        })
        return { success: false, error }
      }
    },
    [showCopyContextToastThroughBackground]
  )

  const showToast = useCallback(
    (payload: ClipboardToastPayload) => {
      showClipboardToast(payload)
    },
    [showClipboardToast]
  )

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>
    let copyContextHideTimer: ReturnType<typeof setTimeout>

    const showAndScheduleHide = (payload: ClipboardToastPayload) => {
      showToast(payload)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(
        () => setToast((prev) => ({ ...prev, visible: false })),
        3000
      )
    }

    const showAndScheduleCopyContextHide = (
      payload: CopyContextToastPayload
    ) => {
      showCopyContextToast(payload)
      clearTimeout(copyContextHideTimer)
      copyContextHideTimer = setTimeout(
        () => setToast((prev) => ({ ...prev, visible: false })),
        2600
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
              frameUrlPresent: Boolean(window.location.href),
              error: runtimeError.message
            })
            return
          }

          if (response && !response.success) {
            console.warn("[Aviso] Clipboard toast request was rejected", {
              frameUrlPresent: Boolean(window.location.href),
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
      if (request.action === "SHOW_CLIPBOARD_TOAST") {
        showAndScheduleHide(request.payload)
        sendResponse({ success: true })
        return
      }

      if (request.action === "SHOW_COPY_CONTEXT_TOAST") {
        showAndScheduleCopyContextHide(request.payload)
        sendResponse({ success: true })
        return
      }

      if (request.action === "WRITE_CURRENT_CONTEXT_TO_CLIPBOARD") {
        writeCurrentContextToClipboard(request.payload.text).then(sendResponse)
        return true
      }
    }

    document.addEventListener("copy", handleCopy)
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      document.removeEventListener("copy", handleCopy)
      chrome.runtime.onMessage.removeListener(handleMessage)
      clearTimeout(hideTimer)
      clearTimeout(copyContextHideTimer)
    }
  }, [showCopyContextToast, showToast, writeCurrentContextToClipboard])

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

  const isCopyContextToast = toast.mode === "copy-context"
  const typeLabel = getClipboardTypeLabel(toast.type, t)
  const iconColor =
    isCopyContextToast && toast.status === "failure"
      ? aviso.danger
      : aviso.sage400

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: aviso.darkSurface,
        border: `1px solid ${
          isCopyContextToast && toast.status === "failure"
            ? aviso.danger
            : aviso.darkLine
        }`,
        borderRadius: aviso.radiusMd,
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
      <AvisoMark size={20} style={{ color: iconColor }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontWeight: 600 }}>
          {isCopyContextToast
            ? toast.message
            : `${t("toast.copiedPrefix")}${typeLabel}`}
        </strong>
        {isCopyContextToast && toast.detail && (
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
            {toast.detail}
          </span>
        )}
        {!isCopyContextToast && toast.text.length > 20 && (
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
      {!isCopyContextToast && (
        <button
          className="aviso-toast-button"
          onClick={handleSendToAI}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: aviso.accentSurface,
            border: "none",
            borderRadius: aviso.radiusSm,
            color: aviso.sage300,
            padding: "5px 9px",
            fontFamily: aviso.font,
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}>
          <AvisoIcon name="send" size={14} />
          {t("common.sendToAi")}
        </button>
      )}
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: "100%",
          background: iconColor,
          transformOrigin: "left",
          animation: `timer ${
            isCopyContextToast ? "2.6s" : "3s"
          } linear forwards`
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
        .aviso-toast-button {
          transition:
            background .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-toast-button:hover {
          background: ${aviso.accentSurfaceStrong} !important;
        }
        .aviso-toast-button:active {
          transform: translateY(1px);
        }
        .aviso-toast-button:focus-visible {
          outline: 2px solid ${aviso.sage400};
          outline-offset: 2px;
          box-shadow: ${aviso.focusRing};
        }
      `}</style>
    </div>
  )
}

function getClipboardTypeLabel(
  type: ClipboardType,
  t: (key: I18nKey) => string
): string {
  const key: Record<ClipboardType, I18nKey> = {
    english: "clipboard.type.english",
    code: "clipboard.type.code",
    url: "clipboard.type.url",
    chinese: "clipboard.type.chinese",
    other: "clipboard.type.other"
  }
  return t(key[type])
}

async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to the DOM copy fallback below.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  textarea.style.left = "-1000px"
  textarea.style.opacity = "0"
  const target = document.body ?? document.documentElement
  target.appendChild(textarea)
  textarea.select()

  try {
    const copied = document.execCommand("copy")
    if (!copied) throw new Error("Clipboard write was rejected")
  } finally {
    textarea.remove()
  }
}

export default ClipboardToast
