import type { HostedGoogleSignInData } from "~types/messages"
import type { HostedAccountStatus } from "~utils/hosted-session"
import type { I18nKey } from "~utils/i18n-core"

export const HOSTED_SIGN_IN_HELP_URL =
  "https://aviso-nine.vercel.app/docs/first-use"

export const HOSTED_SIGN_IN_FAILURE_CATEGORIES = [
  "cancelled",
  "invalid",
  "network",
  "rate_limited",
  "unavailable"
] as const

export type HostedSignInFailureCategory =
  (typeof HOSTED_SIGN_IN_FAILURE_CATEGORIES)[number]

export type HostedSignInFailureView = {
  category: HostedSignInFailureCategory
  status: HostedAccountStatus
  stage: HostedGoogleSignInData["stage"]
  messageKey: I18nKey
  traceId: string
  occurredAt: string
}

export type HostedSignInDialogAction =
  | "retry"
  | "byok"
  | "help"
  | "copy_trace"

export type HostedSignInDialogEffect =
  | { type: "retry_sign_in"; closeDialog: false }
  | { type: "show_byok"; closeDialog: true; requiresLogin: boolean }
  | { type: "open_help"; closeDialog: false; url: string }
  | { type: "copy_trace"; closeDialog: false; text: string }

export type HostedSignInDialogState =
  | { visible: false }
  | { visible: true; mode: "signing_in" }
  | { visible: true; mode: "failed"; failure: HostedSignInFailureView }

type NormalizedHostedSignInFailureInput = {
  status?: HostedAccountStatus
  stage: HostedGoogleSignInData["stage"]
  error?: {
    source?: "oauth" | "backend" | "storage" | "unknown"
    code?: string
    httpStatusClass?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "unknown"
  }
}

