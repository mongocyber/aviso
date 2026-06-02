import type { ContextMenuContext, MessageResponse } from "~types/messages"
import {
  isSupportedImageSrc,
  UNSUPPORTED_IMAGE_SRC_MESSAGE
} from "~utils/image-src"
import { truncatePageContent } from "~utils/page-content"
import { getSettings, saveSettings } from "~utils/storage"
import { logTiming, markTiming, startTiming } from "~utils/timing"

import {
  sendMessageToDisplayFrame,
  sendMessageToFrame,
  TOP_FRAME_ID
} from "./frame-router"

const MENU_ID_ROOT = "contextai-root"
const MENU_ID_EXPLAIN = "contextai-explain"
const MENU_ID_TRANSLATE = "contextai-translate"
const MENU_ID_TRANSLATE_PAGE = "contextai-translate-page"
const MENU_ID_POLISH = "contextai-polish"
const MENU_ID_POLISH_EDITABLE = "contextai-polish-editable"
const MENU_ID_SUMMARIZE = "contextai-summarize"
const MENU_ID_SUMMARIZE_VIDEO = "contextai-summarize-video"
const MENU_ID_SUMMARIZE_LINK = "contextai-summarize-link"
const MENU_ID_SUMMARIZE_PAGE = "contextai-summarize-page"
const MENU_ID_IMAGE_EXPLAIN = "contextai-image-explain"
const MENU_ID_SCREENSHOT_ASK = "contextai-screenshot-ask"
const MENU_ID_TEMPLATES = "contextai-templates"
const MENU_ID_MODEL_SEPARATOR = "contextai-model-sep"
const MENU_ID_MODEL_PREFIX = "contextai-model-"
const SELECTION_PREVIEW_MAX_CHARS = 20

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet" },
  { id: "doubao", label: "豆包（火山方舟）" }
]

const ALL_CONTEXTS: chrome.contextMenus.ContextType[] = [
  "selection",
  "link",
  "image",
  "video",
  "editable",
  "page"
]

