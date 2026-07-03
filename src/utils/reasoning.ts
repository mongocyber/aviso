import type { AIRequestPayload } from "~types/messages"
import type { ProviderId } from "~utils/model-registry"

export type ReasoningStreamKind = "answer" | "reasoning"

export type ChatCompletionReasoningParams = {
  reasoning_effort?: "low"
  thinking?: {
    type: "enabled"
  }
}

const OPENAI_REASONING_MODEL_PATTERN =
  /^(?:o\d|o\d-|gpt-5(?:[.-]|$)|gpt-[\w.-]*reasoning)/i
const DOUBAO_THINKING_MODEL_PATTERN =
  /(?:thinking|reasoning|deepseek-r1|\br1\b|doubao[\w.-]*seed[\w.-]*1[\w.-]*6)/i

export function isSelectionTtftOperation(
  payload: Pick<
    AIRequestPayload,
    | "operation"
    | "context"
    | "selectionText"
    | "pageContent"
    | "imageSource"
    | "srcUrl"
  >
): boolean {
  if (payload.operation !== "translate" && payload.operation !== "explain") {
    return false
  }
  if (payload.context && payload.context !== "selection") return false
  if (payload.pageContent || payload.imageSource || payload.srcUrl) return false
  return (
    Boolean(payload.selectionText?.trim()) || payload.context === "selection"
  )
}

export function isOpenAIReasoningModel(model: string): boolean {
  return OPENAI_REASONING_MODEL_PATTERN.test(model.trim())
}

export function isDoubaoThinkingModel(modelOrEndpoint: string): boolean {
  return DOUBAO_THINKING_MODEL_PATTERN.test(modelOrEndpoint.trim())
}

export function supportsRequestReasoningParams(input: {
  providerId: ProviderId
  modelOrEndpoint: string
}): boolean {
  if (input.providerId === "openai") {
    return isOpenAIReasoningModel(input.modelOrEndpoint)
  }
  if (input.providerId === "doubao") {
    return isDoubaoThinkingModel(input.modelOrEndpoint)
  }
  return false
}

export function buildChatCompletionReasoningParams(input: {
  providerId: ProviderId
  modelOrEndpoint: string
  payload: Pick<
    AIRequestPayload,
    | "operation"
    | "context"
    | "selectionText"
    | "pageContent"
    | "imageSource"
    | "srcUrl"
  >
}): ChatCompletionReasoningParams {
  if (!isSelectionTtftOperation(input.payload)) return {}

  if (
    input.providerId === "openai" &&
    isOpenAIReasoningModel(input.modelOrEndpoint)
  ) {
    return { reasoning_effort: "low" }
  }

  if (
    input.providerId === "doubao" &&
    isDoubaoThinkingModel(input.modelOrEndpoint)
  ) {
    return { thinking: { type: "enabled" } }
  }

  return {}
}

export function shouldUseMaxCompletionTokens(input: {
  providerId: ProviderId
  modelOrEndpoint: string
}): boolean {
  return (
    input.providerId === "openai" &&
    isOpenAIReasoningModel(input.modelOrEndpoint)
  )
}

export function extractReasoningDeltaText(chunkOrDelta: unknown): string {
  const delta = getChunkDelta(chunkOrDelta)
  if (!delta) return ""

  return (
    textFromUnknown(delta.reasoning_content) ||
    textFromUnknown(delta.reasoning_text) ||
    textFromUnknown(delta.reasoning) ||
    textFromReasoningDetails(delta.reasoning_details)
  )
}

function getChunkDelta(input: unknown): Record<string, unknown> | undefined {
  if (!isRecord(input)) return undefined
  const choices = input.choices
  if (Array.isArray(choices)) {
    const first = choices[0]
    if (isRecord(first) && isRecord(first.delta)) return first.delta
  }
  if (isRecord(input.delta)) return input.delta
  return input
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(textFromUnknown).join("")
  if (isRecord(value)) {
    if (typeof value.text === "string") return value.text
    if (typeof value.content === "string") return value.content
  }
  return ""
}

function textFromReasoningDetails(value: unknown): string {
  if (!Array.isArray(value)) return ""
  return value
    .map((detail) => {
      if (!isRecord(detail)) return ""
      return textFromUnknown(detail.text) || textFromUnknown(detail.summary)
    })
    .join("")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
