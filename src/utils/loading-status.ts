import type { ContextMenuContext } from "~types/messages"

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
}

export function getDynamicLoadingStatusText({
  operation,
  context,
  statusText = "",
  tick = 0
}: LoadingStatusInput): string {
  const frames = getLoadingStatusFrames({ operation, context, statusText })
  return frames[Math.abs(tick) % frames.length]
}

export function getLoadingStatusFrames({
  operation,
  context,
  statusText = ""
}: Omit<LoadingStatusInput, "tick">): string[] {
  if (/读取页面|读取网页/.test(statusText)) {
    return [
      "正在读取网页内容…",
      "正在提取页面重点…",
      "准备发送给模型…"
    ]
  }

  if (/截图/.test(statusText) || operation === "image_explain") {
    return [
      "正在发送截图给模型…",
      "模型正在读取截图内容…",
      "等待首段解释返回…"
    ]
  }

  if (statusText === SLOW_MODEL_RESPONSE_TEXT) {
    if (operation === "translate") {
      return [
        "已发送给模型，等待首段译文…",
        "模型仍在读取待翻译文本…",
        "还在响应中，可随时停止等待…"
      ]
    }

    if (operation === "summarize" && context === "page") {
      return [
        "已发送给模型，等待首段总结…",
        "模型仍在读取网页内容…",
        "还在响应中，可随时停止等待…"
      ]
    }

    return [
      "已发送给模型，等待首段回答…",
      "模型仍在读取上下文…",
      "还在响应中，可随时停止等待…"
    ]
  }

  if (operation === "translate" || statusText === TRANSLATION_WAITING_TEXT) {
    return [
      "已发送给模型，正在读取待翻译文本…",
      "模型正在生成译文…",
      "等待首段译文返回…"
    ]
  }

  if (operation === "summarize" && context === "page") {
    return [
      "已发送给模型，正在读取网页内容…",
      "模型正在整理页面要点…",
      "等待首段总结返回…"
    ]
  }

  if (operation === "summarize") {
    return [
      "已发送给模型，正在读取选区内容…",
      "模型正在提取要点…",
      "等待首段总结返回…"
    ]
  }

  if (operation === "explain") {
    return [
      "已发送给模型，正在读取选区内容…",
      "模型正在提取关键意思…",
      "等待首段解释返回…"
    ]
  }

  if (operation === "polish") {
    return [
      "已发送给模型，正在读取原文…",
      "模型正在调整表达…",
      "等待润色结果返回…"
    ]
  }

  if (operation === "custom") {
    return [
      "已发送给模型，正在读取你的问题…",
      "模型正在组织回答…",
      "等待首段回答返回…"
    ]
  }

  if (statusText && statusText !== WAITING_MODEL_RESPONSE_TEXT) {
    return [
      statusText,
      "模型正在读取上下文…",
      "等待首段回答返回…"
    ]
  }

  return [
    "已发送给模型，正在读取上下文…",
    "模型正在组织第一段回答…",
    "等待首段内容返回…"
  ]
}