const SAFE_TRACE_ID_PATTERN =
  /^(?:trace|request|req|rid|aviso|local)[-_.:][A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/i

export function buildHostedSignInFailureView(
  input: unknown,
  options: { now?: number; traceId?: string } = {}
): HostedSignInFailureView {
  const normalized = normalizeHostedSignInFailureInput(input)
  const category = categorizeHostedSignInFailure(input, normalized)
  const occurredAt = formatTraceTimestamp(options.now)

  return {
    category,
    status: normalizeFailureStatus(normalized.status, category),
    stage: normalized.stage,
    messageKey: getHostedSignInFailureMessageKey(category),
    traceId: sanitizeHostedSignInTraceId(options.traceId, occurredAt),
    occurredAt
  }
}

export function getHostedSignInDialogState(_options: {
  explicitHostedChoice: boolean
  busy: boolean
  failure?: HostedSignInFailureView | null
  hasHostedSession: boolean
}): HostedSignInDialogState {
  if (!_options.explicitHostedChoice || _options.hasHostedSession) {
    return { visible: false }
  }
  if (_options.busy) return { visible: true, mode: "signing_in" }
  if (_options.failure) {
    return { visible: true, mode: "failed", failure: _options.failure }
  }
  return { visible: false }
}

export function resolveHostedSignInDialogAction(
  action: HostedSignInDialogAction,
  failure?: HostedSignInFailureView | null
): HostedSignInDialogEffect {
  if (action === "retry") return { type: "retry_sign_in", closeDialog: false }
  if (action === "byok") {
    return { type: "show_byok", closeDialog: true, requiresLogin: false }
  }
  if (action === "help") {
    return { type: "open_help", closeDialog: false, url: HOSTED_SIGN_IN_HELP_URL }
  }
  return {
    type: "copy_trace",
    closeDialog: false,
    text: failure ? buildHostedSignInTraceText(failure) : ""
  }
}

export async function runHostedSignInDialogAction(
  action: HostedSignInDialogAction,
  handlers: {
    retrySignIn?: () => void | Promise<void>
    showByok?: () => void | Promise<void>
    openHelp?: (url: string) => void | Promise<void>
    copyTrace?: (text: string) => void | Promise<void>
  },
  failure?: HostedSignInFailureView | null
): Promise<HostedSignInDialogEffect> {
  const effect = resolveHostedSignInDialogAction(action, failure)
  if (effect.type === "retry_sign_in") await handlers.retrySignIn?.()
  if (effect.type === "show_byok") await handlers.showByok?.()
  if (effect.type === "open_help") await handlers.openHelp?.(effect.url)
  if (effect.type === "copy_trace") await handlers.copyTrace?.(effect.text)
  return effect
}

export function buildHostedSignInTraceText(
  failure: HostedSignInFailureView
): string {
  return [
    "aviso_hosted_sign_in",
    `category=${failure.category}`,
    `time=${failure.occurredAt}`,
    `trace=${failure.traceId}`
  ].join(" ")
}

export function getHostedSignInFailureCategoryLabelKey(
  category: HostedSignInFailureCategory
): I18nKey {
  return `popup.hosted.dialog.category.${category}` as I18nKey
}

function normalizeHostedSignInFailureInput(
  input: unknown
): NormalizedHostedSignInFailureInput {
  if (!isRecord(input)) return { stage: "client" }

  const error = isRecord(input.error) ? input.error : undefined
  return {
    status: isHostedAccountStatus(input.status) ? input.status : undefined,
    stage: isHostedSignInStage(input.stage) ? input.stage : "client",
    error: error
      ? {
          source: isHostedErrorSource(error.source) ? error.source : undefined,
          code: typeof error.code === "string" ? error.code : undefined,
          httpStatusClass: isHostedHttpStatusClass(error.httpStatusClass)
            ? error.httpStatusClass
            : undefined
        }
      : undefined
  }
}

function categorizeHostedSignInFailure(
  input: unknown,
  normalized: NormalizedHostedSignInFailureInput
): HostedSignInFailureCategory {
  const code = normalized.error?.code
  const status = normalized.status

  if (normalized.stage === "storage") return "unavailable"
  if (normalized.error?.source === "oauth") {
    if (code === "user_cancelled") return "cancelled"
    if (
      code === "config_missing" ||
      code === "redirect_invalid" ||
      code === "id_token_missing" ||
      code === "state_mismatch"
    ) {
      return "invalid"
    }
    return "unavailable"
  }

  if (normalized.error?.source === "backend") {
    if (code === "rate_limited" || status === "rate_limited") {
      return "rate_limited"
    }
    if (
      code === "bad_request" ||
      code === "unauthorized" ||
      status === "expired" ||
      status === "request_invalid"
    ) {
      return "invalid"
    }
    if (code === "service_unavailable") {
      return normalized.error.httpStatusClass === "5xx" ? "unavailable" : "network"
    }
    return "unavailable"
  }

  if (status === "rate_limited") return "rate_limited"
  if (status === "expired" || status === "request_invalid") return "invalid"
  if (status === "local_backend_unavailable") return "network"
  if (input instanceof Error) return "network"
  return "unavailable"
}

function normalizeFailureStatus(
  status: HostedAccountStatus | undefined,
  category: HostedSignInFailureCategory
): HostedAccountStatus {
  if (status && status !== "signed_in" && status !== "signing_in") return status
  if (category === "cancelled") return "signed_out"
  if (category === "invalid") return "request_invalid"
  if (category === "network") return "local_backend_unavailable"
  if (category === "rate_limited") return "rate_limited"
  return "hosted_route_unavailable"
}

function getHostedSignInFailureMessageKey(
  category: HostedSignInFailureCategory
): I18nKey {
  return `popup.hosted.dialog.message.${category}` as I18nKey
}

function formatTraceTimestamp(now = Date.now()): string {
  const timestamp = Number.isFinite(now) ? now : Date.now()
  return new Date(timestamp).toISOString()
}

function sanitizeHostedSignInTraceId(
  traceId: unknown,
  occurredAt: string
): string {
  if (typeof traceId === "string") {
    const trimmed = traceId.trim()
    if (SAFE_TRACE_ID_PATTERN.test(trimmed)) return trimmed.slice(0, 96)
  }

  const timestamp = Date.parse(occurredAt)
  const suffix = Number.isFinite(timestamp)
    ? Math.max(0, timestamp).toString(36)
    : Date.now().toString(36)
  return `local-${suffix}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isHostedAccountStatus(value: unknown): value is HostedAccountStatus {
  return (
    value === "signed_out" ||
    value === "signing_in" ||
    value === "signed_in" ||
    value === "expired" ||
    value === "local_backend_unavailable" ||
    value === "quota_exhausted" ||
    value === "rate_limited" ||
    value === "hosted_route_unavailable" ||
    value === "request_invalid"
  )
}

function isHostedSignInStage(
  value: unknown
): value is HostedGoogleSignInData["stage"] {
  return (
    value === "client" ||
    value === "challenge" ||
    value === "oauth" ||
    value === "auth_google" ||
    value === "me" ||
    value === "storage" ||
    value === "done"
  )
}

function isHostedErrorSource(
  value: unknown
): value is NonNullable<HostedGoogleSignInData["error"]>["source"] {
  return (
    value === "oauth" ||
    value === "backend" ||
    value === "storage" ||
    value === "unknown"
  )
}

function isHostedHttpStatusClass(
  value: unknown
): value is NonNullable<HostedGoogleSignInData["error"]>["httpStatusClass"] {
  return (
    value === "1xx" ||
    value === "2xx" ||
    value === "3xx" ||
    value === "4xx" ||
    value === "5xx" ||
    value === "unknown"
  )
}
