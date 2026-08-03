import type { I18nKey } from "~utils/i18n-core"
import {
  clearHostedSession,
  clearHostedSignInResult,
  isHostedSessionUsable,
  readHostedSession,
  readHostedSignInResult,
  type StoredHostedSession
} from "~utils/hosted-session"

export const ACCOUNT_DELETION_CONTRACT_PATH = "/v1/account/deletion"
export const ACCOUNT_DELETION_BACKEND_PATH = "/account/deletion"
export const ACCOUNT_DELETION_BACKEND_STATES = [
  "accepted",
  "processing",
  "completed",
  "retry"
] as const

export type AccountDeletionBackendState =
  (typeof ACCOUNT_DELETION_BACKEND_STATES)[number]

export type AccountDeletionDialogStep =
  | "idle"
  | "scope"
  | "second_confirm"
  | "processing"

export type AccountDeletionDialogAction =
  | "open"
  | "continue"
  | "confirm"
  | "retry"
  | "cancel"
  | "close"

export type AccountDeletionDialogEffect = {
  closeDialog: boolean
  nextStep: AccountDeletionDialogStep
  submit: boolean
}

export type AccountDeletionRequestResult =
  | {
      kind: "backend"
      state: AccountDeletionBackendState
      clearedHostedState: boolean
    }
  | {
      kind: "safe_retry"
      state: "retry"
      reason: "network" | "server" | "invalid_response"
      clearedHostedState: false
    }
  | {
      kind: "local_auth"
      reason: "missing_or_expired_session" | "unauthorized"
      clearedHostedState: true
    }

export type RequestAccountDeletionOptions = {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  timeoutMs?: number
  now?: number
  readSession?: () => Promise<StoredHostedSession | null>
  readSignInResult?: typeof readHostedSignInResult
  clearSession?: typeof clearHostedSession
  clearSignInResult?: typeof clearHostedSignInResult
}

export function normalizeAccountDeletionResponse(
  value: unknown
): AccountDeletionBackendState {
  if (isAccountDeletionBackendState(value)) return value
  if (!value || typeof value !== "object") return "retry"
  const state = (value as { state?: unknown }).state
  return isAccountDeletionBackendState(state) ? state : "retry"
}

export function getAccountDeletionStateLabelKey(
  state: AccountDeletionBackendState
): I18nKey {
  return `popup.accountDeletion.state.${state}` as I18nKey
}

export function resolveAccountDeletionDialogAction(
  action: AccountDeletionDialogAction,
  current: { step: AccountDeletionDialogStep }
): AccountDeletionDialogEffect {
  if (action === "cancel" || action === "close") {
    return { closeDialog: true, nextStep: "idle", submit: false }
  }
  if (action === "open") {
    return { closeDialog: false, nextStep: "scope", submit: false }
  }
  if (action === "continue" && current.step === "scope") {
    return { closeDialog: false, nextStep: "second_confirm", submit: false }
  }
  if (action === "confirm" && current.step === "second_confirm") {
    return { closeDialog: false, nextStep: "processing", submit: true }
  }
  if (action === "retry") {
    return { closeDialog: false, nextStep: "processing", submit: true }
  }
  return { closeDialog: false, nextStep: current.step, submit: false }
}

export async function requestAccountDeletion(
  options: RequestAccountDeletionOptions = {}
): Promise<AccountDeletionRequestResult> {
  const readSession = options.readSession ?? readHostedSession
  const readSignInResult = options.readSignInResult ?? readHostedSignInResult

  const [session] = await Promise.all([
    readSession(),
    readSignInResult().catch(() => null)
  ])

  if (!isHostedSessionUsable(session, options.now)) {
    await clearHostedDeletionState(options)
    return {
      kind: "local_auth",
      reason: "missing_or_expired_session",
      clearedHostedState: true
    }
  }

  let response: Response
  try {
    response = await fetchWithDeletionTimeout(
      options.fetchImpl ?? globalThis.fetch,
      buildAccountDeletionUrl(session.baseUrl),
      {
        method: "POST",
        signal: options.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.session.session_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirm: true })
      },
      options.timeoutMs
    )
  } catch {
    return {
      kind: "safe_retry",
      state: "retry",
      reason: "network",
      clearedHostedState: false
    }
  }

  if (response.status === 401) {
    await clearHostedDeletionState(options)
    return {
      kind: "local_auth",
      reason: "unauthorized",
      clearedHostedState: true
    }
  }

  if (!response.ok) {
    return {
      kind: "safe_retry",
      state: "retry",
      reason: response.status >= 500 ? "server" : "invalid_response",
      clearedHostedState: false
    }
  }

  const state = normalizeAccountDeletionResponse(await safeReadJson(response))
  if (state === "retry") {
    return {
      kind: "backend",
      state,
      clearedHostedState: false
    }
  }

  await clearHostedDeletionState(options)
  return {
    kind: "backend",
    state,
    clearedHostedState: true
  }
}

function isAccountDeletionBackendState(
  value: unknown
): value is AccountDeletionBackendState {
  return ACCOUNT_DELETION_BACKEND_STATES.includes(
    value as AccountDeletionBackendState
  )
}

function buildAccountDeletionUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}${ACCOUNT_DELETION_BACKEND_PATH}`
}

async function clearHostedDeletionState(
  options: Pick<
    RequestAccountDeletionOptions,
    "clearSession" | "clearSignInResult"
  >
): Promise<void> {
  await Promise.allSettled([
    (options.clearSession ?? clearHostedSession)(),
    (options.clearSignInResult ?? clearHostedSignInResult)()
  ])
}

async function fetchWithDeletionTimeout(
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
        reject(new Error("account_deletion_timeout"))
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

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
