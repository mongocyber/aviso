import type { AIRequestPayload, AIStreamChunk } from "~types/messages"
import {
  createHostedAiClient,
  HostedAiClientError,
  type HostedAiMe,
  normalizeHostedAiError,
  type HostedAiChatContext,
  type HostedAiChatRequest,
  type HostedAiMessage,
  type HostedAiOperation
} from "~utils/hosted-ai-client"
import {
  clearHostedSession,
  HOSTED_AI_DEFAULT_MODEL,
  readHostedSession,
  requiresHostedSignInForRoute,
  type StoredHostedSession,
  updateHostedSessionMe
} from "~utils/hosted-session"
import {
  resolveTranslationTargetLanguageForText,
  type TranslationTargetLanguage
} from "~utils/translation"
import {
  categorizePerfError,
  logHostedFirstRequestPerfSummary,
  logPerfSummary,
  logTiming,
  markTiming,
  type HostedFirstRequestPerfSummary,
  type HostedFirstRequestReason,
  type PerfContextType,
  type PerfErrorCategory,
  type PerfSummary,
  type RequestTiming
} from "~utils/timing"

export const HOSTED_CHAT_DEFAULT_MODEL = HOSTED_AI_DEFAULT_MODEL

const HOSTED_CHAT_OPERATIONS = new Set<HostedAiOperation>([
  "translate",
  "explain",
  "polish",
  "summarize",
  "custom"
])

export function shouldUseHostedChatRoute(payload: AIRequestPayload): boolean {
  return payload.aiRoute === "hosted"
}

export function buildHostedChatRequest(
  payload: AIRequestPayload,
  options: { targetLanguage?: TranslationTargetLanguage } = {}
): HostedAiChatRequest {
  if (payload.operation === "image_explain" || payload.imageSource) {
    throw new HostedAiClientError(normalizeHostedAiError("bad_request"))
  }

  const operation = normalizeHostedOperation(payload.operation)
  const input = getHostedChatInput(payload)
  if (!input) throw new HostedAiClientError(normalizeHostedAiError("bad_request"))

  const messages = buildHostedChatMessages(payload)
  return {
    operation,
    input,
    context: getHostedChatContext(payload),
    target_lang:
      operation === "translate"
        ? resolveTranslationTargetLanguageForText(options.targetLanguage, input)
        : undefined,
    model: HOSTED_CHAT_DEFAULT_MODEL,
    messages: messages.length ? messages : undefined
  }
}

export async function runHostedChatRequest(
  payload: AIRequestPayload,
  onChunk: (chunk: AIStreamChunk) => void,
  options: {
    signal?: AbortSignal
    requestId?: string
    session?: StoredHostedSession | null
    targetLanguage?: TranslationTargetLanguage
    firstRequestReason?: HostedFirstRequestReason
    onPerfSummary?: (summary: PerfSummary) => void
    onHostedFirstRequestPerfSummary?: (
      summary: HostedFirstRequestPerfSummary
    ) => void
  } = {}
): Promise<PerfSummary | undefined> {
  const requestId = options.requestId ?? "unknown"
  const session = options.session ?? (await readHostedSession())
  if (requiresHostedSignInForRoute({ route: "hosted", session })) {
    throw new HostedAiClientError(normalizeHostedAiError("unauthorized"))
  }
  if (!session) throw new HostedAiClientError(normalizeHostedAiError("unauthorized"))

  const client = createHostedAiClient({
    baseUrl: session.baseUrl,
    sessionToken: session.session.session_token
  })
  let timing: RequestTiming | undefined = payload.timing
  let sawFirstChunk = false
  let sawDone = false
  let errorCategory: PerfErrorCategory = "none"
  let finalPerfSummary: PerfSummary | undefined

  try {
    timing = markTiming(timing, "providerRequestStartedAt")
    payload = { ...payload, timing }
    logTiming("hosted_chat_request_start", requestId, timing, {
      operation: payload.operation,
      inputChars: estimateHostedPayloadChars(payload)
    })

    for await (const event of client.chatStream(
      buildHostedChatRequest(payload, {
        targetLanguage: options.targetLanguage
      }),
      {
        sessionToken: session.session.session_token,
        signal: options.signal
      }
    )) {
      if (event.type === "delta") {
        if (!sawFirstChunk) {
          sawFirstChunk = true
          timing = markTiming(timing, "firstChunkAt")
          payload = { ...payload, timing }
          logTiming("hosted_chat_first_chunk", requestId, timing, {
            operation: payload.operation,
            model: HOSTED_CHAT_DEFAULT_MODEL
          })
        }
        onChunk({ text: event.delta, done: false, kind: "answer" })
      } else if (event.type === "done") {
        sawDone = true
        timing = markTiming(timing, "doneAt")
        payload = { ...payload, timing }
        logTiming("hosted_chat_done", requestId, timing, {
          operation: payload.operation,
          model: HOSTED_CHAT_DEFAULT_MODEL
        })
        if (!sawFirstChunk && errorCategory === "none") {
          errorCategory = "missing_first_chunk"
        }
        onChunk({ text: "", done: true, kind: "answer" })
      } else if (event.type === "error") {
        throw new HostedAiClientError(event.error)
      }
    }

    if (!sawDone) {
      errorCategory = "missing_done"
      timing = markTiming(timing, "doneAt")
      payload = { ...payload, timing }
      logTiming("hosted_chat_done", requestId, timing, {
        operation: payload.operation,
        model: HOSTED_CHAT_DEFAULT_MODEL,
        reason: "stream-ended"
      })
      onChunk({ text: "", done: true, kind: "answer" })
    }
  } catch (error) {
    errorCategory = categorizeHostedPerfError(error)
    timing = markTiming(timing, "doneAt")
    payload = { ...payload, timing }
    logTiming("hosted_chat_error", requestId, timing, {
      operation: payload.operation,
      errorCategory
    })
    if (
      error instanceof HostedAiClientError &&
      error.normalized.code === "unauthorized"
    ) {
      await clearHostedSession()
    }
    throw error
  } finally {
    finalPerfSummary = logPerfSummary({
      trigger: payload.trigger,
      provider: "hosted",
      modelOrEndpoint: HOSTED_CHAT_DEFAULT_MODEL,
      operation: payload.operation,
      inputChars: estimateHostedPayloadChars(payload),
      contextType: inferHostedPerfContextType(payload),
      timing,
      errorCategory
    })
    options.onPerfSummary?.(finalPerfSummary)

    if (options.firstRequestReason) {
      const hostedSummary = logHostedFirstRequestPerfSummary({
        reason: options.firstRequestReason,
        trigger: payload.trigger,
        operation: payload.operation,
        inputChars: estimateHostedPayloadChars(payload),
        contextType: inferHostedPerfContextType(payload),
        timing,
        errorCategory
      })
      options.onHostedFirstRequestPerfSummary?.(hostedSummary)
    }
  }

  await refreshHostedSessionMeAfterSuccessfulChat(session, client.me)
  return finalPerfSummary
}

