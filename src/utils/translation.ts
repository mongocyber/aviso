import type { AIRequestPayload } from "~types/messages"

export type TranslationTargetLanguage =
  | "auto"
  | "zh-CN"
  | "en"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"

export const TRANSLATION_TARGET_OPTIONS: {
  value: TranslationTargetLanguage
  label: string
}[] = [
  { value: "auto", label: "自动" },
  { value: "zh-CN", label: "中文" },
  { value: "en", label: "英文" },
  { value: "ja", label: "日文" },
  { value: "ko", label: "韩文" },
  { value: "es", label: "西班牙文" },
  { value: "fr", label: "法文" },
  { value: "de", label: "德文" }
]

export const TRANSLATION_SYSTEM_PROMPT = [
  "你是一个专业翻译助手。请只输出译文，不要添加解释、总结、标题、引号、拼音、候选译法或额外说明。",
  "如果原文主要是中文，翻译成自然、准确的英文；否则翻译成自然、准确的中文。",
  "保持原意、语气、格式、专有名词、数字、链接、代码片段和换行结构；无法确定的专有名词保留原文。"
].join("\n")

export const TRANSLATION_WAITING_TEXT = "正在翻译…"

export const TRANSLATION_EMPTY_INPUT_ERROR =
  "没有可翻译的文本：请先选中文字，或在命令面板输入“翻译 + 文本”。"

export const INLINE_TRANSLATION_MAX_CHARS = 500
export const INLINE_TRANSLATION_MAX_LINES = 8
export const TRANSLATION_SHORT_MAX_TOKENS = 128
export const TRANSLATION_MEDIUM_MAX_TOKENS = 256
export const TRANSLATION_LONG_MAX_TOKENS = 512

const TRANSLATION_TARGET_INSTRUCTIONS: Record<
  Exclude<TranslationTargetLanguage, "auto">,
  string
> = {
  "zh-CN": "请把原文翻译成自然、准确的简体中文。",
  en: "请把原文翻译成自然、准确的英文。",
  ja: "请把原文翻译成自然、准确的日文。",
  ko: "请把原文翻译成自然、准确的韩文。",
  es: "请把原文翻译成自然、准确的西班牙文。",
  fr: "请把原文翻译成自然、准确的法文。",
  de: "请把原文翻译成自然、准确的德文。"
}

export type InlineTranslationRoute =
  | { route: "inline"; reason: "short_text" }
  | {
      route: "result-panel"
      reason: "empty" | "too_long" | "too_many_lines"
    }

export function normalizeTranslationTargetLanguage(
  value: unknown
): TranslationTargetLanguage {
  return TRANSLATION_TARGET_OPTIONS.some((option) => option.value === value)
    ? (value as TranslationTargetLanguage)
    : "auto"
}

export function getTranslationTargetLabel(
  value: unknown
): string {
  const normalized = normalizeTranslationTargetLanguage(value)
  return (
    TRANSLATION_TARGET_OPTIONS.find((option) => option.value === normalized)
      ?.label ?? "自动"
  )
}

export function buildTranslationSystemPrompt(
  targetLanguage: unknown = "auto"
): string {
  const normalized = normalizeTranslationTargetLanguage(targetLanguage)
  if (normalized === "auto") return TRANSLATION_SYSTEM_PROMPT

  return [
    "你是一个专业翻译助手。请只输出译文，不要添加解释、总结、标题、引号、拼音、候选译法或额外说明。",
    TRANSLATION_TARGET_INSTRUCTIONS[normalized],
    "保持原意、语气、格式、专有名词、数字、链接、代码片段和换行结构；无法确定的专有名词保留原文。"
  ].join("\n")
}

export function getInlineTranslationRoute(
  sourceText: string
): InlineTranslationRoute {
  const text = sourceText.trim()
  if (!text) return { route: "result-panel", reason: "empty" }
  if (text.length > INLINE_TRANSLATION_MAX_CHARS) {
    return { route: "result-panel", reason: "too_long" }
  }
  if (text.split(/\r?\n/).length > INLINE_TRANSLATION_MAX_LINES) {
    return { route: "result-panel", reason: "too_many_lines" }
  }
  return { route: "inline", reason: "short_text" }
}

export function getTranslationSourceText(payload: AIRequestPayload): string {
  return (payload.selectionText || payload.userMessage || "").trim()
}

export function sanitizeTranslationPayload(
  payload: AIRequestPayload
): AIRequestPayload {
  if (payload.operation !== "translate") return payload
  const selectionText = payload.selectionText?.trim() || undefined
  const userMessage = selectionText
    ? undefined
    : payload.userMessage?.trim() || undefined

  return {
    ...payload,
    selectionText,
    userMessage,
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

export function getTranslationMaxOutputTokens(
  payload: Pick<AIRequestPayload, "operation" | "selectionText" | "userMessage">
): number {
  const sourceLength = getTranslationSourceText(payload as AIRequestPayload).length
  if (sourceLength <= 120) return TRANSLATION_SHORT_MAX_TOKENS
  if (sourceLength <= 500) return TRANSLATION_MEDIUM_MAX_TOKENS
  return TRANSLATION_LONG_MAX_TOKENS
}

export function formatTranslationUserBubble(inputText: string): string {
  const text = inputText.trim()
  return text ? `待翻译文本：\n${text}` : ""
}

export function formatTranslationError(error: string): string {
  return /^翻译失败[：:]/.test(error) ? error : `翻译失败：${error}`
}
