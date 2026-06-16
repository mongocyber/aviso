import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { AvisoButton, AvisoIconButton } from "~components"
import {
  aviso,
  AvisoIcon,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"
import type { ConversationMessage } from "~types/history"
import type {
  AIRequestPayload,
  MessageRequest,
  MessageResponse
} from "~types/messages"
import { buildFollowUpPriorContext } from "~utils/follow-up-context"
import {
  getDynamicLoadingStatusText,
  LOADING_STATUS_TICK_MS
} from "~utils/loading-status"
import { useSyncedAvisoLanguage, type I18nKey } from "~utils/i18n"
import {
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS
} from "~utils/response-guard"
import { logTiming, markTiming, startTiming } from "~utils/timing"
import {
  appendConversationTurn,
  historyEntryFromConversation
} from "~utils/conversation-history"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "aviso-floating-host"

function logPerfSummaryFromResponse(response?: MessageResponse): void {
  const data = response?.data
  if (!data || typeof data !== "object" || !("perfSummary" in data)) return

  const perfSummary = (data as { perfSummary?: unknown }).perfSummary
  if (perfSummary) console.info(`[Aviso perf] ${JSON.stringify(perfSummary)}`)
}

type ChatMsg = ConversationMessage

type FloatingState = {
  visible: boolean
  loading: boolean
  error: string
  sessionId: string
  createdAt: number
  requestId: string
  trigger: string
  operation: string
  context?: AIRequestPayload["context"]
  statusText: string
  reasoningText: string
  reasoningExpanded: boolean
  messages: ChatMsg[]
}

const INITIAL_STATE: FloatingState = {
  visible: false,
  loading: false,
  error: "",
  sessionId: "",
  createdAt: 0,
  requestId: "",
  trigger: "",
  operation: "",
  context: undefined,
  statusText: "",
  reasoningText: "",
  reasoningExpanded: false,
  messages: []
}

const OPERATION_LABEL_KEYS: Record<string, I18nKey> = {
  explain: "operation.explain",
  translate: "operation.translate",
  polish: "operation.polish",
  summarize: "operation.summarize",
  custom: "operation.custom",
  image_explain: "operation.imageExplain",
  search: "operation.search",
  navigate: "operation.navigate"
}

function operationLabel(
  operation: string,
  t: (key: I18nKey) => string
): string {
  const key = OPERATION_LABEL_KEYS[operation]
  return key ? t(key) : operation
}

// 用户气泡显示文案：图片不展示 URL / base64，其余展示原始输入
function userBubbleText(
  operation: string,
  inputText: string,
  imageSource: AIRequestPayload["imageSource"] | undefined,
  t: (key: I18nKey) => string
): string {
  if (operation === "image_explain" && imageSource === "screenshot-region") {
    return t("floating.screenshotRegion")
  }
  if (operation === "image_explain") return t("floating.image")
  if (operation === "translate") {
    const text = inputText.trim()
    return text ? `${t("translation.userBubblePrefix")}\n${text}` : ""
  }
  return inputText
}

function defaultStatusText(
  operation: string,
  t: (key: I18nKey) => string
): string {
  return operation === "translate"
    ? t("translation.waiting")
    : t("model.waiting")
}

function visibleErrorText(
  operation: string,
  error: string,
  t: (key: I18nKey) => string
): string {
  if (operation !== "translate") return error
  return /^翻译失败[：:]|^Translation failed:/i.test(error)
    ? error
    : `${t("translation.errorPrefix")}${error}`
}

function lastByRole(messages: ChatMsg[], role: "user" | "assistant"): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === role) return messages[i].content
  }
  return ""
}

function hasAssistantContentForRequest(
  messages: ChatMsg[],
  requestId: string
): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      message.reqId === requestId &&
      message.content.trim().length > 0
  )
}

function persistConversation(
  state: FloatingState,
  options: { pinned?: boolean } = {}
): void {
  chrome.runtime.sendMessage({
    action: "SAVE_HISTORY",
    payload: historyEntryFromConversation({
      id: state.sessionId,
      trigger: state.trigger as any,
      operation: state.operation,
      url: window.location.href,
      messages: state.messages,
      createdAt: state.createdAt || Date.now(),
      updatedAt: Date.now(),
      pinned: options.pinned
    })
  })
}

