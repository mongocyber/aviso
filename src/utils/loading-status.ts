import type { ContextMenuContext } from "~types/messages"
import type { ResolvedUiLanguage } from "~utils/i18n-core"

import {
  SLOW_MODEL_RESPONSE_TEXT,
  WAITING_MODEL_RESPONSE_TEXT
} from "./response-guard"
import { TRANSLATION_WAITING_TEXT } from "./translation"

export const LOADING_STATUS_TICK_MS = 1200

type LoadingStatusInput = {
  operation?: string
  context?: ContextMenuContext
  statusText?: string
  tick?: number
  language?: ResolvedUiLanguage
}

export function getDynamicLoadingStatusText({
  operation,
  context,
  statusText = "",
  tick = 0,
  language = "zh-CN"
}: LoadingStatusInput): string {
  const frames = getLoadingStatusFrames({
    operation,
    context,
    statusText,
    language
  })
  return frames[Math.abs(tick) % frames.length]
}

export function getLoadingStatusFrames({
  operation,
  context,
  statusText = "",
  language = "zh-CN"
}: Omit<LoadingStatusInput, "tick">): string[] {
  const en = language === "en"

  if (/读取页面|读取网页|Reading page/i.test(statusText)) {
    if (en) {
      return [
        "Reading page content...",
        "Extracting the key points...",
        "Preparing to send to the model..."
      ]
    }
    return [
      "正在读取网页内容…",
      "正在提取页面重点…",
      "准备发送给模型…"
    ]
  }

  if (/截图|screenshot/i.test(statusText) || operation === "image_explain") {
    if (en) {
      return [
        "Sending the screenshot to the model...",
        "The model is reading the screenshot...",
        "Waiting for the first explanation..."
      ]
    }
    return [
      "正在发送截图给模型…",
      "模型正在读取截图内容…",
      "等待首段解释返回…"
    ]
  }

  if (
    statusText === SLOW_MODEL_RESPONSE_TEXT ||
    /still responding/i.test(statusText)
  ) {
    if (operation === "translate") {
      if (en) {
        return [
          "Sent to the model. Waiting for the first translation...",
          "The model is still reading the text...",
          "Still responding..."
        ]
      }
      return [
        "已发送给模型，等待首段译文…",
        "模型仍在读取待翻译文本…",
        "还在响应中…"
      ]
    }

    if (operation === "summarize" && context === "page") {
      if (en) {
        return [
          "Sent to the model. Waiting for the first summary...",
          "The model is still reading the page...",
          "Still responding..."
        ]
      }
      return [
        "已发送给模型，等待首段总结…",
        "模型仍在读取网页内容…",
        "还在响应中…"
      ]
    }

    if (en) {
      return [
        "Sent to the model. Waiting for the first answer...",
        "The model is still reading the context...",
        "Still responding..."
      ]
    }
    return [
      "已发送给模型，等待首段回答…",
      "模型仍在读取上下文…",
      "还在响应中…"
    ]
  }

  if (
    operation === "translate" ||
    statusText === TRANSLATION_WAITING_TEXT ||
    /Translat/i.test(statusText)
  ) {
    if (en) {
      return [
        "Sent to the model. Reading the text...",
        "The model is generating the translation...",
        "Waiting for the first translation..."
      ]
    }
    return [
      "已发送给模型，正在读取待翻译文本…",
      "模型正在生成译文…",
      "等待首段译文返回…"
    ]
  }

  if (operation === "summarize" && context === "page") {
    if (en) {
      return [
        "Sent to the model. Reading the page...",
        "The model is organizing the key points...",
        "Waiting for the first summary..."
      ]
    }
    return [
      "已发送给模型，正在读取网页内容…",
      "模型正在整理页面要点…",
      "等待首段总结返回…"
    ]
  }

  if (operation === "summarize") {
    if (en) {
      return [
        "Sent to the model. Reading the selection...",
        "The model is extracting the key points...",
        "Waiting for the first summary..."
      ]
    }
    return [
      "已发送给模型，正在读取选区内容…",
      "模型正在提取要点…",
      "等待首段总结返回…"
    ]
  }

  if (operation === "explain") {
    if (en) {
      return [
        "Sent to the model. Reading the selection...",
        "The model is finding the core meaning...",
        "Waiting for the first explanation..."
      ]
    }
    return [
      "已发送给模型，正在读取选区内容…",
      "模型正在提取关键意思…",
      "等待首段解释返回…"
    ]
  }

  if (operation === "polish") {
    if (en) {
      return [
        "Sent to the model. Reading the original text...",
        "The model is improving the wording...",
        "Waiting for the polished text..."
      ]
    }
    return [
      "已发送给模型，正在读取原文…",
      "模型正在调整表达…",
      "等待润色结果返回…"
    ]
  }

  if (operation === "custom") {
    if (en) {
      return [
        "Sent to the model. Reading your question...",
        "The model is drafting an answer...",
        "Waiting for the first answer..."
      ]
    }
    return [
      "已发送给模型，正在读取你的问题…",
      "模型正在组织回答…",
      "等待首段回答返回…"
    ]
  }

  if (statusText && statusText !== WAITING_MODEL_RESPONSE_TEXT) {
    if (en) {
      return [
        statusText,
        "The model is reading the context...",
        "Waiting for the first answer..."
      ]
    }
    return [
      statusText,
      "模型正在读取上下文…",
      "等待首段回答返回…"
    ]
  }

  if (en) {
    return [
      "Sent to the model. Reading the context...",
      "The model is drafting the first answer...",
      "Waiting for the first response..."
    ]
  }
  return [
    "已发送给模型，正在读取上下文…",
    "模型正在组织第一段回答…",
    "等待首段内容返回…"
  ]
}
