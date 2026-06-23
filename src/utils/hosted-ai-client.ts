// Mirrors the V03 first-slice @aviso/contract shapes until the package is
// available in this repo without changing package dependencies.
const HOSTED_AI_LOCAL_BASE_URL = "http://127.0.0.1:3000/v1"
const HOSTED_AI_STAGING_BASE_URL =
  "https://aviso-backend-staging.vercel.app/v1"

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])
const STAGING_ORIGIN = new URL(HOSTED_AI_STAGING_BASE_URL).origin
const STAGING_PATH = new URL(HOSTED_AI_STAGING_BASE_URL).pathname

export const HOSTED_AI_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "quota_exceeded",
  "forbidden_model",
  "rate_limited",
  "service_unavailable",
  "provider_error",
  "internal"
] as const

export type HostedAiErrorCode = (typeof HOSTED_AI_ERROR_CODES)[number]

export const HOSTED_AI_OPERATIONS = [
  "translate",
  "explain",
  "polish",
  "summarize",
  "custom"
] as const

export type HostedAiOperation = (typeof HOSTED_AI_OPERATIONS)[number]

export type HostedAiChatContext = "selection" | "page" | "editable"

export type HostedAiUser = {
  id: string
  email?: string | null
  tier: "free" | "paid"
  region: "global"
}

export type HostedAiSession = {
  session_token: string
  expires_at: string
  user: HostedAiUser
}

export type HostedAiQuotaWindow = {
  limit: number
  used: number
  resets_at: string
}

export type HostedAiMe = {
  user: HostedAiUser
  quota: {
    unit: "tokens"
    monthly: HostedAiQuotaWindow
    daily?: HostedAiQuotaWindow
  }
  rate_limit: {
    requests_per_min: number
    tokens_per_min: number
  }
  models: {
    available: string[]
    default: string
  }
}

export type HostedAiMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

export type HostedAiChatRequest = {
  operation: HostedAiOperation
  input: string
  context?: HostedAiChatContext
  target_lang?: string
  model?: string
  messages?: HostedAiMessage[]
}

export type HostedAiUsage = {
  tokens_in: number
  tokens_out: number
}

export type HostedAiErrorAction =
  | "fix_local_integration"
  | "sign_in_again"
  | "switch_to_byok"
  | "fallback_to_default_model"
  | "retry_later"
  | "retry_or_switch_to_byok"
  | "retry"

export type HostedAiErrorCategory =
  | "request_invalid"
  | "auth_required"
  | "quota_exhausted"
  | "model_unavailable"
  | "rate_limited"
  | "service_unavailable"
  | "provider_unavailable"
  | "service_error"

export type NormalizedHostedAiError = {
  code: HostedAiErrorCode
  category: HostedAiErrorCategory
  action: HostedAiErrorAction
  userMessage: string
  status?: number
  upgrade?: boolean
}

export type HostedAiSseEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; usage?: HostedAiUsage }
  | { type: "error"; error: NormalizedHostedAiError }

export type HostedAiClientOptions = {
  baseUrl?: string | null
  sessionToken?: string
  fetchImpl?: typeof fetch
  createIdempotencyKey?: () => string
}

export type HostedAiChatOptions = {
  sessionToken?: string
  idempotencyKey?: string
  signal?: AbortSignal
}

type ErrorBody = {
  error?: {
    code?: unknown
    message?: unknown
    upgrade?: unknown
  }
}

export function resolveHostedAiBaseUrl(baseUrl?: string | null): string | null {
  if (!baseUrl?.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(baseUrl.trim())
  } catch {
    return null
  }

  if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.toString().replace(/\/$/, "")
  }

  if (parsed.origin !== STAGING_ORIGIN) return null
  if (parsed.protocol !== "https:") return null
  if (parsed.search || parsed.hash) return null
  if (parsed.pathname.replace(/\/$/, "") !== STAGING_PATH) return null

  return HOSTED_AI_STAGING_BASE_URL
}

