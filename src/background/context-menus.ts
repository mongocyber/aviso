import type { ContextMenuContext, MessageResponse } from "~types/messages"
import { AI_CONTEXT_LIMITS } from "~utils/ai-context"
import {
  getTemplateParentMenuContexts,
  normalizeTemplateMenuContexts
} from "~utils/context-menu-templates"
import {
  getModelMetadata,
  PROVIDER_PRIMARY_MODEL
} from "~utils/model-registry"
import {
  getModelForProviderConfig,
  getProviderConfigsWithLegacy,
  hasProviderConfigKey,
  resolveDefaultProviderConfigId
} from "~utils/provider-configs"
import {
  isSupportedImageSrc,
  UNSUPPORTED_IMAGE_SRC_MESSAGE
} from "~utils/image-src"
import { formatCurrentContext, truncatePageContent } from "~utils/page-content"
import { WAITING_MODEL_RESPONSE_TEXT } from "~utils/response-guard"
import { getApiKeys, getSettings, saveSettings } from "~utils/storage"
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

const MENU_ID_ROOT = "contextai-root"
const MENU_ID_EXPLAIN = "contextai-explain"
const MENU_ID_TRANSLATE = "contextai-translate"
const MENU_ID_POLISH = "contextai-polish"
const MENU_ID_POLISH_EDITABLE = "contextai-polish-editable"
const MENU_ID_SUMMARIZE = "contextai-summarize"
const MENU_ID_SUMMARIZE_VIDEO = "contextai-summarize-video"
const MENU_ID_SUMMARIZE_LINK = "contextai-summarize-link"
const MENU_ID_SUMMARIZE_PAGE = "contextai-summarize-page"
const MENU_ID_IMAGE_EXPLAIN = "contextai-image-explain"
const MENU_ID_SCREENSHOT_ASK = "contextai-screenshot-ask"
const MENU_ID_COPY_CONTEXT = "contextai-copy-context"
const MENU_ID_TEMPLATES = "contextai-templates"
const MENU_ID_MODEL_SEPARATOR = "contextai-model-sep"
const MENU_ID_MODEL_PREFIX = "contextai-model-"

const ALL_CONTEXTS: chrome.contextMenus.ContextType[] = [
  "selection",
  "link",
  "image",
  "video",
  "editable",
  "page"
]

let contextMenuRegistration = Promise.resolve()

export function registerContextMenus() {
  contextMenuRegistration = contextMenuRegistration
    .catch(() => undefined)
    .then(registerContextMenusNow)
  return contextMenuRegistration
}