async function refreshHostedSessionMeAfterSuccessfulChat(
  session: StoredHostedSession,
  getMe: (sessionToken?: string) => Promise<HostedAiMe>
): Promise<void> {
  try {
    const me = await getMe(session.session.session_token)
    await updateHostedSessionMe(session, me)
  } catch {
    // Quota refresh is best-effort; a completed chat response should still stand.
  }
}

function normalizeHostedOperation(operation?: string): HostedAiOperation {
  return HOSTED_CHAT_OPERATIONS.has(operation as HostedAiOperation)
    ? (operation as HostedAiOperation)
    : "custom"
}

function getHostedChatContext(
  payload: AIRequestPayload
): HostedAiChatContext | undefined {
  if (payload.context === "selection") return "selection"
  if (payload.context === "editable") return "editable"
  if (payload.context === "page" || payload.pageContent) return "page"
  return undefined
}

function getHostedChatInput(payload: AIRequestPayload): string {
  const candidates =
    payload.operation === "summarize"
      ? [payload.pageContent, payload.selectionText, payload.userMessage]
      : [payload.userMessage, payload.selectionText, payload.pageContent]

  return candidates.find((value) => value?.trim())?.trim() ?? ""
}

function buildHostedChatMessages(
  payload: AIRequestPayload
): HostedAiMessage[] {
  const messages: HostedAiMessage[] = []
  if (payload.systemPrompt?.trim()) {
    messages.push({ role: "system", content: payload.systemPrompt.trim() })
  }
  if (payload.priorContext?.trim()) {
    messages.push({ role: "system", content: payload.priorContext.trim() })
  }
  if (payload.userMessage?.trim()) {
    messages.push({ role: "user", content: payload.userMessage.trim() })
  }
  return messages
}

function estimateHostedPayloadChars(payload: AIRequestPayload): number {
  return [
    payload.selectionText,
    payload.pageContent,
    payload.userMessage,
    payload.priorContext,
    payload.systemPrompt
  ].reduce((sum, value) => sum + (value?.length ?? 0), 0)
}

function inferHostedPerfContextType(payload: AIRequestPayload): PerfContextType {
  if (payload.trigger === "follow-up") return "follow_up"
  if (payload.operation === "summarize" && payload.pageContent) {
    return "page_summary"
  }
  if (payload.trigger === "command-palette" || payload.userMessage) {
    return "command"
  }
  if (payload.context === "selection" || payload.selectionText) {
    return "selection"
  }
  return "unknown"
}

function categorizeHostedPerfError(error: unknown): PerfErrorCategory {
  if (error instanceof HostedAiClientError) {
    switch (error.normalized.code) {
      case "unauthorized":
        return "unauthorized"
      case "rate_limited":
      case "quota_exceeded":
        return "rate_limited"
      case "provider_error":
      case "forbidden_model":
      case "internal":
        return "provider_error"
      case "service_unavailable":
        return "network_error"
      case "bad_request":
        return "unknown_error"
    }
  }
  return categorizePerfError(error)
}
