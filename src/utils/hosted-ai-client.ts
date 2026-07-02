// Mirrors the V03 first-slice @aviso/contract shapes until the package is
// available in this repo without changing package dependencies.
const HOSTED_AI_LOCAL_BASE_URL = "http://127.0.0.1:3000/v1"
const HOSTED_AI_PRODUCTION_BASE_URL =
  "https://aviso-backend-production.vercel.app/v1"

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])
const PRODUCTION_ORIGIN = new URL(HOSTED_AI_PRODUCTION_BASE_URL).origin
const PRODUCTION_PATH = new URL(HOSTED_AI_PRODUCTION_BASE_URL).pathname

const HOSTED_AI_STREAM_LIMIT_ERROR_MESSAGE =
  "AI 返回内容过大或响应超时，请缩短输入后重试。"

const DEFAULT_HOSTED_AI_STREAM_RESOURCE_LIMITS = {
  overallTimeoutMs: 120_000,
  idleTimeoutMs: 30_000,
  maxChunkChars: 65_536,
  maxEventChars: 65_536,
  maxBufferChars: 262_144,
  maxOutputChars: 262_144
} as const

export type HostedAiStreamResourceLimits = Partial<
  typeof DEFAULT_HOSTED_AI_STREAM_RESOURCE_LIMITS
>

class HostedAiStreamResourceLimitError extends Error {
  constructor() {
    super(HOSTED_AI_STREAM_LIMIT_ERROR_MESSAGE)
    this.name = "HostedAiStreamResourceLimitError"
  }
}

type HostedAiStreamResourceGuard = ReturnType<
  typeof createAiStreamResourceGuard
>

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

