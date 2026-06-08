import type { AIRequestPayload } from "~types/messages"

export const AI_CONTEXT_LIMITS = {
  selectionChars: 2400,
  userMessageChars: 1200,
  priorContextChars: 1200,
  pageSummaryChars: 3000
} as const

export function applyAIContextBudget(
  payload: AIRequestPayload
): AIRequestPayload {
  if (payload.operation === "translate") return payload

  const operation = payload.operation ?? "custom"
  const hasSelection = Boolean(payload.selectionText?.trim())
  const isPageSummary =
    operation === "summarize" &&
    payload.context === "page" &&
    Boolean(payload.pageContent?.trim())
  const isImageExplain = operation === "image_explain"

  if (isImageExplain) {
    return {
      ...payload,
      userMessage: truncateText(
        payload.userMessage,
        AI_CONTEXT_LIMITS.userMessageChars
      ),
      priorContext: undefined,
      pageContent: undefined,
      linkUrl: undefined
    }
  }

  if (isPageSummary) {
    return {
      ...payload,
      selectionText: truncateText(
        payload.selectionText,
        AI_CONTEXT_LIMITS.selectionChars
      ),
      userMessage: truncateText(
        payload.userMessage,
        AI_CONTEXT_LIMITS.userMessageChars
      ),
      priorContext: undefined,
      linkUrl: undefined,
      srcUrl: undefined,
      pageContent: truncateText(
        payload.pageContent,
        AI_CONTEXT_LIMITS.pageSummaryChars
      )
    }
  }

  return {
    ...payload,
    selectionText: truncateText(
      payload.selectionText,
      AI_CONTEXT_LIMITS.selectionChars
    ),
    userMessage: truncateText(
      payload.userMessage,
      AI_CONTEXT_LIMITS.userMessageChars
    ),
    priorContext: truncateText(
      payload.priorContext,
      AI_CONTEXT_LIMITS.priorContextChars
    ),
    pageContent: undefined,
    pageUrl: hasSelection ? undefined : payload.pageUrl
  }
}

export function truncateText(
  value: string | undefined,
  maxChars: number
): string | undefined {
  const text = value?.trim()
  if (!text) return undefined
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n…（内容过长已截断）`
}
