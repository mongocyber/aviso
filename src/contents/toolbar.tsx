import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { AvisoButton, AvisoIconButton } from "~components"
import {
  aviso,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"
import type { MessageRequest, MessageResponse } from "~types/messages"
import {
  isUnsafeDoubleClickTarget,
  type DoubleClickTargetDescriptor
} from "~utils/double-click-menu"
import { getAiUnavailableDetailKey } from "~utils/ai-unavailable-guidance"
import {
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS,
} from "~utils/response-guard"
import {
  getDynamicLoadingStatusText,
  LOADING_STATUS_TICK_MS
} from "~utils/loading-status"
import { useSyncedAvisoLanguage, type I18nKey } from "~utils/i18n"
import { getSettings } from "~utils/storage"
import { logTiming, markTiming, startTiming } from "~utils/timing"
import {
  formatTranslationError,
  formatTranslationUserBubble,
  getInlineTranslationRoute,
  getTranslationTargetLabel,
  normalizeTranslationTargetLanguage,
  type TranslationTargetLanguage
} from "~utils/translation"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "aviso-toolbar-host"

function logPerfSummaryFromResponse(response?: MessageResponse): void {
  const data = response?.data
  if (!data || typeof data !== "object" || !("perfSummary" in data)) return

  const perfSummary = (data as { perfSummary?: unknown }).perfSummary
  if (perfSummary) console.info(`[Aviso perf] ${JSON.stringify(perfSummary)}`)
}

function warmRuntimeConfig(requestId: string): void {
  chrome.runtime.sendMessage(
    {
      action: "WARM_RUNTIME_CONFIG",
      payload: { requestId }
    },
    () => {
      const runtimeError = chrome.runtime.lastError
      if (!runtimeError) return
      console.warn("[Aviso] Runtime config warmup failed", {
        requestId,
        error: runtimeError.message
      })
    }
  )
}

type ToolbarPlacement = "above" | "below"
type ToolbarPosition = {
  top: number
  left: number
  placement: ToolbarPlacement
}
type InlineTranslationMode = "loading" | "success" | "error" | "fallback"
type InlineTranslationCardState = {
  visible: boolean
  mode: InlineTranslationMode
  top: number
  left: number
  placement: ToolbarPlacement
  requestId: string
  sourceText: string
  output: string
  statusText: string
  error: string
  targetLabel: string
  copied: boolean
}
type Operation = "explain" | "translate" | "polish" | "summarize" | "send"

const TOOLBAR_BUTTONS: { op: Operation; labelKey: I18nKey }[] = [
  { op: "explain", labelKey: "operation.explain" },
  { op: "translate", labelKey: "operation.translate" },
  { op: "polish", labelKey: "operation.polish" },
  { op: "summarize", labelKey: "operation.summarize" },
  { op: "send", labelKey: "common.sendToAi" }
]

// "发给 AI" 走自由对话；其余按钮即操作名
const OPERATION_MAP: Record<Operation, string> = {
  explain: "explain",
  translate: "translate",
  polish: "polish",
  summarize: "summarize",
  send: "custom"
}

const OPERATION_ICON: Record<Operation, AvisoIconName> = {
  explain: "explain",
  translate: "translate",
  polish: "refine",
  summarize: "summarize",
  send: "send"
}

const VIEWPORT_MARGIN = 12
const TOOLBAR_GAP = 20
const TOOLBAR_ESTIMATED_HEIGHT = 52
const INLINE_CARD_WIDTH = 324
const INLINE_CARD_ESTIMATED_HEIGHT = 218
const INLINE_CARD_GAP = 12
const INLINE_TRANSLATION_DEBOUNCE_MS = 100
const SUPPRESS_SELECTION_TOOLBAR_EVENT = "aviso:suppress-selection-toolbar"
const SELECTION_TOOLBAR_SUPPRESSION_MS = 700

const INITIAL_INLINE_CARD: InlineTranslationCardState = {
  visible: false,
  mode: "loading",
  top: 0,
  left: 0,
  placement: "below",
  requestId: "",
  sourceText: "",
  output: "",
  statusText: "",
  error: "",
  targetLabel: "自动",
  copied: false
}

const HOST_IDS = [
  "aviso-toolbar-host",
  "aviso-floating-host",
  "aviso-command-host",
  "aviso-clipboard-host",
  "aviso-double-click-menu-host"
]

const CODE_EDITOR_SELECTOR = [
  ".ace_editor",
  ".cm-editor",
  ".CodeMirror",
  ".monaco-editor",
  ".ProseMirror",
  ".ql-editor",
  ".tox-edit-area",
  "[data-slate-editor='true']"
].join(",")

const UNSAFE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[role='textbox']",
  "[role='combobox']",
  CODE_EDITOR_SELECTOR
].join(",")