export type HostedAiGoogleChallenge = {
  state: string
  nonce: string
  expires_at: string
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
  streamLimits?: HostedAiStreamResourceLimits
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

  if (parsed.origin !== PRODUCTION_ORIGIN) return null
  if (parsed.protocol !== "https:") return null
  if (parsed.search || parsed.hash) return null
  if (parsed.pathname.replace(/\/$/, "") !== PRODUCTION_PATH) return null

  return HOSTED_AI_PRODUCTION_BASE_URL
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
    async createGoogleAuthChallenge(): Promise<HostedAiGoogleChallenge> {
      return normalizeHostedAiGoogleChallenge(
        await requestJson<unknown>("/auth/google/challenge", {
          method: "POST"
        })
      )
    },
    authGoogle(body: {
      id_token: string
      state: string
      nonce: string
    }): Promise<HostedAiSession> {
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

      const parser = createHostedAiSseParser(options.streamLimits)
      for await (const chunk of readResponseTextChunks(
        response.body,
        chatOptions.signal,
        options.streamLimits
      )) {
        for (const event of parser.push(chunk)) {
          yield event
          if (event.type === "done" || event.type === "error") return
        }
      }
      for (const event of parser.finish()) {
        yield event
        if (event.type === "done" || event.type === "error") return
      }
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

export function createHostedAiSseParser(limits?: HostedAiStreamResourceLimits) {
  let buffer = ""
  let dataLines: string[] = []
  const guard = createAiStreamResourceGuard(limits)

  const dispatch = (): HostedAiSseEvent[] => {
    if (dataLines.length === 0) return []
    const data = dataLines.join("\n")
    guard.recordEvent(data.length)
    dataLines = []
    const event = parseHostedAiSseData(data)
    if (event.type === "delta") guard.recordOutput(event.delta)
    if (event.type === "done" || event.type === "error") guard.markTerminal()
    return [event]
  }

  return {
    push(chunk: string): HostedAiSseEvent[] {
      guard.recordIncomingChunk(chunk)
      buffer += chunk
      const events: HostedAiSseEvent[] = []
      let lineEnd = buffer.search(/\r?\n/)

      while (lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "")
        const consumed = buffer[lineEnd] === "\r" ? lineEnd + 2 : lineEnd + 1
        buffer = buffer.slice(consumed)
        guard.releaseBuffer(consumed)

        if (line === "") {
          events.push(...dispatch())
          if (guard.isTerminal()) break
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
        guard.releaseBuffer(buffer.length)
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
  body: NonNullable<Response["body"]>,
  signal?: AbortSignal,
  limits?: HostedAiStreamResourceLimits
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const guard = createAiStreamResourceGuard(limits)
  let completedNaturally = false
  try {
    while (true) {
      const { done, value } = await readStreamStepWithTimeout(
        () => reader.read(),
        guard,
        signal
      )
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      guard.recordIncomingChunk(chunk)
      yield chunk
    }
    const flushed = decoder.decode()
    if (flushed) {
      guard.recordIncomingChunk(flushed)
      yield flushed
    }
    completedNaturally = true
  } finally {
    if (!completedNaturally) {
      try {
        await reader.cancel()
      } catch {
        // Cancellation is best-effort cleanup; callers should keep the safe
        // stream-limit or parser error instead of a raw stream cancellation error.
      }
    }
    reader.releaseLock()
  }
}

function createAiStreamResourceGuard(
  limits: HostedAiStreamResourceLimits = {},
  now: () => number = () => Date.now()
) {
  const resolved = { ...DEFAULT_HOSTED_AI_STREAM_RESOURCE_LIMITS, ...limits }
  const startedAt = now()
  let lastActivityAt = startedAt
  let bufferedChars = 0
  let outputChars = 0
  let terminal = false

  const fail = (): never => {
    throw new HostedAiStreamResourceLimitError()
  }
  const assertActive = () => {
    if (terminal) fail()
  }
  const assertWithinTime = () => {
    const current = now()
    if (current - startedAt > resolved.overallTimeoutMs) fail()
    if (current - lastActivityAt > resolved.idleTimeoutMs) fail()
  }

  return {
    limits: resolved,
    isTerminal(): boolean {
      return terminal
    },
    markTerminal(): void {
      terminal = true
    },
    recordIncomingChunk(chunk: string): void {
      assertActive()
      assertWithinTime()
      if (chunk.length > resolved.maxChunkChars) fail()
      bufferedChars += chunk.length
      if (bufferedChars > resolved.maxBufferChars) fail()
      lastActivityAt = now()
    },
    recordEvent(eventChars: number): void {
      assertActive()
      assertWithinTime()
      if (eventChars > resolved.maxEventChars) fail()
    },
    releaseBuffer(chars: number): void {
      bufferedChars = Math.max(0, bufferedChars - chars)
    },
    recordOutput(text: string): void {
      assertWithinTime()
      outputChars += text.length
      if (outputChars > resolved.maxOutputChars) fail()
      lastActivityAt = now()
    },
    assertCanRead(): void {
      assertActive()
      assertWithinTime()
    }
  }
}

async function readStreamStepWithTimeout<T>(
  read: () => Promise<T>,
  guard: HostedAiStreamResourceGuard,
  signal?: AbortSignal
): Promise<T> {
  guard.assertCanRead()
  if (signal?.aborted) throw new HostedAiStreamResourceLimitError()

  return await new Promise<T>((resolve, reject) => {
    let settled = false
    const timeoutMs = Math.max(
      1,
      Math.min(guard.limits.idleTimeoutMs, guard.limits.overallTimeoutMs)
    )
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new HostedAiStreamResourceLimitError())
    }, timeoutMs)
    const abort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new HostedAiStreamResourceLimitError())
    }

    signal?.addEventListener("abort", abort, { once: true })
    read().then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abort)
        resolve(value)
      },
      (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abort)
        reject(error)
      }
    )
  })
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

function normalizeHostedAiGoogleChallenge(
  value: unknown
): HostedAiGoogleChallenge {
  if (typeof value !== "object" || value === null) {
    throw new HostedAiClientError(normalizeHostedAiError("bad_request"))
  }

  const candidate = value as Partial<HostedAiGoogleChallenge>
  if (
    !isNonEmptyString(candidate.state) ||
    !isNonEmptyString(candidate.nonce) ||
    !isNonEmptyString(candidate.expires_at) ||
    !Number.isFinite(Date.parse(candidate.expires_at))
  ) {
    throw new HostedAiClientError(normalizeHostedAiError("bad_request"))
  }

  return {
    state: candidate.state,
    nonce: candidate.nonce,
    expires_at: candidate.expires_at
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
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
    userMessage: "托管登录状态已失效，请在 AI 服务页重新登录。"
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
    userMessage: "托管服务暂不可用，请稍后重试，或切换到自己的 API Key。"
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
