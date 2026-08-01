# Supabase Auth Migration ADR

Status: accepted frontend migration spec for MON-119. MON-121 implements the
default-disabled frontend foundation only.

## MON-121 Implementation Note

MON-121 keeps the provider-neutral adapter, message/type rename, v2 hosted
session migration, and MON-42 safe failure mapping, but does not enable a real
Supabase sign-in path. The default adapter constants for the Supabase project
origin, anon key, and Google client ID intentionally remain empty. The exact
Supabase project origin/anon key, redirect allowlist, and manifest
host-permission activation are split into a separate owner-gated follow-up.

No Supabase host permission is added by MON-121, no real Supabase credentials
are committed, and tests use mocked/local fixtures only.

## Context

Aviso is pivoting the optional hosted path from the current Chrome
Identity/Google OAuth/custom hosted session flow to Supabase Auth. The frontend
work in MON-119 freezes the provider boundary for the next implementation task;
it does not implement Supabase sign-in and does not change live OAuth, session,
message, or BYOK behavior.

The following boundaries are fixed:

- BYOK remains independent. It never requires Aviso login.
- `selectConfiguredHostedRoute`, `requiresHostedSignInForRoute`, and
  `isByokBlockedByHostedSignIn` stay behaviorally unchanged. They ask only
  whether hosted has a usable session.
- `contextai_api_keys` and BYOK provider-config storage are not migration
  targets.
- Real Supabase credentials, provider calls, production changes, manifest
  changes, CWS action, and merges are out of scope.

## Storage Decision

Decision: MON-121 should add a version/provider marker to the values stored at
the existing hosted keys, and treat unversioned legacy values as invalid.

Current keys stay in place:

- `aviso_hosted_session`
- `aviso_hosted_sign_in_result`

New hosted-session values should use the current frontend-normalized hosted
session contract as the runtime-facing shape, but add explicit markers:

```ts
type StoredHostedSessionV2 = StoredHostedSession & {
  schemaVersion: 2
  authProvider: "supabase"
  tokenKind: "hosted_bearer"
}
```

`session.session_token` remains an opaque bearer token for existing hosted chat
and `/v1/me` consumers. Whether that bearer is a Supabase access token accepted
directly by the backend or a backend-issued wrapper is pending
`aviso-mon119-be`; the frontend must not infer the token origin from the field
name.

New hosted sign-in result values should use provider-neutral stage/source
vocabulary and the same marker:

```ts
type StoredHostedSignInResultV2 = {
  schemaVersion: 2
  authProvider: "supabase"
  status: HostedAccountStatus
  stage: ProviderNeutralHostedSignInStage
  error?: {
    source: ProviderNeutralHostedFailureSource
    code: string
    httpStatusClass?: HostedHttpStatusClass
  }
  updatedAt: number
}
```

Migration rule:

- If `aviso_hosted_session` is missing `schemaVersion: 2`, has a provider other
  than `supabase`, has an unknown `tokenKind`, has an unusable bearer, or fails
  the existing base URL checks, clear only `aviso_hosted_session`.
- If `aviso_hosted_sign_in_result` is missing `schemaVersion: 2`, has a provider
  other than `supabase`, or uses old stage/source vocabulary, clear only
  `aviso_hosted_sign_in_result`.
- Do not field-migrate legacy custom sessions. Old non-expired custom
  `session_token` values must not be accepted as Supabase-era sessions.
- Do not remove `contextai_settings`, `contextai_api_keys`,
  `contextai_history`, BYOK provider configs, default/fast provider settings,
  or user templates.

Why versioning rather than a pure clear-only one-off:

- The existing `isHostedSessionUsable` check intentionally treats any non-empty,
  non-expired `session.session_token` as usable. A marker prevents stale custom
  tokens from crossing the Supabase boundary.
- The marker gives future provider swaps a cheap rejection path without
  scattering provider checks across route selection.
