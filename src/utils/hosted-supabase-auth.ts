import type {
  HostedAuthAdapter,
  HostedSignInResult,
  HostedSignInOptions,
  NormalizeHostedSignInFailureContext,
  ProviderNeutralHostedSignInFailure,
  ProviderNeutralHostedSignInStage,
  RefreshHostedAccountOptions,
  SignOutHostedOptions
} from "~utils/hosted-auth-adapter"
import {
  createHostedAiClient,
  HostedAiClientError,
  type HostedAiMe,
  type HostedAiSession
} from "~utils/hosted-ai-client"
import {
  clearHostedSession,
  clearHostedSignInResult,
  deriveHostedAccountStatus,
  HOSTED_AI_DEFAULT_BASE_URL,
  isHostedSessionUsable,
  readHostedSession,
  saveHostedSession,
  saveHostedSignInResult,
  updateHostedSessionMe,
  type HostedAccountStatus,
  type HostedHttpStatusClass,
  type StoredHostedSession
} from "~utils/hosted-session"

export const HOSTED_SUPABASE_AUTH_PROVIDER_ID = "supabase"
// Owner-gated activation values. MON-121 ships the provider-neutral foundation
// default-disabled; the exact Supabase project origin, anon key, redirect
// allowlist, and manifest host permission are a separate follow-up.
export const HOSTED_SUPABASE_AUTH_URL = ""
export const HOSTED_SUPABASE_ANON_KEY = ""
export const HOSTED_SUPABASE_GOOGLE_CLIENT_ID = ""

const GOOGLE_IDENTITY_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_IDENTITY_SCOPES = ["openid", "email", "profile"] as const
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])

export type HostedSupabaseAuthErrorCode =
  | "config_missing"
  | "identity_unavailable"
  | "user_cancelled"
  | "access_denied"
  | "provider_error"
  | "redirect_invalid"
  | "id_token_missing"
  | "state_mismatch"
  | "invalid_credentials"
  | "invalid_token"
  | "session_expired"
  | "refresh_failed"
  | "bad_request"
  | "unauthorized"
  | "rate_limited"
  | "service_unavailable"
  | "network_error"
  | "unknown"

export class HostedSupabaseAuthError extends Error {
  readonly code: HostedSupabaseAuthErrorCode
  readonly httpStatus?: number

