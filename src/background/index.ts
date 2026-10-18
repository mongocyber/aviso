import type { Settings } from "~types/history"
import type {
  AIRequestPayload,
  AIStreamChunk,
  MessageRequest,
  MessageResponse
} from "~types/messages"
import { deriveAiUnavailableGuidance } from "~utils/ai-unavailable-guidance"
import { buildSafeErrorLog, normalizeError } from "~utils/errors"
import { createI18n, resolveSettingsUiLanguage } from "~utils/i18n-core"
import { parseIntentLocally } from "~utils/intent"
import {
  bucketScreenshotDataUrl,
  normalizeScreenshotCaptureError
} from "~utils/screenshot"
import {
  hasDefaultModelChanged,
  hasUiLanguageChanged,
  haveProviderConfigMenusChanged,
  haveTemplatesChanged
} from "~utils/settings-change"
import { runLegacyStorageMigration } from "~utils/legacy-migration"
import { getSettings } from "~utils/storage"
import { logTiming, markTiming, type PerfSummary } from "~utils/timing"

import { handleAIRequest, handleProviderConnectivityTest } from "./ai-client"
import {
  clearAIRuntimeCaches,
  getRuntimeConfigSnapshot
} from "./ai-runtime-cache"
import { handleCommandQuickAction } from "./command-actions"
import {
  copyCurrentContextFromFrame,
  handleContextMenuClick,
  registerContextMenus,
  summarizePageFromFrame,
  syncModelMenuSelection
} from "./context-menus"
import {
  sendMessageToDisplayFrame,
  sendMessageToFrame,
  TOP_FRAME_ID
} from "./frame-router"
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getHistory,
  pinHistoryEntry,
  searchHistory
} from "./history"
import {
  getSafeMessageActionLabel,
  validateBackgroundMessageBoundary
} from "./message-boundary"

const MAX_BOOKMARK_RESULTS = 12
const MAX_BROWSER_HISTORY_RESULTS = 12
const STREAM_CHUNK_BATCH_MS = 40
const STREAM_CHUNK_BATCH_MAX_CHARS = 640
const activeAIRequests = new Map<string, AbortController>()

type BookmarkSearchSource = "native" | "tree-fallback"

type BookmarkSearchMeta = {
  hasQuery: boolean
  queryLength: number
  nativeRawCount: number
  nativeCount: number
  fallbackCount: number
  returnedCount: number
  source: BookmarkSearchSource
  fallbackUsed: boolean
  nativeError?: string
}

type StreamChunkDispatcher = {
  push: (chunk: AIStreamChunk) => void
  flush: () => Promise<void>
}

type RuntimeConfigSnapshot = Awaited<ReturnType<typeof getRuntimeConfigSnapshot>>

function createStreamChunkDispatcher(input: {
  tabId?: number
  requestId: string
  frameId: number
}): StreamChunkDispatcher {
  let buffered: AIStreamChunk | undefined
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  let sendQueue = Promise.resolve()

  const enqueueChunk = (chunk: AIStreamChunk) => {
    if (!input.tabId) return
    sendQueue = sendQueue.then(() =>
      sendMessageToFrame(
        input.tabId!,
        {
          action: "AI_STREAM_CHUNK",
          payload: { chunk, requestId: input.requestId }
        },
        {
          frameId: input.frameId,
          label: "ai-stream-chunk"
        }
      ).then(() => undefined)
    )
  }

  const clearFlushTimer = () => {
    if (!flushTimer) return
    clearTimeout(flushTimer)
    flushTimer = undefined
  }

  const flushBuffered = () => {
    clearFlushTimer()
    if (!buffered) return
    const chunk = buffered
    buffered = undefined
    enqueueChunk(chunk)
  }

  return {
    push: (chunk) => {
      if (!input.tabId) return
      if (chunk.done || chunk.perfSummary) {
        flushBuffered()
        enqueueChunk(chunk)
        return
      }

      if (!chunk.text) return
      if (buffered && buffered.kind !== chunk.kind) flushBuffered()
      buffered = buffered
        ? { ...buffered, text: buffered.text + chunk.text }
        : { ...chunk }

      if (buffered.text.length >= STREAM_CHUNK_BATCH_MAX_CHARS) {
        flushBuffered()
        return
      }

      if (!flushTimer) {
        flushTimer = setTimeout(flushBuffered, STREAM_CHUNK_BATCH_MS)
      }
    },
    flush: async () => {
      flushBuffered()
      await sendQueue
    }
  }
}

