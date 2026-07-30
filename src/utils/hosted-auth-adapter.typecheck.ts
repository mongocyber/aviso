import type {
  HostedAuthAdapter,
  HostedSignInOptions,
  HostedSignInResult,
  NormalizeHostedSignInFailureContext,
  ProviderNeutralHostedSignInFailure,
  RefreshHostedAccountOptions,
  SignOutHostedOptions
} from "~utils/hosted-auth-adapter"
import type { StoredHostedSession } from "~utils/hosted-session"

type IsAssignable<T, U> = T extends U ? true : false
type Assert<T extends true> = T
type HasNoBaseUrl<T> = "baseUrl" extends keyof T ? false : true

type SupabaseAdapterSketch = {
  providerId: "supabase"
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

export type HostedAuthAdapterCompileCheck = Assert<
  IsAssignable<SupabaseAdapterSketch, HostedAuthAdapter>
>

export type HostedSignInOptionsDoNotExposeRawBaseUrl = Assert<
  HasNoBaseUrl<HostedSignInOptions>
>
export type RefreshHostedAccountOptionsDoNotExposeRawBaseUrl = Assert<
  HasNoBaseUrl<RefreshHostedAccountOptions>
>
export type SignOutHostedOptionsDoNotExposeRawBaseUrl = Assert<
  HasNoBaseUrl<SignOutHostedOptions>
>
