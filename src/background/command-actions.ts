import type { AIRequestPayload, MessageResponse } from "~types/messages"
import { AI_CONTEXT_LIMITS } from "~utils/ai-context"
import type { CommandQuickActionId } from "~utils/command-access"
import { buildSafeErrorLog } from "~utils/errors"
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

  if (actionId === "page_translate") {
    return translatePageQuickAction(tabId, sourceFrameId, sourceFrameUrl, pageUrl)
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
  return runPageAiQuickAction({
    tabId,
    sourceFrameId,
    sourceFrameUrl,
    pageUrl,
    operation: "summarize",
    showLabel: "command-palette-show-page-summary",
    startLabel: "command-palette-start-page-summary",
    contentLabel: "command-palette-extract-page-content",
    aiPayload: (pageContent, timing) => ({
      trigger: "command-palette",
      operation: "summarize",
      context: "page",
      pageUrl,
      pageContent,
      timing
    })
  })
}

async function translatePageQuickAction(
  tabId: number,
  sourceFrameId: number,
  sourceFrameUrl: string | undefined,
  pageUrl: string
): Promise<MessageResponse> {
  return runPageAiQuickAction({
    tabId,
    sourceFrameId,
    sourceFrameUrl,
    pageUrl,
    operation: "translate",
    showLabel: "command-palette-show-page-translate",
    startLabel: "command-palette-start-page-translate",
    contentLabel: "command-palette-extract-page-translate",
    aiPayload: (pageContent, timing) => ({
      trigger: "command-palette",
      operation: "translate",
      context: "page",
      pageUrl,
      selectionText: pageContent,
      timing
    })
  })
}

async function runPageAiQuickAction(input: {
  tabId: number
  sourceFrameId: number
  sourceFrameUrl: string | undefined
  pageUrl: string
  operation: "summarize" | "translate"
  showLabel: string
  startLabel: string
  contentLabel: string
  aiPayload: (
    pageContent: string,
    timing: ReturnType<typeof startTiming>
  ) => AIRequestPayload
}): Promise<MessageResponse> {
  const requestId = `req-${Date.now()}`
  const timing = startTiming()
  logTiming("trigger", requestId, timing, {
    trigger: "command-palette",
    operation: input.operation,
    context: "page",
    frameId: input.sourceFrameId,
    frameUrl: input.sourceFrameUrl
  })

  const runtimeWarmup = getRuntimeConfigSnapshot().catch((err) => {
    console.warn("[Aviso] Runtime config warmup failed", {
      requestId,
      error: buildSafeErrorLog(err)
    })
  })

  const displayPromise = sendMessageToDisplayFrame(
    input.tabId,
    {
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "command-palette",
        operation: input.operation,
        context: "page",
        pageUrl: input.pageUrl,
        timing,
        deferAiRequest: true,
        statusText: "正在读取页面内容…"
      }
    },
    {
      fallbackFrameId: input.sourceFrameId,
      fallbackFrameUrl: input.sourceFrameUrl,
      label: input.showLabel
    }
  )

  const contentPromise = requestPageContentForCommandSummary(
    input.tabId,
    requestId,
    timing,
    input.sourceFrameId,
    input.sourceFrameUrl,
    input.pageUrl,
    input.contentLabel
  )
  const [displayResult, { pageContent, timing: contentTiming }] =
    await Promise.all([displayPromise, contentPromise])
  await runtimeWarmup

  if (displayResult.ok === false) {
    return { success: false, error: displayResult.error }
  }

  const startResult = await sendMessageToFrame<MessageResponse>(
    input.tabId,
    {
      action: "START_FLOATING_AI_REQUEST",
      payload: {
        requestId,
        timing: contentTiming,
        statusText: WAITING_MODEL_RESPONSE_TEXT,
        aiPayload: input.aiPayload(pageContent, contentTiming)
      }
    },
    {
      frameId: displayResult.frameId,
      label: input.startLabel
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
  pageUrl?: string,
  label = "command-palette-extract-page-content"
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
      label
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
