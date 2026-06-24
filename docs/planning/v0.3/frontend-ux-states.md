# Aviso v0.3 Frontend UX States

Status: `completed / UX-state-design / implementation-ready / local-only`
Updated: 2026-06-18

This file defines the expected extension states for BYOK plus hosted AI. It is a planning artifact, not an implementation approval.

2026-06-23 update: this UX plan was written for the first local-only slice. Linear `MON-20` later approved the exact staging backend config, host permission, `identity` permission, and staging frontend OAuth identity-token handling. The UI principles here still apply, but loaded-extension OAuth smoke, production, public copy, billing, and CWS disclosure remain separate gates. Current execution state lives in [`status.md`](./status.md) and [`release-gates.md`](./release-gates.md).

## UX Principles

- BYOK remains first-class and does not require login.
- Hosted AI is optional and asks for login only when the user chooses or needs hosted AI.
- The first implementation phase is local mock / local backend only.
- The UI should explain account, quota, and fallback states without making public launch claims.
- Error states should give the user a next action without exposing raw backend or provider details.

## State Matrix

| State | Trigger | UI Behavior | Backend Path | Fallback | Stop Lines |
| --- | --- | --- | --- | --- | --- |
| BYOK configured, signed out | User has provider key and no hosted session. | Keep normal BYOK actions available. Hosted AI can be shown as optional. | None for BYOK. | BYOK direct-provider. | Do not force sign-in. |
| No BYOK, signed out | User has no provider key and chooses an AI action. | Offer hosted AI sign-in and keep settings path visible. | Local mock auth only in first slice. | User can configure BYOK instead. | No global account wall. |
| Signed in free, quota available | Hosted session exists and `/v1/me` returns usable quota. | Show hosted route as available with quota/account surface. | `GET /v1/me`, `POST /v1/chat`. | BYOK if configured. | Do not publish placeholder quota. |
| Signed in free, quota exhausted | `/v1/me` or chat error says quota is exhausted. | Explain quota state and suggest BYOK fallback if configured. | `GET /v1/me`, chat error mapping. | BYOK if configured. | No paid upsell launch in first release. |
| Both BYOK and hosted available | User has local provider key and hosted session. | Allow clear route choice or sensible default without hiding either path. | Hosted only when selected. | Switch to BYOK on hosted failure. | Do not overwrite BYOK settings. |
| Hosted unavailable | Local backend is offline or returns unavailable state. | Show hosted unavailable state and preserve BYOK path. | Local backend only. | BYOK if configured, or retry later. | No staging or production backend assumption. |
| Auth expired or revoked | Backend returns unauthorized or session is missing. | Ask user to sign in again only for hosted AI. | `POST /v1/auth/google` after user action. | BYOK if configured. | Do not clear BYOK settings. |
| Provider or model route error | Backend returns provider/model error. | Explain hosted route is temporarily unavailable or unsupported. | `POST /v1/chat` error. | BYOK if configured. | Do not expose raw provider error payloads. |
| Rate limited | Backend returns rate-limit state. | Tell user to wait or switch to BYOK if available. | Error mapping. | BYOK if configured. | Do not promise exact reset if backend does not provide it. |
| Bad request or internal error | Contract validation or unexpected server error. | Show recoverable error copy and allow retry where safe. | Error mapping. | BYOK if configured. | Do not log raw prompt or page content. |
| Privacy/account/quota read state | User opens settings or account area. | Show account, quota, provider path, and privacy summary in product UI. | `GET /v1/me`. | BYOK settings remain separate. | Public policy/CWS copy stays release-gated. |

## V03-FE01 Implementation UX Decisions

This section converts the matrix above into the current extension surfaces. It is still a docs-plan; it does not approve product-code changes, host permissions, public copy, staging, production, live OAuth, real provider calls, or billing.

### First Local Slice Surfaces