async function runAIRequestToFrame(input: {
  tabId?: number
  responseFrameId: number
  requestId: string
  payload: AIRequestPayload
  pageUrl?: string
  runtimeConfigSnapshot?: RuntimeConfigSnapshot
}): Promise<MessageResponse> {
  const {
    tabId,
    responseFrameId,
    requestId,
    payload,
    pageUrl,
    runtimeConfigSnapshot
  } = input
  const streamChunks = createStreamChunkDispatcher({
    tabId,
    requestId,
    frameId: responseFrameId
  })
  activeAIRequests.get(requestId)?.abort()
  const abortController = new AbortController()
  activeAIRequests.set(requestId, abortController)
  let perfSummary: PerfSummary | undefined

  try {
    const timing = markTiming(payload.timing, "backgroundReceivedAt")
    logTiming("background_ai_request_received", requestId, timing, {
      operation: payload.operation,
      pageContentChars: payload.pageContent?.length ?? 0,
      priorContextChars: payload.priorContext?.length ?? 0,
      selectionChars: payload.selectionText?.length ?? 0,
      userMessageChars: payload.userMessage?.length ?? 0
    })

    const returnedPerfSummary = await handleAIRequest(
      { ...payload, timing },
      (chunk) => {
        if (chunk.perfSummary) perfSummary = chunk.perfSummary
        streamChunks.push(chunk)
      },
      {
        requestId,
        signal: abortController.signal,
        pageUrl,
        runtimeConfigSnapshot,
        onPerfSummary: (summary) => {
          perfSummary = summary
        }
      }
    )
    if (!perfSummary && returnedPerfSummary) {
      perfSummary = returnedPerfSummary
    }
    await streamChunks.flush()
    if (tabId && perfSummary) {
      await sendMessageToFrame(
        tabId,
        {
          action: "AI_PERF_SUMMARY",
          payload: { requestId, summary: perfSummary }
        },
        {
          frameId: responseFrameId,
          label: "ai-perf-summary"
        }
      )
      await sendMessageToFrame(
        tabId,
        {
          action: "AI_STREAM_CHUNK",
          payload: {
            requestId,
            chunk: {
              text: "",
              done: true,
              kind: "answer",
              perfSummary
            }
          }
        },
        {
          frameId: responseFrameId,
          label: "ai-stream-perf-summary"
        }
      )
    }
    return {
      success: true,
      data: perfSummary ? { perfSummary } : undefined
    }
  } catch (err) {
    const error = normalizeError(err)
    const guidance = deriveAiUnavailableGuidance(error)
    await streamChunks.flush()
    if (tabId) {
      await sendMessageToFrame(
        tabId,
        {
          action: "AI_STREAM_ERROR",
          payload: { error, requestId, guidance }
        },
        {
          frameId: responseFrameId,
          label: "ai-stream-error"
        }
      )
    }
    return {
      success: false,
      error,
      meta: guidance ? { aiGuidance: guidance } : undefined
    }
  } finally {
    if (activeAIRequests.get(requestId) === abortController) {
      activeAIRequests.delete(requestId)
    }
  }
}

// ── 初始化 ──────────────────────────────────────────────────────────────────

let contextMenusInitialized = false

function ensureContextMenusRegistered(reason: string) {
  if (contextMenusInitialized) return
  contextMenusInitialized = true
  void registerContextMenus().catch((err) => {
    contextMenusInitialized = false
    console.warn("[Aviso] Failed to register context menus", {
      reason,
      error: buildSafeErrorLog(err)
    })
  })
}

