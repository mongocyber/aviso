import type {
  HostedAccountStatus,
  StoredHostedSession
} from "~utils/hosted-session"

export type HostedAuthProviderId = string

export type ProviderNeutralHostedSignInStage =
  | "client"
  | "sign_in_prepare"
  | "provider_auth"
  | "session_exchange"
  | "account_refresh"
  | "storage"
  | "done"

export type ProviderNeutralHostedFailureSource =
  | "identity_provider"
  | "hosted_backend"
  | "storage"
  | "network"
  | "unknown"

export type HostedHttpStatusClass =
  | "1xx"
  | "2xx"
  | "3xx"
  | "4xx"
  | "5xx"
  | "unknown"

export type ProviderNeutralHostedSignInFailure = {
  status: HostedAccountStatus
  stage: ProviderNeutralHostedSignInStage
  error: {
    source: ProviderNeutralHostedFailureSource
    code: string
    httpStatusClass?: HostedHttpStatusClass
  }
  traceId?: string
}

export type HostedSignInOptions = {
  interactive?: boolean
  signal?: AbortSignal
}

export type RefreshHostedAccountOptions = {
  session?: StoredHostedSession | null
  signal?: AbortSignal
}

export type SignOutHostedOptions = {
  session?: StoredHostedSession | null
  signal?: AbortSignal
}

export type NormalizeHostedSignInFailureContext = {
  stage?: ProviderNeutralHostedSignInStage
  source?: ProviderNeutralHostedFailureSource
  traceId?: string
}

export type HostedSignInResult = {
  status: HostedAccountStatus
  stage: ProviderNeutralHostedSignInStage
  session?: StoredHostedSession | null
  failure?: ProviderNeutralHostedSignInFailure
}

export interface HostedAuthAdapter {
  providerId: HostedAuthProviderId
  startHostedSignIn(options?: HostedSignInOptions): Promise<HostedSignInResult>
  getHostedSession(): Promise<StoredHostedSession | null>
  refreshHostedAccount(
    options?: RefreshHostedAccountOptions
  ): Promise<StoredHostedSession | null>
  signOutHosted(options?: SignOutHostedOptions): Promise<void>
  normalizeHostedSignInFailure(
    input: unknown,
    context?: NormalizeHostedSignInFailureContext
  ): ProviderNeutralHostedSignInFailure
}