| Surface | Current role | Hosted AI first-slice behavior | BYOK behavior |
| --- | --- | --- | --- |
| Popup general tab / current model area | Shows current route, service readiness, common feature toggles, and path to AI service setup. | Add a compact hosted route/account summary only when local hosted client is enabled or the user has a hosted session. Show local-only status such as signed out, signed in, quota available, quota exhausted, or local backend unavailable. | Keep current provider route as the primary no-login path. If no provider is configured, keep the existing configure-service action visible. |
| Popup API / AI service tab | Stores BYOK provider configs and provider connectivity test results. | Add hosted account controls here or adjacent to this tab: sign in, sign out, refresh account/quota, and local backend status. Do not mix hosted session storage with API key storage. | Preserve API key cards, provider config names, model IDs, connectivity tests, default provider selection, and local encryption behavior. |
| Floating result window | Displays streaming AI output, loading state, errors, stop/copy/save/follow-up. | Show hosted route status inline when the active request uses hosted AI: sign-in required, quota exhausted, rate limited, unavailable, or route failed. Error actions should be visible near the error message. | If BYOK is configured, show "switch to BYOK" / "retry with BYOK" as an action after hosted failure. Normal direct-provider results should not require hosted account UI. |
| Selection toolbar / context menu triggered floating flow | Starts translate, explain, polish, summarize, custom, and image/screenshot flows that render in the floating window. | Do not add a global login wall before opening tools. If the chosen action needs hosted AI and no session exists, open the floating window with a just-in-time hosted sign-in prompt for that action. | Existing selection and context-menu AI actions continue through BYOK when a provider route is configured. |
| Command palette quick actions | Starts page summarize/translate and other local commands, then displays the floating window. | For hosted-only local tests, show the same just-in-time hosted sign-in or hosted error state in the floating window after the user chooses the AI command. | Local commands and BYOK-backed AI commands stay available without hosted login. |
| History and templates | Stores prior local conversation UI and user templates. | No hosted account or quota state in the first slice. Hosted results may use existing approved history behavior only; no new raw-content persistence. | Existing history/template behavior remains unchanged. |

Screenshot entry points stay out of the public hosted-AI UX for the first slice; keep the existing internal right-click boundary.

### BYOK First-Class Rule

- BYOK remains usable without account creation, hosted sign-in, backend session, quota lookup, or `/v1/me`.
- The default provider route should continue to resolve from existing provider settings until the owner approves a different default. Hosted AI is an optional route, not a replacement.
- "Configure your own API key" must remain visible in empty, signed-out, hosted-unavailable, quota-exhausted, and auth-expired states.
- Hosted failures must not clear BYOK settings, change default provider config, migrate `contextai_api_keys`, or overwrite provider connectivity state.

### Just-In-Time Hosted Sign-In

Hosted sign-in belongs at the moment the user chooses hosted AI or an AI action cannot proceed because no BYOK route is configured and hosted AI is the selected local route.

Use two entry points:

- Popup API/account area: explicit hosted account sign-in for users who want to set it up before using actions.
- Floating result window: inline sign-in prompt for the current AI action, with secondary actions to configure BYOK or cancel.

Do not show a global sign-in wall when the extension opens. Common feature toggles, templates, history, BYOK settings, and local non-AI commands must remain reachable while signed out.

### Account And Quota Placement

Primary placement is the popup API/account area because account, quota, local backend status, and BYOK provider setup are settings-level concerns. The popup general tab may show a compact route/account summary for the active route.

2026-06-24 update (MON-26, see [`../../issues/V03-FE09-hosted-signin-ux-redesign.md`](../../issues/V03-FE09-hosted-signin-ux-redesign.md)): a persistent account chip is added to the popup header as the primary at-a-glance identity surface. It shows signed-out vs signed-in plus the account tier, and opens a compact account panel (monthly quota meter, reset timing, refresh, manage-in-AI-services, sign out). This supersedes the earlier "account state lives only in the API tab" placement: the API/AI-service tab stays the settings-level detail/config surface, while the header chip + panel make login state explicit on every tab. The general tab additionally surfaces a non-blocking zero-state with a dual entry (sign in for free hosted quota, or add your own API key) when the user has neither a hosted session nor any BYOK config. No global sign-in wall is introduced, and paid/subscription/upgrade entries remain deferred per decision `0003`.