function runLegacyMigrationSafely(reason: string) {
  void runLegacyStorageMigration().catch((err) => {
    console.warn("[Aviso] Legacy storage migration failed", {
      reason,
      error: buildSafeErrorLog(err)
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  runLegacyMigrationSafely("installed")
  contextMenusInitialized = false
  ensureContextMenusRegistered("installed")
  console.log("[Aviso] Extension installed / updated")
})

chrome.runtime.onStartup.addListener(() => {
  runLegacyMigrationSafely("startup")
  contextMenusInitialized = false
  ensureContextMenusRegistered("startup")
})

chrome.contextMenus.onClicked.addListener(handleContextMenuClick)
setTimeout(() => ensureContextMenusRegistered("service-worker-start"), 0)

// 默认模型在别处（Popup / 右键 radio）变更时，同步右键菜单勾选
chrome.storage.onChanged.addListener((changes, area) => {
  if (
    (area === "sync" && changes.contextai_settings) ||
    (area === "local" && changes.contextai_api_keys)
  ) {
    clearAIRuntimeCaches()
  }

  if (area === "local" && changes.contextai_api_keys) {
    void registerContextMenus()
  }

  if (area === "sync" && changes.contextai_settings) {
    const previous = changes.contextai_settings.oldValue as
      | Partial<Settings>
      | undefined
    const next = changes.contextai_settings.newValue as
      | Partial<Settings>
      | undefined

    if (
      haveTemplatesChanged(previous, next) ||
      haveProviderConfigMenusChanged(previous, next) ||
      hasUiLanguageChanged(previous, next)
    ) {
      void registerContextMenus()
      return
    }

    if (hasDefaultModelChanged(previous, next)) {
      if (next?.defaultProviderConfigId) {
        void syncModelMenuSelection(next.defaultProviderConfigId)
      } else {
        void registerContextMenus()
      }
    }
  }
})

// ── 命令面板快捷键 ────────────────────────────────────────────────────────────
// _execute_action 是 Chrome 保留命令（打开 popup），不触发 onCommand。
// open-command-palette 才会触发，对应 Mac Command+Shift+Space / Win/Linux Ctrl+Shift+Space。
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-command-palette") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await sendMessageToDisplayFrame(
        tab.id,
        { action: "OPEN_COMMAND_PALETTE" },
        { label: "command-shortcut" }
      )
    }
  }
})

// ── 消息路由 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    handleMessage(request, sender, sendResponse)
    // 返回 true 保持消息通道开放，支持异步 sendResponse
    return true
  }
)

