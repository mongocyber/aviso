import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type {
  AIRequestPayload,
  MessageRequest,
  MessageResponse
} from "~types/messages"
import { buildFollowUpPriorContext } from "~utils/follow-up-context"
import {
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS,
  SLOW_MODEL_RESPONSE_TEXT,
  USER_CANCELLED_ASSISTANT_TEXT,
  WAITING_MODEL_RESPONSE_TEXT
} from "~utils/response-guard"
import { logTiming, markTiming, startTiming } from "~utils/timing"
import {
  formatTranslationError,
  formatTranslationUserBubble,
  TRANSLATION_WAITING_TEXT
} from "~utils/translation"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "contextai-floating-host"

type ChatMsg = { role: "user" | "assistant"; content: string; reqId?: string }

type FloatingState = {
  visible: boolean
  loading: boolean
  error: string
  requestId: string
  trigger: string
  operation: string
  statusText: string
  messages: ChatMsg[]
}

const INITIAL_STATE: FloatingState = {
  visible: false,
  loading: false,
  error: "",
  requestId: "",
  trigger: "",
  operation: "",
  statusText: "",
  messages: []
}

const OPERATION_LABELS: Record<string, string> = {
  explain: "解释",
  translate: "翻译文本",
  polish: "润色",
  summarize: "总结",
  custom: "自由提问",
  image_explain: "图片解释",
  search: "搜索",
  navigate: "导航"
}

function operationLabel(operation: string): string {
  return OPERATION_LABELS[operation] ?? operation
}

// 用户气泡显示文案：图片不展示 URL / base64，其余展示原始输入
function userBubbleText(
  operation: string,
  inputText: string,
  imageSource?: AIRequestPayload["imageSource"]
): string {
  if (operation === "image_explain" && imageSource === "screenshot-region") {
    return "🖼 [截图区域]"
  }
  if (operation === "image_explain") return "🖼 [图片]"
  if (operation === "translate") return formatTranslationUserBubble(inputText)
  return inputText
}

function defaultStatusText(operation: string): string {
  return operation === "translate"
    ? TRANSLATION_WAITING_TEXT
    : WAITING_MODEL_RESPONSE_TEXT
}

function visibleErrorText(operation: string, error: string): string {
  return operation === "translate" ? formatTranslationError(error) : error
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

function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="aviso-loading-message" role="status" aria-live="polite">
      <div className="aviso-loading-row">
        <span className="aviso-loading-mark">
          <AvisoMark size={24} style={{ color: aviso.sage400 }} />
        </span>
        <span className="aviso-loading-text">{text}</span>
      </div>
    </div>
  )
}

