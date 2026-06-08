import type { Settings } from "~types/history"
import type { MessageRequest, MessageResponse } from "~types/messages"
import { parseIntentLocally } from "~utils/intent"
import {
  bucketScreenshotDataUrl,
  normalizeScreenshotCaptureError
} from "~utils/screenshot"
import {
  hasDefaultModelChanged,
  haveTemplatesChanged
} from "~utils/settings-change"
import { logTiming, markTiming } from "~utils/timing"

import { handleAIRequest, handleProviderConnectivityTest } from "./ai-client"
import { clearAIRuntimeCaches } from "./ai-runtime-cache"
import { handleCommandQuickAction } from "./command-actions"
import {
  copyCurrentContextFromFrame,
  handleContextMenuClick,
  registerContextMenus,
  summarizePageFromFrame,
  syncModelMenuSelection
} from "./context-menus"
import { sendMessageToDisplayFrame, sendMessageToFrame } from "./frame-router"
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getHistory,
  pinHistoryEntry,
  searchHistory
} from "./history"

const MAX_BOOKMARK_RESULTS = 12
const MAX_BROWSER_HISTORY_RESULTS = 12
const activeAIRequests = new Map<string, AbortController>()
const SCREENSHOT_AUTH_ENTRY_MESSAGE = "截图需要从浏览器扩展入口启动"
const SCREENSHOT_AUTH_ENTRY_DETAIL =
  "请通过右键菜单里的“截图提问”、扩展按钮或浏览器快捷命令重新触发；页面内快捷按钮不会授予截图所需权限。"

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

// ── 初始化 ──────────────────────────────────────────────────────────────────

let contextMenusInitialized = false

function ensureContextMenusRegistered(reason: string) {
  if (contextMenusInitialized) return
  contextMenusInitialized = true
  void registerContextMenus().catch((err) => {
    contextMenusInitialized = false
    const error = err instanceof Error ? err.message : String(err)
    console.warn("[Aviso] Failed to register context menus", {
      reason,
      error
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  contextMenusInitialized = false
  ensureContextMenusRegistered("installed")
  console.log("[Aviso] Extension installed / updated")
})

chrome.runtime.onStartup.addListener(() => {
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

  if (area === "sync" && changes.contextai_settings) {
    const previous = changes.contextai_settings.oldValue as
      | Partial<Settings>
      | undefined
    const next = changes.contextai_settings.newValue as
      | Partial<Settings>
      | undefined

    if (haveTemplatesChanged(previous, next)) {
      void registerContextMenus()
      return
    }

    if (hasDefaultModelChanged(previous, next) && next?.defaultModel) {
      syncModelMenuSelection(next.defaultModel)
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
  // content script 发来的消息可从 sender.tab.id 获取发送方标签页
  const senderTabId = sender.tab?.id

  try {
    switch (request.action) {
      // ── toolbar / clipboard / command 触发浮窗：转发给同一 tab ────────────
      case "SHOW_FLOATING_WINDOW": {
        if (senderTabId) {
          const result = await sendMessageToDisplayFrame(
            senderTabId,
            {
              action: "SHOW_FLOATING_WINDOW",
              payload: request.payload
            },
            {
              fallbackFrameId: sender.frameId,
              fallbackFrameUrl: sender.url,
              label: "runtime-show-floating-window"
            }
          )

          if (result.ok === false) {
            sendResponse({ success: false, error: result.error })
            break
          }
        }
        sendResponse({ success: true })
        break
      }

      // ── 流式 AI 请求：用 sender.tab.id 路由 chunk 回当前页面 ────────────
      case "AI_REQUEST": {
        const tabId = senderTabId
        const responseFrameId = sender.frameId ?? 0
        activeAIRequests.get(request.requestId)?.abort()
        const abortController = new AbortController()
        activeAIRequests.set(request.requestId, abortController)

        try {
          const timing = markTiming(
            request.payload.timing,
            "backgroundReceivedAt"
          )
          logTiming(
            "background_ai_request_received",
            request.requestId,
            timing,
            {
              operation: request.payload.operation,
              pageContentChars: request.payload.pageContent?.length ?? 0,
              priorContextChars: request.payload.priorContext?.length ?? 0,
              selectionChars: request.payload.selectionText?.length ?? 0,
              userMessageChars: request.payload.userMessage?.length ?? 0
            }
          )

          await handleAIRequest(
            { ...request.payload, timing },
            (chunk) => {
              if (tabId) {
                void sendMessageToFrame(
                  tabId,
                  {
                    action: "AI_STREAM_CHUNK",
                    payload: { chunk, requestId: request.requestId }
                  },
                  {
                    frameId: responseFrameId,
                    label: "ai-stream-chunk"
                  }
                )
              }
            },
            {
              requestId: request.requestId,
              signal: abortController.signal,
              pageUrl: request.payload.pageUrl ?? sender.tab?.url ?? sender.url
            }
          )
          sendResponse({ success: true })
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          // 通知浮窗停止 loading 并显示错误
          if (tabId) {
            await sendMessageToFrame(
              tabId,
              {
                action: "AI_STREAM_ERROR",
                payload: { error, requestId: request.requestId }
              },
              {
                frameId: responseFrameId,
                label: "ai-stream-error"
              }
            )
          }
          sendResponse({ success: false, error })
        } finally {
          activeAIRequests.delete(request.requestId)
        }
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
        const summary = await handleProviderConnectivityTest(request.payload)
        sendResponse({ success: true, data: summary })
        break
      }

      case "CAPTURE_VISIBLE_TAB": {
        if (!sender.tab?.windowId) {
          sendResponse({
            success: false,
            error: "无法截图：没有可用的当前窗口。"
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
        console.info("[Aviso] Bookmark search:", meta)
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

      case "REQUEST_START_SCREENSHOT_SELECTION": {
        if (!senderTabId) {
          sendResponse({
            success: false,
            error: "Cannot start screenshot without sender tab"
          })
          break
        }

        const result = await sendMessageToDisplayFrame(
          senderTabId,
          {
            action: "SHOW_COPY_CONTEXT_TOAST",
            payload: {
              status: "failure",
              message: SCREENSHOT_AUTH_ENTRY_MESSAGE,
              detail: SCREENSHOT_AUTH_ENTRY_DETAIL
            }
          },
          {
            fallbackFrameId: sender.frameId,
            fallbackFrameUrl: sender.url,
            label: "page-screenshot-auth-toast"
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
          error: `Unknown action: ${(request as any).action}`
        })
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[Aviso] Unhandled error in message handler:", error)
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
    nativeError = err instanceof Error ? err.message : String(err)
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