  constructor(code: HostedSupabaseAuthErrorCode, httpStatus?: number) {
    super(HOSTED_SUPABASE_AUTH_ERROR_MESSAGES[code])
    this.name = "HostedSupabaseAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

const HOSTED_SUPABASE_AUTH_ERROR_MESSAGES: Record<
  HostedSupabaseAuthErrorCode,
  string
> = {
  config_missing: "Hosted sign-in is not configured.",
  identity_unavailable: "Hosted sign-in is unavailable.",
  user_cancelled: "Hosted sign-in was cancelled.",
  access_denied: "Hosted sign-in was cancelled.",
  provider_error: "Hosted sign-in failed.",
  redirect_invalid: "Hosted sign-in returned an invalid redirect.",
  id_token_missing: "Hosted sign-in did not return an identity token.",
  state_mismatch: "Hosted sign-in state did not match.",
  invalid_credentials: "Hosted sign-in credentials were invalid.",
  invalid_token: "Hosted sign-in token was invalid.",
  session_expired: "Hosted sign-in session expired.",
  refresh_failed: "Hosted sign-in refresh failed.",
  bad_request: "Hosted sign-in request was invalid.",
  unauthorized: "Hosted sign-in session was invalid.",
  rate_limited: "Hosted sign-in was rate limited.",
  service_unavailable: "Hosted sign-in is temporarily unavailable.",
  network_error: "Hosted sign-in could not reach the auth service.",
  unknown: "Hosted sign-in failed."
}

export type HostedSupabaseIdentityLaunchWebAuthFlow = (
  details: { url: string; interactive: boolean },
  callback: (responseUrl?: string) => void
) => void

export type HostedSupabaseNoncePair = {
  nonce: string
  hashedNonce: string
}

export type HostedSupabaseIdentityOptions = {
  clientId?: string
  getRedirectUrl?: () => string
  launchWebAuthFlow?: HostedSupabaseIdentityLaunchWebAuthFlow
  getLastError?: () => { message?: string } | undefined
  createNoncePair?: () => Promise<HostedSupabaseNoncePair>
  createState?: () => string
  interactive?: boolean
}

type HostedSupabaseTokenResponse = {
  access_token?: unknown
  token_type?: unknown
  expires_at?: unknown
  expires_in?: unknown
  user?: unknown
}

type HostedSupabaseAdapterClient = {
  baseUrl: string
  me: (sessionToken?: string) => Promise<HostedAiMe>
  logout?: (sessionToken?: string) => Promise<void>
}

export type SupabaseHostedAuthAdapterOptions = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  googleClientId?: string
  getRedirectUrl?: HostedSupabaseIdentityOptions["getRedirectUrl"]
  launchWebAuthFlow?: HostedSupabaseIdentityLaunchWebAuthFlow
  getLastError?: HostedSupabaseIdentityOptions["getLastError"]
  createNoncePair?: HostedSupabaseIdentityOptions["createNoncePair"]
  createState?: HostedSupabaseIdentityOptions["createState"]
  fetchImpl?: typeof fetch
  createHostedClient?: (sessionToken?: string) => HostedSupabaseAdapterClient
  saveSession?: typeof saveHostedSession
  saveSignInResult?: typeof saveHostedSignInResult
  clearSignInResult?: typeof clearHostedSignInResult
  clearSession?: typeof clearHostedSession
  readSession?: typeof readHostedSession
  updateSessionMe?: typeof updateHostedSessionMe
}

export function createSupabaseHostedAuthAdapter(
  dependencies: SupabaseHostedAuthAdapterOptions = {}
): HostedAuthAdapter {
  return {
    providerId: HOSTED_SUPABASE_AUTH_PROVIDER_ID,
    async startHostedSignIn(
      options: HostedSignInOptions = {}
    ): Promise<HostedSignInResult> {
      let idToken: string | null = null
      let stage: ProviderNeutralHostedSignInStage = "client"

      try {
        stage = "sign_in_prepare"
        assertHostedSupabaseAdapterConfigured(dependencies)

        stage = "provider_auth"
        const identity = await requestHostedSupabaseGoogleIdentityToken({
          clientId: dependencies.googleClientId,
          getRedirectUrl: dependencies.getRedirectUrl,
          launchWebAuthFlow: dependencies.launchWebAuthFlow,
          getLastError: dependencies.getLastError,
          createNoncePair: dependencies.createNoncePair,
          createState: dependencies.createState,
          interactive: options.interactive ?? true
        })
        idToken = identity.idToken

        stage = "session_exchange"
        const session = await signInWithSupabaseGoogleIdToken({
          supabaseUrl: dependencies.supabaseUrl,
          supabaseAnonKey: dependencies.supabaseAnonKey,
          idToken,
          nonce: identity.nonce,
          fetchImpl: dependencies.fetchImpl,
          signal: options.signal
        })
        idToken = null

        stage = "account_refresh"
        const client = createAdapterHostedClient(
          dependencies,
          session.session_token
        )
        const me = await client.me(session.session_token)

        stage = "storage"
        const stored = await (dependencies.saveSession ?? saveHostedSession)(
          session,
          { baseUrl: client.baseUrl, me }
        )
        try {
          await (dependencies.clearSignInResult ?? clearHostedSignInResult)()
        } catch {
          // Stale sign-in status cleanup should not fail a completed sign-in.
        }

        return {
          status: "signed_in",
          stage: "done",
          session: stored
        }
      } catch (error) {
        const failure = this.normalizeHostedSignInFailure(error, { stage })
        await persistHostedSignInFailure(failure, dependencies)
        return {
          status: failure.status,
          stage: failure.stage,
          failure
        }
      } finally {
        idToken = null
      }
    },
    getHostedSession(): Promise<StoredHostedSession | null> {
      return (dependencies.readSession ?? readHostedSession)()
    },
    async refreshHostedAccount(
      options: RefreshHostedAccountOptions = {}
    ): Promise<StoredHostedSession | null> {
      const session =
        options.session ?? (await (dependencies.readSession ?? readHostedSession)())
      if (!isHostedSessionUsable(session)) {
        await (dependencies.clearSession ?? clearHostedSession)()
        return null
      }

      try {
        const client = createAdapterHostedClient(
          dependencies,
          session.session.session_token
        )
        const me = await client.me(session.session.session_token)
        return await (dependencies.updateSessionMe ?? updateHostedSessionMe)(
          session,
          me
        )
      } catch (error) {
        if (
          error instanceof HostedAiClientError &&
          error.normalized.code === "unauthorized"
        ) {
          await (dependencies.clearSession ?? clearHostedSession)()
          return null
        }
        throw error
      }
    },
    async signOutHosted(options: SignOutHostedOptions = {}): Promise<void> {
      const session =
        options.session ?? (await (dependencies.readSession ?? readHostedSession)())
      try {
        if (session?.session.session_token) {
          await signOutSupabaseSession({
            supabaseUrl: dependencies.supabaseUrl,
            supabaseAnonKey: dependencies.supabaseAnonKey,
            sessionToken: session.session.session_token,
            fetchImpl: dependencies.fetchImpl,
            signal: options.signal
          })
        }
      } catch {
        // Local sign-out must clear stale hosted credentials even if remote
        // revocation cannot be reached.
      } finally {
        await (dependencies.clearSession ?? clearHostedSession)()
        await (dependencies.clearSignInResult ?? clearHostedSignInResult)()
      }
    },
    normalizeHostedSignInFailure(
      input: unknown,
      context: NormalizeHostedSignInFailureContext = {}
    ): ProviderNeutralHostedSignInFailure {
      return normalizeSupabaseHostedSignInFailure(input, context)
    }
  }
}

export const hostedAuthAdapter = createSupabaseHostedAuthAdapter()

function assertHostedSupabaseAdapterConfigured(
  dependencies: SupabaseHostedAuthAdapterOptions
): void {
  const googleClientId =
    dependencies.googleClientId ?? HOSTED_SUPABASE_GOOGLE_CLIENT_ID
  const supabaseAnonKey =
    dependencies.supabaseAnonKey ?? HOSTED_SUPABASE_ANON_KEY
  const supabaseUrl = resolveHostedSupabaseAuthUrl(dependencies.supabaseUrl)
  if (!googleClientId.trim() || !supabaseAnonKey.trim() || !supabaseUrl) {
    throw new HostedSupabaseAuthError("config_missing")
  }
}

export function buildHostedSupabaseGoogleIdentityUrl(options: {
  clientId?: string
  redirectUri: string
  state: string
  hashedNonce: string
}): string {
  const clientId = options.clientId ?? HOSTED_SUPABASE_GOOGLE_CLIENT_ID
  if (
    !clientId.trim() ||
    !isSafeProtocolParam(options.state) ||
    !isSafeProtocolParam(options.hashedNonce)
  ) {
    throw new HostedSupabaseAuthError("config_missing")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: "id_token",
    response_mode: "fragment",
    scope: GOOGLE_IDENTITY_SCOPES.join(" "),
    prompt: "select_account",
    nonce: options.hashedNonce,
    state: options.state
  })