function FloatingWindow() {
  const [state, setState] = useState<FloatingState>(INITIAL_STATE)
  const [followUp, setFollowUp] = useState("")
  const [savedId, setSavedId] = useState("")
  const [copiedId, setCopiedId] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const activeRequestRef = useRef("")
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()
  const slowTimer = useRef<ReturnType<typeof setTimeout>>()

  const sendAIRequest = (
    requestId: string,
    payload: AIRequestPayload,
    statusText = defaultStatusText(payload.operation ?? "")
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
                    response.error as string
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
        const requestId = providedRequestId ?? `req-${Date.now()}`
        const timing = markTiming(incomingTiming, "floatingShownAt")
        activeRequestRef.current = requestId

        // 从历史恢复：直接回填已存对话，不发起 AI 请求
        if (restore) {
          const restored: ChatMsg[] = []
          if (restore.input)
            restored.push({ role: "user", content: restore.input })
          restored.push({ role: "assistant", content: restore.output })
          setState({
            visible: true,
            loading: false,
            error: "",
            requestId,
            trigger,
            operation,
            statusText: "",
            messages: restored
          })
          setSavedId(requestId)
          sendResponse({ success: true })
          return
        }

        // inputText 优先级：选中文字 > 用户输入 > 链接/资源URL > 页面URL
        const inputText =
          selectionText || userMessage || linkUrl || srcUrl || pageUrl || ""

        const bubble = userBubbleText(operation, inputText, imageSource)
        const messages: ChatMsg[] = bubble
          ? [
              { role: "user", content: bubble },
              { role: "assistant", content: "", reqId: requestId }
            ]
          : [{ role: "assistant", content: "", reqId: requestId }]

        logTiming("floating_shown", requestId, timing, {
          trigger,
          operation,
          deferred: !!deferAiRequest,
          pageContentChars: pageContent?.length ?? 0,
          inputChars: inputText.length
        })

        setState({
          visible: true,
          loading: true,
          error: "",
          requestId,
          trigger,
          operation,
          statusText: statusText ?? defaultStatusText(operation),
          messages
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
            statusText ?? defaultStatusText(operation)
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
          statusText ?? defaultStatusText(aiPayload.operation ?? "")
        )
      }

      if (message.action === "AI_STREAM_CHUNK") {
        handled = true
        const { chunk, requestId } = message.payload
        setState((prev) => {
          if (
            prev.requestId !== requestId ||
            activeRequestRef.current !== requestId
          ) {
            return prev
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
                error: visibleErrorText(prev.operation, error),
                statusText: ""
              }
            : prev
        )
      }

      if (handled) sendResponse({ success: true })
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

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

        return { ...prev, statusText: SLOW_MODEL_RESPONSE_TEXT }
      })
    }, SLOW_FIRST_CHUNK_MS)

    return () => clearTimeout(slowTimer.current)
  }, [state.loading, state.requestId])

  const handleCopy = async () => {
    const output = lastByRole(state.messages, "assistant")
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopiedId(state.requestId)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedId(""), 1200)
  }

  const handleSave = () => {
    const output = lastByRole(state.messages, "assistant")
    // 同一结果只入库一次，避免重复点击产生多条记录
    if (savedId === state.requestId || !output) return
    chrome.runtime.sendMessage({
      action: "SAVE_HISTORY",
      payload: {
        id: state.requestId,
        trigger: state.trigger as any,
        operation: state.operation,
        input: lastByRole(state.messages, "user"),
        output,
        url: window.location.href,
        timestamp: Date.now(),
        pinned: true
      }
    })
    setSavedId(state.requestId)
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
      statusText: WAITING_MODEL_RESPONSE_TEXT,
      messages: [
        ...prev.messages,
        { role: "user", content: q },
        { role: "assistant", content: "", reqId: requestId }
      ]
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
      WAITING_MODEL_RESPONSE_TEXT
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
                      ? `${message.content}\n\n${USER_CANCELLED_ASSISTANT_TEXT}`
                      : USER_CANCELLED_ASSISTANT_TEXT
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
        background: aviso.darkSurface,
        border: `1px solid ${aviso.darkLine}`,
        borderRadius: aviso.radiusLg,
        boxShadow: aviso.panelShadow,
        display: "flex",
        flexDirection: "column",
        fontFamily: aviso.font,
        color: aviso.darkText,
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
          borderBottom: `1px solid ${aviso.darkLine}`
        }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            color: aviso.darkText
          }}>
          <AvisoMark size={18} style={{ color: aviso.sage400 }} />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "-0.01em"
            }}>
            Aviso 结果面板
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
              background: aviso.accentSurface,
              color: aviso.sage300
            }}>
            {operationLabel(state.operation)}
          </span>
        </span>
        <button
          onClick={handleClose}
          className="aviso-icon-button"
          aria-label="关闭"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            background: "transparent",
            border: "none",
            borderRadius: aviso.radiusSm,
            color: aviso.darkText3,
            cursor: "pointer",
            padding: 0,
            transition: `.15s ${aviso.ease}`
          }}>
          <AvisoIcon name="close" size={16} />
        </button>
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
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: isUser ? aviso.darkSurface2 : "transparent",
                borderRadius: isUser ? aviso.radiusMd : 0,
                padding: isUser ? "8px 12px" : 0,
                color: isUser ? aviso.darkText2 : aviso.darkText,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere"
              }}>
              {!isUser && !m.content && isStreaming ? (
                <LoadingMessage text={state.statusText || "正在生成…"} />
              ) : (
                m.content
              )}
              {isStreaming && m.content && (
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "14px",
                    background: aviso.sage400,
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
              color: aviso.darkText2,
              background: aviso.dangerSurface,
              borderRadius: aviso.radiusMd,
              padding: "10px 12px",
              fontSize: "13px",
              lineHeight: "1.5"
            }}>
            <AvisoIcon
              name="warning"
              size={16}
              style={{ color: aviso.danger, marginTop: 1 }}
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
          borderTop: `1px solid ${aviso.darkLine}`,
          background: `color-mix(in oklab, ${aviso.darkBg} 40%, transparent)`
        }}>
        {[
          {
            label:
              copiedId === state.requestId && state.requestId
                ? "已复制"
                : "复制",
            icon: "copy" as const,
            onClick: handleCopy,
            active: copiedId === state.requestId && !!state.requestId
          },
          {
            label:
              savedId === state.requestId && state.requestId
                ? "已保存"
                : "保存",
            icon: "save" as const,
            onClick: handleSave,
            active: savedId === state.requestId && !!state.requestId
          },
          ...(state.loading
            ? [
                {
                  label: "停止",
                  icon: "stop" as const,
                  onClick: handleStopWaiting,
                  active: false
                }
              ]
            : [])
        ].map(({ label, icon, onClick, active }) => (
          <button
            key={icon}
            onClick={onClick}
            className="aviso-result-action"
            data-active={active ? "true" : "false"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: aviso.darkText,
              borderRadius: aviso.radiusSm,
              padding: "7px 11px",
              fontFamily: aviso.font,
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}>
            <AvisoIcon name={icon} size={15} style={{ opacity: 0.8 }} />
            {label}
          </button>
        ))}
      </div>

      {/* 追问输入框 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "11px 12px",
          borderTop: `1px solid ${aviso.darkLine}`
        }}>
        <input
          className="aviso-follow-up-input"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && handleFollowUp()
          }
          placeholder="继续追问…"
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            borderRadius: aviso.radiusSm,
            color: aviso.darkText,
            padding: "7px 4px",
            fontFamily: aviso.font,
            fontSize: "13.5px",
            outline: "none"
          }}
        />
        <button
          onClick={handleFollowUp}
          className="aviso-send-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: aviso.sage500,
            border: "none",
            borderRadius: aviso.radiusMd,
            color: aviso.paper,
            padding: "8px 14px",
            fontFamily: aviso.font,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}>
          <AvisoIcon name="send" size={15} />
          发送
        </button>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes aviso-spin { to { transform: rotate(360deg); } }
        .aviso-loading-message {
          width: min(260px, 100%);
          color: ${aviso.darkText2};
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
          background: ${aviso.darkSurface2} !important;
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
          outline: 2px solid ${aviso.sage400};
          outline-offset: 2px;
          box-shadow: ${aviso.focusRing};
        }
        .aviso-send-button {
          transition:
            background .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-send-button:hover {
          background: ${aviso.sage600} !important;
        }
        .aviso-icon-button {
          transition:
            background .15s ${aviso.ease},
            color .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-icon-button:hover {
          background: ${aviso.darkSurface2} !important;
          color: ${aviso.darkText2} !important;
        }
      `}</style>
    </div>
  )
}

export default FloatingWindow
