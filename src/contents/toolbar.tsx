import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type { MessageResponse } from "~types/messages"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "contextai-toolbar-host"

type ToolbarPlacement = "above" | "below"
type ToolbarPosition = {
  top: number
  left: number
  placement: ToolbarPlacement
}
type Operation = "explain" | "translate" | "polish" | "summarize" | "send"

const TOOLBAR_BUTTONS: { op: Operation; label: string }[] = [
  { op: "explain", label: "解释" },
  { op: "translate", label: "翻译" },
  { op: "polish", label: "润色" },
  { op: "summarize", label: "总结" },
  { op: "send", label: "发给 AI" }
]

// "发给 AI" 走自由对话；其余按钮即操作名
const OPERATION_MAP: Record<Operation, string> = {
  explain: "explain",
  translate: "translate",
  polish: "polish",
  summarize: "summarize",
  send: "custom"
}

const OPERATION_ICON: Record<
  Operation,
  "explain" | "translate" | "refine" | "summarize" | "send"
> = {
  explain: "explain",
  translate: "translate",
  polish: "refine",
  summarize: "summarize",
  send: "send"
}

const VIEWPORT_MARGIN = 12
const TOOLBAR_GAP = 20
const TOOLBAR_ESTIMATED_HEIGHT = 52

function SelectionToolbar() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<ToolbarPosition>({
    top: 0,
    left: 0,
    placement: "above"
  })
  const [selection, setSelection] = useState("")
  const enabledRef = useRef(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // 读取并持续跟踪「划词工具栏」开关
  useEffect(() => {
    getSettings().then((s) => {
      enabledRef.current = s.enableToolbar
    })
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === "sync" && changes.contextai_settings) {
        const next = changes.contextai_settings.newValue as
          | { enableToolbar?: boolean }
          | undefined
        if (next && typeof next.enableToolbar === "boolean") {
          enabledRef.current = next.enableToolbar
          if (!next.enableToolbar) setVisible(false)
        }
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useEffect(() => {
    const isInsideAvisoUI = (e: MouseEvent): boolean => {
      const hostIds = [
        "contextai-toolbar-host",
        "contextai-floating-host",
        "contextai-command-host",
        "contextai-clipboard-host"
      ]
      const path = e.composedPath()
      // composedPath() 穿透 Shadow DOM 边界，host.contains() 无法做到
      return hostIds.some((id) => {
        const host = document.getElementById(id)
        return !!host && path.includes(host)
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!enabledRef.current) return
      // 点击工具栏自身时不重新定位
      if (isInsideAvisoUI(e)) return

      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ""

      if (!text || text.length < 2) {
        hideTimer.current = setTimeout(() => setVisible(false), 200)
        return
      }

      clearTimeout(hideTimer.current)
      setSelection(text)

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) {
        setVisible(false)
        return
      }
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

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleMouseDown)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleMouseDown)
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
            frameUrl: window.location.href,
            error: runtimeError.message
          })
          return
        }

        if (response && !response.success) {
          console.warn("[Aviso] Toolbar floating window request failed", {
            requestId,
            frameUrl: window.location.href,
            error: response.error
          })
        }
      }
    )
  }

  if (!visible) return null

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
          background: aviso.darkSurface,
          border: `1px solid ${aviso.darkLine}`,
          borderRadius: aviso.radius,
          padding: "6px",
          boxShadow: aviso.toolbarShadow,
          fontFamily: aviso.font,
          color: aviso.darkText
        }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            color: aviso.sage300,
            flex: "0 0 auto"
          }}>
          <AvisoMark size={18} />
        </span>
        <span
          style={{
            width: 1,
            height: 20,
            background: aviso.darkLine,
            margin: "0 2px",
            flex: "0 0 auto"
          }}
        />
        {TOOLBAR_BUTTONS.map(({ op, label }) => (
          <button
            key={op}
            className="aviso-toolbar-button"
            data-primary={op === "send" ? "true" : "false"}
            onClick={() => handleOperation(op)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background:
                op === "send" ? aviso.accentSurface : "transparent",
              border: "none",
              color: op === "send" ? aviso.sage300 : aviso.darkText,
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
                  ? aviso.accentSurfaceStrong
                  : aviso.darkSurface2)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                op === "send" ? aviso.accentSurface : "transparent")
            }>
            <AvisoIcon
              name={OPERATION_ICON[op]}
              size={16}
              style={{ opacity: op === "send" ? 1 : 0.85 }}
            />
            {label}
          </button>
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
          background: aviso.darkSurface,
          borderRight:
            position.placement === "above"
              ? `1px solid ${aviso.darkLine}`
              : undefined,
          borderBottom:
            position.placement === "above"
              ? `1px solid ${aviso.darkLine}`
              : undefined,
          borderLeft:
            position.placement === "below"
              ? `1px solid ${aviso.darkLine}`
              : undefined,
          borderTop:
            position.placement === "below"
              ? `1px solid ${aviso.darkLine}`
              : undefined
        }}
      />
      <style>{`
        .aviso-toolbar-button:focus-visible {
          outline: 2px solid ${aviso.sage400};
          outline-offset: 2px;
          box-shadow: ${aviso.focusRing};
        }
        .aviso-toolbar-button:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  )
}

export default SelectionToolbar