export function createHostedAiClient(options: HostedAiClientOptions = {}) {
  const baseUrl = resolveHostedAiBaseUrl(options.baseUrl)
  if (!baseUrl) {
    throw new HostedAiClientError(normalizeHostedAiError("service_unavailable"))
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const createIdempotencyKey =
    options.createIdempotencyKey ?? createHostedAiIdempotencyKey

  async function requestJson<T>(
    path: string,
    init: RequestInit & { sessionToken?: string } = {}
  ): Promise<T> {
    const response = await safeFetch(fetchImpl, `${baseUrl}${path}`, {
      ...init,
      headers: buildHostedAiHeaders({
        contentType: init.body ? "application/json" : undefined,
        sessionToken: init.sessionToken ?? options.sessionToken,
        headers: init.headers
      })
    })

    if (!response.ok) throw await createHostedAiHttpError(response)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    baseUrl,
    authGoogle(body: { id_token: string }): Promise<HostedAiSession> {
      return requestJson<HostedAiSession>("/auth/google", {
        method: "POST",
        body: JSON.stringify(body)
      })
    },
    logout(sessionToken?: string): Promise<void> {
      return requestJson<void>("/auth/logout", {
        method: "POST",
        sessionToken
      })
    },
    me(sessionToken?: string): Promise<HostedAiMe> {
      return requestJson<HostedAiMe>("/me", {
        method: "GET",
        sessionToken
      })
    },
    async *chatStream(
      body: HostedAiChatRequest,
      chatOptions: HostedAiChatOptions = {}
    ): AsyncGenerator<HostedAiSseEvent> {
      const idempotencyKey =
        chatOptions.idempotencyKey ?? createIdempotencyKey()
      const response = await safeFetch(fetchImpl, `${baseUrl}/chat`, {
        method: "POST",
        body: JSON.stringify(body),
        signal: chatOptions.signal,
        headers: buildHostedAiHeaders({
          contentType: "application/json",
          accept: "text/event-stream",
          sessionToken: chatOptions.sessionToken ?? options.sessionToken,
          idempotencyKey
        })
      })

      if (!response.ok) throw await createHostedAiHttpError(response)
      if (!response.body) {
        throw new HostedAiClientError(
          normalizeHostedAiError("service_unavailable", response.status)
        )
      }

      const parser = createHostedAiSseParser()
      for await (const chunk of readResponseTextChunks(response.body)) {
        for (const event of parser.push(chunk)) yield event
      }
      for (const event of parser.finish()) yield event
    }
  }
}

export class HostedAiClientError extends Error {
  readonly normalized: NormalizedHostedAiError

  constructor(normalized: NormalizedHostedAiError) {
    super(normalized.userMessage)
    this.name = "HostedAiClientError"
    this.normalized = normalized
  }
}

export function normalizeHostedAiError(
  code: unknown,
  status?: number,
  upgrade?: boolean
): NormalizedHostedAiError {
  const safeCode = isHostedAiErrorCode(code) ? code : codeFromStatus(status)
  const base = HOSTED_AI_ERROR_MAP[safeCode]
  return {
    code: safeCode,
    status,
    upgrade,
    ...base
  }
}

export function createHostedAiSseParser() {
  let buffer = ""
  let dataLines: string[] = []

  const dispatch = (): HostedAiSseEvent[] => {
    if (dataLines.length === 0) return []
    const data = dataLines.join("\n")
    dataLines = []
    return [parseHostedAiSseData(data)]
  }

  return {
    push(chunk: string): HostedAiSseEvent[] {
      buffer += chunk
      const events: HostedAiSseEvent[] = []
      let lineEnd = buffer.search(/\r?\n/)

      while (lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "")
        buffer = buffer.slice(buffer[lineEnd] === "\r" ? lineEnd + 2 : lineEnd + 1)

        if (line === "") {
          events.push(...dispatch())
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart())
        }

        lineEnd = buffer.search(/\r?\n/)
      }

      return events
    },
    finish(): HostedAiSseEvent[] {
      if (buffer) {
        if (buffer.startsWith("data:")) dataLines.push(buffer.slice(5).trimStart())
        buffer = ""
      }
      return dispatch()
    }
  }
}

export function createHostedAiIdempotencyKey(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto)
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildHostedAiHeaders({
  accept,
  contentType,
  headers,
  idempotencyKey,
  sessionToken
}: {
  accept?: string
  contentType?: string
  headers?: HeadersInit
  idempotencyKey?: string
  sessionToken?: string
}): Headers {
  const next = new Headers(headers)
  if (accept) next.set("Accept", accept)
  if (contentType) next.set("Content-Type", contentType)
  if (sessionToken) next.set("Authorization", `Bearer ${sessionToken}`)
  if (idempotencyKey) next.set("Idempotency-Key", idempotencyKey)
  return next
}

