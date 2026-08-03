import type { I18nKey } from "~utils/i18n-core"
import {
  clearHostedSession,
  clearHostedSignInResult,
  isHostedSessionUsable,
  readHostedSession,
  readHostedSignInResult,
  type StoredHostedSession
} from "~utils/hosted-session"

export const BILLING_CHECKOUT_CONTRACT_PATH = "/v1/billing/checkout"
export const BILLING_PORTAL_CONTRACT_PATH = "/v1/billing/portal"
export const BILLING_CHECKOUT_BACKEND_PATH = "/billing/checkout"
export const BILLING_PORTAL_BACKEND_PATH = "/billing/portal"
export const BILLING_TRUSTED_EXTERNAL_ORIGINS = [
  "https://checkout.creem.io",
  "https://creem.io",
  "https://www.creem.io"
] as const

type BillingDestination = "checkout" | "portal"

type BillingSafeErrorReason =
  | "network"
  | "server"
  | "invalid_response"
  | "portal_unavailable"
  | "untrusted_url"

type BillingLocalAuthReason =
  | "missing_or_expired_session"
  | "unauthorized"

export type BillingRequestResult =
  | {
      kind: "success"
      destination: BillingDestination
      url: string
    }
  | {
      kind: "safe_error"
      destination: BillingDestination
      reason: BillingSafeErrorReason
      messageKey: I18nKey
      status?: number
      clearedHostedState: false
    }
  | {
      kind: "local_auth"
      destination: BillingDestination
      reason: BillingLocalAuthReason
      messageKey: I18nKey
      clearedHostedState: true
    }

export type BillingCheckoutOptions = BillingRequestOptions & {
  plan?: string
}

export type BillingPortalOptions = BillingRequestOptions

export type BillingRequestOptions = {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  timeoutMs?: number
  now?: number
  readSession?: () => Promise<StoredHostedSession | null>
  readSignInResult?: typeof readHostedSignInResult
  clearSession?: typeof clearHostedSession
  clearSignInResult?: typeof clearHostedSignInResult
}

export type BillingOpenResult =
  | {
      kind: "opened"
      url: string
    }
  | {
      kind: "blocked"
      reason: "untrusted_url"
      messageKey: I18nKey
    }
  | {
      kind: "failed"
      reason: "navigation_failed"
      messageKey: I18nKey
    }

export type BillingOpenOptions = {
  createTab?: (details: { url: string }) => void | Promise<void>
}

export type BillingSubscriptionRefreshResult =
  | {
      kind: "refreshed"
      source: "backend_account"
      tier: "free" | "paid"
      session: StoredHostedSession
      messageKey: I18nKey
    }
  | {
      kind: "signed_out"
      reason: BillingLocalAuthReason
      messageKey: I18nKey
      clearedHostedState: true
    }
  | {
      kind: "safe_error"
      reason: "network" | "invalid_response"
      messageKey: I18nKey
      clearedHostedState: false
    }

export type BillingSubscriptionRefreshOptions = {
  session?: StoredHostedSession | null
  returnUrl?: string
  now?: number
  refreshHostedAccount: (options: {
    session: StoredHostedSession
  }) => Promise<StoredHostedSession | null>
  clearSession?: typeof clearHostedSession
  clearSignInResult?: typeof clearHostedSignInResult
}

export async function requestBillingCheckout(
  options: BillingCheckoutOptions = {}
): Promise<BillingRequestResult> {
  const session = await getUsableBillingSession("checkout", options)
  if (session.kind !== "session") return session.result

  const body =
    typeof options.plan === "string" && options.plan.trim()
      ? JSON.stringify({ plan: options.plan.trim() })
      : undefined

  return await requestBillingUrl({
    destination: "checkout",
    session: session.session,
    path: BILLING_CHECKOUT_BACKEND_PATH,
    init: {
      method: "POST",
      signal: options.signal,
      ...(body ? { body } : {})
    },
    options
  })
}

