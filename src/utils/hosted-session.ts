export const HOSTED_AI_LOCAL_BASE_URL = "http://127.0.0.1:3000/v1"
export const HOSTED_AI_PRODUCTION_BASE_URL =
  "https://aviso-backend-production.vercel.app/v1"
export const HOSTED_AI_DEFAULT_BASE_URL = HOSTED_AI_PRODUCTION_BASE_URL
export const HOSTED_AI_PRODUCTION_HOST_PERMISSION =
  "https://aviso-backend-production.vercel.app/*"
export const HOSTED_AI_PROVIDER_CONFIG_ID = "aviso-hosted-ai"
export const HOSTED_AI_DEFAULT_MODEL = "free-small"
export const HOSTED_SESSION_STORAGE_KEY = "aviso_hosted_session"

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])
const PRODUCTION_ORIGIN = new URL(HOSTED_AI_PRODUCTION_BASE_URL).origin
const PRODUCTION_PATH = new URL(HOSTED_AI_PRODUCTION_BASE_URL).pathname

type HostedAiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "quota_exceeded"
  | "forbidden_model"
  | "rate_limited"
  | "service_unavailable"
  | "provider_error"
  | "internal"
  | string

type HostedSessionUser = {
  id: string
  email?: string | null
  tier: "free" | "paid"
  region: "global"
}

type HostedAiSession = {
  session_token: string
  expires_at: string
  user: HostedSessionUser
}

type HostedAiMe = {
  user: HostedSessionUser
  quota?: unknown
  rate_limit?: unknown
  models?: unknown
}

export type StoredHostedSession = {
  session: HostedAiSession
  me?: HostedAiMe
  baseUrl: string
  updatedAt: number
}

export type HostedAccountStatus =
  | "signed_out"
  | "signing_in"
  | "signed_in"
  | "expired"
  | "local_backend_unavailable"
  | "quota_exhausted"
  | "rate_limited"
  | "hosted_route_unavailable"
  | "request_invalid"

export type HostedRouteSelection = "byok" | "hosted"

export function isHostedAiProviderConfigId(configId?: string): boolean {
  return configId === HOSTED_AI_PROVIDER_CONFIG_ID
}

export type HostedQuotaDisplayLabels = {
  unknown: string
  unavailable: string
  tokens: string
  tierFree: string
  tierPaid: string
}

export type HostedAccountQuotaDisplay = {
  tierLabel: string
  monthlyQuotaLabel: string
  dailyQuotaLabel: string
  resetLabel: string
}

