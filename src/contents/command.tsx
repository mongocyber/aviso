import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type { MessageRequest, MessageResponse } from "~types/messages"
import { parseUserIntent } from "~utils/intent"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "contextai-command-host"

type ResultItem = {
  id: string
  title: string
  subtitle?: string
  url?: string
  operation?: string
  type: "history" | "bookmark"
}

type SearchNotice = {
  type: "empty" | "error"
  text: string
}

type BookmarkSearchResult = {
  items: ResultItem[]
  failed: boolean
}

const COMMAND_PANEL_TOP = "clamp(120px, 26vh, 280px)"
const SEARCH_RESPONSE_TIMEOUT_MS = 4000
const EMPTY_SEARCH_TEXT = "没有找到已保存历史或书签，按 Enter 发给 AI"
const BOOKMARK_SEARCH_ERROR_TEXT = "书签搜索失败，请检查扩展权限或重新加载扩展"

function CommandPalette() {
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchNotice, setSearchNotice] = useState<SearchNotice | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsListRef = useRef<HTMLDivElement>(null)
  const resultItemRefs = useRef<Array<HTMLDivElement | null>>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRunId = useRef(0)
  const enabledRef = useRef(true)
  const isComposingRef = useRef(false)

  // 读取并持续跟踪「命令面板」开关
  useEffect(() => {
    getSettings().then((s) => {
      enabledRef.current = s.enableCommandPalette
    })
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === "sync" && changes.contextai_settings) {
        const next = changes.contextai_settings.newValue as
          | { enableCommandPalette?: boolean }
          | undefined
        if (next && typeof next.enableCommandPalette === "boolean") {
          enabledRef.current = next.enableCommandPalette
          if (!next.enableCommandPalette) setVisible(false)
        }
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  // 监听 background 发来的"打开命令面板"消息
  useEffect(() => {
    const listener = (
      message: MessageRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (message.action === "OPEN_COMMAND_PALETTE") {
        if (!enabledRef.current) {
          sendResponse({ success: false, error: "Command palette is disabled" })
          return
        }
        setVisible(true)
        setTimeout(() => inputRef.current?.focus(), 50)
        sendResponse({ success: true })
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // 键盘快捷键监听：Mac 使用 Command+Shift+Space，其余平台使用 Ctrl+Shift+Space。
  // Alt+Space 在 Windows 会触发系统窗口菜单、在 Mac 会被输入法吞为不间断空格，故改用此组合
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const isCommandPaletteShortcut =
        e.shiftKey &&
        !e.altKey &&
        e.code === "Space" &&
        (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey)

      if (isCommandPaletteShortcut) {
        if (!enabledRef.current) return
        e.preventDefault()
        setVisible((v) => {
          if (!v) setTimeout(() => inputRef.current?.focus(), 50)
          return !v
        })
      }
      if (e.key === "Escape") setVisible(false)
    }
    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)

    const trimmedQuery = query.trim()
    const runId = searchRunId.current + 1
    searchRunId.current = runId

    if (!trimmedQuery) {
      setResults([])
      setLoading(false)
      setSearchNotice(null)
      return
    }

    setSearchNotice(null)
    setResults([])
    searchTimer.current = setTimeout(() => doSearch(trimmedQuery, runId), 300)

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query])

  useEffect(() => {
    if (!visible || results.length === 0) return
    scrollSelectedResultIntoView()
  }, [selectedIndex, results.length, visible])

  async function doSearch(q: string, runId: number) {
    setLoading(true)
    setSearchNotice(null)
    setSelectedIndex(0)

    try {
      const [historyResults, bookmarkResults] = await Promise.all([
        searchChromeHistory(q),
        searchChromeBookmarks(q)
      ])

      if (runId !== searchRunId.current) return

      const nextResults = [...historyResults, ...bookmarkResults.items].slice(
        0,
        12
      )
      setResults(nextResults)

      if (bookmarkResults.failed) {
        setSearchNotice({ type: "error", text: BOOKMARK_SEARCH_ERROR_TEXT })
      } else if (nextResults.length === 0) {
        setSearchNotice({ type: "empty", text: EMPTY_SEARCH_TEXT })
      } else {
        setSearchNotice(null)
      }
    } catch {
      if (runId !== searchRunId.current) return
      setResults([])
      setSearchNotice({ type: "error", text: BOOKMARK_SEARCH_ERROR_TEXT })
    } finally {
      if (runId === searchRunId.current) setLoading(false)
    }
  }

  async function searchChromeHistory(query: string): Promise<ResultItem[]> {
    const response = await sendRuntimeMessage({
      action: "SEARCH_HISTORY",
      payload: { query }
    })

    if (!response.success || !Array.isArray(response.data)) return []

    return response.data.map((e: any) => ({
      id: e.id,
      title: e.input,
      subtitle: e.output?.slice(0, 60) + "…",
      operation: e.operation,
      type: "history" as const
    }))
  }

  async function searchChromeBookmarks(
    query: string
  ): Promise<BookmarkSearchResult> {
    // chrome.bookmarks 在 content script 中不可用，必须路由到 background
    const response = await sendRuntimeMessage({
      action: "SEARCH_BOOKMARKS",
      payload: { query }
    })

    if (!response.success || !Array.isArray(response.data)) {
      return { items: [], failed: true }
    }

    return {
      items: (response.data as chrome.bookmarks.BookmarkTreeNode[]).map(
        (b) => ({
          id: b.id,
          title: b.title || b.url || "书签",
          subtitle: b.url,
          url: b.url,
          type: "bookmark" as const
        })
      ),
      failed: false
    }
  }

  const handleSelect = (item: ResultItem) => {
    if (item.url) {
      window.open(item.url, "_blank")
    } else if (item.type === "history") {
      // 复用历史项原始操作重新执行；缺失时回退到解释
      const requestId = `req-${Date.now()}`
      const timing = startTiming()
      logTiming("trigger", requestId, timing, {
        trigger: "command-palette-history",
        operation: item.operation || "explain",
        selectionChars: item.title.length
      })

      chrome.runtime.sendMessage({
        action: "SHOW_FLOATING_WINDOW",
        payload: {
          requestId,
          trigger: "command-palette",
          operation: item.operation || "explain",
          selectionText: item.title,
          timing
        }
      })
    }
    setVisible(false)
    setQuery("")
  }

  const handleSendToAI = async () => {
    if (!query.trim()) return
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    setVisible(false)
    const intent = await parseUserIntent(query)
    logTiming("trigger", requestId, timing, {
      trigger: "command-palette",
      operation: intent.action,
      userMessageChars: query.length
    })

    chrome.runtime.sendMessage({
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "command-palette",
        operation: intent.action,
        userMessage: query,
        timing
      }
    })
    setQuery("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const nativeEvent = e.nativeEvent as KeyboardEvent & {
      isComposing?: boolean
    }
    if (
      isComposingRef.current ||
      nativeEvent.isComposing ||
      nativeEvent.keyCode === 229
    ) {
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (results.length === 0) return
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (results.length === 0) return
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results.length > 0) {
        handleSelect(results[selectedIndex])
      } else {
        handleSendToAI()
      }
    }
  }

  const handlePanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const list = resultsListRef.current
    if (list) {
      const maxScrollTop = list.scrollHeight - list.clientHeight
      if (maxScrollTop > 0) {
        const deltaY =
          e.deltaMode === 1
            ? e.deltaY * 16
            : e.deltaMode === 2
              ? e.deltaY * list.clientHeight
              : e.deltaY
        list.scrollTop = Math.max(
          0,
          Math.min(maxScrollTop, list.scrollTop + deltaY)
        )
      }
    }

    e.preventDefault()
    e.stopPropagation()
  }

  const scrollSelectedResultIntoView = () => {
    const list = resultsListRef.current
    const selectedItem = resultItemRefs.current[selectedIndex]
    if (!list || !selectedItem) return

    const listRect = list.getBoundingClientRect()
    const itemRect = selectedItem.getBoundingClientRect()
    const edgePadding = 8
    const maxScrollTop = list.scrollHeight - list.clientHeight

    if (itemRect.top < listRect.top + edgePadding) {
      list.scrollTop = Math.max(
        0,
        list.scrollTop - (listRect.top + edgePadding - itemRect.top)
      )
    } else if (itemRect.bottom > listRect.bottom - edgePadding) {
      list.scrollTop = Math.min(
        maxScrollTop,
        list.scrollTop + itemRect.bottom - (listRect.bottom - edgePadding)
      )
    }
  }

  if (!visible) return null

  const visibleNotice = query.trim() && !loading ? searchNotice : null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / .28)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 2147483647,
        fontFamily: aviso.font,
        padding: `${COMMAND_PANEL_TOP} 16px 16px`,
        boxSizing: "border-box",
        overscrollBehavior: "contain",
        ...visuallyStable
      }}
      onWheel={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => e.target === e.currentTarget && setVisible(false)}>
      <div
        onWheel={handlePanelWheel}
        style={{
          width: "560px",
          maxWidth: "100%",
          background: aviso.darkSurface,
          border: `1px solid ${aviso.darkLine}`,
          borderRadius: "16px",
          boxShadow: aviso.popShadow,
          overflow: "hidden",
          color: aviso.darkText,
          display: "flex",
          flexDirection: "column",
          maxHeight: `calc(100vh - ${COMMAND_PANEL_TOP} - 16px)`,
          overscrollBehavior: "contain"
        }}>
        {/* 输入框 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 18px",
            gap: "12px",
            borderBottom:
              results.length > 0 || visibleNotice
                ? `1px solid ${aviso.darkLine}`
                : "none"
          }}>
          <AvisoMark size={18} style={{ color: aviso.sage400 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索已保存历史、书签，或发问 AI…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              color: aviso.darkText,
              fontFamily: aviso.font,
              fontSize: "16px",
              outline: "none",
              caretColor: aviso.sage400
            }}
          />
          {loading && (
            <span
              style={{
                color: aviso.darkText3,
                fontSize: "12px",
                whiteSpace: "nowrap"
              }}>
              搜索中…
            </span>
          )}
        </div>

        {/* 结果列表 */}
        {results.length > 0 && (
          <div
            ref={resultsListRef}
            style={{
              flex: "1 1 auto",
              maxHeight: `min(360px, calc(100vh - ${COMMAND_PANEL_TOP} - 136px))`,
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: 6
            }}>
            {results.map((item, idx) => (
              <div
                key={item.id}
                ref={(node) => {
                  resultItemRefs.current[idx] = node
                }}
                onClick={() => handleSelect(item)}
                style={{
                  padding: "11px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background:
                    idx === selectedIndex
                      ? `color-mix(in oklab, ${aviso.sage400} 16%, transparent)`
                      : "transparent",
                  display: "flex",
                  gap: "13px",
                  alignItems: "center",
                  transition: `.15s ${aviso.ease}`
                }}
                onMouseEnter={() => setSelectedIndex(idx)}>
                <AvisoIcon
                  name={item.type === "bookmark" ? "bookmark" : "history"}
                  size={18}
                  style={{
                    color:
                      idx === selectedIndex ? aviso.sage300 : aviso.darkText3
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      color: aviso.darkText,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div
                      style={{
                        fontFamily: aviso.mono,
                        fontSize: "11px",
                        color: aviso.darkText3,
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    flex: "0 0 auto",
                    fontFamily: aviso.mono,
                    fontSize: "10.5px",
                    padding: "2px 7px",
                    borderRadius: 6,
                    border: `1px solid ${aviso.darkLine}`,
                    color: aviso.darkText3
                  }}>
                  {item.type === "bookmark" ? "书签" : "已保存历史"}
                </span>
              </div>
            ))}
          </div>
        )}

        {visibleNotice && (
          <div
            style={{
              borderTop:
                results.length > 0 ? `1px solid ${aviso.darkLine}` : "none",
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color:
                visibleNotice.type === "error" ? aviso.danger : aviso.darkText2,
              fontSize: "13px"
            }}>
            <AvisoIcon
              name={visibleNotice.type === "error" ? "warning" : "search"}
              size={16}
            />
            <span>{visibleNotice.text}</span>
          </div>
        )}

        {/* 底部提示 */}
        <div
          style={{
            borderTop: `1px solid ${aviso.darkLine}`,
            padding: "10px 16px",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            fontSize: "12px",
            color: aviso.darkText3
          }}>
          <span style={{ minWidth: 0 }}>
            <kbd style={styles.kbd}>↑↓</kbd> 导航 ·{" "}
            <kbd style={styles.kbd}>Enter</kbd>{" "}
            {results.length > 0 ? "选择" : "发给 AI"}
          </span>
          <span
            onClick={handleSendToAI}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              color: aviso.sage300,
              whiteSpace: "nowrap"
            }}>
            无结果时 <kbd style={styles.kbd}>Enter</kbd> 发给 AI
          </span>
        </div>
      </div>
    </div>
  )
}

function sendRuntimeMessage(message: unknown): Promise<MessageResponse> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      settled = true
      resolve({ success: false, error: "Background response timed out" })
    }, SEARCH_RESPONSE_TIMEOUT_MS)

    try {
      chrome.runtime.sendMessage(message, (response?: MessageResponse) => {
        const runtimeError = chrome.runtime.lastError
        if (settled) return
        settled = true
        clearTimeout(timer)

        if (runtimeError) {
          resolve({ success: false, error: runtimeError.message })
          return
        }

        if (!response) {
          resolve({ success: false, error: "Background did not respond" })
          return
        }

        resolve(response)
      })
    } catch (err) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  })
}

const styles: Record<string, React.CSSProperties> = {
  kbd: {
    fontFamily: aviso.mono,
    fontSize: 11,
    padding: "1px 5px",
    borderRadius: 5,
    border: `1px solid ${aviso.darkLine}`,
    color: aviso.darkText2,
    background: "transparent"
  }
}

export default CommandPalette