function SelectionToolbar() {
  const { tokens: ui } = useSyncedAvisoTheme()
  const { language, t } = useSyncedAvisoLanguage()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<ToolbarPosition>({
    top: 0,
    left: 0,
    placement: "above"
  })
  const [inlineCard, setInlineCard] =
    useState<InlineTranslationCardState>(INITIAL_INLINE_CARD)
  const [inlineLoadingTick, setInlineLoadingTick] = useState(0)
  const [selection, setSelection] = useState("")
  const enabledRef = useRef(true)
  const inlineEnabledRef = useRef(false)
  const inlineTargetLanguageRef = useRef<TranslationTargetLanguage>("auto")
  const inlineRequestRef = useRef("")
  const languageRef = useRef(language)
  const tRef = useRef(t)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const inlineTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const inlineCopyTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const inlineSlowTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const suppressUntilRef = useRef(0)

  const cancelInlineRequest = (requestId: string) => {
    if (!requestId) return
    chrome.runtime.sendMessage({
      action: "CANCEL_AI_REQUEST",
      payload: { requestId }
    })
  }

  const closeInlineCard = (cancel = true) => {
    clearTimeout(inlineTimer.current)
    clearTimeout(inlineCopyTimer.current)
    clearTimeout(inlineSlowTimer.current)
    if (cancel && inlineRequestRef.current) {
      cancelInlineRequest(inlineRequestRef.current)
    }
    inlineRequestRef.current = ""
    setInlineCard(INITIAL_INLINE_CARD)
  }

  const startInlineSlowHintTimer = (requestId: string) => {
    clearTimeout(inlineSlowTimer.current)
    inlineSlowTimer.current = setTimeout(() => {
      setInlineCard((prev) => {
        if (
          prev.requestId !== requestId ||
          inlineRequestRef.current !== requestId ||
          !shouldShowSlowResponseHint({
            loading: prev.mode === "loading",
            hasFirstChunk: prev.output.trim().length > 0,
            elapsedMs: SLOW_FIRST_CHUNK_MS
          })
        ) {
          return prev
        }

        return { ...prev, statusText: tRef.current("model.slow") }
      })
    }, SLOW_FIRST_CHUNK_MS)
  }

  useEffect(() => {
    languageRef.current = language
    tRef.current = t
  }, [language, t])

  useEffect(() => {
    if (
      !inlineCard.visible ||
      inlineCard.mode !== "loading" ||
      inlineCard.output.trim()
    ) {
      setInlineLoadingTick(0)
      return
    }

    const timer = window.setInterval(() => {
      setInlineLoadingTick((tick) => tick + 1)
    }, LOADING_STATUS_TICK_MS)

    return () => window.clearInterval(timer)
  }, [inlineCard.visible, inlineCard.mode, inlineCard.output])

  // 读取并持续跟踪「划词工具栏」开关
  useEffect(() => {
    getSettings().then((s) => {
      enabledRef.current = s.enableToolbar
      inlineEnabledRef.current = s.enableInlineTranslation
      inlineTargetLanguageRef.current = normalizeTranslationTargetLanguage(
        s.inlineTranslationTargetLanguage
      )
    })
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === "sync" && changes.contextai_settings) {
        const next = changes.contextai_settings.newValue as
          | {
              enableToolbar?: boolean
              enableInlineTranslation?: boolean
              inlineTranslationTargetLanguage?: unknown
            }
          | undefined
        if (next && typeof next.enableToolbar === "boolean") {
          enabledRef.current = next.enableToolbar
          if (!next.enableToolbar) setVisible(false)
        }
        if (next && typeof next.enableInlineTranslation === "boolean") {
          inlineEnabledRef.current = next.enableInlineTranslation
          if (!next.enableInlineTranslation) closeInlineCard()
        }
        if (next && "inlineTranslationTargetLanguage" in next) {
          inlineTargetLanguageRef.current = normalizeTranslationTargetLanguage(
            next.inlineTranslationTargetLanguage
          )
        }
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useEffect(() => {
    const listener = (message: MessageRequest) => {
      if (message.action === "AI_STREAM_CHUNK") {
        const { chunk, requestId } = message.payload
        if (chunk.perfSummary) {
          console.info(`[Aviso perf] ${JSON.stringify(chunk.perfSummary)}`)
        }
        if (requestId !== inlineRequestRef.current) return
        if (chunk.kind === "reasoning") {
          setInlineCard((prev) =>
            prev.requestId === requestId
              ? { ...prev, statusText: tRef.current("model.thinking") }
              : prev
          )
          return
        }

        setInlineCard((prev) => {
          if (prev.requestId !== requestId) return prev
          return {
            ...prev,
            mode: chunk.done ? "success" : prev.mode,
            output: prev.output + chunk.text,
            statusText: chunk.text ? "" : prev.statusText
          }
        })

        if (chunk.done) {
          inlineRequestRef.current = ""
          clearTimeout(inlineSlowTimer.current)
          setInlineCard((prev) =>
            prev.requestId === requestId
              ? { ...prev, mode: "success", statusText: "" }
              : prev
          )
        }
      }

      if (message.action === "AI_STREAM_ERROR") {
        const { error, guidance, requestId } = message.payload
        if (requestId !== inlineRequestRef.current) return
        inlineRequestRef.current = ""
        clearTimeout(inlineSlowTimer.current)
        const displayError = guidance
          ? tRef.current(getAiUnavailableDetailKey(guidance))
          : error
        setInlineCard((prev) =>
          prev.requestId === requestId
            ? {
                ...prev,
                mode: "error",
                statusText: "",
                error: formatTranslationError(displayError, languageRef.current)
              }
            : prev
        )
      }

      if (message.action === "AI_PERF_SUMMARY") {
        console.info(`[Aviso perf] ${JSON.stringify(message.payload.summary)}`)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const sendInlineTranslationRequest = (
    requestId: string,
    sourceText: string,
    timing: ReturnType<typeof startTiming>
  ) => {
    if (inlineRequestRef.current !== requestId) return
    const requestTiming = markTiming(timing, "aiRequestSentAt")
    logTiming("ai_request_sent", requestId, requestTiming, {
      trigger: "inline-translation",
      operation: "translate",
      selectionChars: sourceText.length
    })
    startInlineSlowHintTimer(requestId)

    chrome.runtime.sendMessage(
      {
        action: "AI_REQUEST",
        requestId,
        payload: {
          trigger: "inline-translation",
          operation: "translate",
          selectionText: sourceText,
          timing: requestTiming
        }
      },
      (response?: MessageResponse) => {
        logPerfSummaryFromResponse(response)

        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          clearTimeout(inlineSlowTimer.current)
          setInlineCard((prev) =>
            prev.requestId === requestId &&
            inlineRequestRef.current === requestId
              ? {
                  ...prev,
                  mode: "error",
                  statusText: "",
                  error: formatTranslationError(
                    runtimeError.message,
                    languageRef.current
                  )
                }
              : prev
          )
          inlineRequestRef.current = ""
          return
        }

        if (response && !response.success && response.error) {
          const guidance = response.meta?.aiGuidance
          const displayError = guidance
            ? tRef.current(getAiUnavailableDetailKey(guidance))
            : (response.error as string)
          clearTimeout(inlineSlowTimer.current)
          setInlineCard((prev) =>
            prev.requestId === requestId &&
            inlineRequestRef.current === requestId
              ? {
                  ...prev,
                  mode: "error",
                  statusText: "",
                  error: formatTranslationError(
                    displayError,
                    languageRef.current
                  )
                }
              : prev
          )
          inlineRequestRef.current = ""
        }
      }
    )
  }

  const showInlineTranslationForSelection = (
    sourceText: string,
    rect: DOMRect
  ) => {
    const route = getInlineTranslationRoute(sourceText)
    const position = getInlineCardPosition(rect)
    const requestId = `inline-${Date.now()}`
    const timing = startTiming()
    const targetLabel = getTranslationTargetLabel(
      inlineTargetLanguageRef.current
    )

    clearTimeout(inlineTimer.current)
    clearTimeout(inlineCopyTimer.current)
    if (inlineRequestRef.current) {
      cancelInlineRequest(inlineRequestRef.current)
      inlineRequestRef.current = ""
    }

    logTiming("trigger", requestId, timing, {
      trigger: "inline-translation",
      operation: "translate",
      inlineRoute: route.route,
      routeReason: route.reason,
      selectionChars: sourceText.length
    })

    if (route.route === "result-panel") {
      if (route.reason === "empty") return
      setInlineCard({
        visible: true,
        mode: "fallback",
        requestId,
        sourceText,
        output: "",
        statusText: "",
        error:
          route.reason === "too_many_lines"
            ? t("translation.manyLines")
            : t("translation.longSelection"),
        targetLabel,
        copied: false,
        ...position
      })
      return
    }

    warmRuntimeConfig(requestId)
    inlineRequestRef.current = requestId
    setInlineCard({
      visible: true,
      mode: "loading",
      requestId,
      sourceText,
      output: "",
      statusText: "",
      error: "",
      targetLabel,
      copied: false,
      ...position
    })
    inlineTimer.current = setTimeout(
      () => sendInlineTranslationRequest(requestId, sourceText, timing),
      INLINE_TRANSLATION_DEBOUNCE_MS
    )
  }

  const retryInlineTranslation = () => {
    if (!inlineCard.sourceText.trim()) return
    const requestId = `inline-${Date.now()}`
    const timing = startTiming()
    clearTimeout(inlineTimer.current)
    clearTimeout(inlineSlowTimer.current)
    if (inlineRequestRef.current) cancelInlineRequest(inlineRequestRef.current)
    inlineRequestRef.current = requestId
    setInlineCard((prev) => ({
      ...prev,
      mode: "loading",
      requestId,
      output: "",
      statusText: "",
      error: "",
      copied: false
    }))
    logTiming("trigger", requestId, timing, {
      trigger: "inline-translation",
      operation: "translate",
      inlineRoute: "retry",
      selectionChars: inlineCard.sourceText.length
    })
    sendInlineTranslationRequest(requestId, inlineCard.sourceText, timing)
  }

  const copyInlineTranslation = async () => {
    const text = inlineCard.output.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      clearTimeout(inlineCopyTimer.current)
      setInlineCard((prev) => ({ ...prev, copied: true }))
      inlineCopyTimer.current = setTimeout(
        () => setInlineCard((prev) => ({ ...prev, copied: false })),
        1200
      )
    } catch {
      setInlineCard((prev) => ({
        ...prev,
        mode: "error",
        error: t("translation.copyError")
      }))
    }
  }

  const openInlineTranslationInResultPanel = () => {
    const current = inlineCard
    if (!current.sourceText.trim()) return
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    const translatedText = current.output.trim()
    closeInlineCard(current.mode === "loading")

    chrome.runtime.sendMessage(
      {
        action: "SHOW_FLOATING_WINDOW",
        payload: translatedText
          ? {
              requestId,
              trigger: "inline-translation",
              operation: "translate",
              restore: {
                input: formatTranslationUserBubble(current.sourceText),
                output: translatedText,
                messages: [
                  {
                    role: "user",
                    content: formatTranslationUserBubble(current.sourceText),
                    operation: "translate",
                    trigger: "inline-translation"
                  },
                  {
                    role: "assistant",
                    content: translatedText,
                    reqId: requestId,
                    operation: "translate",
                    trigger: "inline-translation"
                  }
                ],
                createdAt: Date.now()
              }
            }
          : {
              requestId,
              trigger: "inline-translation",
              operation: "translate",
              selectionText: current.sourceText,
              timing
            }
      },
      (response?: MessageResponse) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          console.warn("[Aviso] Inline translation result panel failed", {
            requestId,
            error: runtimeError.message
          })
          return
        }

        if (response && !response.success) {
          console.warn("[Aviso] Inline translation result panel rejected", {
            requestId,
            error: response.error
          })
        }
      }
    )
  }

  useEffect(() => {
    const isInsideAvisoUI = (e: MouseEvent): boolean => {
      const path = e.composedPath()
      // composedPath() 穿透 Shadow DOM 边界，host.contains() 无法做到
      return HOST_IDS.some((id) => {
        const host = document.getElementById(id)
        return !!host && path.includes(host)
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      const toolbarEnabled = enabledRef.current
      const inlineEnabled = inlineEnabledRef.current
      if (!toolbarEnabled && !inlineEnabled) return
      if (Date.now() < suppressUntilRef.current) {
        setVisible(false)
        closeInlineCard()
        return
      }
      // 点击工具栏自身时不重新定位
      if (isInsideAvisoUI(e)) return

      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ""

      if (!text) {
        hideTimer.current = setTimeout(() => setVisible(false), 200)
        closeInlineCard()
        return
      }

      clearTimeout(hideTimer.current)
      setSelection(text)

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) {
        setVisible(false)
        closeInlineCard()
        return
      }

      if (inlineEnabled && isSafeInlineTranslationTarget(e.target)) {
        showInlineTranslationForSelection(text, rect)
      }

      if (text.length < 2) {
        setVisible(false)
        return
      }

      if (!toolbarEnabled) return
      // fixed 定位：直接用视口坐标，无需叠加 scrollY / scrollX
      const hasRoomAbove =
        rect.top >= VIEWPORT_MARGIN + TOOLBAR_GAP + TOOLBAR_ESTIMATED_HEIGHT
      const hasRoomBelow =
        window.innerHeight - rect.bottom >=
        VIEWPORT_MARGIN + TOOLBAR_GAP + TOOLBAR_ESTIMATED_HEIGHT
      const placement: ToolbarPlacement =
        hasRoomAbove || !hasRoomBelow ? "above" : "below"

      setPosition({
        top:
          placement === "above"
            ? rect.top - TOOLBAR_ESTIMATED_HEIGHT - TOOLBAR_GAP
            : rect.bottom + TOOLBAR_GAP,
        left: rect.left + rect.width / 2,
        placement
      })
      setVisible(true)
    }

    const handleMouseDown = (e: MouseEvent) => {
      // 点击工具栏内部时不触发隐藏计时器
      if (isInsideAvisoUI(e)) return
      clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setVisible(false), 200)
    }

    const handleSuppressSelectionToolbar = () => {
      suppressUntilRef.current = Date.now() + SELECTION_TOOLBAR_SUPPRESSION_MS
      clearTimeout(hideTimer.current)
      setVisible(false)
      closeInlineCard()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVisible(false)
        closeInlineCard()
      }
    }

    const handleScroll = () => {
      setVisible(false)
      closeInlineCard()
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener(
      SUPPRESS_SELECTION_TOOLBAR_EVENT,
      handleSuppressSelectionToolbar
    )
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener(
        SUPPRESS_SELECTION_TOOLBAR_EVENT,
        handleSuppressSelectionToolbar
      )
    }
  }, [])

  const handleOperation = (op: Operation) => {
    setVisible(false)
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    logTiming("trigger", requestId, timing, {
      trigger: "toolbar",
      operation: OPERATION_MAP[op],
      selectionChars: selection.length
    })

    chrome.runtime.sendMessage(
      {
        action: "SHOW_FLOATING_WINDOW",
        payload: {
          requestId,
          trigger: "toolbar",
          operation: OPERATION_MAP[op],
          selectionText: selection,
          pageUrl: window.location.href,
          timing
        }
      },
      (response?: MessageResponse) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          console.warn("[Aviso] Toolbar failed to open floating window", {
            requestId,
            frameUrlPresent: Boolean(window.location.href),
            error: runtimeError.message
          })
          return
        }

        if (response && !response.success) {
          console.warn("[Aviso] Toolbar floating window request failed", {
            requestId,
            frameUrlPresent: Boolean(window.location.href),
            error: response.error
          })
        }
      }
    )
  }

  if (!visible && !inlineCard.visible) return null

  const viewportWidth =
    typeof window === "undefined" ? 0 : Math.max(window.innerWidth, 0)
  const viewportHeight =
    typeof window === "undefined" ? 0 : Math.max(window.innerHeight, 0)
  const safeLeft = viewportWidth
    ? Math.min(
        Math.max(position.left, VIEWPORT_MARGIN),
        viewportWidth - VIEWPORT_MARGIN
      )
    : position.left
  const maxTop = viewportHeight
    ? Math.max(
        VIEWPORT_MARGIN,
        viewportHeight - TOOLBAR_ESTIMATED_HEIGHT - VIEWPORT_MARGIN
      )
    : position.top
  const safeTop = Math.min(Math.max(position.top, VIEWPORT_MARGIN), maxTop)
  const alignStart = safeLeft < 220
  const alignEnd = viewportWidth > 0 && safeLeft > viewportWidth - 220
  const toolbarTransform = alignStart
    ? "translateX(0)"
    : alignEnd
      ? "translateX(-100%)"
      : "translateX(-50%)"
  const beakLeft = alignStart ? 24 : alignEnd ? "calc(100% - 24px)" : "50%"

  return (
    <>
      {visible && (
        <div
      style={{
        position: "fixed",
        top: safeTop,
        left: safeLeft,
        transform: toolbarTransform,
        zIndex: 2147483647,
        maxWidth: "calc(100vw - 24px)",
        overflowX: "auto",
        paddingTop: position.placement === "below" ? 7 : 0,
        paddingBottom: position.placement === "above" ? 7 : 0,
        ...visuallyStable
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          background: ui.surface,
          border: `1px solid ${ui.line}`,
          borderRadius: aviso.radius,
          padding: "6px",
          boxShadow: ui.toolbarShadow,
          fontFamily: aviso.font,
          color: ui.text
        }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            color: ui.accent,
            flex: "0 0 auto"
          }}>
          <AvisoMark size={18} />
        </span>
        <span
          style={{
            width: 1,
            height: 20,
            background: ui.line,
            margin: "0 2px",
            flex: "0 0 auto"
          }}
        />
        {TOOLBAR_BUTTONS.map(({ op, labelKey }) => (
          <AvisoButton
            key={op}
            variant={op === "send" ? "secondary" : "ghost"}
            size="md"
            icon={OPERATION_ICON[op]}
            className="aviso-toolbar-button"
            data-primary={op === "send" ? "true" : "false"}
            onClick={() => handleOperation(op)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: op === "send" ? ui.accentSoft : "transparent",
              border: "none",
              color: op === "send" ? ui.accent : ui.text,
              fontFamily: aviso.font,
              fontSize: "13.5px",
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: aviso.radiusSm,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: `.16s ${aviso.ease}`,
              flex: "0 0 auto"
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                op === "send"
                  ? ui.buttonHover
                  : ui.surface2)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                op === "send" ? ui.accentSoft : "transparent")
            }>
            {t(labelKey)}
          </AvisoButton>
        ))}
      </div>
      <span
        style={{
          position: "absolute",
          left: beakLeft,
          top: position.placement === "below" ? 1 : undefined,
          bottom: position.placement === "above" ? 1 : undefined,
          width: 12,
          height: 12,
          transform: "translateX(-50%) rotate(45deg)",
          background: ui.surface,
          borderRight:
            position.placement === "above"
              ? `1px solid ${ui.line}`
              : undefined,
          borderBottom:
            position.placement === "above"
              ? `1px solid ${ui.line}`
              : undefined,
          borderLeft:
            position.placement === "below"
              ? `1px solid ${ui.line}`
              : undefined,
          borderTop:
            position.placement === "below"
              ? `1px solid ${ui.line}`
              : undefined
        }}
      />
      <style>{`
        .aviso-toolbar-button:focus-visible {
          outline: 2px solid ${ui.accent};
          outline-offset: 2px;
          box-shadow: ${ui.focusRing};
        }
        .aviso-toolbar-button:active {
          transform: translateY(1px);
        }
      `}</style>
        </div>
      )}
      {inlineCard.visible && (
        <InlineTranslationCard
          card={inlineCard}
          loadingTick={inlineLoadingTick}
          onClose={() => closeInlineCard()}
          onCopy={copyInlineTranslation}
          onRetry={retryInlineTranslation}
          onOpenResultPanel={openInlineTranslationInResultPanel}
          language={language}
          t={t}
        />
      )}
    </>
  )
}

