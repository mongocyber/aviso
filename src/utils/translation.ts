import type { AIRequestPayload } from "~types/messages"

export const TRANSLATION_SYSTEM_PROMPT = [
  "你是一个专业翻译助手。请只输出译文，不要添加解释、总结、标题、引号、拼音、候选译法或额外说明。",
  "如果原文主要是中文，翻译成自然、准确的英文；否则翻译成自然、准确的中文。",
  "保持原意、语气、格式、专有名词、数字、链接、代码片段和换行结构；无法确定的专有名词保留原文。"
].join("\n")

export const TRANSLATION_WAITING_TEXT = "正在翻译…"

export const TRANSLATION_EMPTY_INPUT_ERROR =
  "没有可翻译的文本：请先选中文字，或在命令面板输入“翻译 + 文本”。"

export function getTranslationSourceText(payload: AIRequestPayload): string {
  return (payload.selectionText || payload.userMessage || "").trim()
}

export function sanitizeTranslationPayload(
  payload: AIRequestPayload
): AIRequestPayload {
  if (payload.operation !== "translate") return payload

  return {
    ...payload,
    selectionText: payload.selectionText?.trim() || undefined,
    userMessage: payload.userMessage?.trim() || undefined,
    pageContent: undefined,
    priorContext: undefined,
    linkUrl: undefined,
    srcUrl: undefined,
    pageUrl: undefined
  }
}

export function buildTranslationUserContent(payload: AIRequestPayload): string {
  const sourceText = getTranslationSourceText(
    sanitizeTranslationPayload(payload)
  )
  if (!sourceText) return ""

  return `待翻译文本：\n${sourceText}`
}

export function formatTranslationUserBubble(inputText: string): string {
  const text = inputText.trim()
  return text ? `待翻译文本：\n${text}` : ""
}

export function formatTranslationError(error: string): string {
  return /^翻译失败[：:]/.test(error) ? error : `翻译失败：${error}`
}
