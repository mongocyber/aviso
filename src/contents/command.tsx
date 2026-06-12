import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useRef, useState } from "react"

import {
  aviso,
  AvisoIcon,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable
} from "~styles/aviso"
import type { ConversationMessage, Settings } from "~types/history"
import type { MessageRequest, MessageResponse } from "~types/messages"
import { parseIntentLocally, type ParsedIntent } from "~utils/intent"
import { useSyncedAvisoLanguage, type I18nKey } from "~utils/i18n"
import {
  resolveModelRoute,
  type ModelRoute,
  type ProviderId
} from "~utils/model-registry"
import { getLegacyProviderFromConfigId } from "~utils/provider-configs"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"
import {
  isSafeBrowserOpenUrl,
  normalizeSafeBrowserOpenUrl
} from "~utils/url-safety"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "aviso-command-host"

type ResultItem = {
  id: string
  title: string
  subtitle?: string
  url?: string
  operation?: string
  actionId?: "page_translate" | "page_summary"
  userMessage?: string
  restore?: {
    input: string
    output: string
    messages?: ConversationMessage[]
    createdAt?: number
    pinned?: boolean
  }
  requiresConfirmation?: boolean
  type:
    | "ai-history"
    | "ask-ai"
    | "bookmark"
    | "browser-history"
    | "open-url"
    | "page-action"
}

type SearchNotice = {
  type: "empty" | "error"
  text: string
}

type BookmarkSearchResult = {
  items: ResultItem[]
  failed: boolean
}

type AiNotice = {
  title: string
  detail: string
  type: "info" | "error"
}

type AiConnection = {
  connected: boolean
  providerLabel: string
}

const COMMAND_PANEL_TOP = "clamp(120px, 26vh, 280px)"
const SEARCH_RESPONSE_TIMEOUT_MS = 4000
function getResultTypeLabel(
  type: ResultItem["type"],
  t: (key: I18nKey) => string
): string {
  if (type === "open-url") return t("command.openUrl")
  if (type === "page-action") return t("command.pageAction")
  if (type === "ask-ai") return t("command.askAi")
  if (type === "browser-history") return t("command.history")
  if (type === "bookmark") return t("command.bookmark")
  return t("command.aiHistory")
}

function getResultIcon(type: ResultItem["type"]) {
  if (type === "bookmark") return "bookmark"
  if (type === "ask-ai" || type === "page-action") return "explain"
  if (type === "open-url") return "search"
  return "history"
}

function readSelectionSuggestion(): string {
  const text = window.getSelection()?.toString().replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

async function getStoredApiKeyPresence(): Promise<
  Partial<Record<ProviderId, boolean>> & {
    providerConfigKeys: Record<string, boolean>
  }
> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const raw = result.contextai_api_keys ?? {}
  const providerConfigKeys = raw.providerConfigKeys ?? {}
  return {
    openai: Boolean(raw.openai),
    anthropic: Boolean(raw.anthropic),
    doubao: Boolean(raw.doubao),
    providerConfigKeys: Object.fromEntries(
      Object.keys(providerConfigKeys).map((configId) => [configId, true])
    )
  }
}

function getAiConnectionFromSettings(
  settings: Settings,
  keyPresence: Partial<Record<ProviderId, boolean>> & {
    providerConfigKeys: Record<string, boolean>
  }
): AiConnection {
  const route = resolveModelRoute(undefined, settings)
  const providerId = route.provider.id
  const legacyProvider = route.providerConfigId
    ? getLegacyProviderFromConfigId(route.providerConfigId)
    : undefined
  const hasKey = route.providerConfigId
    ? legacyProvider
      ? Boolean(keyPresence[legacyProvider])
      : Boolean(keyPresence.providerConfigKeys[route.providerConfigId])
    : Boolean(keyPresence[providerId])
  const hasEndpoint = !route.missingConfig

  return {
    connected: hasKey && hasEndpoint,
    providerLabel: route.provider.displayName
  }
}