function InlineTranslationCard({
  card,
  loadingTick,
  onClose,
  onCopy,
  onRetry,
  onOpenResultPanel,
  language,
  t
}: {
  card: InlineTranslationCardState
  loadingTick: number
  onClose: () => void
  onCopy: () => void
  onRetry: () => void
  onOpenResultPanel: () => void
  language: ReturnType<typeof useSyncedAvisoLanguage>["language"]
  t: (key: I18nKey) => string
}) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const title =
    card.targetLabel === "自动"
      ? t("translation.autoTitle")
      : `${t("translation.toTitle")}${card.targetLabel}`
  const canCopy = card.output.trim().length > 0
  const showRetry = card.mode === "error" || card.mode === "success"
  const displayText =
    card.output ||
    (card.mode === "loading"
      ? getDynamicLoadingStatusText({
          operation: "translate",
          statusText: card.statusText,
          tick: loadingTick,
          language
        })
      : card.statusText || t("translation.fallbackWaiting"))

  return (
    <div
      role="dialog"
      aria-label={t("translation.cardLabel")}
      style={{
        position: "fixed",
        top: card.top,
        left: card.left,
        width: INLINE_CARD_WIDTH,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "min(320px, calc(100vh - 24px))",
        display: "flex",
        flexDirection: "column",
        background: ui.surface,
        border: `1px solid ${ui.line}`,
        borderRadius: aviso.radius,
        boxShadow: ui.popShadow,
        color: ui.text,
        fontFamily: aviso.font,
        zIndex: 2147483647,
        overflow: "hidden",
        ...visuallyStable
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "11px 12px",
          borderBottom: `1px solid ${ui.line}`,
          minWidth: 0
        }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            color: ui.text,
            fontSize: 13,
            fontWeight: 750
          }}>
          <AvisoMark size={16} style={{ color: ui.accent }} />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            {title}
          </span>
        </span>
        <AvisoIconButton
          icon="close"
          aria-label={t("translation.closeCard")}
          className="aviso-inline-translation-icon-button"
          onClick={onClose}
          style={{ flex: "0 0 auto" }}
        />
      </div>

      <div
        style={{
          padding: "12px 13px",
          minHeight: 68,
          overflowY: "auto",
          color: card.mode === "error" ? ui.danger : ui.text2,
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere"
        }}>
        {card.mode === "fallback" && card.error}
        {card.mode === "error" && card.error}
        {card.mode !== "fallback" && card.mode !== "error" && (
          <>
            {displayText}
            {card.mode === "loading" && (
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: "1em",
                  marginLeft: 3,
                  borderRadius: 1,
                  background: ui.accent,
                  verticalAlign: "-2px"
                }}
              />
            )}
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "9px 10px",
          borderTop: `1px solid ${ui.line}`
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {canCopy && (
            <InlineCardButton
              icon="copy"
              label={card.copied ? t("common.copied") : t("common.copy")}
              onClick={onCopy}
            />
          )}
          {showRetry && (
            <InlineCardButton
              icon="refine"
              label={t("common.retry")}
              onClick={onRetry}
            />
          )}
        </div>
        <InlineCardButton
          icon="send"
          label={t("common.sendToAi")}
          onClick={onOpenResultPanel}
        />
      </div>
      <style>{`
        .aviso-inline-translation-button:hover,
        .aviso-inline-translation-icon-button:hover {
          background: ${ui.accentSoft} !important;
          color: ${ui.text} !important;
        }
        .aviso-inline-translation-button:focus-visible,
        .aviso-inline-translation-icon-button:focus-visible {
          outline: 2px solid ${ui.accent};
          outline-offset: 2px;
          box-shadow: ${ui.focusRing};
        }
        .aviso-inline-translation-button:active,
        .aviso-inline-translation-icon-button:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  )
}

function InlineCardButton({
  icon,
  label,
  onClick
}: {
  icon: AvisoIconName
  label: string
  onClick: () => void
}) {
  return (
    <AvisoButton
      variant="ghost"
      size="sm"
      icon={icon}
      className="aviso-inline-translation-button"
      onClick={onClick}
      style={{ minHeight: 30, padding: "6px 9px", fontSize: 12 }}>
      {label}
    </AvisoButton>
  )
}

function getInlineCardPosition(rect: DOMRect): {
  top: number
  left: number
  placement: ToolbarPlacement
} {
  const hasRoomBelow =
    window.innerHeight - rect.bottom >=
    VIEWPORT_MARGIN + INLINE_CARD_GAP + INLINE_CARD_ESTIMATED_HEIGHT
  const placement: ToolbarPlacement = hasRoomBelow ? "below" : "above"
  const preferredTop =
    placement === "below"
      ? rect.bottom + INLINE_CARD_GAP
      : rect.top - INLINE_CARD_GAP - INLINE_CARD_ESTIMATED_HEIGHT
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - INLINE_CARD_WIDTH - VIEWPORT_MARGIN
  )
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - INLINE_CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN
  )

  return {
    placement,
    left: Math.min(
      Math.max(rect.left + rect.width / 2 - INLINE_CARD_WIDTH / 2, VIEWPORT_MARGIN),
      maxLeft
    ),
    top: Math.min(Math.max(preferredTop, VIEWPORT_MARGIN), maxTop)
  }
}

function isSafeInlineTranslationTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(UNSAFE_SELECTOR)) return false

  const descriptor = describeInlineTarget(target)
  return !isUnsafeDoubleClickTarget(descriptor)
}

function describeInlineTarget(target: Element): DoubleClickTargetDescriptor {
  const input = target instanceof HTMLInputElement ? target : null
  const editor = target.closest(CODE_EDITOR_SELECTOR)
  return {
    tagName: target.tagName,
    inputType: input?.type,
    role: target.getAttribute("role") ?? undefined,
    isContentEditable: (target as HTMLElement).isContentEditable,
    id: target.id || editor?.id,
    className: [target.className, editor?.className].join(" "),
    ariaLabel: target.getAttribute("aria-label") ?? undefined
  }
}

export default SelectionToolbar
