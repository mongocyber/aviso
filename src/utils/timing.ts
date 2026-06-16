export type RequestTiming = {
  triggerAt?: number
  floatingShownAt?: number
  aiRequestSentAt?: number
  backgroundReceivedAt?: number
  pageContentRequestStartedAt?: number
  pageContentReadyAt?: number
  screenshotCaptureStartedAt?: number
  screenshotCaptureReadyAt?: number
  screenshotCropReadyAt?: number
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

export type PerfOperation =
  | "translate"
  | "explain"
  | "polish"
  | "summarize"
  | "image_explain"
  | "custom"
  | "template"
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
  | "unsupported_image_input"
  | "user_cancelled"
  | "unknown_error"

export type PerfSummary = {
  trigger: string
  provider: string
  model_or_endpoint: string
  operation: PerfOperation
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
  operation?: string
  inputChars?: number
  contextType?: PerfContextType
  timing?: RequestTiming
  errorCategory?: PerfErrorCategory
}

export type SelectionTtftDogfoodOperation =
  | "selection_translate"
  | "selection_explain"

export type SelectionTtftDogfoodRow = {
  provider: string
  model_or_endpoint: string
  operation: SelectionTtftDogfoodOperation
  input_size_bucket: PerfInputSizeBucket
  t_ui_visible_ms: number | null
  t_provider_start_ms: number | null
  t_first_chunk_ms: number | null
  t_done_ms: number | null
  error_category: PerfErrorCategory
}

export type SelectionTtftAggregate = {
  operation: SelectionTtftDogfoodOperation | "selection_all"
  sample_count: number
  p50_first_chunk_ms: number | null
  p95_first_chunk_ms: number | null
  excluded_count: number
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
    ...sanitizeTimingDetails(details)
  })
}

const URL_DETAIL_KEYS = new Set([
  "url",
  "href",
  "frameUrl",
  "pageUrl",
  "linkUrl",
  "srcUrl"
])

const TEXT_DETAIL_KEYS = new Set([
  "selectionText",
  "pageContent",
  "textContent",
  "rawPrompt",
  "rawResponse",
  "prompt",
  "response",
  "clipboardText"
])

const BINARY_DETAIL_KEYS = new Set(["dataUrl", "base64", "screenshot"])
const URL_PATTERN = /\b(?:https?|file|chrome|chrome-extension):\/\/\S+/gi
const IMAGE_DATA_PATTERN = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi

export function sanitizeTimingDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    if (URL_DETAIL_KEYS.has(key)) {
      sanitized[`${key}Present`] = typeof value === "string" && value.length > 0
      continue
    }

    if (TEXT_DETAIL_KEYS.has(key) || BINARY_DETAIL_KEYS.has(key)) {
      sanitized[`${key}Chars`] =
        typeof value === "string" ? value.length : value == null ? 0 : undefined
      continue
    }

    if (typeof value === "string") {
      sanitized[key] = value
        .replace(IMAGE_DATA_PATTERN, "[image data omitted]")
        .replace(URL_PATTERN, "[url omitted]")
      continue
    }

    sanitized[key] = value
  }

  return sanitized
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
    operation: sanitizeOperation(input.operation),
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

export function logPerfSummary(input: PerfSummaryInput): PerfSummary {
  const summary = buildPerfSummary(input)
  console.info(`[Aviso perf] ${JSON.stringify(summary)}`)
  return summary
}

export function buildSelectionTtftDogfoodRow(
  summary: PerfSummary
): SelectionTtftDogfoodRow | null {
  const operation = getSelectionTtftOperation(summary)
  if (!operation) return null

  return {
    provider: summary.provider,
    model_or_endpoint: summary.model_or_endpoint,
    operation,
    input_size_bucket: summary.input_size_bucket,
    t_ui_visible_ms: summary.t_ui_visible_ms,
    t_provider_start_ms: summary.t_provider_start_ms,
    t_first_chunk_ms: summary.t_first_chunk_ms,
    t_done_ms: summary.t_done_ms,
    error_category: summary.error_category
  }
}

export function buildSelectionTtftAggregate(
  summaries: PerfSummary[],
  operation: SelectionTtftDogfoodOperation | "selection_all" = "selection_all"
): SelectionTtftAggregate {
  const rows = summaries
    .map(buildSelectionTtftDogfoodRow)
    .filter((row): row is SelectionTtftDogfoodRow => {
      if (!row) return false
      return operation === "selection_all" || row.operation === operation
    })
  const eligible = rows.filter(
    (row) =>
      row.error_category === "none" &&
      row.t_provider_start_ms != null &&
      row.t_first_chunk_ms != null
  )
  const firstChunkTimes = eligible.map((row) => row.t_first_chunk_ms as number)

  return {
    operation,
    sample_count: eligible.length,
    p50_first_chunk_ms: percentileNearestRank(firstChunkTimes, 50),
    p95_first_chunk_ms: percentileNearestRank(firstChunkTimes, 95),
    excluded_count: rows.length - eligible.length
  }
}

export function categorizePerfError(err: unknown): PerfErrorCategory {
  if (isAbortLikeError(err)) return "user_cancelled"

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
    "inline-translation",
    "history",
    "screenshot"
  ])
  return trigger && allowed.has(trigger) ? trigger : "unknown"
}

function sanitizeOperation(operation: string | undefined): PerfOperation {
  if (
    operation === "translate" ||
    operation === "explain" ||
    operation === "polish" ||
    operation === "summarize" ||
    operation === "image_explain" ||
    operation === "custom" ||
    operation === "template"
  ) {
    return operation
  }
  return "unknown"
}

function sanitizeProvider(provider: string | undefined): string {
  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "doubao" ||
    provider === "deepseek" ||
    provider === "moonshot" ||
    provider === "openrouter" ||
    provider === "gemini" ||
    provider === "hunyuan"
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

function getSelectionTtftOperation(
  summary: PerfSummary
): SelectionTtftDogfoodOperation | null {
  if (summary.context_type !== "selection") return null
  if (summary.operation === "translate") return "selection_translate"
  if (summary.operation === "explain") return "selection_explain"
  return null
}

function percentileNearestRank(
  values: number[],
  percentile: 50 | 95
): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1)
  return sorted[index]
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const status = (err as { status?: unknown }).status
  return typeof status === "number" ? status : undefined
}

function isAbortLikeError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const name = (err as { name?: unknown }).name
    if (name === "AbortError") return true
  }

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "")

  return /aborted|aborterror|cancelled|canceled|user_cancelled|已停止等待/i.test(
    message
  )
}