function CommandPalette() {
  const { tokens: ui } = useSyncedAvisoTheme()
  const { t } = useSyncedAvisoLanguage()
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchNotice, setSearchNotice] = useState<SearchNotice | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [settingsSnapshot, setSettingsSnapshot] = useState<Settings | null>(
    null
  )
  const [aiConnection, setAiConnection] = useState<AiConnection>({
    connected: false,
    providerLabel: ""
  })
  const [aiNotice, setAiNotice] = useState<AiNotice | null>(null)
  const [selectionSuggestion, setSelectionSuggestion] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsListRef = useRef<HTMLDivElement>(null)
  const resultItemRefs = useRef<Array<HTMLDivElement | null>>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRunId = useRef(0)
  const enabledRef = useRef(true)
  const isComposingRef = useRef(false)

  const openPanel = () => {
    setSelectionSuggestion(readSelectionSuggestion())
    setAiNotice(null)
    setVisible(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // 读取并持续跟踪「命令面板」开关
  useEffect(() => {
    const refreshAiConnection = async (settings: Settings) => {
      const keyPresence = await getStoredApiKeyPresence()
      setAiConnection(getAiConnectionFromSettings(settings, keyPresence))
    }

    getSettings().then((s) => {
      enabledRef.current = s.enableCommandPalette
      setSettingsSnapshot(s)
      refreshAiConnection(s)
    })
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === "sync" && changes.contextai_settings) {
        const next = changes.contextai_settings.newValue as
          | Partial<Settings>
          | undefined
        if (next) {
          setSettingsSnapshot((prev) => {
            const merged = prev ? { ...prev, ...next } : (next as Settings)
            refreshAiConnection(merged)
            return merged
          })
        }
        if (next && typeof next.enableCommandPalette === "boolean") {
          enabledRef.current = next.enableCommandPalette
          if (!next.enableCommandPalette) setVisible(false)
        }
      }
      if (area === "local" && changes.contextai_api_keys) {
        getSettings().then((settings) => {
          setSettingsSnapshot(settings)
          refreshAiConnection(settings)
        })
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
        openPanel()
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
          if (!v) {
            setSelectionSuggestion(readSelectionSuggestion())
            setAiNotice(null)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
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

    setAiNotice(null)
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
      const intent = parseIntentLocally(q)
      const searchTarget = intent.target.trim() || q
      const intentResults = buildIntentResults(intent, q)
      const shouldSearchBrowserHistory =
        intent.action === "search" || intent.action === "history_search"
      const shouldSearchBookmarks =
        intent.action === "search" || intent.action === "bookmark_search"
      const shouldSearchAiHistory =
        intent.action === "search" || intent.action === "conversation_search"

      const [browserHistoryResults, bookmarkResults, aiHistoryResults] =
        await Promise.all([
          shouldSearchBrowserHistory
            ? searchBrowserHistory(searchTarget)
            : Promise.resolve({ items: [], failed: false }),
          shouldSearchBookmarks
            ? searchChromeBookmarks(searchTarget)
            : Promise.resolve({ items: [], failed: false }),
          shouldSearchAiHistory ? searchAvisoHistory(searchTarget) : Promise.resolve([])
        ])

      if (runId !== searchRunId.current) return

      const nextResults = [
        ...intentResults,
        ...browserHistoryResults.items,
        ...bookmarkResults.items,
        ...aiHistoryResults
      ].slice(0, 12)
      setResults(nextResults)

      if (browserHistoryResults.failed || bookmarkResults.failed) {
        setSearchNotice({ type: "error", text: t("command.searchError") })
      } else if (nextResults.length === 0) {
        setSearchNotice({ type: "empty", text: t("command.empty") })
      } else {
        setSearchNotice(null)
      }
    } catch {
      if (runId !== searchRunId.current) return
      setResults([])
      setSearchNotice({ type: "error", text: t("command.searchError") })
    } finally {
      if (runId === searchRunId.current) setLoading(false)
    }
  }

  function buildIntentResults(intent: ParsedIntent, rawQuery: string): ResultItem[] {
    const target = intent.target.trim()
    if (intent.action === "navigate") {
      const normalizedUrl = normalizeSafeBrowserOpenUrl(target)
      return normalizedUrl
        ? [
            {
              id: `open-url-${normalizedUrl}`,
              title: normalizedUrl,
              subtitle: t("command.confirmOpenUrl"),
              url: normalizedUrl,
              requiresConfirmation: true,
              type: "open-url"
            }
          ]
        : []
    }

    if (intent.action === "translate_page") {
      return [
        {
          id: "page-translate-current",
          title: t("command.translateCurrentPage"),
          subtitle: t("command.confirmPageAction"),
          actionId: "page_translate",
          requiresConfirmation: true,
          type: "page-action"
        }
      ]
    }

    if (intent.action === "summarize_page") {
      return [
        {
          id: "page-summarize-current",
          title: t("command.summarizeCurrentPage"),
          subtitle: t("command.confirmPageAction"),
          actionId: "page_summary",
          requiresConfirmation: true,
          type: "page-action"
        }
      ]
    }

    if (intent.action === "ask_ai" && target) {
      return [
        {
          id: `ask-ai-${target}`,
          title: t("command.askAi"),
          subtitle: target,
          userMessage: target,
          operation: "custom",
          type: "ask-ai"
        }
      ]
    }

    if (
      ["explain", "translate", "polish", "summarize"].includes(intent.action) &&
      target
    ) {
      return [
        {
          id: `ai-intent-${intent.action}-${target}`,
          title: getAiIntentTitle(intent.action),
          subtitle: target,
          userMessage: target,
          operation: intent.action,
          type: "ask-ai"
        }
      ]
    }

    const normalizedUrl = normalizeSafeBrowserOpenUrl(rawQuery)
    if (normalizedUrl) {
      return [
        {
          id: `open-url-${normalizedUrl}`,
          title: normalizedUrl,
          subtitle: t("command.confirmOpenUrl"),
          url: normalizedUrl,
          requiresConfirmation: true,
          type: "open-url"
        }
      ]
    }

    return []
  }

  function getAiIntentTitle(action: ParsedIntent["action"]): string {
    if (action === "translate") return t("operation.translate")
    if (action === "summarize") return t("operation.summarize")
    if (action === "polish") return t("operation.polish")
    return t("operation.explain")
  }

  async function searchAvisoHistory(query: string): Promise<ResultItem[]> {
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
      restore: {
        input: e.input,
        output: e.output,
        messages: e.messages,
        createdAt: e.timestamp,
        pinned: e.pinned
      },
      type: "ai-history" as const
    }))
  }

  async function searchBrowserHistory(
    query: string
  ): Promise<BookmarkSearchResult> {
    const response = await sendRuntimeMessage({
      action: "SEARCH_BROWSER_HISTORY",
      payload: { query }
    })

    if (!response.success || !Array.isArray(response.data)) {
      return { items: [], failed: true }
    }

    return {
      items: (response.data as chrome.history.HistoryItem[])
        .filter((item) => Boolean(item.url && isSafeBrowserOpenUrl(item.url)))
        .map((item) => ({
          id: item.id,
          title: item.title || item.url || "浏览历史",
          subtitle: item.url,
          url: normalizeSafeBrowserOpenUrl(item.url ?? "") ?? undefined,
          requiresConfirmation: true,
          type: "browser-history" as const
        })),
      failed: false
    }
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
      items: (response.data as chrome.bookmarks.BookmarkTreeNode[])
        .filter((b) => Boolean(b.url && isSafeBrowserOpenUrl(b.url)))
        .map((b) => ({
          id: b.id,
          title: b.title || b.url || "书签",
          subtitle: b.url,
          url: normalizeSafeBrowserOpenUrl(b.url ?? "") ?? undefined,
          requiresConfirmation: true,
          type: "bookmark" as const
        })),
      failed: false
    }
  }

  const handleSelect = async (item: ResultItem) => {
    if (item.url) {
      if (!isSafeBrowserOpenUrl(item.url)) {
        setAiNotice({
          title: t("command.unsafeUrlBlocked"),
          detail: t("command.unsafeUrlBlockedDetail"),
          type: "error"
        })
        return
      }
      window.open(item.url, "_blank")
    } else if (item.actionId) {
      if (!aiConnection.connected) {
        setAiNotice({
          title: t("command.aiDisconnected"),
          detail: t("command.aiDisconnectedDetail"),
          type: "error"
        })
        return
      }

      const response = await sendRuntimeMessage({
        action: "RUN_COMMAND_QUICK_ACTION",
        payload: { actionId: item.actionId }
      })
      if (!response.success) {
        setAiNotice({
          title: t("command.pageActionFailed"),
          detail: response.error || t("command.searchError"),
          type: "error"
        })
        return
      }
    } else if (item.userMessage) {
      handleSendToAI(
        {
          action:
            item.operation === "translate" ||
            item.operation === "summarize" ||
            item.operation === "polish" ||
            item.operation === "explain"
              ? item.operation
              : "custom",
          target: item.userMessage,
          params: {}
        },
        item.userMessage
      )
      return
    } else if (item.type === "ai-history" && item.restore) {
      const requestId = item.id || `req-${Date.now()}`
      chrome.runtime.sendMessage({
        action: "SHOW_FLOATING_WINDOW",
        payload: {
          requestId,
          trigger: "command-palette",
          operation: item.operation || "explain",
          restore: item.restore
        }
      })
    }
    setVisible(false)
    setQuery("")
  }

  const handleSendToAI = (parsedIntent?: ParsedIntent, overrideInput?: string) => {
    const rawInput = overrideInput ?? query
    if (!rawInput.trim()) return
    if (!aiConnection.connected) {
      setAiNotice({
        title: t("command.aiDisconnected"),
        detail: t("command.aiDisconnectedDetail"),
        type: "error"
      })
      return
    }

    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    setVisible(false)
    const intent = parsedIntent ?? parseIntentLocally(rawInput)
    const operation = getProviderOperation(intent)
    if (!operation) {
      setVisible(true)
      setAiNotice({
        title: t("command.selectLocalCandidate"),
        detail: t("command.selectLocalCandidateDetail"),
        type: "info"
      })
      return
    }
    const userMessage =
      operation === "translate" ? intent.target.trim() : rawInput
    logTiming("trigger", requestId, timing, {
      trigger: "command-palette",
      operation,
      userMessageChars: rawInput.length
    })

    chrome.runtime.sendMessage({
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "command-palette",
        operation,
        userMessage,
        timing,
        ...(operation === "translate"
          ? { pageUrl: window.location.href }
          : {})
      }
    })
    setQuery("")
  }

  const getActiveRoute = (): ModelRoute | null =>
    settingsSnapshot ? resolveModelRoute(undefined, settingsSnapshot) : null

  function getProviderOperation(intent: ParsedIntent): string | null {
    if (
      intent.action === "explain" ||
      intent.action === "translate" ||
      intent.action === "polish" ||
      intent.action === "summarize" ||
      intent.action === "search" ||
      intent.action === "custom"
    ) {
      return intent.action
    }
    if (intent.action === "ask_ai") return "custom"
    return null
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
      const directTranslateIntent = parseIntentLocally(query)
      if (isDirectTranslateIntent(directTranslateIntent)) {
        handleSendToAI(directTranslateIntent)
      } else if (results.length > 0) {
        handleSelect(results[selectedIndex])
      } else {
        handleSendToAI()
      }
    } else if (e.key === "Tab" && !query.trim() && selectionSuggestion) {
      e.preventDefault()
      setQuery(selectionSuggestion)
      setSelectionSuggestion("")
    }
  }

  const isDirectTranslateIntent = (intent: ParsedIntent): boolean =>
    intent.action === "translate" && Boolean(intent.target.trim())

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
  const activeRoute = getActiveRoute()
  const statusLabel =
    aiConnection.connected && activeRoute
      ? `${t("command.aiConnected")} · ${aiConnection.providerLabel}`
      : t("command.aiDisconnected")
  const canFillSelection = !query.trim() && selectionSuggestion

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: ui.overlay,
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
          background: ui.surface,
          border: `1px solid ${ui.line}`,
          borderRadius: aviso.radiusLg,
          boxShadow: ui.popShadow,
          overflow: "hidden",
          color: ui.text,
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
                ? `1px solid ${ui.line}`
                : "none"
          }}>
          <AvisoMark size={18} style={{ color: ui.accent }} />
          <input
            className="aviso-command-input"
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
            placeholder={t("command.placeholder")}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              color: ui.text,
              fontFamily: aviso.font,
              fontSize: "16px",
              outline: "none",
              caretColor: ui.accent
            }}
          />
          {loading && (
            <span
              style={{
                color: ui.text3,
                fontSize: "12px",
                whiteSpace: "nowrap"
              }}>
              {t("command.searching")}
            </span>
          )}
          <span
            aria-label="AI 状态"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flex: "0 1 auto",
              maxWidth: "38%",
              minWidth: 0,
              color: ui.text3,
              fontSize: 12,
              whiteSpace: "nowrap",
              overflow: "hidden"
            }}>
            <AvisoIcon
              name="shield"
              size={14}
              style={{ flex: "0 0 auto" }}
            />
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
              {statusLabel}
            </span>
          </span>
        </div>

        {(canFillSelection || aiNotice) && (
          <div
            style={{
              borderTop: `1px solid ${ui.line}`,
              padding: "10px 14px",
              display: "grid",
              gap: 8
            }}>
            {canFillSelection && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: `1px solid ${ui.line}`,
                  background: "transparent",
                  borderRadius: aviso.radiusMd,
                  padding: "8px 10px",
                  color: ui.text2,
                  fontSize: 12
                }}>
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: ui.text3
                  }}>
                  {t("command.selectionPrefix")}
                  {selectionSuggestion}
                </span>
                <span style={{ flex: "0 0 auto", color: ui.accent }}>
                  {t("command.fillSelection")}
                </span>
              </div>
            )}

            {aiNotice && (
              <div
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "flex-start",
                  border: `1px solid ${
                    aiNotice.type === "error" ? ui.danger : ui.line
                  }`,
                  background:
                    aiNotice.type === "error"
                      ? ui.dangerBg
                      : ui.accentSoft,
                  borderRadius: aviso.radiusMd,
                  padding: "9px 10px",
                  color: ui.text2,
                  fontSize: 12
                }}>
                <AvisoIcon
                  name={aiNotice.type === "error" ? "warning" : "explain"}
                  size={15}
                  style={{
                    color:
                      aiNotice.type === "error" ? ui.danger : ui.accent,
                    marginTop: 1
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: ui.text, fontSize: 12.5 }}>
                    {aiNotice.title}
                  </div>
                  <div style={{ marginTop: 2 }}>{aiNotice.detail}</div>
                </div>
              </div>
            )}
          </div>
        )}

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
                      ? ui.accentSoft
                      : "transparent",
                  display: "flex",
                  gap: "13px",
                  alignItems: "center",
                  transition: `.15s ${aviso.ease}`
                }}
                onMouseEnter={() => setSelectedIndex(idx)}>
                <AvisoIcon
                  name={getResultIcon(item.type)}
                  size={18}
                  style={{
                    color:
                      idx === selectedIndex ? ui.accent : ui.text3
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      color: ui.text,
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
                        color: ui.text3,
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
                    borderRadius: aviso.radiusSm,
                    border: `1px solid ${ui.line}`,
                    color: ui.text3
                  }}>
                  {item.requiresConfirmation
                    ? t("command.confirm")
                    : getResultTypeLabel(item.type, t)}
                </span>
              </div>
            ))}
          </div>
        )}

        {visibleNotice && (
          <div
            style={{
              borderTop:
                results.length > 0 ? `1px solid ${ui.line}` : "none",
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color:
                visibleNotice.type === "error" ? ui.danger : ui.text2,
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
            borderTop: `1px solid ${ui.line}`,
            padding: "10px 16px",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            fontSize: "12px",
            color: ui.text3
          }}>
          <span style={{ minWidth: 0 }}>
            <kbd style={{ ...styles.kbd, borderColor: ui.line, color: ui.text2 }}>
              ↑↓
            </kbd>{" "}
            {t("command.navigate")} ·{" "}
            <kbd style={{ ...styles.kbd, borderColor: ui.line, color: ui.text2 }}>
              Enter
            </kbd>{" "}
            {results.length > 0 ? t("command.select") : t("command.continue")}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: aiConnection.connected ? ui.accent : ui.text3,
              whiteSpace: "nowrap"
            }}>
            {aiConnection.connected
              ? t("command.sendWhenNoResults")
              : t("command.searchOnly")}
          </span>
        </div>
        <style>{`
          .aviso-command-input::placeholder {
            color: ${ui.text3};
          }
          .aviso-command-input:focus-visible {
            outline: none;
          }
        `}</style>
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
    border: "1px solid transparent",
    color: "inherit",
    background: "transparent"
  }
}

export default CommandPalette