async function handleMessage(
  request: MessageRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): Promise<void> {
  const boundary = validateBackgroundMessageBoundary(request, sender)
  if (boundary.ok === false) {
    console.warn("[Aviso] Rejected background message", boundary.log)
    sendResponse({ success: false, error: boundary.error })
    return
  }

  // content script 发来的消息可从 sender.tab.id 获取发送方标签页
  const senderTabId = sender.tab?.id

  try {
    switch (request.action) {
      // ── toolbar / clipboard / command 触发浮窗：转发给同一 tab ────────────
      case "SHOW_FLOATING_WINDOW": {
        if (senderTabId) {
          const shouldRunAIInBackground =
            !request.payload.deferAiRequest && !request.payload.restore
          const requestId = request.payload.requestId ?? `req-${Date.now()}`
          const runtimeConfigSnapshot = shouldRunAIInBackground
            ? getRuntimeConfigSnapshot()
            : undefined
          const displayPayload = shouldRunAIInBackground
            ? {
                ...request.payload,
                requestId,
                deferAiRequest: true
              }
            : request.payload

          const result = await sendMessageToDisplayFrame(
            senderTabId,
            {
              action: "SHOW_FLOATING_WINDOW",
              payload: displayPayload
            },
            {
              fallbackFrameId: sender.frameId,
              fallbackFrameUrl: sender.url,
              label: "runtime-show-floating-window"
            }
          )

          if (result.ok === false) {
            if (shouldRunAIInBackground) {
              await Promise.allSettled([runtimeConfigSnapshot])
            }
            sendResponse({ success: false, error: result.error })
            break
          }

          if (shouldRunAIInBackground) {
            const {
              requestId: _requestId,
              deferAiRequest: _deferAiRequest,
              restore: _restore,
              statusText: _statusText,
              ...aiPayload
            } = displayPayload
            const aiResponse = await runAIRequestToFrame({
              tabId: senderTabId,
              responseFrameId: result.frameId ?? TOP_FRAME_ID,
              requestId,
              payload: aiPayload,
              runtimeConfigSnapshot: await runtimeConfigSnapshot,
              pageUrl: aiPayload.pageUrl ?? sender.tab?.url ?? sender.url
            })
            sendResponse(aiResponse)
            break
          }
        }
        sendResponse({ success: true })
        break
      }

      case "WARM_RUNTIME_CONFIG": {
        await getRuntimeConfigSnapshot()
        sendResponse({ success: true })
        break
      }

      // ── 流式 AI 请求：用 sender.tab.id 路由 chunk 回当前页面 ────────────
      case "AI_REQUEST": {
        const response = await runAIRequestToFrame({
          tabId: senderTabId,
          responseFrameId: sender.frameId ?? TOP_FRAME_ID,
          requestId: request.requestId,
          payload: request.payload,
          runtimeConfigSnapshot: await getRuntimeConfigSnapshot(),
          pageUrl: request.payload.pageUrl ?? sender.tab?.url ?? sender.url
        })
        sendResponse(response)
        break
      }

      case "CANCEL_AI_REQUEST": {
        const controller = activeAIRequests.get(request.payload.requestId)
        controller?.abort()
        sendResponse({
          success: true,
          data: { cancelled: Boolean(controller) }
        })
        break
      }

      // ── 意图解析：同步收集流式结果后整体返回 ────────────────────────────
      case "PARSE_INTENT": {
        sendResponse({
          success: true,
          data: parseIntentLocally(request.payload.input)
        })
        break
      }

      case "VALIDATE_PROVIDER_CONNECTIVITY": {
        clearAIRuntimeCaches()
        const summary = await handleProviderConnectivityTest(request.payload)
        sendResponse({ success: true, data: summary })
        break
      }

      case "CAPTURE_VISIBLE_TAB": {
        if (!sender.tab?.windowId) {
          const t = createI18n(resolveSettingsUiLanguage(await getSettings()))
          sendResponse({
            success: false,
            error: t("background.screenshotNoWindow")
          })
          break
        }

        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(
            sender.tab.windowId,
            { format: "png" }
          )
          const timing = markTiming(
            request.payload.timing,
            "screenshotCaptureReadyAt"
          )
          logTiming(
            "screenshot_capture_ready",
            request.payload.requestId,
            timing,
            {
              imageSizeBucket: bucketScreenshotDataUrl(dataUrl)
            }
          )
          sendResponse({ success: true, data: { dataUrl, timing } })
        } catch (err) {
          sendResponse({
            success: false,
            error: normalizeScreenshotCaptureError(err, sender.url)
          })
        }
        break
      }

      // ── 书签搜索：chrome.bookmarks 仅在 background 可用 ──────────────────
      case "SEARCH_BOOKMARKS": {
        const { results, meta } = await searchBookmarks(request.payload.query)
        sendResponse({ success: true, data: results, meta })
        break
      }

      case "SEARCH_BROWSER_HISTORY": {
        const results = await searchBrowserHistory(request.payload.query)
        sendResponse({ success: true, data: results })
        break
      }

      case "RUN_COMMAND_QUICK_ACTION": {
        const response = await handleCommandQuickAction(
          request.payload.actionId,
          sender
        )
        sendResponse(response)
        break
      }

      case "REQUEST_OPEN_COMMAND_PALETTE": {
        if (!senderTabId) {
          sendResponse({
            success: false,
            error: "Cannot open command palette without sender tab"
          })
          break
        }

        const result = await sendMessageToDisplayFrame(
          senderTabId,
          { action: "OPEN_COMMAND_PALETTE" },
          {
            fallbackFrameId: sender.frameId,
            fallbackFrameUrl: sender.url,
            label: "frame-request-open-command-palette"
          }
        )

        sendResponse(
          result.ok === true
            ? { success: true }
            : { success: false, error: result.error }
        )
        break
      }

      case "REQUEST_COPY_CURRENT_CONTEXT": {
        const activeTab =
          senderTabId === undefined
            ? (
                await chrome.tabs.query({
                  active: true,
                  currentWindow: true
                })
              )[0]
            : undefined
        const targetTabId = senderTabId ?? activeTab?.id

        if (!targetTabId) {
          sendResponse({
            success: false,
            error: "Cannot copy context without sender tab"
          })
          break
        }

        await copyCurrentContextFromFrame({
          tabId: targetTabId,
          sourceFrameId: sender.frameId ?? 0,
          sourceFrameUrl: sender.url ?? activeTab?.url,
          sourcePageUrl:
            request.payload.pageUrl || sender.url || activeTab?.url || "",
          tabTitle: request.payload.title ?? activeTab?.title,
          selectionText: request.payload.selectionText,
          label: senderTabId === undefined ? "popup-local-card" : "double-click-menu"
        })
        sendResponse({ success: true })
        break
      }

      case "REQUEST_SUMMARIZE_PAGE": {
        if (!senderTabId) {
          sendResponse({
            success: false,
            error: "Cannot summarize page without sender tab"
          })
          break
        }

        await summarizePageFromFrame({
          tabId: senderTabId,
          sourceFrameId: sender.frameId ?? 0,
          sourceFrameUrl: sender.url,
          sourcePageUrl: request.payload.pageUrl || sender.url || "",
          trigger: "double-click-menu"
        })
        sendResponse({ success: true })
        break
      }

      case "REQUEST_CLIPBOARD_TOAST": {
        if (!senderTabId) {
          sendResponse({
            success: false,
            error: "Cannot show clipboard toast without sender tab"
          })
          break
        }

        const result = await sendMessageToDisplayFrame(
          senderTabId,
          {
            action: "SHOW_CLIPBOARD_TOAST",
            payload: request.payload
          },
          {
            fallbackFrameId: sender.frameId,
            fallbackFrameUrl: sender.url,
            label: "frame-request-clipboard-toast"
          }
        )

        sendResponse(
          result.ok === true
            ? { success: true }
            : { success: false, error: result.error }
        )
        break
      }

      case "REQUEST_COPY_CONTEXT_TOAST": {
        if (!senderTabId) {
          sendResponse({
            success: false,
            error: "Cannot show copy context toast without sender tab"
          })
          break
        }

        const result = await sendMessageToDisplayFrame(
          senderTabId,
          {
            action: "SHOW_COPY_CONTEXT_TOAST",
            payload: request.payload
          },
          {
            fallbackFrameId: sender.frameId,
            fallbackFrameUrl: sender.url,
            label: "frame-request-copy-context-toast"
          }
        )

        sendResponse(
          result.ok === true
            ? { success: true }
            : { success: false, error: result.error }
        )
        break
      }

      // ── 历史管理 ──────────────────────────────────────────────────────────
      case "SAVE_HISTORY": {
        await addHistoryEntry(request.payload)
        sendResponse({ success: true })
        break
      }

      case "GET_HISTORY": {
        const entries = await getHistory()
        sendResponse({ success: true, data: entries })
        break
      }

      case "SEARCH_HISTORY": {
        const results = await searchHistory(request.payload.query)
        sendResponse({ success: true, data: results })
        break
      }

      case "PIN_HISTORY": {
        await pinHistoryEntry(request.payload.id)
        sendResponse({ success: true })
        break
      }

      case "DELETE_HISTORY": {
        await deleteHistoryEntry(request.payload.id)
        sendResponse({ success: true })
        break
      }

      case "CLEAR_HISTORY": {
        await clearHistory()
        sendResponse({ success: true })
        break
      }

      // ── 模板变更：重建右键菜单使新模板即时生效 ──────────────────────────
      case "UPDATE_TEMPLATES": {
        await registerContextMenus()
        sendResponse({ success: true })
        break
      }

      case "PING": {
        sendResponse({ success: true, data: "pong" })
        break
      }

      default: {
        sendResponse({
          success: false,
          error: "Unknown action"
        })
      }
    }
  } catch (err) {
    const error = normalizeError(err)
    console.error(
      `[Aviso] Unhandled error in message handler action=${getSafeMessageActionLabel(request)}`,
      buildSafeErrorLog(err)
    )
    sendResponse({ success: false, error })
  }
}