async function registerContextMenusNow() {
  const settings = await getSettings()
  const apiKeys = await getApiKeys()
  const providerConfigs = getProviderConfigsWithLegacy(settings, apiKeys)
  const defaultProviderConfigId = resolveDefaultProviderConfigId(
    settings,
    providerConfigs
  )
  const templates = settings.templates ?? []
  await removeAllContextMenus()
  // 根菜单（所有上下文可见）
  chrome.contextMenus.create({
    id: MENU_ID_ROOT,
    title: "Aviso",
    contexts: ["selection", "link", "image", "video", "editable", "page"]
  })

  // 解释（选中文字）
  chrome.contextMenus.create({
    id: MENU_ID_EXPLAIN,
    parentId: MENU_ID_ROOT,
    title: "解释选中文本",
    contexts: ["selection"]
  })

  // 解释图片（仅图片上下文）
  chrome.contextMenus.create({
    id: MENU_ID_IMAGE_EXPLAIN,
    parentId: MENU_ID_ROOT,
    title: "解释这张图片",
    contexts: ["image"]
  })

  // 翻译（选中文字）
  chrome.contextMenus.create({
    id: MENU_ID_TRANSLATE,
    parentId: MENU_ID_ROOT,
    title: "翻译选中文本",
    contexts: ["selection"]
  })

  // 润色（选中文字）
  chrome.contextMenus.create({
    id: MENU_ID_POLISH,
    parentId: MENU_ID_ROOT,
    title: "润色选中文本",
    contexts: ["selection"]
  })

  // 润色（可编辑区域）
  chrome.contextMenus.create({
    id: MENU_ID_POLISH_EDITABLE,
    parentId: MENU_ID_ROOT,
    title: "润色文字",
    contexts: ["editable"]
  })

  // 总结（选中文字）
  chrome.contextMenus.create({
    id: MENU_ID_SUMMARIZE,
    parentId: MENU_ID_ROOT,
    title: "总结选中文本",
    contexts: ["selection"]
  })

  // 总结视频——保留非 selection 场景的静态标题
  chrome.contextMenus.create({
    id: MENU_ID_SUMMARIZE_VIDEO,
    parentId: MENU_ID_ROOT,
    title: "总结内容",
    contexts: ["video"]
  })

  // 总结链接——Chrome 仅在 link 上下文显示，标题随上下文区分
  chrome.contextMenus.create({
    id: MENU_ID_SUMMARIZE_LINK,
    parentId: MENU_ID_ROOT,
    title: "总结这个链接",
    contexts: ["link"]
  })

  // 总结页面——Chrome 仅在 page（空白处）上下文显示
  chrome.contextMenus.create({
    id: MENU_ID_SUMMARIZE_PAGE,
    parentId: MENU_ID_ROOT,
    title: "总结当前页面",
    contexts: ["page"]
  })

  // 用户手动框选当前可见区域后再发送给支持视觉的模型
  chrome.contextMenus.create({
    id: MENU_ID_SCREENSHOT_ASK,
    parentId: MENU_ID_ROOT,
    title: "截图提问",
    contexts: ["page"]
  })

  // 手动复制当前页面上下文到剪贴板，不调用 AI，不持久化。
  chrome.contextMenus.create({
    id: MENU_ID_COPY_CONTEXT,
    parentId: MENU_ID_ROOT,
    title: "复制当前上下文",
    contexts: ["page", "selection"]
  })

  // 自定义模板子菜单（仅在有模板时创建，子项随设置动态生成）
  if (templates.length > 0) {
    const templateParentContexts = getTemplateParentMenuContexts(templates)
    chrome.contextMenus.create({
      id: MENU_ID_TEMPLATES,
      parentId: MENU_ID_ROOT,
      title: "自定义模板 ▸",
      contexts: templateParentContexts
    })
    templates.forEach((tpl) => {
      const contexts = normalizeTemplateMenuContexts(tpl.contexts)
      chrome.contextMenus.create({
        id: `contextai-template-${tpl.id}`,
        parentId: MENU_ID_TEMPLATES,
        title: tpl.name,
        contexts
      })
    })
  }

  if (providerConfigs.length > 0) {
    // 模型切换分隔线
    chrome.contextMenus.create({
      id: MENU_ID_MODEL_SEPARATOR,
      parentId: MENU_ID_ROOT,
      type: "separator",
      contexts: ["selection", "link", "image", "video", "editable", "page"]
    })

    // 模型选项（勾选项跟随 Popup 中已保存的 AI 服务配置）
    registerModelMenuItems(providerConfigs, defaultProviderConfigId, apiKeys)
  }
}

function removeAllContextMenus() {
  return new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => resolve())
  })
}

function registerModelMenuItems(
  providerConfigs: ReturnType<typeof getProviderConfigsWithLegacy>,
  defaultProviderConfigId: string,
  apiKeys: Awaited<ReturnType<typeof getApiKeys>>
) {
  providerConfigs.forEach((config) => {
    const disabled =
      !hasProviderConfigKey(config, apiKeys) ||
      (config.provider === "doubao" && !config.model.trim())
    chrome.contextMenus.create({
      id: `${MENU_ID_MODEL_PREFIX}${config.id}`,
      parentId: MENU_ID_ROOT,
      type: "radio",
      title: getProviderConfigMenuTitle(config),
      checked: config.id === defaultProviderConfigId,
      enabled: !disabled,
      contexts: ["selection", "link", "image", "video", "editable", "page"]
    })
  })
}