function LoadingMessage({ text }: { text: string }) {
  const { tokens: ui } = useSyncedAvisoTheme()

  return (
    <div className="aviso-loading-message" role="status" aria-live="polite">
      <div className="aviso-loading-row">
        <span className="aviso-loading-mark">
          <AvisoMark size={24} style={{ color: ui.accent }} />
        </span>
        <span className="aviso-loading-text">{text}</span>
      </div>
    </div>
  )
}

const MAX_REASONING_DISPLAY_CHARS = 4000

function appendReasoningText(current: string, next: string): string {
  return `${current}${next}`.slice(-MAX_REASONING_DISPLAY_CHARS)
}

function ReasoningMessage({
  text,
  expanded,
  loading,
  onToggle,
  t
}: {
  text: string
  expanded: boolean
  loading: boolean
  onToggle: () => void
  t: (key: I18nKey) => string
}) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const label = loading ? t("model.thinking") : t("model.thinkingDone")

  return (
    <div
      className="aviso-reasoning-message"
      style={{
        border: `1px solid ${ui.line}`,
        borderRadius: aviso.radiusMd,
        background: ui.surface2,
        color: ui.text2,
        overflow: "hidden",
        marginBottom: 8
      }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 10px",
          border: "none",
          background: "transparent",
          color: ui.text2,
          cursor: "pointer",
          fontFamily: aviso.font,
          fontSize: "12.5px",
          fontWeight: 650,
          textAlign: "left"
        }}>
        <span>{label}</span>
        <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
      </button>
      {expanded && (
        <div
          style={{
            maxHeight: 160,
            overflowY: "auto",
            padding: "0 10px 10px",
            fontFamily: aviso.mono,
            fontSize: "12px",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere"
          }}>
          {text}
        </div>
      )}
    </div>
  )
}