async function searchBookmarks(query: string): Promise<{
  results: chrome.bookmarks.BookmarkTreeNode[]
  meta: BookmarkSearchMeta
}> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return {
      results: [],
      meta: {
        hasQuery: false,
        queryLength: 0,
        nativeRawCount: 0,
        nativeCount: 0,
        fallbackCount: 0,
        returnedCount: 0,
        source: "native",
        fallbackUsed: false
      }
    }
  }

  let nativeResults: chrome.bookmarks.BookmarkTreeNode[] = []
  let nativeError: string | undefined

  try {
    nativeResults = await searchBookmarksNatively(trimmedQuery)
  } catch (err) {
    nativeError = buildSafeErrorLog(err).category
  }

  const nativeBookmarks = onlyUrlBookmarks(nativeResults)
  let fallbackBookmarks: chrome.bookmarks.BookmarkTreeNode[] = []
  let source: BookmarkSearchSource = "native"

  if (nativeBookmarks.length === 0) {
    const tree = await getBookmarkTree()
    fallbackBookmarks = searchBookmarksInTree(tree, trimmedQuery)
    source = "tree-fallback"
  }

  const sourceResults =
    source === "tree-fallback" ? fallbackBookmarks : nativeBookmarks
  const results = sourceResults.slice(0, MAX_BOOKMARK_RESULTS)
  const meta: BookmarkSearchMeta = {
    hasQuery: true,
    queryLength: trimmedQuery.length,
    nativeRawCount: nativeResults.length,
    nativeCount: nativeBookmarks.length,
    fallbackCount: fallbackBookmarks.length,
    returnedCount: results.length,
    source,
    fallbackUsed: source === "tree-fallback",
    ...(nativeError ? { nativeError } : {})
  }

  return { results, meta }
}