function getProviderConfigMenuTitle(
  config: ReturnType<typeof getProviderConfigsWithLegacy>[number]
): string {
  const modelId =
    config.provider === "doubao"
      ? config.model.trim() || "未配置接入点"
      : config.model || PROVIDER_PRIMARY_MODEL[config.provider]
  const modelLabel = getModelMetadata(modelId)?.displayName ?? modelId
  return `${config.displayName} · ${modelLabel}`
}

/** 外部（如 Popup）切换默认模型后，同步右键菜单 radio 勾选 */
export async function syncModelMenuSelection(providerConfigId: string) {
  const settings = await getSettings()
  const apiKeys = await getApiKeys()
  const providerConfigs = getProviderConfigsWithLegacy(settings, apiKeys)

  providerConfigs.forEach(({ id }) => {
    chrome.contextMenus.update(
      `${MENU_ID_MODEL_PREFIX}${id}`,
      {
        checked: id === providerConfigId
      },
      () => {
        const error = chrome.runtime.lastError
        if (!error) return

        console.warn("[Aviso] Failed to sync context menu model selection", {
          providerConfigId,
          menuId: `${MENU_ID_MODEL_PREFIX}${id}`,
          error: error.message
        })
      }
    )
  })
}

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  if (!tab?.id) return

  const tabId = tab.id
  const menuItemId = info.menuItemId as string
  const ctx = resolveContext(info)
  const sourceFrameId =
    typeof info.frameId === "number" ? info.frameId : TOP_FRAME_ID
  const sourceFrameUrl = info.frameUrl
  const sourcePageUrl = sourceFrameUrl ?? info.pageUrl ?? tab.url ?? ""

  // 模型切换
  if (menuItemId.startsWith(MENU_ID_MODEL_PREFIX)) {
    const providerConfigId = menuItemId.replace(MENU_ID_MODEL_PREFIX, "")
    await handleModelSwitch(providerConfigId)
    return
  }

  if (menuItemId === MENU_ID_SCREENSHOT_ASK) {
    await startScreenshotSelectionFromFrame({
      tabId,
      sourceFrameId,
      sourceFrameUrl,
      sourcePageUrl,
      trigger: "screenshot"
    })
    return
  }

  if (menuItemId === MENU_ID_COPY_CONTEXT) {
    await copyCurrentContextFromFrame({
      tabId,
      sourceFrameId,
      sourceFrameUrl,
      sourcePageUrl,
      tabTitle: tab.title,
      selectionText: info.selectionText,
      label: "context-menu"
    })
    return
  }

  // 内置操作映射
  const actionMap: Record<string, string> = {
    [MENU_ID_EXPLAIN]: "explain",
    [MENU_ID_TRANSLATE]: "translate",
    [MENU_ID_POLISH]: "polish",
    [MENU_ID_POLISH_EDITABLE]: "polish",
    [MENU_ID_SUMMARIZE]: "summarize",
    [MENU_ID_SUMMARIZE_VIDEO]: "summarize",
    [MENU_ID_SUMMARIZE_LINK]: "summarize",
    [MENU_ID_SUMMARIZE_PAGE]: "summarize",
    [MENU_ID_IMAGE_EXPLAIN]: "image_explain"
  }

  const builtinAction = actionMap[menuItemId]
  if (builtinAction) {
    // 总结当前页面先显示浮窗，再抽取正文，避免用户误以为右键点击无响应。
    if (menuItemId === MENU_ID_SUMMARIZE_PAGE) {
      await summarizePageFromFrame({
        tabId,
        sourceFrameId,
        sourceFrameUrl,
        sourcePageUrl,
        selectionText: info.selectionText ?? "",
        linkUrl: info.linkUrl ?? "",
        srcUrl: info.srcUrl ?? "",
        trigger: "context-menu"
      })
      return
    }

    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    logTiming("trigger", requestId, timing, {
      trigger: "context-menu",
      operation: builtinAction,
      context: ctx,
      frameId: sourceFrameId,
      frameUrl: sourceFrameUrl
    })

    const basePayload = {
      requestId,
      trigger: "context-menu",
      operation: builtinAction,
      context: ctx,
      selectionText: info.selectionText ?? "",
      linkUrl: info.linkUrl ?? "",
      srcUrl: info.srcUrl ?? "",
      pageUrl: sourcePageUrl,
      timing
    }

    if (
      menuItemId === MENU_ID_IMAGE_EXPLAIN &&
      !isSupportedImageSrc(info.srcUrl)
    ) {
      const displayResult = await sendMessageToDisplayFrame(
        tabId,
        {
          action: "SHOW_FLOATING_WINDOW",
          payload: {
            ...basePayload,
            pageContent: "",
            deferAiRequest: true,
            statusText: ""
          }
        },
        {
          fallbackFrameId: sourceFrameId,
          fallbackFrameUrl: sourceFrameUrl,
          label: "context-menu-show-floating-window"
        }
      )
      if (displayResult.ok) {
        await sendMessageToFrame(
          tabId,
          {
            action: "AI_STREAM_ERROR",
            payload: {
              error: UNSUPPORTED_IMAGE_SRC_MESSAGE,
              requestId
            }
          },
          {
            frameId: displayResult.frameId,
            label: "context-menu-unsupported-image-error"
          }
        )
      }
      return
    }

    void getRuntimeConfigSnapshot().catch((err) => {
      console.warn("[Aviso] Runtime config warmup failed", {
        requestId,
        error: err instanceof Error ? err.message : String(err)
      })
    })

    await sendMessageToDisplayFrame(
      tabId,
      {
        action: "SHOW_FLOATING_WINDOW",
        payload: {
          ...basePayload,
          pageContent: ""
        }
      },
      {
        fallbackFrameId: sourceFrameId,
        fallbackFrameUrl: sourceFrameUrl,
        label: "context-menu-show-floating-window"
      }
    )
    return
  }

  // 自定义模板（以 contextai-template- 开头）
  if (menuItemId.startsWith("contextai-template-")) {
    const templateId = menuItemId.replace("contextai-template-", "")
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    logTiming("trigger", requestId, timing, {
      trigger: "context-menu",
      operation: "template",
      context: ctx,
      frameId: sourceFrameId,
      frameUrl: sourceFrameUrl
    })
    void getRuntimeConfigSnapshot().catch((err) => {
      console.warn("[Aviso] Runtime config warmup failed", {
        requestId,
        error: err instanceof Error ? err.message : String(err)
      })
    })

    await sendMessageToDisplayFrame(
      tabId,
      {
        action: "SHOW_FLOATING_WINDOW",
        payload: {
          requestId,
          trigger: "context-menu",
          operation: "template",
          templateId,
          context: ctx,
          selectionText: info.selectionText ?? "",
          pageUrl: sourcePageUrl,
          timing
        }
      },
      {
        fallbackFrameId: sourceFrameId,
        fallbackFrameUrl: sourceFrameUrl,
        label: "context-menu-show-floating-window"
      }
    )
  }
}