The floating window should show only request-relevant account/quota states: sign in required, quota exhausted, rate limited, auth expired, hosted unavailable, or active hosted route. It should not become the main account dashboard.

Quota copy in the local slice may reference account usage from `/v1/me`, but placeholder quota values remain development/QA details and must not become public marketing or Chrome Web Store copy.

### Error And Fallback Actions

| Contract state | Popup behavior | Floating / command behavior | Primary action | Secondary action |
| --- | --- | --- | --- | --- |
| Hosted unavailable / `service_unavailable` | Show local backend unavailable or hosted route unavailable. Keep BYOK config visible. | Preserve any partial result if streaming started, then show hosted unavailable. | Retry hosted when local backend is available. | Switch to BYOK if configured, or configure BYOK. |
| Quota exhausted / `quota_exceeded` | Show quota exhausted in hosted account area. Do not show paid-plan promise in first slice. | Tell the user free hosted quota is used up for now. | Switch to BYOK if configured. | Configure BYOK or wait for reset if `/v1/me` provides reset timing. |
| Auth expired / `unauthorized` | Mark hosted session expired and offer sign in again. | Ask for hosted sign-in only for the hosted action. | Sign in again. | Switch to BYOK if configured. |
| Rate limited / `rate_limited` | Show temporary rate limit with no exact reset unless contract provides one. | Tell the user to wait before retrying. Avoid automatic retry loops. | Retry later. | Switch to BYOK if configured. |
| Provider/model route failed / `provider_error` or `forbidden_model` | Show hosted route/model unavailable, without raw provider payload. | Explain the hosted route failed or the model is unavailable. | Retry hosted or fall back to `free-small` when contract says it is safe. | Switch to BYOK if configured. |
| Bad request / `bad_request` | Treat as local integration issue, not user setup failure. | Show request failed and allow safe retry after code/config fix. | Retry after local fix. | Use BYOK only if the user is blocked and BYOK is configured. |
| Internal error / `internal` | Show service error and local-only debug-safe status. | Show service error without raw prompt, response, page body, URL, screenshot/base64, or provider payload. | Retry. | Switch to BYOK if configured. |

### Deferred Release-Gate States

The following remain deferred until explicit release gates or owner approval:

- Public website, privacy policy, and Chrome Web Store hosted-AI copy.
- Paid plan, checkout, billing provider, upgrade CTA, and paid quota wording.
- Staging backend, production backend, backend domain, and Chrome host permission changes.
- Real Google OAuth credentials, real provider validation, real OpenRouter/downstream provider claims, and secrets.
- `X-Install-Id`, install/device signal persistence, and any related privacy/abuse-control disclosure.
- Public screenshot positioning or ordinary-user screenshot hosted-AI entry points.

### FE02 Readiness

`V03-FE02 Backend client and contract integration` is unblocked from UX/copy planning. It may start as a local-only implementation using the `V03-SH01` decision: small local typed wrapper consuming `@aviso/contract`, local-only base URL injection, `Idempotency-Key` included, and `X-Install-Id` excluded.

`V03-FE02` must still stop before host permission changes, production URL defaults, live OAuth, real provider calls, billing, public copy, API key storage changes, or product-code scope outside the local hosted client integration.

## Copy Rules

Use concise product copy. The exact public-facing wording should be finalized later, but the local implementation should follow these principles:

- For BYOK: "Use your own provider key" should remain a normal path, not a fallback-only path.
- For hosted AI: describe it as a signed-in hosted route, not as a production launch claim.
- For quota: use account and usage language, not promotional language.
- For errors: name the user action, such as sign in again, wait and retry, switch to BYOK, or configure a key.
- For privacy: state the route truth plainly: hosted requests pass through Aviso backend and downstream AI providers; raw content is not persisted by Aviso backend under the planned policy.

## First Frontend Issue Input

This file completed `V03-FE01 Hosted/BYOK UX design`.

`V03-FE02 Backend client and contract integration` may start because `V03-SH01` has confirmed the contract workflow and this file now names the implementation surfaces, account/quota placement, just-in-time sign-in behavior, fallback actions, and deferred release gates.
