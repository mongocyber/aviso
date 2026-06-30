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
    targetLanguage?: TranslationTargetLanguage
  } = {}
): Promise<void> {
  const session = await readHostedSession()
  if (requiresHostedSignInForRoute({ route: "hosted", session })) {
    throw new HostedAiClientError(normalizeHostedAiError("unauthorized"))
  }
  if (!session) throw new HostedAiClientError(normalizeHostedAiError("unauthorized"))

  const client = createHostedAiClient({
    baseUrl: session.baseUrl,
    sessionToken: session.session.session_token
  })
  let sawDone = false

  try {
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
        onChunk({ text: event.delta, done: false, kind: "answer" })
      } else if (event.type === "done") {
        sawDone = true
        onChunk({ text: "", done: true, kind: "answer" })
      } else if (event.type === "error") {
        throw new HostedAiClientError(event.error)
      }
    }
  } catch (error) {
    if (
      error instanceof HostedAiClientError &&
      error.normalized.code === "unauthorized"
    ) {
      await clearHostedSession()
    }
    throw error
  }

  if (!sawDone) {
    onChunk({ text: "", done: true, kind: "answer" })
  }

  await refreshHostedSessionMeAfterSuccessfulChat(session, client.me)
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
