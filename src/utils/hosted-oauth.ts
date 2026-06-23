export const HOSTED_GOOGLE_OAUTH_CLIENT_ID =
  "870944741190-u0s87t8sdhr4fusqs53u2727pq1raj9d.apps.googleusercontent.com"

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_OAUTH_SCOPES = ["openid", "email", "profile"] as const

export type HostedGoogleOAuthErrorCode =
  | "config_missing"
  | "identity_unavailable"
  | "user_cancelled"
  | "oauth_error"
  | "redirect_invalid"
  | "id_token_missing"
  | "state_mismatch"

export class HostedGoogleOAuthError extends Error {
  readonly code: HostedGoogleOAuthErrorCode

  constructor(code: HostedGoogleOAuthErrorCode) {
    super(HOSTED_GOOGLE_OAUTH_ERROR_MESSAGES[code])
    this.name = "HostedGoogleOAuthError"
    this.code = code
  }
}

const HOSTED_GOOGLE_OAUTH_ERROR_MESSAGES: Record<
  HostedGoogleOAuthErrorCode,
  string
> = {
  config_missing: "Hosted Google OAuth is not configured.",
  identity_unavailable: "Chrome identity is unavailable.",
  user_cancelled: "Hosted Google sign-in was cancelled.",
  oauth_error: "Hosted Google sign-in failed.",
  redirect_invalid: "Hosted Google sign-in returned an invalid redirect.",
  id_token_missing: "Hosted Google sign-in did not return an identity token.",
  state_mismatch: "Hosted Google sign-in state did not match."
}

export type HostedGoogleOAuthLaunchWebAuthFlow = (
  details: { url: string; interactive: boolean },
  callback: (responseUrl?: string) => void
) => void

export type HostedGoogleOAuthOptions = {
  clientId?: string
  getRedirectUrl?: () => string
  launchWebAuthFlow?: HostedGoogleOAuthLaunchWebAuthFlow
  getLastError?: () => { message?: string } | undefined
  nonce?: string
  state?: string
}

export async function requestHostedGoogleIdToken(
  options: HostedGoogleOAuthOptions = {}
): Promise<string> {
  const clientId = options.clientId ?? HOSTED_GOOGLE_OAUTH_CLIENT_ID
  if (!clientId.trim()) {
    throw new HostedGoogleOAuthError("config_missing")
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
    throw new HostedGoogleOAuthError("identity_unavailable")
  }

  const redirectUri = getRedirectUrl()
  if (!redirectUri) {
    throw new HostedGoogleOAuthError("identity_unavailable")
  }

  const state = options.state ?? createHostedGoogleOAuthNonce()
  const nonce = options.nonce ?? createHostedGoogleOAuthNonce()
  const url = buildHostedGoogleOAuthUrl({
    clientId,
    redirectUri,
    nonce,
    state
  })

  return new Promise((resolve, reject) => {
    launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
      const lastError = getLastError()
      if (lastError) {
        reject(classifyChromeIdentityError(lastError.message))
        return
      }

      try {
        resolve(
          parseHostedGoogleOAuthRedirect(responseUrl, {
            expectedRedirectUri: redirectUri,
            expectedState: state
          })
        )
      } catch (error) {
        reject(error)
      }
    })
  })
}

export function buildHostedGoogleOAuthUrl(options: {
  clientId?: string
  redirectUri: string
  nonce: string
  state: string
}): string {
  const clientId = options.clientId ?? HOSTED_GOOGLE_OAUTH_CLIENT_ID
  if (!clientId.trim()) {
    throw new HostedGoogleOAuthError("config_missing")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: "id_token",
    response_mode: "fragment",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    prompt: "select_account",
    nonce: options.nonce,
    state: options.state
  })

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`
}

export function parseHostedGoogleOAuthRedirect(
  responseUrl: string | undefined,
  options: { expectedRedirectUri?: string; expectedState?: string } = {}
): string {
  if (!responseUrl) {
    throw new HostedGoogleOAuthError("user_cancelled")
  }

  let parsed: URL
  try {
    parsed = new URL(responseUrl)
  } catch {
    throw new HostedGoogleOAuthError("redirect_invalid")
  }

  if (options.expectedRedirectUri) {
    let expected: URL
    try {
      expected = new URL(options.expectedRedirectUri)
    } catch {
      throw new HostedGoogleOAuthError("redirect_invalid")
    }

    if (
      parsed.origin !== expected.origin ||
      parsed.pathname !== expected.pathname
    ) {
      throw new HostedGoogleOAuthError("redirect_invalid")
    }
  }

  const params =
    parsed.hash.length > 1
      ? new URLSearchParams(parsed.hash.slice(1))
      : parsed.searchParams

  if (params.get("error")) {
    throw new HostedGoogleOAuthError("oauth_error")
  }

  if (options.expectedState && params.get("state") !== options.expectedState) {
    throw new HostedGoogleOAuthError("state_mismatch")
  }

  const idToken = params.get("id_token")
  if (!idToken) {
    throw new HostedGoogleOAuthError("id_token_missing")
  }

  return idToken
}

export function createHostedGoogleOAuthNonce(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function classifyChromeIdentityError(
  message?: string
): HostedGoogleOAuthError {
  const normalized = message?.toLowerCase() ?? ""
  if (
    normalized.includes("cancel") ||
    normalized.includes("closed") ||
    normalized.includes("denied")
  ) {
    return new HostedGoogleOAuthError("user_cancelled")
  }
  return new HostedGoogleOAuthError("identity_unavailable")
}
