import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useCallback, useEffect, useState } from "react"

import { AvisoButton, AvisoToast } from "~components"
import { aviso } from "~styles/aviso"
import type { MessageRequest, MessageResponse } from "~types/messages"
import {
  detectType,
  isSensitive,
  isSensitiveDomain,
  type ClipboardType
} from "~utils/clipboard-detect"
import { useSyncedAvisoLanguage, type I18nKey } from "~utils/i18n"
import { createClipboardSenseListenerController } from "~utils/clipboard-sense"
import { writeTextToClipboard } from "~utils/clipboard-write"
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
    async (payload: {
      text: string
      allowDomFallback: boolean
    }): Promise<MessageResponse> => {
      try {
        await writeTextToClipboard(payload.text, {
          allowDomFallback: payload.allowDomFallback === true
        })
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
        writeCurrentContextToClipboard(request.payload).then(sendResponse)
        return true
      }
    }

    let disposed = false
    const copyListenerController = createClipboardSenseListenerController({
      listener: handleCopy,
      addCopyListener: (listener) => document.addEventListener("copy", listener),
      removeCopyListener: (listener) =>
        document.removeEventListener("copy", listener)
    })

    getSettings().then((settings) => {
      if (!disposed) copyListenerController.applySettings(settings)
    })

    const handleSettingsChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync" || !changes.contextai_settings) return
      copyListenerController.applySettings(
        changes.contextai_settings.newValue as
          | { enableClipboardSense?: boolean }
          | undefined
      )
    }

    chrome.storage.onChanged.addListener(handleSettingsChange)
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      disposed = true
      copyListenerController.dispose()
      chrome.storage.onChanged.removeListener(handleSettingsChange)
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
  const toastTone =
    isCopyContextToast && toast.status === "failure" ? "danger" : "neutral"
  const toastTitle = isCopyContextToast
    ? toast.message
    : `${t("toast.copiedPrefix")}${typeLabel}`
  const toastDetail =
    isCopyContextToast && toast.detail
      ? toast.detail
      : !isCopyContextToast && toast.text.length > 20
        ? `"${toast.text.slice(0, 20)}..."`
        : undefined

  return (
    <>
      <AvisoToast
        tone={toastTone}
        title={toastTitle}
        detail={toastDetail}
        showProgress
        progressDurationMs={isCopyContextToast ? 2600 : 3000}
        action={
          !isCopyContextToast ? (
            <AvisoButton
              className="aviso-toast-button"
              icon="send"
              size="sm"
              variant="secondary"
              onClick={handleSendToAI}
              style={{
                background: aviso.accentSurface,
                border: "none",
                color: aviso.sage300
              }}>
              {t("common.sendToAi")}
            </AvisoButton>
          ) : undefined
        }
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 2147483646,
          animation: "slide-in 0.2s ease-out"
        }}
      />
      <style>{`
        @keyframes slide-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
    </>
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

export default ClipboardToast