type ContextMenusWithShown = typeof chrome.contextMenus & {
  onShown?: chrome.events.Event<
    (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void
  >
  refresh?: (callback?: () => void) => void
}

const SELECTION_TITLE_UPDATES = [
  [MENU_ID_EXPLAIN, "解释"],
  [MENU_ID_TRANSLATE, "翻译"],
  [MENU_ID_POLISH, "润色"],
  [MENU_ID_SUMMARIZE, "总结"]
] as const

export async function registerContextMenus() {
  const settings = await getSettings()
  const currentModel = settings.defaultModel ?? "gpt-4o-mini"
  const templates = settings.templates ?? []
  chrome.contextMenus.removeAll(() => {
    // 根菜单（所有上下文可见）
    chrome.contextMenus.create({
      id: MENU_ID_ROOT,
      title: "Aviso",
      contexts: ["selection", "link", "image", "video", "editable", "page"]
    })

    // 解释（选中文字时显示预览）
    chrome.contextMenus.create({
      id: MENU_ID_EXPLAIN,
      parentId: MENU_ID_ROOT,
      title: "解释“%s”",
      contexts: ["selection"]
    })

    // 解释图片（仅图片上下文）
    chrome.contextMenus.create({
      id: MENU_ID_IMAGE_EXPLAIN,
      parentId: MENU_ID_ROOT,
      title: "解释这张图片",
      contexts: ["image"]
    })

    // 翻译（选中文字时使用 Chrome 原生 %s 预览）
    chrome.contextMenus.create({
      id: MENU_ID_TRANSLATE,
      parentId: MENU_ID_ROOT,
      title: "翻译“%s”",
      contexts: ["selection"]
    })

    // 翻译页面——保留非 selection 场景的静态标题，避免显示字面量 %s
    chrome.contextMenus.create({
      id: MENU_ID_TRANSLATE_PAGE,
      parentId: MENU_ID_ROOT,
      title: "翻译",
      contexts: ["page"]
    })

    // 润色（选中文字时使用 Chrome 原生 %s 预览）
    chrome.contextMenus.create({
      id: MENU_ID_POLISH,
      parentId: MENU_ID_ROOT,
      title: "润色“%s”",
      contexts: ["selection"]
    })

    // 润色（可编辑区域）
    chrome.contextMenus.create({
      id: MENU_ID_POLISH_EDITABLE,
      parentId: MENU_ID_ROOT,
      title: "润色文字",
      contexts: ["editable"]
    })

    // 总结（选中文字时使用 Chrome 原生 %s 预览）
    chrome.contextMenus.create({
      id: MENU_ID_SUMMARIZE,
      parentId: MENU_ID_ROOT,
      title: "总结“%s”",
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

    // 自定义模板子菜单（仅在有模板时创建，子项随设置动态生成）
    if (templates.length > 0) {
      chrome.contextMenus.create({
        id: MENU_ID_TEMPLATES,
        parentId: MENU_ID_ROOT,
        title: "自定义模板 ▸",
        contexts: ALL_CONTEXTS
      })
      templates.forEach((tpl) => {
        const contexts = (
          tpl.contexts?.length ? tpl.contexts : ["selection"]
        ) as chrome.contextMenus.ContextType[]
        chrome.contextMenus.create({
          id: `contextai-template-${tpl.id}`,
          parentId: MENU_ID_TEMPLATES,
          title: tpl.name,
          contexts
        })
      })
    }

    // 模型切换分隔线
    chrome.contextMenus.create({
      id: MENU_ID_MODEL_SEPARATOR,
      parentId: MENU_ID_ROOT,
      type: "separator",
      contexts: ["selection", "link", "image", "video", "editable", "page"]
    })

    // 模型选项（勾选项跟随已保存的默认模型）
    registerModelMenuItems(currentModel)
  })
}

export function registerSelectionMenuPreviewUpdater() {
  const contextMenus = chrome.contextMenus as ContextMenusWithShown
  contextMenus.onShown?.addListener((info) => {
    if (!info.selectionText) return

    const preview = buildSelectionPreview(info.selectionText)
    let pendingUpdates = SELECTION_TITLE_UPDATES.length
    SELECTION_TITLE_UPDATES.forEach(([id, action]) => {
      chrome.contextMenus.update(
        id,
        {
          title: `${action}“${preview}”`
        },
        () => {
          pendingUpdates -= 1
          if (pendingUpdates === 0) contextMenus.refresh?.()
        }
      )
    })
  })
}

function buildSelectionPreview(selectionText: string) {
  const text = selectionText.trim()
  return text.length > SELECTION_PREVIEW_MAX_CHARS
    ? `${text.slice(0, SELECTION_PREVIEW_MAX_CHARS)}…`
    : text
}

function registerModelMenuItems(currentModel: string) {
  MODELS.forEach(({ id, label }) => {
    chrome.contextMenus.create({
      id: `${MENU_ID_MODEL_PREFIX}${id}`,
      parentId: MENU_ID_ROOT,
      type: "radio",
      title: label,
      checked: id === currentModel,
      contexts: ["selection", "link", "image", "video", "editable", "page"]
    })
  })
}

/** 外部（如 Popup）切换默认模型后，同步右键菜单 radio 勾选 */
export function syncModelMenuSelection(modelId: string) {
  MODELS.forEach(({ id }) => {
    chrome.contextMenus.update(`${MENU_ID_MODEL_PREFIX}${id}`, {
      checked: id === modelId
    })
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
    const modelId = menuItemId.replace(MENU_ID_MODEL_PREFIX, "")
    handleModelSwitch(modelId)
    return
  }

  if (menuItemId === MENU_ID_SCREENSHOT_ASK) {
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    logTiming("trigger", requestId, timing, {
      trigger: "screenshot",
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
        label: "context-menu-start-screenshot-selection"
      }
    )
    return
  }

  // 内置操作映射
  const actionMap: Record<string, string> = {
    [MENU_ID_EXPLAIN]: "explain",
    [MENU_ID_TRANSLATE]: "translate",
    [MENU_ID_TRANSLATE_PAGE]: "translate",
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

    // 总结当前页面先显示浮窗，再抽取正文，避免用户误以为右键点击无响应。
    if (menuItemId === MENU_ID_SUMMARIZE_PAGE) {
      const displayResult = await sendMessageToDisplayFrame(
        tabId,
        {
          action: "SHOW_FLOATING_WINDOW",
          payload: {
            ...basePayload,
            deferAiRequest: true,
            statusText: "正在读取页面内容…"
          }
        },
        {
          fallbackFrameId: sourceFrameId,
          fallbackFrameUrl: sourceFrameUrl,
          label: "context-menu-show-floating-window"
        }
      )

      const { pageContent, timing: contentTiming } = await requestPageContent(
        tabId,
        requestId,
        timing,
        sourceFrameId,
        sourceFrameUrl
      )

      if (displayResult.ok) {
        await sendMessageToFrame(
          tabId,
          {
            action: "START_FLOATING_AI_REQUEST",
            payload: {
              requestId,
              timing: contentTiming,
              statusText: "正在连接模型…",
              aiPayload: {
                trigger: "context-menu",
                operation: builtinAction,
                context: ctx,
                selectionText: info.selectionText ?? "",
                linkUrl: info.linkUrl ?? "",
                srcUrl: info.srcUrl ?? "",
                pageUrl: sourcePageUrl,
                pageContent,
                timing: contentTiming
              }
            }
          },
          {
            frameId: displayResult.frameId,
            label: "context-menu-start-floating-ai-request"
          }
        )
      }
      return
    }

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

async function handleModelSwitch(modelId: string) {
  await saveSettings({ defaultModel: modelId })
}

/** 向 content script 请求 Readability 抽取的当前页正文，失败时返回空串 */
async function requestPageContent(
  tabId: number,
  requestId: string,
  timing: ReturnType<typeof startTiming>,
  frameId: number,
  frameUrl?: string
): Promise<{ pageContent: string; timing: ReturnType<typeof startTiming> }> {
  let nextTiming = markTiming(timing, "pageContentRequestStartedAt")
  logTiming("page_content_request_start", requestId, nextTiming, {
    frameId,
    frameUrl
  })

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
    const pageContent = text ? truncatePageContent(text) : ""
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