- Clearing only the hosted keys preserves BYOK and keeps stale hosted defaults
  safe: explicit hosted use can surface sign-in-required UX, while BYOK fallback
  remains available.

## Rename Plan

MON-121 should rename provider-specific frontend protocol names before wiring
Supabase. Do not keep "Google" or "oauth" names in new Supabase-facing code
unless the term is describing a vendor error received from Supabase.

| Current name                       | Provider-neutral replacement           | Notes                                                                                                                                           |
| ---------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `HOSTED_GOOGLE_SIGN_IN`            | `HOSTED_SIGN_IN`                       | Message action remains extension-page only in `message-boundary.ts`. Keep a short compatibility shim only if MON-121 needs a transition window. |
| `HostedGoogleSignInData`           | `HostedSignInData`                     | Message response data remains status/stage/error only; no raw provider error, URL, token, or profile payload.                                   |
| `handleHostedGoogleSignIn`         | `handleHostedSignIn`                   | The handler should delegate to the active auth adapter.                                                                                         |
| `requestHostedGoogleIdentityToken` | Supabase adapter implementation detail | Do not preserve Chrome Identity naming for Supabase.                                                                                            |
| `challenge` stage                  | `sign_in_prepare`                      | Covers setup before provider interaction, if any. Supabase may no-op this stage.                                                                |
| `oauth` stage                      | `provider_auth`                        | Covers browser/provider interaction without naming OAuth as the frontend contract.                                                              |
| `auth_google` stage                | `session_exchange`                     | Covers converting provider auth state into the hosted bearer/session expected by Aviso.                                                         |
| `me` stage                         | `account_refresh`                      | Covers `/v1/me` or equivalent account refresh after sign-in.                                                                                    |
| `oauth` failure source             | `identity_provider`                    | Covers Supabase/Auth/provider denials without leaking vendor mechanics.                                                                         |
| `backend` failure source           | `hosted_backend`                       | Optional cleanup for consistency; still provider-neutral.                                                                                       |

Provider-neutral stage/source vocabulary:

```ts
type ProviderNeutralHostedSignInStage =
  | "client"
  | "sign_in_prepare"
  | "provider_auth"
  | "session_exchange"
  | "account_refresh"
  | "storage"
  | "done"

type ProviderNeutralHostedFailureSource =
  | "identity_provider"
  | "hosted_backend"
  | "storage"
  | "network"
  | "unknown"
```

## Frontend Auth Adapter

MON-121's Supabase implementation should conform to the provider-neutral
adapter in `src/utils/hosted-auth-adapter.ts`:

```ts
interface HostedAuthAdapter {
  providerId: string
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
```

Adapter responsibilities:

- Encapsulate Supabase Auth specifics, redirect parsing, token refresh, logout,
  and provider error normalization.
- Bind and resolve its hosted backend URL internally. Token-bearing adapter
  operations must not accept a caller-supplied raw `baseUrl` string; any
  implementation-level local-dev override must be normalized through the
  existing hosted base URL resolver before constructing clients or attaching a
  hosted bearer.
- Return or persist only the frontend-normalized hosted session shape.
- Keep `/v1/me` account refresh behind `refreshHostedAccount`.
- Sanitize provider errors before saving `aviso_hosted_sign_in_result` or
  showing MON-42 UI.
- Leave route selection, BYOK fallback, and provider config storage untouched.

Security decision for MON-119 review fix:

- Chosen approach: remove the raw `baseUrl` option from the public
  `HostedAuthAdapter` operation options.
- Rationale: backend origin selection is already a security boundary in the
  hosted runtime. Keeping URL binding inside the adapter lets MON-121 reuse the
  existing resolver at one implementation boundary instead of requiring every
  caller of sign-in, account refresh, or sign-out to remember the allowlist
  before a token-bearing request.
- Compile-only invariant: `src/utils/hosted-auth-adapter.typecheck.ts` asserts
  that `HostedSignInOptions`, `RefreshHostedAccountOptions`, and
  `SignOutHostedOptions` do not expose `baseUrl`.