export async function startScreenshotSelectionFromFrame({
  tabId,
  sourceFrameId,
  sourceFrameUrl,
  sourcePageUrl,
  trigger
}: {
  tabId: number
  sourceFrameId: number
  sourceFrameUrl?: string
  sourcePageUrl: string
  trigger: string
}) {
  const requestId = `req-${Date.now()}`
  const timing = startTiming()
  logTiming("trigger", requestId, timing, {
    trigger,
    operation: "image_explain",
    context: "page",
    frameId: sourceFrameId,
    frameUrl: sourceFrameUrl
  })

  await sendMessageToDisplayFrame(
    tabId,
    {
      action: "START_SCREENSHOT_SELECTION",
      payload: {
        requestId,
        pageUrl: sourcePageUrl,
        timing
      }
    },
    {
      fallbackFrameId: sourceFrameId,
      fallbackFrameUrl: sourceFrameUrl,
      label: `${trigger}-start-screenshot-selection`
    }
  )
}

export async function copyCurrentContextFromFrame({
  tabId,
  sourceFrameId,
  sourceFrameUrl,
  sourcePageUrl,
  tabTitle,
  selectionText,
  label
}: {
  tabId: number
  sourceFrameId: number
  sourceFrameUrl?: string
  sourcePageUrl: string
  tabTitle?: string
  selectionText?: string
  label: string
}) {
  const extracted = await requestPageContentForCopy(
    tabId,
    sourceFrameId,
    sourceFrameUrl
  )
  const text = formatCurrentContext({
    title: extracted.title || tabTitle,
    url: sourcePageUrl,
    selectionText,
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
      label: `${label}-write-copy-context`
    }
  )

  if (writeResult.ok === false) {
    await sendMessageToDisplayFrame(
      tabId,
      {
        action: "SHOW_COPY_CONTEXT_TOAST",
        payload: {
          status: "failure",
          message: "复制失败",
          detail: "当前页面无法接收剪贴板写入请求。"
        }
      },
      {
        fallbackFrameId: sourceFrameId,
        fallbackFrameUrl: sourceFrameUrl,
        label: `${label}-copy-context-failure-toast`
      }
    )
  }
}