export async function requestBillingPortal(
  options: BillingPortalOptions = {}
): Promise<BillingRequestResult> {
  const session = await getUsableBillingSession("portal", options)
  if (session.kind !== "session") return session.result

  return await requestBillingUrl({
    destination: "portal",
    session: session.session,
    path: BILLING_PORTAL_BACKEND_PATH,
    init: {
      method: "POST",
      signal: options.signal
    },
    options
  })
}

export function normalizeTrustedBillingExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return null
  }

  if (parsed.protocol !== "https:") return null
  if (!BILLING_TRUSTED_EXTERNAL_ORIGINS.includes(parsed.origin as any)) {
    return null
  }
  return parsed.toString()
}

export async function openTrustedBillingUrl(
  value: unknown,
  options: BillingOpenOptions = {}
): Promise<BillingOpenResult> {
  const url = normalizeTrustedBillingExternalUrl(value)
  if (!url) {
    return {
      kind: "blocked",
      reason: "untrusted_url",
      messageKey: "popup.billing.status.untrustedUrl" as I18nKey
    }
  }

  try {
    await (options.createTab ?? createDefaultBillingTab)({ url })
    return { kind: "opened", url }
  } catch {
    return {
      kind: "failed",
      reason: "navigation_failed",
      messageKey: "popup.billing.status.navigationFailed" as I18nKey
    }
  }
}

export async function refreshHostedSubscriptionStatus(
  options: BillingSubscriptionRefreshOptions
): Promise<BillingSubscriptionRefreshResult> {
  const session = options.session ?? null
  void options.returnUrl

  if (!isHostedSessionUsable(session, options.now)) {
    await clearHostedBillingState(options)
    return {
      kind: "signed_out",
      reason: "missing_or_expired_session",
      messageKey: "popup.billing.status.signedOut" as I18nKey,
      clearedHostedState: true
    }
  }

  try {
    const refreshed = await options.refreshHostedAccount({ session })
    if (!refreshed || !isHostedSessionUsable(refreshed, options.now)) {
      return {
        kind: "safe_error",
        reason: "invalid_response",
        messageKey: "popup.billing.status.invalid" as I18nKey,
        clearedHostedState: false
      }
    }
    return {
      kind: "refreshed",
      source: "backend_account",
      tier: getHostedBillingTier(refreshed),
      session: refreshed,
      messageKey: "popup.billing.status.refreshed" as I18nKey
    }
  } catch {
    return {
      kind: "safe_error",
      reason: "network",
      messageKey: "popup.billing.status.network" as I18nKey,
      clearedHostedState: false
    }
  }
}

export function getHostedBillingTier(
  session?: StoredHostedSession | null
): "free" | "paid" {
  const tier = session?.me?.user?.tier ?? session?.session?.user?.tier
  return tier === "paid" ? "paid" : "free"
}

async function getUsableBillingSession(
  destination: BillingDestination,
  options: BillingRequestOptions
): Promise<
  | { kind: "session"; session: StoredHostedSession }
  | { kind: "result"; result: BillingRequestResult }
> {
  const readSession = options.readSession ?? readHostedSession
  const readSignInResult = options.readSignInResult ?? readHostedSignInResult
  const [session] = await Promise.all([
    readSession(),
    readSignInResult().catch(() => null)
  ])

  if (!isHostedSessionUsable(session, options.now)) {
    await clearHostedBillingState(options)
    return {
      kind: "result",
      result: {
        kind: "local_auth",
        destination,
        reason: "missing_or_expired_session",
        messageKey: "popup.billing.status.signedOut" as I18nKey,
        clearedHostedState: true
      }
    }
  }

  return { kind: "session", session }
}