## MON-42 Failure Mapping

The existing MON-42 user-visible categories remain complete:

- `cancelled`
- `invalid`
- `network`
- `rate_limited`
- `unavailable`

Supabase-specific inputs should be normalized into those categories before the
Popup consumes them:

| Supabase-side failure mode                                                  | Provider-neutral input                                                                                                                  | MON-42 category                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Invalid email/password, invalid one-time token, malformed callback state    | `source: "identity_provider"` or `source: "hosted_backend"`, `code: "invalid_credentials"` / `"invalid_token"` / `"bad_request"`, `4xx` | `invalid`                                                                                        |
| Magic link expired, session expired before exchange, refresh token rejected | `code: "session_expired"` / `"refresh_failed"` / `"unauthorized"`, `4xx`, status `expired`                                              | `invalid`                                                                                        |
| User denied provider consent / provider returned access denied              | `source: "identity_provider"`, `code: "access_denied"` / `"provider_denied"`                                                            | `cancelled` when user-denial is explicit; otherwise `invalid` for policy/permission-denied `4xx` |
| Supabase/auth API rate limit                                                | `code: "rate_limited"` or HTTP `429`                                                                                                    | `rate_limited`                                                                                   |
| Browser offline, DNS/TLS failure, fetch aborted before HTTP response        | `source: "network"` or thrown network error                                                                                             | `network`                                                                                        |
| Supabase/backend outage, provider 5xx, maintenance, unusable auth service   | `source: "identity_provider"` or `"hosted_backend"`, `5xx` / `service_unavailable`                                                      | `unavailable`                                                                                    |

The mapper must continue to exclude raw provider messages, raw callback URLs,
tokens, profile payloads, provider stack traces, and credential values from
stored sign-in results, UI strings, copied trace text, and project evidence.

## Account Deletion Consumption Assumption

MON-43 currently has no frontend implementation in this repository. It should
wait for the backend contract from `aviso-mon119-be` before building UI.

Frontend assumption for planning only:

- Method: `DELETE` to a backend-published public account endpoint under the
  existing `/v1` API namespace. Placeholder path for planning is
  `DELETE /v1/account`; exact path is pending `aviso-mon119-be`.
- Auth: `Authorization: Bearer <hosted bearer>` obtained from
  `getHostedSession()`. BYOK API keys are never sent, read, cleared, or used.
- Body: no body unless `aviso-mon119-be` publishes a confirmation or idempotency
  contract.
- Success states: backend reports deletion accepted, deletion completed, or
  already pending/already deleted. The frontend may clear only hosted session
  state after an accepted terminal or pending deletion state.
- Auth failure states: `401` or equivalent means the hosted session is expired
  or missing; show sign-in-required/expired UX and do not claim deletion.
- Conflict or forbidden states: backend may reject deletion because lifecycle,
  ownership, subscription/customer, or provider state is not in a deletable
  condition. Show a provider-neutral error and do not invent remediation beyond
  the backend-published state.
- Retry states: `429`, network failure, and `5xx` are retryable safe failures.

MON-43 must reconcile the final method/path/request body, success enum, error
enum, idempotency semantics, and lifecycle ordering with whatever
`aviso-mon119-be` publishes for Supabase Auth, Aviso data, Upstash metadata, and
Creem customer/subscription state.

## Validation Expected In MON-121

MON-121 should add focused tests before runtime changes for:

- Legacy unversioned hosted session and sign-in-result values are rejected or
  cleared without touching `contextai_api_keys`.
- `selectConfiguredHostedRoute`, `requiresHostedSignInForRoute`, and
  `isByokBlockedByHostedSignIn` keep their current behavior.
- `HOSTED_SIGN_IN`/`HostedSignInData` replace Google-specific names without
  widening message-boundary permissions.
- Supabase failures map into the existing MON-42 categories without raw
  provider leakage.
- BYOK fallback remains usable when hosted sign-in fails or the hosted session
  is stale.