export function resolveLocalHostedBaseUrl(
  baseUrl = HOSTED_AI_DEFAULT_BASE_URL
): string | null {
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

export async function readHostedSession(): Promise<StoredHostedSession | null> {
  const result = await chrome.storage.local.get(HOSTED_SESSION_STORAGE_KEY)
  return normalizeStoredHostedSession(result[HOSTED_SESSION_STORAGE_KEY])
}

export async function saveHostedSession(
  session: HostedAiSession,
  options: { baseUrl?: string; me?: HostedAiMe } = {}
): Promise<StoredHostedSession> {
  const baseUrl = resolveLocalHostedBaseUrl(options.baseUrl)
  if (!baseUrl) {
    throw new Error("Hosted AI base URL must be local or production.")
  }

  const value: StoredHostedSession = {
    session,
    me: options.me,
    baseUrl,
    updatedAt: Date.now()
  }

  await chrome.storage.local.set({ [HOSTED_SESSION_STORAGE_KEY]: value })
  return value
}

export async function updateHostedSessionMe(
  current: StoredHostedSession,
  me: HostedAiMe
): Promise<StoredHostedSession> {
  const value: StoredHostedSession = {
    ...current,
    me,
    updatedAt: Date.now()
  }
  await chrome.storage.local.set({ [HOSTED_SESSION_STORAGE_KEY]: value })
  return value
}

export async function clearHostedSession(): Promise<void> {
  await chrome.storage.local.remove(HOSTED_SESSION_STORAGE_KEY)
}

export function deriveHostedAccountStatus(options: {
  session?: StoredHostedSession | null
  busy?: boolean
  errorCode?: HostedAiErrorCode | null
}): HostedAccountStatus {
  if (options.busy) return "signing_in"
  if (options.errorCode === "unauthorized") return "expired"
  if (options.errorCode === "service_unavailable") {
    return "local_backend_unavailable"
  }
  if (options.errorCode === "quota_exceeded") return "quota_exhausted"
  if (options.errorCode === "rate_limited") return "rate_limited"
  if (options.errorCode === "bad_request") return "request_invalid"
  if (
    options.errorCode === "forbidden_model" ||
    options.errorCode === "provider_error" ||
    options.errorCode === "internal"
  ) {
    return "hosted_route_unavailable"
  }
  return options.session?.session?.session_token ? "signed_in" : "signed_out"
}

// Single source of truth for "is the hosted session currently usable" — a stored
// session counts only when it has a token AND has not expired. popup, context menu
// and runtime all route off this same judgment.
export function isHostedSessionUsable(
  session?: StoredHostedSession | null,
  now: number = Date.now()
): boolean {
  const token = session?.session?.session_token
  if (typeof token !== "string" || !token.trim()) return false
  const expiresAt = Date.parse(session.session.expires_at)
  if (Number.isFinite(expiresAt) && expiresAt <= now) return false
  return true
}

export function requiresHostedSignInForRoute(options: {
  route: HostedRouteSelection
  session?: StoredHostedSession | null
}): boolean {
  return options.route === "hosted" && !isHostedSessionUsable(options.session)
}

// Decide whether a runtime AI request should take the hosted route. Hosted as a
// *saved default* yields to BYOK when the session isn't usable; only an explicit
// hosted request (or hosted being the only configured option) keeps the hosted
// route — which then surfaces sign-in required downstream.
export function selectConfiguredHostedRoute(options: {
  requestedRoute?: HostedRouteSelection
  hostedExplicit: boolean
  hostedIsSavedDefault: boolean
  hostedUsable: boolean
  hasByokFallback: boolean
}): boolean {
  if (options.requestedRoute === "byok") return false
  if (options.hostedExplicit) return true
  if (!options.hostedIsSavedDefault) return false
  return options.hostedUsable || !options.hasByokFallback
}

export function isByokBlockedByHostedSignIn(): boolean {
  return false
}

export function buildHostedAccountQuotaDisplay(options: {
  session?: StoredHostedSession | null
  status?: HostedAccountStatus
  labels: HostedQuotaDisplayLabels
}): HostedAccountQuotaDisplay {
  const fallback =
    options.status === "local_backend_unavailable"
      ? options.labels.unavailable
      : options.labels.unknown
  const me = options.session?.me
  const tier = me?.user?.tier ?? options.session?.session.user.tier
  const quota =
    options.status !== "local_backend_unavailable" &&
    me?.quota &&
    typeof me.quota === "object"
      ? (me.quota as { monthly?: unknown; daily?: unknown })
      : null

  return {
    tierLabel:
      tier === "free"
        ? options.labels.tierFree
        : tier === "paid"
          ? options.labels.tierPaid
          : fallback,
    monthlyQuotaLabel: formatHostedQuotaUsage(
      quota?.monthly,
      options.labels,
      fallback
    ),
    dailyQuotaLabel: formatHostedQuotaUsage(
      quota?.daily,
      options.labels,
      fallback
    ),
    resetLabel: formatHostedQuotaReset(
      quota?.monthly ?? quota?.daily,
      fallback
    )
  }
}

export function getHostedMonthlyQuotaWindow(
  session?: StoredHostedSession | null
): { limit: number; used: number; resets_at: string } | null {
  const me = session?.me
  if (!me || typeof me.quota !== "object" || !me.quota) return null
  const quota = me.quota as { monthly?: unknown }
  return normalizeHostedQuotaWindow(quota.monthly)
}

export function formatHostedQuotaUsage(
  value: unknown,
  labels: Pick<HostedQuotaDisplayLabels, "tokens">,
  fallback: string
): string {
  const quota = normalizeHostedQuotaWindow(value)
  if (!quota) return fallback
  return `${formatHostedQuotaNumber(quota.used)} / ${formatHostedQuotaNumber(
    quota.limit
  )} ${labels.tokens}`
}

export function formatHostedQuotaReset(
  value: unknown,
  fallback: string
): string {
  const quota = normalizeHostedQuotaWindow(value)
  if (!quota) return fallback
  const timestamp = Date.parse(quota.resets_at)
  if (!Number.isFinite(timestamp)) return fallback
  return formatHostedQuotaDateTime(timestamp)
}

function normalizeStoredHostedSession(
  value: unknown
): StoredHostedSession | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<StoredHostedSession>
  const token = candidate.session?.session_token
  const baseUrl = candidate.baseUrl

  if (typeof token !== "string" || !token.trim()) return null
  if (typeof baseUrl !== "string" || !resolveLocalHostedBaseUrl(baseUrl)) {
    return null
  }

  return candidate as StoredHostedSession
}

function normalizeHostedQuotaWindow(
  value: unknown
): { limit: number; used: number; resets_at: string } | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as {
    limit?: unknown
    used?: unknown
    resets_at?: unknown
  }

  if (!isFiniteQuotaNumber(candidate.limit)) return null
  if (!isFiniteQuotaNumber(candidate.used)) return null
  if (typeof candidate.resets_at !== "string" || !candidate.resets_at.trim()) {
    return null
  }

  return {
    limit: candidate.limit,
    used: candidate.used,
    resets_at: candidate.resets_at
  }
}

function isFiniteQuotaNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function formatHostedQuotaNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US")
}

function formatHostedQuotaDateTime(value: number): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}`
}