async function requestBillingUrl({
  destination,
  init,
  options,
  path,
  session
}: {
  destination: BillingDestination
  init: RequestInit
  options: BillingRequestOptions
  path: string
  session: StoredHostedSession
}): Promise<BillingRequestResult> {
  let response: Response
  try {
    response = await fetchWithBillingTimeout(
      options.fetchImpl ?? globalThis.fetch,
      `${session.baseUrl.replace(/\/$/, "")}${path}`,
      {
        ...init,
        headers: buildBillingHeaders({
          headers: init.headers,
          sessionToken: session.session.session_token,
          contentType: init.body ? "application/json" : undefined
        })
      },
      options.timeoutMs
    )
  } catch {
    return safeBillingError(destination, "network")
  }

  if (response.status === 401) {
    await clearHostedBillingState(options)
    return {
      kind: "local_auth",
      destination,
      reason: "unauthorized",
      messageKey: "popup.billing.status.signedOut" as I18nKey,
      clearedHostedState: true
    }
  }

  if (!response.ok) {
    if (destination === "portal" && response.status === 400) {
      return safeBillingError(destination, "portal_unavailable", response.status)
    }
    return safeBillingError(
      destination,
      response.status >= 500 ? "server" : "invalid_response",
      response.status
    )
  }

  const body = await safeReadBillingJson(response)
  const url = normalizeTrustedBillingExternalUrl(
    destination === "checkout"
      ? (body as { checkout_url?: unknown } | null)?.checkout_url
      : (body as { portal_url?: unknown } | null)?.portal_url
  )

  if (!url) return safeBillingError(destination, "untrusted_url", response.status)
  return { kind: "success", destination, url }
}

function safeBillingError(
  destination: BillingDestination,
  reason: BillingSafeErrorReason,
  status?: number
): BillingRequestResult {
  return {
    kind: "safe_error",
    destination,
    reason,
    messageKey: getBillingSafeErrorMessageKey(reason),
    ...(status ? { status } : {}),
    clearedHostedState: false
  }
}

function getBillingSafeErrorMessageKey(
  reason: BillingSafeErrorReason
): I18nKey {
  if (reason === "network") return "popup.billing.status.network" as I18nKey
  if (reason === "server") return "popup.billing.status.unavailable" as I18nKey
  if (reason === "portal_unavailable") {
    return "popup.billing.status.portalUnavailable" as I18nKey
  }
  if (reason === "untrusted_url") {
    return "popup.billing.status.untrustedUrl" as I18nKey
  }
  return "popup.billing.status.invalid" as I18nKey
}

function buildBillingHeaders({
  contentType,
  headers,
  sessionToken
}: {
  contentType?: string
  headers?: HeadersInit
  sessionToken: string
}): Headers {
  const next = new Headers(headers)
  next.set("Accept", "application/json")
  next.set("Authorization", `Bearer ${sessionToken}`)
  if (contentType) next.set("Content-Type", contentType)
  return next
}

async function clearHostedBillingState(
  options: Pick<BillingRequestOptions, "clearSession" | "clearSignInResult">
): Promise<void> {
  await Promise.allSettled([
    (options.clearSession ?? clearHostedSession)(),
    (options.clearSignInResult ?? clearHostedSignInResult)()
  ])
}

async function fetchWithBillingTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 15_000
): Promise<Response> {
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0
  if (!timeout) return await fetchImpl(input, init)

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    if (init.signal?.aborted) controller.abort()
    init.signal?.addEventListener("abort", abortFromCaller, { once: true })
    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error("billing_request_timeout"))
      }, timeout)
    })
    return await Promise.race([
      fetchImpl(input, { ...init, signal: controller.signal }),
      timeoutPromise
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    init.signal?.removeEventListener("abort", abortFromCaller)
  }
}

async function safeReadBillingJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function createDefaultBillingTab(details: { url: string }): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    await new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ url: details.url }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
    return
  }

  const open = globalThis.open
  if (typeof open === "function") {
    const opened = open(details.url, "_blank", "noopener,noreferrer")
    if (opened === null) throw new Error("billing_navigation_blocked")
    return
  }

  throw new Error("billing_navigation_unavailable")
}