  return `${GOOGLE_IDENTITY_AUTH_URL}?${params.toString()}`
}

export async function requestHostedSupabaseGoogleIdentityToken(
  options: HostedSupabaseIdentityOptions = {}
): Promise<{ idToken: string; nonce: string }> {
  const clientId = options.clientId ?? HOSTED_SUPABASE_GOOGLE_CLIENT_ID
  if (!clientId.trim()) {
    throw new HostedSupabaseAuthError("config_missing")
  }

  const chromeIdentity = globalThis.chrome?.identity
  const getRedirectUrl =
    options.getRedirectUrl ?? (() => chromeIdentity?.getRedirectURL())
  const launchWebAuthFlow =
    options.launchWebAuthFlow ??
    chromeIdentity?.launchWebAuthFlow?.bind(chromeIdentity)
  const getLastError =
    options.getLastError ?? (() => globalThis.chrome?.runtime?.lastError)

  if (!getRedirectUrl || !launchWebAuthFlow) {
    throw new HostedSupabaseAuthError("identity_unavailable")
  }

  const redirectUri = getRedirectUrl()
  if (!redirectUri) {
    throw new HostedSupabaseAuthError("identity_unavailable")
  }

  const noncePair = await (options.createNoncePair ??
    createHostedSupabaseNoncePair)()
  const state = (options.createState ?? createHostedSupabaseState)()
  const url = buildHostedSupabaseGoogleIdentityUrl({
    clientId,
    redirectUri,
    state,
    hashedNonce: noncePair.hashedNonce
  })

  return new Promise((resolve, reject) => {
    launchWebAuthFlow(
      { url, interactive: options.interactive ?? true },
      (responseUrl) => {
        const lastError = getLastError()
        if (lastError) {
          reject(classifyChromeIdentityError(lastError.message))
          return
        }

        try {
          const result = parseHostedSupabaseGoogleIdentityRedirect(
            responseUrl,
            {
              expectedRedirectUri: redirectUri,
              expectedState: state
            }
          )
          resolve({ idToken: result.idToken, nonce: noncePair.nonce })
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

export function parseHostedSupabaseGoogleIdentityRedirect(
  responseUrl: string | undefined,
  options: { expectedRedirectUri?: string; expectedState?: string } = {}
): { idToken: string } {
  if (!responseUrl) {
    throw new HostedSupabaseAuthError("user_cancelled")
  }

  let parsed: URL
  try {
    parsed = new URL(responseUrl)
  } catch {
    throw new HostedSupabaseAuthError("redirect_invalid")
  }

  if (options.expectedRedirectUri) {
    let expected: URL
    try {
      expected = new URL(options.expectedRedirectUri)
    } catch {
      throw new HostedSupabaseAuthError("redirect_invalid")
    }

    if (
      parsed.origin !== expected.origin ||
      parsed.pathname !== expected.pathname
    ) {
      throw new HostedSupabaseAuthError("redirect_invalid")
    }
  }

  const params =
    parsed.hash.length > 1
      ? new URLSearchParams(parsed.hash.slice(1))
      : parsed.searchParams
  const providerError = params.get("error")
  if (providerError) {
    throw new HostedSupabaseAuthError(
      providerError === "access_denied" ? "access_denied" : "provider_error"
    )
  }

  if (options.expectedState && params.get("state") !== options.expectedState) {
    throw new HostedSupabaseAuthError("state_mismatch")
  }

  const idToken = params.get("id_token")
  if (!idToken) {
    throw new HostedSupabaseAuthError("id_token_missing")
  }

  return { idToken }
}

export function resolveHostedSupabaseAuthUrl(
  supabaseUrl = HOSTED_SUPABASE_AUTH_URL
): string | null {
  if (!supabaseUrl.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(supabaseUrl.trim())
  } catch {
    return null
  }

  if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.origin
  }

  if (parsed.protocol !== "https:") return null
  if (!parsed.hostname.endsWith(".supabase.co")) return null
  if (parsed.search || parsed.hash) return null
  if (parsed.pathname !== "/" && parsed.pathname !== "") return null
  return parsed.origin
}

async function signInWithSupabaseGoogleIdToken(options: {
  supabaseUrl?: string
  supabaseAnonKey?: string
  idToken: string
  nonce: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}): Promise<HostedAiSession> {
  const supabaseUrl = resolveHostedSupabaseAuthUrl(options.supabaseUrl)
  const supabaseAnonKey = options.supabaseAnonKey ?? HOSTED_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey.trim()) {
    throw new HostedSupabaseAuthError("config_missing")
  }

  const response = await safeSupabaseFetch(
    options.fetchImpl ?? globalThis.fetch,
    `${supabaseUrl}/auth/v1/token?grant_type=id_token`,
    {
      method: "POST",
      signal: options.signal,
      headers: buildSupabaseAuthHeaders(supabaseAnonKey),
      body: JSON.stringify({
        provider: "google",
        id_token: options.idToken,
        nonce: options.nonce
      })
    }
  )

  if (!response.ok) throw await createSupabaseHttpError(response)
  return normalizeSupabaseHostedSession(await response.json())
}

async function signOutSupabaseSession(options: {
  supabaseUrl?: string
  supabaseAnonKey?: string
  sessionToken: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}): Promise<void> {
  const supabaseUrl = resolveHostedSupabaseAuthUrl(options.supabaseUrl)
  const supabaseAnonKey = options.supabaseAnonKey ?? HOSTED_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey.trim()) return

  const response = await safeSupabaseFetch(
    options.fetchImpl ?? globalThis.fetch,
    `${supabaseUrl}/auth/v1/logout`,
    {
      method: "POST",
      signal: options.signal,
      headers: buildSupabaseAuthHeaders(supabaseAnonKey, options.sessionToken)
    }
  )
  if (!response.ok) throw await createSupabaseHttpError(response)
}

async function safeSupabaseFetch(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  try {
    return await fetchImpl(input, init)
  } catch {
    throw new HostedSupabaseAuthError("network_error")
  }
}

function buildSupabaseAuthHeaders(
  anonKey: string,
  sessionToken?: string
): Headers {
  const headers = new Headers({
    apikey: anonKey,
    Authorization: `Bearer ${sessionToken ?? anonKey}`,
    "Content-Type": "application/json"
  })
  return headers
}

async function createSupabaseHttpError(
  response: Response
): Promise<HostedSupabaseAuthError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return new HostedSupabaseAuthError(
    normalizeSupabaseErrorCode(body, response.status),
    response.status
  )
}

function normalizeSupabaseHostedSession(
  value: unknown
): HostedAiSession {
  if (!value || typeof value !== "object") {
    throw new HostedSupabaseAuthError("invalid_token")
  }
  const candidate = value as HostedSupabaseTokenResponse
  const accessToken = candidate.access_token
  const user = normalizeSupabaseUser(candidate.user)
  if (typeof accessToken !== "string" || !accessToken.trim() || !user) {
    throw new HostedSupabaseAuthError("invalid_token")
  }

  return {
    session_token: accessToken,
    expires_at: normalizeSupabaseExpiresAt(candidate),
    user
  }
}

function normalizeSupabaseUser(value: unknown): HostedAiSession["user"] | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as { id?: unknown; email?: unknown }
  if (typeof candidate.id !== "string" || !candidate.id.trim()) return null

  return {
    id: candidate.id,
    email: typeof candidate.email === "string" ? candidate.email : undefined,
    tier: "free",
    region: "global"
  }
}

function normalizeSupabaseExpiresAt(
  candidate: HostedSupabaseTokenResponse
): string {
  if (typeof candidate.expires_at === "number") {
    return new Date(candidate.expires_at * 1000).toISOString()
  }
  if (typeof candidate.expires_at === "string") {
    const parsed = Date.parse(candidate.expires_at)
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
  }
  if (typeof candidate.expires_in === "number" && candidate.expires_in > 0) {
    return new Date(Date.now() + candidate.expires_in * 1000).toISOString()
  }
  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

function normalizeSupabaseErrorCode(
  body: unknown,
  status?: number
): HostedSupabaseAuthErrorCode {
  const raw = getSupabaseErrorCodeText(body).toLowerCase()
  if (status === 429 || raw.includes("rate")) return "rate_limited"
  if (status && status >= 500) return "service_unavailable"
  if (status === 401 || raw.includes("unauthorized")) return "unauthorized"
  if (raw.includes("expired")) return "session_expired"
  if (raw.includes("invalid_credentials")) return "invalid_credentials"
  if (raw.includes("invalid") && raw.includes("token")) return "invalid_token"
  if (raw.includes("bad") || status === 400) return "bad_request"
  return status && status >= 400 && status < 500 ? "bad_request" : "unknown"
}

function getSupabaseErrorCodeText(body: unknown): string {
  if (!body || typeof body !== "object") return ""
  const candidate = body as {
    error?: unknown
    error_code?: unknown
    code?: unknown
    msg?: unknown
  }
  for (const value of [
    candidate.error_code,
    isRecord(candidate.error) ? candidate.error.code : undefined,
    candidate.code,
    candidate.error,
    candidate.msg
  ]) {
    if (typeof value === "string" && value.trim()) return value
  }
  return ""
}

function normalizeSupabaseHostedSignInFailure(
  input: unknown,
  context: NormalizeHostedSignInFailureContext
): ProviderNeutralHostedSignInFailure {
  const stage = context.stage ?? "client"
  const traceId =
    typeof context.traceId === "string" && context.traceId.trim()
      ? context.traceId
      : undefined

  if (input instanceof HostedSupabaseAuthError) {
    return {
      status: getSupabaseFailureStatus(input.code),
      stage,
      error: {
        source:
          context.source ??
          (input.code === "network_error" ? "network" : "identity_provider"),
        code: input.code,
        httpStatusClass: toHttpStatusClass(input.httpStatus)
      },
      ...(traceId ? { traceId } : {})
    }
  }

  if (input instanceof HostedAiClientError) {
    return {
      status: deriveHostedAccountStatus({
        session: null,
        errorCode: input.normalized.code
      }),
      stage,
      error: {
        source: context.source ?? "hosted_backend",
        code: input.normalized.code,
        httpStatusClass: toHttpStatusClass(input.normalized.status)
      },
      ...(traceId ? { traceId } : {})
    }
  }

  if (input instanceof Error) {
    return {
      status: "local_backend_unavailable",
      stage,
      error: {
        source: context.source ?? "network",
        code: "network_error"
      },
      ...(traceId ? { traceId } : {})
    }
  }

  return {
    status: "hosted_route_unavailable",
    stage,
    error: {
      source: context.source ?? "unknown",
      code: "unknown"
    },
    ...(traceId ? { traceId } : {})
  }
}

async function persistHostedSignInFailure(
  failure: ProviderNeutralHostedSignInFailure,
  dependencies: SupabaseHostedAuthAdapterOptions
): Promise<void> {
  try {
    if (failure.status === "signed_out") {
      await (dependencies.clearSignInResult ?? clearHostedSignInResult)()
      return
    }
    await (dependencies.saveSignInResult ?? saveHostedSignInResult)({
      status: failure.status,
      stage: failure.stage,
      error: failure.error
    })
  } catch {
    // Failure reporting must not mask the underlying auth result.
  }
}

function getSupabaseFailureStatus(
  code: HostedSupabaseAuthErrorCode
): HostedAccountStatus {
  if (code === "user_cancelled" || code === "access_denied") return "signed_out"
  if (code === "rate_limited") return "rate_limited"
  if (
    code === "unauthorized" ||
    code === "session_expired" ||
    code === "refresh_failed"
  ) {
    return "expired"
  }
  if (
    code === "config_missing" ||
    code === "redirect_invalid" ||
    code === "id_token_missing" ||
    code === "state_mismatch" ||
    code === "invalid_credentials" ||
    code === "invalid_token" ||
    code === "bad_request"
  ) {
    return "request_invalid"
  }
  if (code === "network_error") return "local_backend_unavailable"
  return "hosted_route_unavailable"
}

function toHttpStatusClass(status: number | undefined): HostedHttpStatusClass {
  if (!status) return "unknown"
  if (status >= 100 && status < 200) return "1xx"
  if (status >= 200 && status < 300) return "2xx"
  if (status >= 300 && status < 400) return "3xx"
  if (status >= 400 && status < 500) return "4xx"
  if (status >= 500 && status < 600) return "5xx"
  return "unknown"
}

function classifyChromeIdentityError(
  message?: string
): HostedSupabaseAuthError {
  const normalized = message?.toLowerCase() ?? ""
  if (
    normalized.includes("cancel") ||
    normalized.includes("closed") ||
    normalized.includes("denied")
  ) {
    return new HostedSupabaseAuthError("user_cancelled")
  }
  return new HostedSupabaseAuthError("identity_unavailable")
}

function createAdapterHostedClient(
  dependencies: SupabaseHostedAuthAdapterOptions,
  sessionToken?: string
): HostedSupabaseAdapterClient {
  return dependencies.createHostedClient
    ? dependencies.createHostedClient(sessionToken)
    : createHostedAiClient({
        baseUrl: HOSTED_AI_DEFAULT_BASE_URL,
        sessionToken
      })
}

async function createHostedSupabaseNoncePair(): Promise<HostedSupabaseNoncePair> {
  const nonce = createHostedSupabaseState()
  return {
    nonce,
    hashedNonce: await sha256Hex(nonce)
  }
}

function createHostedSupabaseState(): string {
  const bytes = new Uint8Array(32)
  globalThis.crypto?.getRandomValues?.(bytes)
  if (bytes.every((byte) => byte === 0)) {
    throw new HostedSupabaseAuthError("identity_unavailable")
  }
  return bytesToBase64Url(bytes)
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto?.subtle?.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  if (!digest) throw new HostedSupabaseAuthError("identity_unavailable")
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  if (typeof btoa === "function") {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function isSafeProtocolParam(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