function searchBrowserHistory(
  query: string
): Promise<chrome.history.HistoryItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return Promise.resolve([])

  return new Promise((resolve, reject) => {
    if (!chrome.history?.search) {
      reject(new Error("chrome.history.search is unavailable"))
      return
    }

    chrome.history.search(
      {
        text: trimmedQuery,
        startTime: 0,
        maxResults: MAX_BROWSER_HISTORY_RESULTS
      },
      (results) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          reject(new Error(runtimeError.message))
          return
        }

        resolve((results ?? []).filter((item) => Boolean(item.url)))
      }
    )
  })
}

function searchBookmarksNatively(
  query: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve, reject) => {
    if (!chrome.bookmarks?.search) {
      reject(new Error("chrome.bookmarks.search is unavailable"))
      return
    }

    chrome.bookmarks.search(query, (results) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message))
        return
      }

      resolve(results ?? [])
    })
  })
}

function getBookmarkTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve, reject) => {
    if (!chrome.bookmarks?.getTree) {
      reject(new Error("chrome.bookmarks.getTree is unavailable"))
      return
    }

    chrome.bookmarks.getTree((tree) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message))
        return
      }

      resolve(tree ?? [])
    })
  })
}

function searchBookmarksInTree(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  query: string
): chrome.bookmarks.BookmarkTreeNode[] {
  const lowerQuery = query.toLowerCase()
  const matches: chrome.bookmarks.BookmarkTreeNode[] = []

  const visit = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    for (const node of nodes) {
      if (node.url && bookmarkMatches(node, lowerQuery)) {
        matches.push(node)
      }
      if (node.children) visit(node.children)
    }
  }

  visit(tree)
  return matches
}

function onlyUrlBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): chrome.bookmarks.BookmarkTreeNode[] {
  return nodes.filter((node) => Boolean(node.url))
}

function bookmarkMatches(
  node: chrome.bookmarks.BookmarkTreeNode,
  lowerQuery: string
): boolean {
  const title = node.title?.toLowerCase() ?? ""
  const url = node.url?.toLowerCase() ?? ""
  return title.includes(lowerQuery) || url.includes(lowerQuery)
}