async function safeFetch(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  try {
    return await fetchImpl(input, init)
  } catch {
    throw new HostedAiClientError(normalizeHostedAiError("service_unavailable"))
  }
}

async function createHostedAiHttpError(response: Response) {
  const body = await safeReadErrorBody(response)
  const error = body?.error
  return new HostedAiClientError(
    normalizeHostedAiError(
      error?.code,
      response.status,
      typeof error?.upgrade === "boolean" ? error.upgrade : undefined
    )
  )
}

async function safeReadErrorBody(response: Response): Promise<ErrorBody | null> {
  try {
    return (await response.json()) as ErrorBody
  } catch {
    return null
  }
}

async function* readResponseTextChunks(
  body: NonNullable<Response["body"]>
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value, { stream: true })
    }
    const flushed = decoder.decode()
    if (flushed) yield flushed
  } finally {
    reader.releaseLock()
  }
}

function parseHostedAiSseData(data: string): HostedAiSseEvent {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    throw new HostedAiClientError(normalizeHostedAiError("provider_error"))
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new HostedAiClientError(normalizeHostedAiError("provider_error"))
  }

  const event = parsed as {
    delta?: unknown
    done?: unknown
    usage?: unknown
    error?: { code?: unknown; upgrade?: unknown }
  }

  if (typeof event.delta === "string") {
    return { type: "delta", delta: event.delta }
  }

  if (event.error) {
    return {
      type: "error",
      error: normalizeHostedAiError(
        event.error.code,
        undefined,
        typeof event.error.upgrade === "boolean" ? event.error.upgrade : undefined
      )
    }
  }

  if (event.done === true) {
    return isHostedAiUsage(event.usage)
      ? { type: "done", usage: event.usage }
      : { type: "done" }
  }

  throw new HostedAiClientError(normalizeHostedAiError("provider_error"))
}

function isHostedAiUsage(value: unknown): value is HostedAiUsage {
  if (typeof value !== "object" || value === null) return false
  const usage = value as Partial<HostedAiUsage>
  return (
    typeof usage.tokens_in === "number" &&
    typeof usage.tokens_out === "number" &&
    Number.isFinite(usage.tokens_in) &&
    Number.isFinite(usage.tokens_out)
  )
}

function isHostedAiErrorCode(code: unknown): code is HostedAiErrorCode {
  return (
    typeof code === "string" &&
    HOSTED_AI_ERROR_CODES.includes(code as HostedAiErrorCode)
  )
}

function codeFromStatus(status?: number): HostedAiErrorCode {
  if (status === 400) return "bad_request"
  if (status === 401) return "unauthorized"
  if (status === 402) return "quota_exceeded"
  if (status === 403) return "forbidden_model"
  if (status === 429) return "rate_limited"
  if (status === 502) return "provider_error"
  if (status === 503) return "service_unavailable"
  return "internal"
}

const HOSTED_AI_ERROR_MAP: Record<
  HostedAiErrorCode,
  Omit<NormalizedHostedAiError, "code" | "status" | "upgrade">
> = {
  bad_request: {
    category: "request_invalid",
    action: "fix_local_integration",
    userMessage: "托管请求格式不可用，请检查本地集成配置。"
  },
  unauthorized: {
    category: "auth_required",
    action: "sign_in_again",
    userMessage: "托管登录状态已失效，请在 AI 服务页重新本地登录。"
  },
  quota_exceeded: {
    category: "quota_exhausted",
    action: "switch_to_byok",
    userMessage: "托管额度暂不可用，可切换到自己的 API Key。"
  },
  forbidden_model: {
    category: "model_unavailable",
    action: "fallback_to_default_model",
    userMessage: "当前托管模型不可用，请重试默认模型或切换到自己的 API Key。"
  },
  rate_limited: {
    category: "rate_limited",
    action: "retry_later",
    userMessage: "托管请求过于频繁，请稍后重试或切换到自己的 API Key。"
  },
  service_unavailable: {
    category: "service_unavailable",
    action: "retry_or_switch_to_byok",
    userMessage: "本地托管服务暂不可用，请确认本地后端已启动，或切换到自己的 API Key。"
  },
  provider_error: {
    category: "provider_unavailable",
    action: "retry_or_switch_to_byok",
    userMessage: "托管上游服务失败，请稍后重试或切换到自己的 API Key。"
  },
  internal: {
    category: "service_error",
    action: "retry",
    userMessage: "托管服务异常，请稍后重试或切换到自己的 API Key。"
  }
}
