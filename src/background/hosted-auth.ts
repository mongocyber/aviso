import type { HostedGoogleSignInData } from "~types/messages"
import {
  createHostedAiClient,
  HostedAiClientError,
  type HostedAiMe,
  type HostedAiSession
} from "~utils/hosted-ai-client"
import {
  HostedGoogleOAuthError,
  requestHostedGoogleIdToken,
  type HostedGoogleOAuthErrorCode
} from "~utils/hosted-oauth"
import {
  HOSTED_AI_DEFAULT_BASE_URL,
  deriveHostedAccountStatus,
  saveHostedSession,
  type HostedAccountStatus
} from "~utils/hosted-session"

type HostedAuthClient = {
  baseUrl: string
  authGoogle: (body: { id_token: string }) => Promise<HostedAiSession>
  me: (sessionToken?: string) => Promise<HostedAiMe>
}

type HostedGoogleSignInDependencies = {
  client?: HostedAuthClient
  requestGoogleIdToken?: () => Promise<string>
  saveSession?: typeof saveHostedSession
}

export async function handleHostedGoogleSignIn(
  dependencies: HostedGoogleSignInDependencies = {}
): Promise<HostedGoogleSignInData> {
  let googleIdToken: string | null = null
  let stage: HostedGoogleSignInData["stage"] = "client"

  try {
    const client =
      dependencies.client ??
      createHostedAiClient({ baseUrl: HOSTED_AI_DEFAULT_BASE_URL })
    const requestGoogleIdToken =
      dependencies.requestGoogleIdToken ?? requestHostedGoogleIdToken
    const persistSession = dependencies.saveSession ?? saveHostedSession

    stage = "oauth"
    googleIdToken = await requestGoogleIdToken()
    stage = "auth_google"
    const session = await client.authGoogle({ id_token: googleIdToken })
    googleIdToken = null
    stage = "me"
    const me = await client.me(session.session_token)
    stage = "storage"
    await persistSession(session, { baseUrl: client.baseUrl, me })

    return {
      status: "signed_in",
      stage: "done"
    }
  } catch (error) {
    return normalizeHostedGoogleSignInFailure(error, stage)
  } finally {
    googleIdToken = null
  }
}

function normalizeHostedGoogleSignInFailure(
  error: unknown,
  stage: HostedGoogleSignInData["stage"]
): HostedGoogleSignInData {
  if (error instanceof HostedGoogleOAuthError) {
    return {
      status: getHostedOAuthFailureStatus(error.code),
      stage,
      error: {
        source: "oauth",
        code: error.code
      }
    }
  }

  if (error instanceof HostedAiClientError) {
    return {
      status: deriveHostedAccountStatus({
        session: null,
        errorCode: error.normalized.code
      }),
      stage,
      error: {
        source: "backend",
        code: error.normalized.code,
        httpStatusClass: toHttpStatusClass(error.normalized.status)
      }
    }
  }

  return {
    status: "local_backend_unavailable",
    stage,
    error: {
      source: "unknown",
      code: "unknown"
    }
  }
}

function getHostedOAuthFailureStatus(
  code: HostedGoogleOAuthErrorCode
): HostedAccountStatus {
  if (code === "user_cancelled") return "signed_out"
  if (code === "config_missing" || code === "state_mismatch") {
    return "request_invalid"
  }
  return "hosted_route_unavailable"
}

function toHttpStatusClass(
  status: number | undefined
): HostedGoogleSignInData["error"]["httpStatusClass"] {
  if (!status) return "unknown"
  if (status >= 100 && status < 200) return "1xx"
  if (status >= 200 && status < 300) return "2xx"
  if (status >= 300 && status < 400) return "3xx"
  if (status >= 400 && status < 500) return "4xx"
  if (status >= 500 && status < 600) return "5xx"
  return "unknown"
}
