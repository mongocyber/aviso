import type { AIRequestPayload, AIStreamChunk } from "~types/messages"
import type { ResolvedUiLanguage } from "./i18n-core"

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
export const TRANSLATION_NO_FIRST_CHUNK_NOTICE_MS = 10_000
export const TRANSLATION_NO_FIRST_CHUNK_TIMEOUT_MS = 30_000

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

const TRANSLATION_META_PREFIXES = [
  "the user wants me to translate",
  "the user wants to translate",
  "i need to translate",
  "i will translate",
  "i'll translate",
  "let me analyze",
  "let me analyse",
  "let me translate",
  "key terms",
  "translation notes",
  "here is the translation",
  "here's the translation",
  "translated text"
]

const TRANSLATION_META_LINE_PATTERN =
  /^(?:(?:analysis|reasoning|key terms|translation notes)\s*[：:]?$|let me (?:analy[sz]e|translate)\b|the user wants (?:me )?to translate\b|i (?:need|will|'ll) translate\b|here(?:'s| is) the translation\s*[：:]?$)/i
const TRANSLATION_PREFIX_PATTERN =
  /^(?:translation|translated text|译文|翻译)\s*[：:]\s*/i
const TRANSLATION_WRAPPING_QUOTES_PATTERN =
  /^["'“”‘’「」『』]\s*([\s\S]*?)\s*["'“”‘’「」『』]$/

export type InlineTranslationRoute =
  | { route: "inline"; reason: "short_text" | "too_long" | "too_many_lines" }
  | { route: "result-panel"; reason: "empty" }

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

export function getTranslationNoFirstChunkTimeoutError(
  language: ResolvedUiLanguage = "zh-CN"
): string {
  return language === "en"
    ? "No translation text was received. Please retry, or choose a faster BYOK model."
    : "没有收到译文，请重试，或换一个更快的 BYOK 模型。"
}

export function getTranslationNoFirstChunkWaitingText(
  language: ResolvedUiLanguage = "zh-CN"
): string {
  return language === "en"
    ? "The current model is still returning the translation…"
    : "当前模型还没返回译文，继续等待中…"
}

export function resolveTranslationTargetLanguageForText(
  targetLanguage: unknown,
  sourceText: string
): Exclude<TranslationTargetLanguage, "auto"> {
  const normalized = normalizeTranslationTargetLanguage(targetLanguage)
  if (normalized !== "auto") return normalized

  return isPrimarilyChineseText(sourceText) ? "en" : "zh-CN"
}

function isPrimarilyChineseText(text: string): boolean {
  let cjkCount = 0
  let latinCount = 0

  for (const char of text) {
    if (/[\u3400-\u9fff]/u.test(char)) {
      cjkCount += 1
    } else if (/[A-Za-z]/.test(char)) {
      latinCount += 1
    }
  }

  return cjkCount > 0 && cjkCount >= latinCount
}

export function getInlineTranslationRoute(
  sourceText: string
): InlineTranslationRoute {
  const text = sourceText.trim()
  if (!text) return { route: "result-panel", reason: "empty" }
  if (text.length > INLINE_TRANSLATION_MAX_CHARS) {
    return { route: "inline", reason: "too_long" }
  }
  if (text.split(/\r?\n/).length > INLINE_TRANSLATION_MAX_LINES) {
    return { route: "inline", reason: "too_many_lines" }
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

export function sanitizeTranslationOutputText(
  value: string,
  sourceText = ""
): string {
  const source = normalizeComparableTranslationText(sourceText)
  const lines = value.replace(/\r\n/g, "\n").split("\n")
  const output: string[] = []
  let suppressTerminologyBlock = false

  for (const rawLine of lines) {
    const sanitized = sanitizeTranslationOutputLine(rawLine, {
      source,
      suppressTerminologyBlock
    })
    suppressTerminologyBlock = sanitized.suppressTerminologyBlock
    if (sanitized.text == null) continue
    output.push(sanitized.text)
  }

  return stripAddedTranslationWrappingQuotes(output.join("\n").trim())
}

export function createTranslationStreamChunkFilter(
  sourceText = ""
): (chunk: AIStreamChunk) => AIStreamChunk[] {
  const source = normalizeComparableTranslationText(sourceText)
  let pending = ""
  let startedOutput = false
  let suppressTerminologyBlock = false

  const emitText = (text: string, chunk: AIStreamChunk): AIStreamChunk[] => {
    if (!text) return []
    startedOutput = true
    return [{ ...chunk, text, done: false, kind: "answer" }]
  }

  const sanitizeStreamingLine = (rawLine: string): string => {
    const sanitized = sanitizeTranslationOutputLine(rawLine, {
      source,
      suppressTerminologyBlock
    })
    suppressTerminologyBlock = sanitized.suppressTerminologyBlock
    if (sanitized.text == null) return ""
    return startedOutput
      ? sanitized.text
      : stripAddedTranslationWrappingQuotes(sanitized.text.trim())
  }

  const shouldHoldTranslationPartial = (value: string): boolean => {
    const lower = value.trimStart().toLowerCase()
    if (!lower) return false
    return TRANSLATION_META_PREFIXES.some(
      (prefix) => prefix.startsWith(lower) || lower.startsWith(prefix)
    )
  }

  const drainPending = (
    chunk: AIStreamChunk,
    flush: boolean
  ): AIStreamChunk[] => {
    const out: AIStreamChunk[] = []

    while (true) {
      const newlineIndex = pending.search(/\r?\n/)
      if (newlineIndex < 0) break
      const newline = pending[newlineIndex] === "\r" ? "\r\n" : "\n"
      const rawLine = pending.slice(0, newlineIndex)
      pending = pending.slice(newlineIndex + newline.length)
      const sanitized = sanitizeStreamingLine(rawLine)
      if (sanitized) out.push(...emitText(`${sanitized}${newline}`, chunk))
    }

    if (!flush && shouldHoldTranslationPartial(pending)) return out

    if (pending) {
      const sanitized = sanitizeStreamingLine(pending)
      pending = ""
      if (sanitized) out.push(...emitText(sanitized, chunk))
    }

    return out
  }

  return (chunk) => {
    if (chunk.kind === "reasoning") {
      return chunk.done ? [{ ...chunk, text: "", kind: "answer" }] : []
    }

    pending += chunk.text
    const out = drainPending(chunk, chunk.done)

    if (chunk.done) {
      out.push({ ...chunk, text: "", kind: "answer" })
    }

    return out
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

export function formatTranslationError(
  error: string,
  language: ResolvedUiLanguage = "zh-CN"
): string {
  const prefix = language === "en" ? "Translation failed: " : "翻译失败："
  if (
    (language === "en" && /^Translation failed:\s*/i.test(error)) ||
    (language === "zh-CN" && /^翻译失败[：:]/.test(error))
  ) {
    return error
  }

  return `${prefix}${error}`
}

function sanitizeTranslationOutputLine(
  rawLine: string,
  state: {
    source: string
    suppressTerminologyBlock: boolean
  }
): {
  text: string | null
  suppressTerminologyBlock: boolean
  wasMeta: boolean
} {
  const trimmed = rawLine.trim()
  let suppressTerminologyBlock = state.suppressTerminologyBlock

  if (!trimmed) {
    return {
      text: suppressTerminologyBlock ? null : "",
      suppressTerminologyBlock,
      wasMeta: false
    }
  }

  const withoutPrefix = trimmed.replace(TRANSLATION_PREFIX_PATTERN, "")
  if (withoutPrefix !== trimmed) {
    return {
      text: withoutPrefix,
      suppressTerminologyBlock: false,
      wasMeta: true
    }
  }

  if (TRANSLATION_META_LINE_PATTERN.test(trimmed)) {
    return {
      text: null,
      suppressTerminologyBlock: /key terms|translation notes/i.test(trimmed),
      wasMeta: true
    }
  }

  if (suppressTerminologyBlock && /^[-*•]\s+/.test(trimmed)) {
    return { text: null, suppressTerminologyBlock: true, wasMeta: true }
  }

  suppressTerminologyBlock = false
  if (isSourceEchoLine(trimmed, state.source)) {
    return { text: null, suppressTerminologyBlock, wasMeta: false }
  }

  return { text: rawLine, suppressTerminologyBlock, wasMeta: false }
}

function isSourceEchoLine(line: string, normalizedSource: string): boolean {
  if (!normalizedSource) return false
  const normalizedLine = normalizeComparableTranslationText(
    stripAddedTranslationWrappingQuotes(line)
  )
  if (!normalizedLine) return false
  return (
    normalizedLine === normalizedSource ||
    (normalizedLine.length >= 20 && normalizedSource.includes(normalizedLine)) ||
    (normalizedSource.length >= 20 && normalizedLine.includes(normalizedSource))
  )
}

function stripAddedTranslationWrappingQuotes(value: string): string {
  const match = value.match(TRANSLATION_WRAPPING_QUOTES_PATTERN)
  return match ? match[1].trim() : value
}

function normalizeComparableTranslationText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"‘’'「」『』]/g, "")
    .trim()
}
