export type RequestTiming = {
  triggerAt?: number
  floatingShownAt?: number
  aiRequestSentAt?: number
  backgroundReceivedAt?: number
  pageContentRequestStartedAt?: number
  pageContentReadyAt?: number
  providerRequestStartedAt?: number
  firstChunkAt?: number
  doneAt?: number
}

export type PerfInputSizeBucket = "0-500" | "501-2000" | "2001-5000" | "5001+"

export type PerfContextType =
  | "selection"
  | "page_summary"
  | "image_explain"
  | "command"
  | "follow_up"
  | "unknown"

export type PerfErrorCategory =
  | "none"
  | "missing_first_chunk"
  | "missing_done"
  | "api_key_missing"
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "provider_error"
  | "unknown_error"

export type PerfSummary = {
  trigger: string
  provider: string
  model_or_endpoint: string
  input_size_bucket: PerfInputSizeBucket
  context_type: PerfContextType
  t_ui_visible_ms: number | null
  t_background_received_ms: number | null
  t_provider_start_ms: number | null
  t_first_chunk_ms: number | null
  t_done_ms: number | null
  error_category: PerfErrorCategory
}

export type PerfSummaryInput = {
  trigger?: string
  provider?: string
  modelOrEndpoint?: string
  inputChars?: number
  contextType?: PerfContextType
  timing?: RequestTiming
  errorCategory?: PerfErrorCategory
}

export function nowMs(): number {
  return Date.now()
}

export function startTiming(): RequestTiming {
  return { triggerAt: nowMs() }
}

export function markTiming(
  timing: RequestTiming | undefined,
  key: keyof RequestTiming,
  at = nowMs()
): RequestTiming {
  return { ...(timing ?? {}), [key]: at }
}

export function logTiming(
  stage: string,
  requestId: string,
  timing: RequestTiming | undefined,
  details: Record<string, unknown> = {}
): void {
  const triggerAt = timing?.triggerAt
  const elapsedMs =
    typeof triggerAt === "number" ? Math.max(0, nowMs() - triggerAt) : undefined

  console.info("[Aviso timing]", {
    stage,
    requestId,
    elapsedMs,
    marks: timing ?? {},
    ...details
  })
}

export function bucketInputSize(
  inputChars: number | undefined
): PerfInputSizeBucket {
  const size =
    typeof inputChars === "number" && Number.isFinite(inputChars)
      ? Math.max(0, inputChars)
      : 0

  if (size <= 500) return "0-500"
  if (size <= 2000) return "501-2000"
  if (size <= 5000) return "2001-5000"
  return "5001+"
}

export function buildPerfSummary(input: PerfSummaryInput): PerfSummary {
  const timing = input.timing

  return {
    trigger: sanitizeTrigger(input.trigger),
    provider: sanitizeProvider(input.provider),
    model_or_endpoint: sanitizeModelOrEndpoint(input.modelOrEndpoint),
    input_size_bucket: bucketInputSize(input.inputChars),
    context_type: input.contextType ?? "unknown",
    t_ui_visible_ms: elapsedFromTrigger(timing, timing?.floatingShownAt),
    t_background_received_ms: elapsedFromTrigger(
      timing,
      timing?.backgroundReceivedAt
    ),
    t_provider_start_ms: elapsedFromTrigger(
      timing,
      timing?.providerRequestStartedAt
    ),
    t_first_chunk_ms: elapsedFromTrigger(timing, timing?.firstChunkAt),
    t_done_ms: elapsedFromTrigger(timing, timing?.doneAt),
    error_category: input.errorCategory ?? "unknown_error"
  }
}

export function logPerfSummary(input: PerfSummaryInput): void {
  console.info("[Aviso perf]", buildPerfSummary(input))
}

export function categorizePerfError(err: unknown): PerfErrorCategory {
  const status = getErrorStatus(err)
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "")

  if (
    /api key|api_key|key 未配置|密钥|unauthorized|invalid key/i.test(message)
  ) {
    return status === 401 ? "unauthorized" : "api_key_missing"
  }
  if (status === 401 || status === 403) return "unauthorized"
  if (
    status === 429 ||
    /rate.?limit|too many requests|频繁|额度/i.test(message)
  ) {
    return "rate_limited"
  }
  if (/timeout|timed out|超时/i.test(message)) return "timeout"
  if (/network|fetch failed|failed to fetch|网络/i.test(message)) {
    return "network_error"
  }
  if (typeof status === "number" && status >= 500) return "provider_error"
  return "unknown_error"
}

function elapsedFromTrigger(
  timing: RequestTiming | undefined,
  at: number | undefined
): number | null {
  const triggerAt = timing?.triggerAt
  if (typeof triggerAt !== "number" || typeof at !== "number") return null
  return Math.max(0, Math.round(at - triggerAt))
}

function sanitizeTrigger(trigger: string | undefined): string {
  const allowed = new Set([
    "toolbar",
    "context-menu",
    "command-palette",
    "command-palette-history",
    "clipboard",
    "follow-up",
    "history"
  ])
  return trigger && allowed.has(trigger) ? trigger : "unknown"
}

function sanitizeProvider(provider: string | undefined): string {
  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "doubao"
  ) {
    return provider
  }
  return "unknown"
}

function sanitizeModelOrEndpoint(modelOrEndpoint: string | undefined): string {
  const value = modelOrEndpoint?.trim()
  if (!value) return "unknown"
  if (/(https?:\/\/|data:image\/|base64|api[_-]?key|sk-)/i.test(value)) {
    return "redacted_endpoint"
  }
  return value
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const status = (err as { status?: unknown }).status
  return typeof status === "number" ? status : undefined
}