function FloatingWindow() {
  const { tokens: ui } = useSyncedAvisoTheme()
  const { language, t } = useSyncedAvisoLanguage()
  const [state, setState] = useState<FloatingState>(INITIAL_STATE)
  const [followUp, setFollowUp] = useState("")
  const [savedId, setSavedId] = useState("")
  const [copiedId, setCopiedId] = useState("")
  const [loadingTick, setLoadingTick] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const followUpRef = useRef<HTMLTextAreaElement>(null)
  const stateRef = useRef<FloatingState>(INITIAL_STATE)
  const tRef = useRef(t)
  const activeRequestRef = useRef("")
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()
  const slowTimer = useRef<ReturnType<typeof setTimeout>>()
  const conversationTimer = useRef<ReturnType<typeof setTimeout>>()
  const conversationPersistenceKey = state.loading
    ? ""
    : state.messages
        .map(
          (message) =>
            `${message.role}:${message.reqId ?? ""}:${message.content.length}`
        )
        .join("|")

  const sendAIRequest = (
    requestId: string,
    payload: AIRequestPayload,
    statusText = defaultStatusText(payload.operation ?? "", tRef.current)
  ) => {
    if (activeRequestRef.current !== requestId) {
      logTiming("ai_request_skipped", requestId, payload.timing, {
        reason: "floating-window-closed"
      })
      return
    }

    const timing = markTiming(payload.timing, "aiRequestSentAt")
    logTiming("ai_request_sent", requestId, timing, {
      operation: payload.operation,
      pageContentChars: payload.pageContent?.length ?? 0,
      priorContextChars: payload.priorContext?.length ?? 0,
      selectionChars: payload.selectionText?.length ?? 0,
      userMessageChars: payload.userMessage?.length ?? 0
    })

    setState((prev) =>
      prev.requestId === requestId
        ? { ...prev, loading: true, error: "", statusText }
        : prev
    )

    chrome.runtime.sendMessage(
      {
        action: "AI_REQUEST",
        requestId,
        payload: {
          ...payload,
          timing
        }
      },
      (response) => {
        logPerfSummaryFromResponse(response)

        // sendMessage 回调兜底：如 AI_STREAM_ERROR 消息未到达时仍能停止 loading
        if (response && !response.success && response.error) {
          setState((prev) =>
            prev.requestId === requestId &&
            activeRequestRef.current === requestId
              ? {
                  ...prev,
                  loading: false,
                  error: visibleErrorText(
                    prev.operation,
                    response.error as string,
                    tRef.current
                  ),
                  statusText: ""
                }
              : prev
          )
        }
      }
    )
  }

  const cancelBackgroundRequest = (requestId: string) => {
    chrome.runtime.sendMessage({
      action: "CANCEL_AI_REQUEST",
      payload: { requestId }
    })
  }

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    const listener = (
      message: MessageRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      let handled = false

      if (message.action === "SHOW_FLOATING_WINDOW") {
        handled = true
        const {
          requestId: providedRequestId,
          trigger,
          operation,
          context,
          imageSource,
          selectionText,
          userMessage,
          linkUrl,
          srcUrl,
          pageUrl,
          pageContent,
          templateId,
          timing: incomingTiming,
          deferAiRequest,
          statusText,
          restore
        } = message.payload
        const currentState = stateRef.current
        const requestId = providedRequestId ?? `req-${Date.now()}`
        const timing = markTiming(incomingTiming, "floatingShownAt")
        const shouldAppendToCurrentConversation =
          currentState.visible && Boolean(currentState.sessionId)
        activeRequestRef.current = requestId

        // 从历史恢复：直接回填已存对话，不发起 AI 请求
        if (restore) {
          const restored: ChatMsg[] = restore.messages?.length
            ? restore.messages
            : []
          if (restored.length === 0) {
            if (restore.input)
              restored.push({ role: "user", content: restore.input })
            restored.push({ role: "assistant", content: restore.output })
          }
          setState({
            visible: true,
            loading: false,
            error: "",
            sessionId: requestId,
            createdAt: restore.createdAt ?? Date.now(),
            requestId,
            trigger,
            operation,
            context,
            statusText: "",
            reasoningText: "",
            reasoningExpanded: false,
            messages: restored
          })
          setSavedId(restore.pinned ? requestId : "")
          sendResponse({ success: true })
          return
        }

        // inputText 优先级：选中文字 > 用户输入 > 链接/资源URL > 页面URL
        const inputText =
          selectionText || userMessage || linkUrl || srcUrl || pageUrl || ""

        const bubble = userBubbleText(
          operation,
          inputText,
          imageSource,
          tRef.current
        )
        const messages: ChatMsg[] = appendConversationTurn([], {
          userContent: bubble,
          requestId,
          operation,
          trigger
        })

        logTiming("floating_shown", requestId, timing, {
          trigger,
          operation,
          deferred: !!deferAiRequest,
          pageContentChars: pageContent?.length ?? 0,
          inputChars: inputText.length
        })

        if (
          shouldAppendToCurrentConversation &&
          currentState.loading &&
          currentState.requestId &&
          currentState.requestId !== requestId
        ) {
          cancelBackgroundRequest(currentState.requestId)
        }

        setState((prev) => {
          const appending = prev.visible && Boolean(prev.sessionId)
          return {
            visible: true,
            loading: true,
            error: "",
            sessionId: appending ? prev.sessionId : requestId,
            createdAt: appending ? prev.createdAt : Date.now(),
            requestId,
            trigger,
            operation,
            context,
            statusText: statusText ?? defaultStatusText(operation, tRef.current),
            reasoningText: "",
            reasoningExpanded: false,
            messages: appending
              ? appendConversationTurn(prev.messages, {
                  userContent: bubble,
                  requestId,
                  operation,
                  trigger
                })
              : messages
          }
        })
        setSavedId("")

        if (!deferAiRequest) {
          sendAIRequest(
            requestId,
            {
              operation,
              trigger,
              context,
              imageSource,
              selectionText,
              userMessage,
              linkUrl,
              srcUrl,
              pageUrl,
              pageContent,
              templateId,
              timing
            },
            statusText ?? defaultStatusText(operation, tRef.current)
          )
        }
      }

      if (message.action === "START_FLOATING_AI_REQUEST") {
        handled = true
        const { requestId, aiPayload, timing, statusText } = message.payload
        sendAIRequest(
          requestId,
          {
            ...aiPayload,
            timing: timing ?? aiPayload.timing
          },
          statusText ??
            defaultStatusText(aiPayload.operation ?? "", tRef.current)
        )
      }

      if (message.action === "AI_STREAM_CHUNK") {
        handled = true
        const { chunk, requestId } = message.payload
        if (chunk.perfSummary) {
          console.info(`[Aviso perf] ${JSON.stringify(chunk.perfSummary)}`)
        }
        setState((prev) => {
          if (
            prev.requestId !== requestId ||
            activeRequestRef.current !== requestId
          ) {
            return prev
          }
          if (chunk.kind === "reasoning") {
            return {
              ...prev,
              reasoningText: appendReasoningText(
                prev.reasoningText,
                chunk.text
              ),
              statusText: chunk.text ? "" : prev.statusText
            }
          }
          const messages = prev.messages.map((m) =>
            m.reqId === requestId
              ? { ...m, content: m.content + chunk.text }
              : m
          )
          return {
            ...prev,
            messages,
            loading: !chunk.done,
            statusText: chunk.text || chunk.done ? "" : prev.statusText
          }
        })
      }

      if (message.action === "AI_STREAM_ERROR") {
        handled = true
        const { error, requestId } = message.payload
        setState((prev) =>
          prev.requestId === requestId && activeRequestRef.current === requestId
            ? {
                ...prev,
                loading: false,
                error: visibleErrorText(prev.operation, error, tRef.current),
                statusText: ""
              }
            : prev
        )
      }

      if (message.action === "AI_PERF_SUMMARY") {
        handled = true
        console.info(`[Aviso perf] ${JSON.stringify(message.payload.summary)}`)
      }

      if (handled) sendResponse({ success: true })
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    clearTimeout(conversationTimer.current)
    const currentState = stateRef.current

    if (
      !currentState.visible ||
      currentState.loading ||
      !currentState.sessionId ||
      !currentState.messages.some((message) => message.content.trim())
    ) {
      return
    }

    conversationTimer.current = setTimeout(() => {
      persistConversation(stateRef.current)
    }, 250)

    return () => clearTimeout(conversationTimer.current)
  }, [
    state.visible,
    state.loading,
    state.sessionId,
    state.createdAt,
    state.trigger,
    state.operation,
    conversationPersistenceKey
  ])

  // 内容增长 / 新消息时自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [state.messages])

  useEffect(() => {
    return () => clearTimeout(copyTimer.current)
  }, [])

  useEffect(() => {
    return () => clearTimeout(conversationTimer.current)
  }, [])

  useEffect(() => {
    const textarea = followUpRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`
  }, [followUp])

  useEffect(() => {
    if (!state.loading || !state.requestId) {
      setLoadingTick(0)
      return
    }

    const timer = window.setInterval(() => {
      setLoadingTick((tick) => tick + 1)
    }, LOADING_STATUS_TICK_MS)

    return () => window.clearInterval(timer)
  }, [state.loading, state.requestId])

  useEffect(() => {
    clearTimeout(slowTimer.current)

    if (!state.loading || !state.requestId) return

    const requestId = state.requestId
    slowTimer.current = setTimeout(() => {
      setState((prev) => {
        const hasFirstChunk = hasAssistantContentForRequest(
          prev.messages,
          requestId
        )
        if (
          prev.requestId !== requestId ||
          activeRequestRef.current !== requestId ||
          !shouldShowSlowResponseHint({
            loading: prev.loading,
            hasFirstChunk,
            elapsedMs: SLOW_FIRST_CHUNK_MS
          })
        ) {
          return prev
        }

        return { ...prev, statusText: tRef.current("model.slow") }
      })
    }, SLOW_FIRST_CHUNK_MS)

    return () => clearTimeout(slowTimer.current)
  }, [state.loading, state.requestId])

  const handleCopy = async () => {
    const output = lastByRole(state.messages, "assistant")
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopiedId(state.requestId)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedId(""), 1200)
    } catch {
      setState((prev) => ({
        ...prev,
        error: tRef.current("translation.copyError")
      }))
    }
  }

  const handleSave = () => {
    const output = lastByRole(state.messages, "assistant")
    if (savedId === state.sessionId || !output) return
    persistConversation(state, { pinned: true })
    setSavedId(state.sessionId)
  }

  const handleFollowUp = () => {
    const q = followUp.trim()
    if (!q) return
    const requestId = `req-${Date.now()}`
    const timing = markTiming(startTiming(), "floatingShownAt")
    activeRequestRef.current = requestId
    logTiming("trigger", requestId, timing, {
      trigger: "follow-up",
      operation: "custom"
    })
    const priorContext = buildFollowUpPriorContext(state.messages)

    setState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      requestId,
      trigger: "follow-up",
      operation: "custom",
      context: undefined,
      statusText: t("model.waiting"),
      reasoningText: "",
      reasoningExpanded: false,
      messages: appendConversationTurn(prev.messages, {
        userContent: q,
        requestId,
        operation: "custom",
        trigger: "follow-up"
      })
    }))
    setFollowUp("")

    sendAIRequest(
      requestId,
      {
        trigger: "follow-up",
        operation: "custom",
        userMessage: q,
        priorContext,
        timing
      },
      t("model.waiting")
    )
  }

  const handleStopWaiting = () => {
    if (!state.loading || !state.requestId) return

    const requestId = state.requestId
    activeRequestRef.current = ""
    clearTimeout(slowTimer.current)
    cancelBackgroundRequest(requestId)

    setState((prev) =>
      prev.requestId === requestId
        ? {
            ...prev,
            loading: false,
            statusText: "",
            messages: prev.messages.map((message) =>
              message.role === "assistant" && message.reqId === requestId
                ? {
                    ...message,
                    content: message.content.trim()
                      ? `${message.content}\n\n${t("model.cancelled")}`
                      : t("model.cancelled")
                  }
                : message
            )
          }
        : prev
    )
  }

  const handleClose = () => {
    if (state.loading && state.requestId) {
      cancelBackgroundRequest(state.requestId)
    }
    if (
      state.visible &&
      state.sessionId &&
      state.messages.some((message) => message.content.trim())
    ) {
      persistConversation(state)
    }
    activeRequestRef.current = ""
    setState(INITIAL_STATE)
  }

  if (!state.visible) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "380px",
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "min(520px, calc(100vh - 48px))",
        background: ui.surface,
        border: `1px solid ${ui.line}`,
        borderRadius: aviso.radiusLg,
        boxShadow: ui.panelShadow,
        display: "flex",
        flexDirection: "column",
        fontFamily: aviso.font,
        color: ui.text,
        zIndex: 2147483647,
        overflow: "hidden",
        ...visuallyStable
      }}>
      {/* 标题栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "13px 14px",
          borderBottom: `1px solid ${ui.line}`
        }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            color: ui.text
          }}>
          <AvisoMark size={18} style={{ color: ui.accent }} />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "-0.01em"
            }}>
            Aviso
          </span>
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: aviso.mono,
              fontSize: "10.5px",
              letterSpacing: "0.02em",
              padding: "2px 7px",
              borderRadius: aviso.radiusSm,
              background: ui.accentSoft,
              color: ui.accent
            }}>
            {operationLabel(state.operation, t)}
          </span>
        </span>
        <AvisoIconButton
          icon="close"
          onClick={handleClose}
          className="aviso-icon-button"
          aria-label={t("common.close")}
          style={{ flex: "0 0 auto" }}
        />
      </div>

      {/* 对话区 */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 16px",
          fontSize: "14px",
          lineHeight: "1.62",
          minHeight: "120px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
        {state.messages.map((m, idx) => {
          const isUser = m.role === "user"
          const isStreaming =
            !isUser &&
            m.reqId === state.requestId &&
            state.loading &&
            !state.error
          const showReasoning =
            !isUser &&
            m.reqId === state.requestId &&
            state.reasoningText.trim().length > 0
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: isUser ? ui.surface2 : "transparent",
                borderRadius: isUser ? aviso.radiusMd : 0,
                padding: isUser ? "8px 12px" : 0,
                color: isUser ? ui.text2 : ui.text,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere"
              }}>
              {showReasoning && (
                <ReasoningMessage
                  text={state.reasoningText}
                  expanded={state.reasoningExpanded}
                  loading={state.loading}
                  t={t}
                  onToggle={() =>
                    setState((prev) => ({
                      ...prev,
                      reasoningExpanded: !prev.reasoningExpanded
                    }))
                  }
                />
              )}
              {!isUser && !m.content && isStreaming ? (
                <LoadingMessage
                  text={getDynamicLoadingStatusText({
                    operation: state.operation,
                    context: state.context,
                    statusText: state.statusText,
                    tick: loadingTick,
                    language
                  })}
                />
              ) : (
                m.content
              )}
              {isStreaming && m.content && (
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "14px",
                    background: ui.accent,
                    borderRadius: "1px",
                    marginLeft: "2px",
                    verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite"
                  }}
                />
              )}
            </div>
          )
        })}
        {state.error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              color: ui.text2,
              background: ui.dangerBg,
              borderRadius: aviso.radiusMd,
              padding: "10px 12px",
              fontSize: "13px",
              lineHeight: "1.5"
            }}>
            <AvisoIcon
              name="warning"
              size={16}
              style={{ color: ui.danger, marginTop: 1 }}
            />
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {state.error}
            </span>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px 12px",
          borderTop: `1px solid ${ui.line}`,
          background: `color-mix(in oklab, ${ui.bg} 40%, transparent)`
        }}>
        {[
          {
            label:
              copiedId === state.requestId && state.requestId
                ? t("common.copied")
                : t("common.copy"),
            icon: "copy" as AvisoIconName,
            onClick: handleCopy,
            active: copiedId === state.requestId && !!state.requestId
          },
          {
            label:
              savedId === state.sessionId && state.sessionId
                ? t("common.saved")
                : t("common.save"),
            icon: "save" as AvisoIconName,
            onClick: handleSave,
            active: savedId === state.sessionId && !!state.sessionId
          },
          ...(state.loading
            ? [
                {
                  label: t("common.stop"),
                  icon: "stop" as AvisoIconName,
                  onClick: handleStopWaiting,
                  active: false
                }
              ]
            : [])
        ].map(({ label, icon, onClick, active }) => (
          <AvisoButton
            key={icon}
            variant="ghost"
            size="sm"
            icon={icon}
            onClick={onClick}
            className="aviso-result-action"
            data-active={active ? "true" : "false"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: ui.text,
              borderRadius: aviso.radiusSm,
              padding: "7px 11px",
              fontFamily: aviso.font,
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}>
            {label}
          </AvisoButton>
        ))}
      </div>

      {/* 追问输入框 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          padding: "11px 12px",
          borderTop: `1px solid ${ui.line}`
        }}>
        <textarea
          ref={followUpRef}
          className="aviso-follow-up-input"
          rows={1}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !(e.nativeEvent as KeyboardEvent).isComposing
            ) {
              e.preventDefault()
              handleFollowUp()
            }
          }}
          placeholder={t("floating.followUpPlaceholder")}
          style={{
            flex: 1,
            minWidth: 0,
            height: 34,
            maxHeight: 96,
            background: "transparent",
            border: "none",
            borderRadius: aviso.radiusSm,
            color: ui.text,
            padding: "8px 4px",
            fontFamily: aviso.font,
            fontSize: "13.5px",
            lineHeight: "18px",
            outline: "none",
            resize: "none",
            overflowY: "auto",
            overflowWrap: "anywhere"
          }}
        />
        <AvisoButton
          variant="primary"
          size="md"
          icon="send"
          onClick={handleFollowUp}
          className="aviso-send-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: ui.accent,
            border: "none",
            borderRadius: aviso.radiusMd,
            color: ui.accentText,
            padding: "8px 14px",
            fontFamily: aviso.font,
            fontSize: "13px",
            fontWeight: 600,
            minHeight: 34,
            cursor: "pointer",
            flex: "0 0 auto",
            whiteSpace: "nowrap"
          }}>
          {t("common.send")}
        </AvisoButton>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes aviso-spin { to { transform: rotate(360deg); } }
        .aviso-loading-message {
          width: min(260px, 100%);
          color: ${ui.text2};
        }
        .aviso-loading-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 28px;
          font-size: 13.5px;
          line-height: 1.4;
        }
        .aviso-loading-mark {
          display: inline-flex;
          flex: 0 0 auto;
          transform-origin: center;
          animation: aviso-spin 1.1s linear infinite;
        }
        .aviso-loading-text {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .aviso-result-action {
          transition:
            background .15s ${aviso.ease},
            color .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-result-action:hover,
        .aviso-result-action[data-active="true"] {
          background: ${ui.surface2} !important;
        }
        .aviso-result-action:active,
        .aviso-send-button:active,
        .aviso-icon-button:active {
          transform: translateY(1px);
        }
        .aviso-result-action:focus-visible,
        .aviso-send-button:focus-visible,
        .aviso-icon-button:focus-visible,
        .aviso-follow-up-input:focus-visible {
          outline: 2px solid ${ui.accent};
          outline-offset: 2px;
          box-shadow: ${ui.focusRing};
        }
        .aviso-send-button {
          transition:
            background .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-send-button:hover {
          background: ${ui.buttonHover} !important;
        }
        .aviso-icon-button {
          transition:
            background .15s ${aviso.ease},
            color .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-icon-button:hover {
          background: ${ui.surface2} !important;
          color: ${ui.text2} !important;
        }
      `}</style>
    </div>
  )
}

export default FloatingWindow
