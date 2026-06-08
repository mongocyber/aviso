import type { MessageResponse } from "~types/messages"
import { AI_CONTEXT_LIMITS } from "~utils/ai-context"
import type { CommandQuickActionId } from "~utils/command-access"
import { formatCurrentContext, truncatePageContent } from "~utils/page-content"
import { WAITING_MODEL_RESPONSE_TEXT } from "~utils/response-guard"
import { logTiming, markTiming, startTiming } from "~utils/timing"

import { getRuntimeConfigSnapshot } from "./ai-runtime-cache"
import {
  sendMessageToDisplayFrame,
  sendMessageToFrame,
  TOP_FRAME_ID
} from "./frame-router"
import {
  getCachedPageContent,
  setCachedPageContent
} from "./page-content-cache"

export async function handleCommandQuickAction(
  actionId: CommandQuickActionId,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const tabId = sender.tab?.id
  if (!tabId) {
    return {
      success: false,
      error: "Cannot run command action without sender tab"
    }
  }

  const sourceFrameId =
    typeof sender.frameId === "number" ? sender.frameId : TOP_FRAME_ID
  const sourceFrameUrl = sender.url
  const pageUrl = sourceFrameUrl ?? sender.tab?.url ?? ""

  if (actionId === "copy_context") {
    return copyCurrentContextQuickAction(
      tabId,
      sourceFrameId,
      sourceFrameUrl,
      pageUrl,
      sender.tab?.title
    )
  }

  if (actionId === "page_summary") {
    return summarizePageQuickAction(tabId, sourceFrameId, sourceFrameUrl, pageUrl)
  }

  return {
    success: false,
    error: `Unsupported command action: ${actionId}`
  }
}

async function copyCurrentContextQuickAction(
  tabId: number,
  sourceFrameId: number,
  sourceFrameUrl: string | undefined,
  pageUrl: string,
  tabTitle?: string
): Promise<MessageResponse> {
  const extracted = await requestPageContentForCommandCopy(
    tabId,
    sourceFrameId,
    sourceFrameUrl
  )
  const text = formatCurrentContext({
    title: extracted.title || tabTitle,
    url: pageUrl,
    pageContent: extracted.textContent
  })
  const writeResult = await sendMessageToFrame<MessageResponse>(
    tabId,
    {
      action: "WRITE_CURRENT_CONTEXT_TO_CLIPBOARD",
      payload: { text }
    },
    {
      frameId: sourceFrameId,
      frameUrl: sourceFrameUrl,
      label: "command-palette-write-copy-context"
    }
  )

  if (writeResult.ok === false) {
    return { success: false, error: writeResult.error }
  }

  return { success: true }
}

async function summarizePageQuickAction(
  tabId: number,
  sourceFrameId: number,
  sourceFrameUrl: string | undefined,
  pageUrl: string
): Promise<MessageResponse> {
  const requestId = `req-${Date.now()}`
  const timing = startTiming()
  logTiming("trigger", requestId, timing, {
    trigger: "command-palette",
    operation: "summarize",
    context: "page",
    frameId: sourceFrameId,
    frameUrl: sourceFrameUrl
  })

  const runtimeWarmup = getRuntimeConfigSnapshot().catch((err) => {
    console.warn("[Aviso] Runtime config warmup failed", {
      requestId,
      error: err instanceof Error ? err.message : String(err)
    })
  })

  const displayPromise = sendMessageToDisplayFrame(
    tabId,
    {
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "command-palette",
        operation: "summarize",
        context: "page",
        pageUrl,
        timing,
        deferAiRequest: true,
        statusText: "正在读取页面内容…"
      }
    },
    {
      fallbackFrameId: sourceFrameId,
      fallbackFrameUrl: sourceFrameUrl,
      label: "command-palette-show-page-summary"
    }
  )

  const contentPromise = requestPageContentForCommandSummary(
    tabId,
    requestId,
    timing,
    sourceFrameId,
    sourceFrameUrl,
    pageUrl
  )
  const [displayResult, { pageContent, timing: contentTiming }] =
    await Promise.all([displayPromise, contentPromise])
  await runtimeWarmup

  if (displayResult.ok === false) {
    return { success: false, error: displayResult.error }
  }

  const startResult = await sendMessageToFrame<MessageResponse>(
    tabId,
    {
      action: "START_FLOATING_AI_REQUEST",
      payload: {
        requestId,
        timing: contentTiming,
        statusText: WAITING_MODEL_RESPONSE_TEXT,
        aiPayload: {
          trigger: "command-palette",
          operation: "summarize",
          context: "page",
          pageUrl,
          pageContent,
          timing: contentTiming
        }
      }
    },
    {
      frameId: displayResult.frameId,
      label: "command-palette-start-page-summary"
    }
  )

  if (startResult.ok === false) {
    return { success: false, error: startResult.error }
  }

  return { success: true }
}

async function requestPageContentForCommandSummary(
  tabId: number,
  requestId: string,
  timing: ReturnType<typeof startTiming>,
  frameId: number,
  frameUrl?: string,
  pageUrl?: string
): Promise<{ pageContent: string; timing: ReturnType<typeof startTiming> }> {
  let nextTiming = markTiming(timing, "pageContentRequestStartedAt")
  logTiming("page_content_request_start", requestId, nextTiming, {
    frameId,
    frameUrl
  })

  const cachedPageContent = getCachedPageContent({
    tabId,
    frameId,
    frameUrl,
    pageUrl
  })
  if (cachedPageContent) {
    nextTiming = markTiming(nextTiming, "pageContentReadyAt")
    logTiming("page_content_cache_hit", requestId, nextTiming, {
      frameId,
      frameUrl,
      sentChars: cachedPageContent.length
    })
    return { pageContent: cachedPageContent, timing: nextTiming }
  }

  const result = await sendMessageToFrame<MessageResponse>(
    tabId,
    {
      action: "EXTRACT_PAGE_CONTENT"
    },
    {
      frameId,
      frameUrl,
      label: "command-palette-extract-page-content"
    }
  )

  if (result.ok === true) {
    const data = result.response?.data as
      | { textContent?: string }
      | undefined
    const text = data?.textContent
    const pageContent = text
      ? truncatePageContent(text, AI_CONTEXT_LIMITS.pageSummaryChars)
      : ""
    setCachedPageContent({ tabId, frameId, frameUrl, pageUrl }, pageContent)
    nextTiming = markTiming(nextTiming, "pageContentReadyAt")
    logTiming("page_content_ready", requestId, nextTiming, {
      frameId,
      frameUrl,
      rawChars: text?.length ?? 0,
      sentChars: pageContent.length
    })
    return { pageContent, timing: nextTiming }
  }

  nextTiming = markTiming(nextTiming, "pageContentReadyAt")
  logTiming("page_content_failed", requestId, nextTiming, {
    frameId,
    frameUrl,
    error: result.error
  })
  return { pageContent: "", timing: nextTiming }
}

async function requestPageContentForCommandCopy(
  tabId: number,
  frameId: number,
  frameUrl?: string
): Promise<{ title?: string; textContent?: string }> {
  const result = await sendMessageToFrame<MessageResponse>(
    tabId,
    {
      action: "EXTRACT_PAGE_CONTENT"
    },
    {
      frameId,
      frameUrl,
      label: "command-palette-copy-extract-page-content"
    }
  )

  if (result.ok !== true) return {}

  const data = result.response?.data as
    | { title?: string; textContent?: string }
    | undefined
  return {
    title: data?.title,
    textContent: data?.textContent
  }
}
