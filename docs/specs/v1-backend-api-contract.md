# Aviso v1.0 Backend API Contract Draft

Date: 2026-06-03

Status: paused future-state contract draft only. Not approved for implementation, deployment, vendor signup, secrets, real provider traffic, payment wiring, manifest changes, public policy finalization, or public release.

2026-06-05 owner scope override: hosted Aviso AI, backend API, anonymous quota, login, subscription, payment, provider proxy, and account lifecycle are removed from v1.0 basic launch. Keep this contract only as future reference until the owner explicitly reopens hosted-AI work.

## Sources

- `docs/specs/aviso-v1-public-launch.md`
- `docs/issues/003-v1-public-launch-issue-map.md`
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`
- `docs/decisions/003-v1-quota-login-subscription.md`
- `docs/03_TECH_SPEC.md`
- `docs/06_RISK_REGISTER.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`

## Purpose

This draft defines the backend API contract needed for v1.0 default Aviso AI, anonymous quota, logged-in quota, subscription entitlement, provider proxying, deletion/export, and billing webhook events.

It is intended to be a later implementation reference for:

- Backend API implementation.
- Extension-side mocked access states.
- Extension-side hosted Aviso AI integration after owner approval.
- Privacy, logging, retention, and release-gate review.

It must not be read as evidence that hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, or v1.0 public launch is live.

## Non-Scope

This document does not approve or implement:

- Aviso backend service code.
- Auth, login, account linking, session storage, or OAuth flow.
- Billing, subscription, payment provider, pricing page, or hosted checkout.
- Provider proxy, provider credentials, provider model routing, or real model calls.
- Database schema, migration, production domain, infrastructure, telemetry, or monitoring service.
- Extension source changes under `src/*`.
- Website changes under `website/*`.
- `package.json`, manifest, ordinary permissions, or `host_permissions` changes.
- New dependencies.
- API Key access, API Key migration, provider secrets, or secret storage changes.
- Public privacy policy rewrite, Chrome Web Store submission, package, tag, commit, push, or deployment.

## Architecture Boundary

Recommended v1.0 default Aviso AI path:

```text
Extension -> Aviso Backend -> Model Provider
          -> Auth / Quota / Billing systems
          -> Metadata-only operational logs
```

Current BYOK fallback path remains separate:

```text
Extension -> User-selected provider
```

Local-only actions remain browser-local where possible:

```text
Extension -> Browser-local action
```

The extension must be able to distinguish these routes before showing quota, login, or provider errors.

## Base URL And Versioning

Production base URL is not selected.

Draft placeholder:

```text
https://api.aviso.example/v1
```

Owner confirmation required before implementation:

- Production backend domain.
- Development/staging domains.
- Whether the extension needs one new backend `host_permission`.
- CORS policy for extension origins.
- API versioning and deprecation policy.

## Common Request Headers

| Header | Required | Description |
|---|---:|---|
| `Authorization: Bearer <token>` | Conditional | Anonymous token or logged-in session token. Exact auth mechanism pending vendor decision. |
| `X-Aviso-Request-Id` | Yes | Extension-generated UUID for tracing and idempotent UI handling. |
| `X-Aviso-Client-Version` | Yes | Extension version, for compatibility and support. |
| `X-Aviso-Idempotency-Key` | Conditional | Required for AI request acceptance, export jobs, deletion requests, and webhook processing where retries may happen. |
| `Accept-Language` | Optional | UI language preference only. Must not be used for fingerprinting-style identity. |

Do not send API Keys in headers for default Aviso AI. BYOK provider keys stay in the existing local encrypted storage path and are not part of this backend contract.

## Common Response Envelope

Non-streaming responses should use:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {},
  "meta": {
    "server_time": "2026-06-03T00:00:00Z",
    "api_version": "v1"
  }
}
```

Errors should use:

```json
{
  "request_id": "req_...",
  "status": "error",
  "error": {
    "category": "quota_exhausted",
    "code": "quota.anonymous_exhausted",
    "message_key": "quota_anonymous_exhausted",
    "retryable": false,
    "user_action": "show_access_prompt"
  },
  "meta": {
    "server_time": "2026-06-03T00:00:00Z",
    "api_version": "v1"
  }
}
```

`message_key` should map to extension-owned localized copy. Backend `message` strings, if any, are advisory and must not expose provider raw errors.

## Core Enums

### Identity State

| Value | Meaning |
|---|---|
| `anonymous` | User has no logged-in account and uses a backend-issued anonymous token. |
| `logged_in_free` | User is signed in and has account-linked free quota. |
| `subscriber` | User is signed in and has active paid entitlement. |
| `byok_active` | Active AI route uses the user's own provider key and does not consume Aviso hosted quota. |
| `local_only` | Current action does not call hosted AI or BYOK provider. |

### Quota State

| Value | Meaning |
|---|---|
| `not_applicable` | Local-only or BYOK path. No Aviso hosted quota applies. |
| `available` | Current hosted route can run. |
| `low` | Quota is close to exhaustion; show a soft warning only. |
| `exhausted` | Hosted route must not send AI payload before user chooses login, plan, BYOK, or cancel. |
| `unknown` | State cannot be fetched; extension should fail closed for hosted AI and keep local-only/BYOK options visible. |

### Entitlement State

| Value | Meaning |
|---|---|
| `none` | No active paid entitlement. |
| `trialing` | Paid trial or introductory period is active if owner approves one. |
| `active` | Paid entitlement is active. |
| `past_due` | Subscription exists but payment is overdue. |
| `canceled` | Subscription is canceled and no longer grants paid quota. |
| `paused` | Subscription is paused, if the payment vendor supports it. |
| `unknown` | Backend cannot currently confirm entitlement. |

### Operation Type

| Value | Notes |
|---|---|
| `ask` | Direct command palette question or follow-up. |
| `explain` | Explain selected/user-provided content. |
| `translate` | Selected text or user-entered text only. No page URL/link URL/page body/screenshot/clipboard as translation input. |
| `polish` | Rewrite selected/user-provided text. |
| `summarize_selection` | Summarize selected text. |
| `summarize_page` | Summarize user-triggered extracted page text. |
| `image_explain` | User-confirmed image or screenshot region. No screenshot/base64 persistence. |
| `custom_template` | User-triggered template expansion. Expanded content is transient payload only, not persistent log content. |

### Feature Surface

| Value |
|---|
| `command_palette` |
| `context_menu` |
| `selection_toolbar` |
| `double_click_menu` |
| `inline_translation` |
| `result_panel` |
| `screenshot_overlay` |
| `popup_settings` |

## Extension Minimum State Model

The extension should reduce backend and local settings into this minimal model:

```json
{
  "identity_state": "anonymous",
  "active_route": "aviso",
  "quota_state": "available",
  "entitlement_state": "none",
  "byok_provider": null,
  "local_only": false,
  "blocked_reason": null,
  "allowed_actions": ["run_ai", "login", "view_plans", "use_byok", "cancel"],
  "display": {
    "route_label_key": "route_aviso",
    "quota_copy_key": "quota_available",
    "show_access_prompt": false
  }
}
```

Required user modes:

| Mode | `identity_state` | `active_route` | Quota behavior |
|---|---|---|---|
| Anonymous | `anonymous` | `aviso` | Uses anonymous quota. Exhaustion shows Access Prompt. |
| Logged-in free | `logged_in_free` | `aviso` | Uses account-linked free quota. Exhaustion can show subscription prompt plus BYOK. |
| Subscriber | `subscriber` | `aviso` | Uses paid entitlement and backend spend controls. |
| Quota low | Any hosted identity | `aviso` | Soft warning; do not block. |
| Quota exhausted | Anonymous or logged-in free | `aviso` | Block hosted payload before send; show login/plans/BYOK/cancel. |
| BYOK active | `byok_active` | `byok` | Do not consume Aviso quota; show provider-specific route and errors. |
| Local-only | `local_only` | `local` | No quota/login/subscription prompts. |

## API 1: Anonymous Token

Endpoint:

```text
POST /v1/anonymous-token
```

Purpose:

- Issue or refresh a backend anonymous token for no-login free quota.
- Avoid fingerprinting-style device identification.
- Pair backend-issued token with a locally stored random install id.

Request:

```json
{
  "request_id": "req_...",
  "client_install_id": "uuid-v4-random-local-id",
  "client_version": "0.1.0",
  "platform": "chrome_extension",
  "locale": "zh-CN"
}
```

Response:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {
    "anonymous_id": "anon_...",
    "anonymous_token": "opaque_signed_token",
    "expires_at": "2026-06-10T00:00:00Z",
    "quota_state": {
      "pool": "anonymous",
      "state": "available",
      "remaining_units": 5,
      "reset_at": "2026-06-04T00:00:00Z"
    }
  }
}
```

Privacy boundary:

- `client_install_id` must be random, locally generated, resettable, and not derived from browser/device fingerprinting.
- Backend logs may record `anonymous_id`, not raw private content.
- Owner must confirm token expiry, rotation, and abuse controls before implementation.

## API 2: Quota State

Endpoint:

```text
GET /v1/quota/state
```

Purpose:

- Let extension display quota and access state before a hosted AI request.
- Keep backend authoritative for quota counters.
- Keep BYOK and local-only actions out of hosted quota accounting.

Query parameters:

| Field | Required | Description |
|---|---:|---|
| `operation_type` | Optional | Allows backend to estimate cost tier for planned action. |
| `input_size_bucket` | Optional | `0-500`, `501-2000`, `2001-5000`, `5001+`, `image_small`, `image_medium`, `image_large`. |
| `surface` | Optional | Feature surface requesting state. |

Response:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {
    "identity_state": "anonymous",
    "active_route": "aviso",
    "quota": {
      "pool": "anonymous",
      "state": "low",
      "remaining_units": 1,
      "reset_at": "2026-06-04T00:00:00Z",
      "low_threshold_units": 1,
      "unit_model": "request_units"
    },
    "entitlement_state": "none",
    "allowed_actions": ["run_ai", "login", "view_plans", "use_byok", "cancel"],
    "display": {
      "route_label_key": "route_aviso",
      "quota_copy_key": "quota_low",
      "show_access_prompt": false
    }
  }
}
```

Rejected or unavailable hosted quota must not block local-only actions. If quota state is `unknown`, hosted AI should fail closed with local-only and BYOK choices still visible.

## API 3: Hosted AI Request

Endpoint:

```text
POST /v1/ai/requests
```

Purpose:

- Accept a user-triggered default Aviso AI request.
- Enforce quota, rate limits, operation allowlist, payload limits, and entitlement.
- Proxy the transient payload to the configured model provider.
- Stream normalized output and errors to the extension.

Request:

```json
{
  "request_id": "req_...",
  "idempotency_key": "idem_...",
  "operation_type": "translate",
  "surface": "inline_translation",
  "active_route": "aviso",
  "input": {
    "text": "transient user-provided or selected text",
    "image": null,
    "prior_context": null
  },
  "input_metadata": {
    "input_size_bucket": "0-500",
    "has_image": false,
    "source_kind": "selection",
    "page_origin": null,
    "full_url_included": false
  },
  "client_context": {
    "client_version": "0.1.0",
    "locale": "zh-CN"
  }
}
```

Operation-specific input rules:

| Operation | Allowed transient payload | Explicitly not allowed by default |
|---|---|---|
| `translate` | Selected text or command-palette user text. | Page URL, link URL, page body, screenshot, clipboard content, full DOM. |
| `summarize_page` | User-triggered extracted page text after existing truncation/budget rules. | Automatic background page reads, remote link-body fetching, raw content logging. |
| `image_explain` | User-confirmed image or screenshot region. | Screenshot/base64 persistence, full page URL attachment unless separately approved. |
| `custom_template` | Expanded template content needed for this request. | Persistent logging of expanded template content. |
| `ask` / `explain` / `polish` / `summarize_selection` | User-entered text, selected text, or bounded prior context. | Clipboard content unless explicitly user-provided, full page body unless operation requires it. |

Response transport:

- Implementation may use Server-Sent Events, chunked JSON, or another streaming method after backend stack is chosen.
- Extension-visible event schema should stay stable even if transport changes.

Draft stream events:

```json
{ "event": "accepted", "request_id": "req_...", "quota_units_reserved": 1 }
{ "event": "delta", "request_id": "req_...", "text_delta": "..." }
{ "event": "quota_update", "request_id": "req_...", "remaining_units": 4, "quota_state": "available" }
{ "event": "done", "request_id": "req_...", "finish_reason": "stop", "quota_units_consumed": 1 }
```

Stream error event:

```json
{
  "event": "error",
  "request_id": "req_...",
  "error": {
    "category": "provider_unavailable",
    "code": "provider.upstream_unavailable",
    "message_key": "provider_unavailable",
    "retryable": true,
    "user_action": "retry_or_use_byok"
  }
}
```

Quota accounting:

- Quota should be consumed only after backend accepts an AI-processing request.
- Local validation failures should not consume quota.
- Requests rejected before provider start should not consume hosted quota unless owner later approves an anti-abuse rule.
- Retried requests that create a new accepted backend AI request may consume new quota.
- BYOK requests do not consume Aviso hosted quota.

## API 4: Entitlement State

Endpoint:

```text
GET /v1/entitlement/state
```

Purpose:

- Let extension know whether the account has logged-in free quota, subscriber access, expired subscription, or no paid entitlement.
- Keep billing details out of the extension.

Response:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {
    "identity_state": "subscriber",
    "account_id": "acct_...",
    "entitlement_state": "active",
    "plan_code": "pending_owner_confirmation",
    "current_period_end": "2026-07-03T00:00:00Z",
    "quota": {
      "pool": "subscriber",
      "state": "available",
      "remaining_units": 850,
      "reset_at": "2026-07-03T00:00:00Z",
      "unit_model": "request_units"
    },
    "allowed_actions": ["run_ai", "manage_plan", "use_byok", "cancel"]
  }
}
```

Do not expose payment card details, full invoice details, tax identifiers, or billing provider raw payloads to the extension unless a later owner-approved support flow requires it.

## API 5: Provider Proxy Error Normalization

Provider proxy errors should be normalized before reaching the extension.

| Category | Meaning | Retryable | Recommended extension behavior |
|---|---|---:|---|
| `invalid_request` | Payload shape, operation, or size is invalid. | No | Show readable validation error. |
| `auth_required` | Logged-in session is needed. | No | Show login path plus BYOK/cancel. |
| `quota_low` | Hosted quota nearly exhausted. | Yes | Soft warning only. |
| `quota_exhausted` | Hosted quota exhausted. | No | Show Access Prompt before payload send. |
| `subscription_required` | Paid entitlement required for hosted route. | No | Show plans, BYOK, cancel. |
| `rate_limited` | Backend or provider rate limit hit. | Conditional | Show wait/retry guidance with coarse retry window. |
| `spend_cap_reached` | Backend spend cap blocks new hosted requests. | No | Show temporary unavailable plus BYOK. |
| `provider_unavailable` | Provider outage or upstream failure. | Yes | Retry or use BYOK if available. |
| `provider_timeout` | Provider did not respond in time. | Yes | Retry or stop waiting. |
| `provider_policy_blocked` | Provider refused content under policy. | No | Show safe refusal copy. |
| `unsupported_operation` | Current model/route cannot handle requested operation. | No | Suggest compatible route or BYOK provider. |
| `network_error` | Backend connectivity problem. | Yes | Retry; keep local-only actions available. |
| `server_error` | Aviso backend failure. | Yes | Show temporary failure. |
| `unknown` | Unclassified error. | Conditional | Show generic safe error; do not expose raw provider text. |

Backend logs may store normalized category, code, status bucket, retryable flag, and latency bucket. They must not store provider raw error bodies by default.

## API 6: Account Data Export

Endpoint:

```text
POST /v1/account/export
```

Purpose:

- Start an authenticated account data export job.
- Cover account, quota ledger, entitlement metadata, and metadata-only request logs where applicable.
- Exclude raw prompts/responses because they should not be retained by default.

Request:

```json
{
  "request_id": "req_...",
  "idempotency_key": "idem_...",
  "export_scope": ["account", "quota_ledger", "entitlement_events", "request_metadata"],
  "format": "json"
}
```

Response:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {
    "export_id": "exp_...",
    "state": "queued",
    "estimated_ready_at": "2026-06-03T01:00:00Z"
  }
}
```

Status endpoint:

```text
GET /v1/account/export/{export_id}
```

Export states:

| Value |
|---|
| `queued` |
| `processing` |
| `ready` |
| `expired` |
| `failed` |

Owner confirmation required:

- Exact export format.
- Download delivery mechanism.
- Expiration window.
- Whether billing-provider portal data is linked or only referenced.

## API 7: Account Deletion

Endpoint:

```text
POST /v1/account/delete
```

Purpose:

- Start authenticated account deletion.
- Revoke hosted AI access and anonymize or delete account-linked records subject to legal/billing requirements.
- Preserve only records that must legally remain, such as billing invoices if required by the payment vendor or tax rules.

Request:

```json
{
  "request_id": "req_...",
  "idempotency_key": "idem_...",
  "confirmation": "delete_my_aviso_account",
  "reason_code": "optional_user_selected_reason"
}
```

Response:

```json
{
  "request_id": "req_...",
  "status": "ok",
  "data": {
    "deletion_id": "del_...",
    "state": "scheduled",
    "scheduled_for": "2026-06-10T00:00:00Z",
    "revokes_hosted_access_at": "2026-06-03T00:00:00Z",
    "retained_record_categories": ["billing_legal_records"]
  }
}
```

Deletion states:

| Value |
|---|
| `scheduled` |
| `processing` |
| `completed` |
| `canceled_by_user` |
| `failed` |

Deletion must not affect locally stored BYOK API Keys, local history, or local settings unless the extension separately implements a local data deletion action.

## API 8: Billing Webhook Event Contract

Endpoint:

```text
POST /v1/webhooks/billing/{vendor}
```

Purpose:

- Receive subscription and payment lifecycle events from the owner-confirmed billing vendor.
- Update backend entitlement state.
- Keep webhook processing idempotent and auditable without exposing payment card data to the extension.

Vendor is pending owner confirmation. Supported event semantics should map to this internal contract:

```json
{
  "event_id": "evt_...",
  "event_type": "subscription.updated",
  "occurred_at": "2026-06-03T00:00:00Z",
  "account_id": "acct_...",
  "customer_ref": "billing_customer_...",
  "subscription_ref": "billing_subscription_...",
  "entitlement_state": "active",
  "plan_code": "pending_owner_confirmation",
  "current_period_start": "2026-06-03T00:00:00Z",
  "current_period_end": "2026-07-03T00:00:00Z",
  "metadata": {
    "source_vendor": "pending_owner_confirmation"
  }
}
```

Internal event types:

| Event type | Meaning |
|---|---|
| `checkout.completed` | User completed hosted checkout. |
| `subscription.created` | Subscription record was created. |
| `subscription.updated` | Plan, period, or status changed. |
| `subscription.canceled` | Subscription ended or will end. |
| `invoice.payment_succeeded` | Paid period confirmed. |
| `invoice.payment_failed` | Payment failed or account is past due. |
| `refund.created` | Refund event received, if relevant to entitlement. |

Webhook requirements:

- Verify vendor signature before processing.
- Use `event_id` for idempotency.
- Store normalized entitlement event metadata.
- Do not store raw webhook payload by default if it includes unnecessary billing details.
- Do not send payment card details to the extension.

## Metadata-Only Logging Contract

Allowed persistent operational log fields:

| Field | Notes |
|---|---|
| `request_id` | UUID or backend request id. |
| `anonymous_id` / `account_id` | Pseudonymous operational identifier. |
| `route` | `aviso`, `byok`, or `local`; backend logs normally see only `aviso`. |
| `operation_type` | Fixed enum. |
| `size_bucket` | Coarse input/output size bucket only. |
| `quota_units_reserved` / `quota_units_consumed` | Numeric units. |
| `error_category` | Fixed normalized category. |
| `latency_bucket` | Coarse bucket, not exact trace with raw content. |
| `rate_limit_bucket` | Coarse remaining/limited status. |

Never record in project-owned persistent logs by default:

- API Keys, provider secrets, auth secrets, session tokens, or webhook signing secrets.
- Provider ids or model ids unless a later owner-approved policy explicitly adds them to the metadata contract.
- Raw prompts.
- Raw provider responses.
- Provider raw error bodies.
- Selected text.
- Page body.
- Full URL.
- Screenshots, base64 images, OCR text, or image binaries.
- Clipboard content.
- Custom template expanded content.
- Conversation history.
- Payment card details.
- Private account pages, private webpage text, screenshots, or release artifacts containing private data.

If support debugging ever needs raw user content, it requires a separate owner-approved policy, explicit user opt-in, narrow scope, retention expiry, and support access controls. That is not part of this v1.0 default contract.

## Rate Limit, Spend Cap, And Abuse Boundary

Exact limits are not approved. The contract should support:

| Control | Required contract shape | Owner confirmation needed |
|---|---|---|
| Anonymous quota | Pool, remaining units, reset time, exhausted state. | Unit count, reset window, abuse threshold. |
| Logged-in free quota | Account pool, remaining units, reset time. | Monthly quota, eligibility, reset policy. |
| Subscriber quota | Paid pool or fair-use state. | Plan units, fair-use rules, overage policy. |
| Operation cost tiers | Units by operation and size bucket. | Vision/long-page multiplier and retry accounting. |
| Rate limits | Coarse limited state and retry window. | Per-account, anonymous, IP/network windows. |
| Spend caps | `spend_cap_reached` category and fallback action. | Daily/monthly provider caps and alert thresholds. |
| Payload limits | `invalid_request` with size/operation code. | Max text/image sizes and per-operation allowlist. |

Fingerprinting-style device identification is not part of this contract. It would require a separate privacy/security decision.

## Retention Boundary

Draft retention defaults:

| Data category | Draft retention |
|---|---|
| Operational request metadata | 30 days. |
| Security and rate-limit metadata | 90 days unless incident review requires longer. |
| Quota ledger | While account is active, then deletion/anonymization subject to product and legal requirements. |
| Entitlement events | While account is active and as needed for billing/legal requirements. |
| Export jobs | Short-lived download window, exact expiry pending owner confirmation. |
| Deletion jobs | Keep minimal audit metadata required to prove completion. |
| Raw AI content | No default persistent retention. |

Owner must confirm final retention windows before implementation and before public privacy policy updates.

## Mockable Vs Blocked Contracts

Can be mocked now in extension or design work:

- `identity_state`: `anonymous`, `logged_in_free`, `subscriber`, `byok_active`, `local_only`.
- `quota_state`: `available`, `low`, `exhausted`, `unknown`, `not_applicable`.
- `entitlement_state`: `none`, `active`, `past_due`, `canceled`, `unknown`.
- Access Prompt options: login, view plans, use own API Key, cancel.
- Hosted AI error categories and localized copy mapping.
- Quota banners, route badges, local-only behavior, and BYOK-active labels.
- Synthetic stream events for UI state testing.
- Export/delete queued/processing/ready/completed states.

Must wait for owner confirmation before implementation:

- Backend domain and extension host permission.
- Backend stack, database, deployment, monitoring, and environment ownership.
- Auth vendor and login/session flow.
- Payment vendor, pricing, countries, tax/Merchant of Record, refund policy, and support policy.
- Anonymous quota size, logged-in quota, subscriber quota, reset windows, and spend caps.
- Default provider, model, provider credentials boundary, provider retention/subprocessor disclosures.
- Webhook vendor and event signatures.
- Export delivery mechanism and deletion retention policy.
- Public privacy policy, Chrome Web Store declarations, final release copy, and public launch claims.

## Validation And Release Split

| Layer | Current state | Required next gate |
|---|---|---|
| Contract draft | This document. | Owner review and decision update. |
| Implementation | Not started. | Separate scoped backend and extension implementation threads. |
| Validation | Not available for v1.0 hosted AI. | Synthetic backend tests, extension mock tests, privacy/security review, then controlled live validation only after approval. |
| Release readiness | Blocked. | Final manifest, policy, store declarations, provider evidence, payment/auth evidence, leakage scan, package/tag/rollback, owner launch approval. |

No public copy should claim v1.0 hosted Aviso AI, anonymous quota, login, subscription, provider proxy, or payment is live until implementation and validation evidence are recorded in the release checklist.