export async function summarizePageFromFrame({
  tabId,
  sourceFrameId,
  sourceFrameUrl,
  sourcePageUrl,
  selectionText = "",
  linkUrl = "",
  srcUrl = "",
  trigger
}: {
  tabId: number
  sourceFrameId: number
  sourceFrameUrl?: string
  sourcePageUrl: string
  selectionText?: string
  linkUrl?: string
  srcUrl?: string
  trigger: string
}) {
  const requestId = `req-${Date.now()}`
  const timing = startTiming()
  logTiming("trigger", requestId, timing, {
    trigger,
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
        trigger,
        operation: "summarize",
        context: "page",
        selectionText,
        linkUrl,
        srcUrl,
        pageUrl: sourcePageUrl,
        timing,
        deferAiRequest: true,
        statusText: "正在读取页面内容…"
      }
    },
    {
      fallbackFrameId: sourceFrameId,
      fallbackFrameUrl: sourceFrameUrl,
      label: `${trigger}-show-floating-window`
    }
  )

  const contentPromise = requestPageContent(
    tabId,
    requestId,
    timing,
    sourceFrameId,
    sourceFrameUrl,
    sourcePageUrl
  )
  const [displayResult, { pageContent, timing: contentTiming }] =
    await Promise.all([displayPromise, contentPromise])
  await runtimeWarmup

  if (displayResult.ok) {
    await sendMessageToFrame(
      tabId,
      {
        action: "START_FLOATING_AI_REQUEST",
        payload: {
          requestId,
          timing: contentTiming,
          statusText: WAITING_MODEL_RESPONSE_TEXT,
          aiPayload: {
            trigger,
            operation: "summarize",
            context: "page",
            selectionText,
            linkUrl,
            srcUrl,
            pageUrl: sourcePageUrl,
            pageContent,
            timing: contentTiming
          }
        }
      },
      {
        frameId: displayResult.frameId,
        label: `${trigger}-start-floating-ai-request`
      }
    )
  }
}

function resolveContext(
  info: chrome.contextMenus.OnClickData
): ContextMenuContext {
  if (info.mediaType === "image") return "image"
  if (info.selectionText) return "selection"
  if (info.linkUrl) return "link"
  if (info.srcUrl?.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) return "image"
  if (info.mediaType === "video") return "video"
  if (info.editable) return "editable"
  return "page"
}

async function handleModelSwitch(providerConfigId: string) {
  const settings = await getSettings()
  const apiKeys = await getApiKeys()
  const providerConfigs = getProviderConfigsWithLegacy(settings, apiKeys)
  const config = providerConfigs.find((item) => item.id === providerConfigId)
  if (!config) return

  await saveSettings({
    defaultProviderConfigId: providerConfigId,
    defaultModel: getModelForProviderConfig(config)
  })
  await syncModelMenuSelection(providerConfigId)
}

/** 向 content script 请求 Readability 抽取的当前页正文，失败时返回空串 */
async function requestPageContent(
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
      label: "context-menu-extract-page-content"
    }
  )

  if (result.ok === true) {
    const resp = result.response
    const data = resp?.data as { textContent?: string } | undefined
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

async function requestPageContentForCopy(
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
      label: "context-menu-copy-extract-page-content"
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
