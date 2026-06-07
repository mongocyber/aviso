# Decision 002: v1.0 Aviso AI Architecture And Privacy Draft

Date: 2026-06-03

Status: paused future-state decision draft. Not approved for implementation.

2026-06-05 owner scope override: v1.0 basic launch will not include hosted Aviso AI, project-owned backend, anonymous quota, login, subscription, payment, provider proxy, or related privacy-policy rewrite. This document remains a historical/future reference only and must not be used as current v1.0 basic launch authorization.

Baseline: v0.1 internal dogfood / v0.2-alpha implementation state as documented in `STATUS.md`, `RELEASE_CHECKLIST.md`, and `docs/specs/aviso-v1-public-launch.md`.

## Context

Aviso currently uses a BYOK direct-provider model:

- The Chrome extension stores user API Keys encrypted in `chrome.storage.local` under the legacy-compatible `contextai_api_keys` key.
- Non-secret settings, templates, and model selection live in `chrome.storage.sync`.
- AI requests are sent from the browser extension directly to the selected provider: OpenAI, Anthropic, or 豆包 / 火山方舟.
- Aviso has no project-owned backend, account system, quota system, billing system, provider proxy, telemetry, analytics SDK, or project-owned logging service.
- Current `host_permissions` are limited to `https://api.openai.com/*`, `https://api.anthropic.com/*`, and `https://ark.cn-beijing.volces.com/*`.
- Provider connectivity tests are manual, one provider at a time, and summary-only.

The v1.0 public launch requirement changes the default product model:

- Default path: users can use Aviso AI without configuring their own provider key first.
- Free start: anonymous users receive limited free quota.
- Upgrade path: quota exhaustion leads to login and subscription guidance.
- Advanced path: BYOK remains available as an advanced fallback.

This is a material architecture and privacy change. It introduces a project-owned backend data flow and cannot be implemented, described in public copy, or submitted to Chrome Web Store until the design, backend, policy, validation, and release gates are separately completed.

## Requirement Boundary

This draft records the V1-002 recommendation only.

It does not implement:

- Aviso backend.
- Auth, login, account linking, or session storage.
- Billing, subscription, or payment provider integration.
- Anonymous quota, abuse prevention, rate limits, or entitlement checks.
- Provider proxy, provider key management, or server-side model routing.
- Extension manifest, host permission, storage, source code, website, or package changes.
- Public privacy policy rewrite, Chrome Web Store submission, or public release readiness.

## Decision Draft

Recommended direction:

1. Keep v1.0 default AI under the user-facing label "Aviso".
2. Introduce a minimal Aviso backend as the only default-AI route from the extension.
3. Keep BYOK direct-provider mode as an advanced fallback, not the first-run default.
4. Do not let the extension call third-party model providers directly for the default Aviso AI route.
5. Do not store raw prompts, raw provider responses, screenshots, page bodies, selected text, full URLs, API Keys, or provider responses in project-owned logs by default.
6. Treat anonymous quota, login, subscription, and payment as separate implementation gates after this decision is approved.
7. Treat privacy policy and Chrome Web Store declarations as release gates, not afterthought copy updates.

Recommended architecture for default Aviso AI:

```text
Extension -> Aviso Backend -> Provider
          -> Auth / Quota / Billing services
          -> Metadata-only observability
```

The extension should send only the data needed for the user-triggered operation. The backend should enforce quota, route to the configured provider, normalize errors, and return the result. The provider should never receive user identity unless a later decision explicitly approves it.

## Current BYOK Direct Model Vs v1.0 Default Aviso AI

| Area | Current BYOK direct model | v1.0 default Aviso AI model |
|------|---------------------------|-----------------------------|
| Default setup | User configures provider API Key. | User can start with Aviso AI quota before BYOK setup. |
| Network path | Extension calls provider directly. | Extension calls Aviso backend; backend calls provider. |
| API Key ownership | User owns and stores provider keys locally. | Aviso owns server-side provider credentials. User BYOK keys remain local fallback. |
| Backend | None. | Required for quota, auth, billing, proxy, abuse control, and policy enforcement. |
| Quota | Provider/account dependent; no Aviso quota. | Anonymous quota, logged-in quota, and subscription entitlement required. |
| Privacy promise | No project-owned server receives AI payloads. | Aviso server receives user-triggered AI payloads for processing. Public copy must change. |
| Logging | Local console summaries only; no remote telemetry. | Metadata-only backend logs needed for reliability and abuse control, with strict raw-content exclusion. |
| Chrome declaration | Direct provider hosts and broad content-script access disclosed. | Must disclose data transfer to Aviso backend plus provider subprocessors. |
| Release claim | Not public release ready. | Not claimable until backend, policy, validation, and store gates are complete. |

## Recommended System Boundary

### Extension

In scope for v1.0 implementation after approval:

- Add an "Aviso" default AI route in settings and request routing.
- Show anonymous quota, login-required, subscription-required, and BYOK fallback states.
- Send only user-triggered operation payloads to the Aviso backend.
- Preserve local-only actions such as copy context and screenshot copy/save where possible.
- Keep BYOK provider settings in an advanced section.

Do not implement without separate confirmation:

- New `host_permissions` beyond a specific Aviso backend origin.
- Broad page-fetching host permissions.
- Automatic background AI calls.
- Raw-content telemetry.
- API Key migration from local encrypted storage.

### Aviso Backend

Required boundary:

- Own the default AI API endpoint used by the extension.
- Authenticate signed-in users and accept anonymous identifiers for limited free quota.
- Enforce quotas, rate limits, abuse controls, and subscription entitlements.
- Proxy provider requests with server-side provider credentials.
- Normalize provider errors into user-safe categories.
- Emit metadata-only operational logs.
- Keep provider request/response content out of default persistent logs.

### Provider

Required boundary:

- Receives only the content needed to fulfill the explicit user action.
- Does not receive Aviso account identity by default.
- Uses server-side credentials controlled by Aviso for the default AI route.
- Provider-specific retention and subprocessors must be disclosed in the privacy policy before launch.

### Auth And Billing

Required boundary:

- Auth owns user identity, session, and account linking.
- Billing owns checkout, subscription state, invoices, refunds, and payment method handling.
- Aviso backend should store only entitlement state needed for product access.
- Payment card details must not touch the extension or Aviso backend if a hosted checkout can handle them.

### Storage

Recommended split:

| Data | Recommended storage |
|------|---------------------|
| Anonymous install id | Extension local storage, random, resettable, not synced by default. |
| Auth session | Browser extension storage using provider-supported token flow; exact mechanism pending auth decision. |
| BYOK API Keys | Keep encrypted in `chrome.storage.local` under existing key until a separate migration is approved. |
| Settings/templates | Continue using `chrome.storage.sync` for non-secret preferences. |
| History | Continue local-only by default unless a later account-sync decision is approved. |
| Quota counters | Backend authoritative store; extension only caches display state. |
| Billing entitlement | Backend authoritative store, synced from billing provider webhooks. |

## Required New Backend Capabilities

Minimum backend for v1.0 default Aviso AI:

1. Public extension API with a stable Aviso backend origin.
2. Request authentication for logged-in users.
3. Anonymous request identity and quota enforcement.
4. Rate limiting per anonymous id, account id, coarse IP/network signals, and spend caps; fingerprinting-style device identification is not part of this default recommendation and requires a separate privacy/security decision plus user approval.
5. Subscription entitlement lookup.
6. Provider proxy for text and vision-capable requests.
7. Provider model routing and fallback rules.
8. Server-side provider credential storage.
9. Request validation, payload size limits, and operation allowlist.
10. Metadata-only request logging and error classification.
11. Quota event ledger without raw content.
12. Webhook receiver for payment/subscription changes.
13. Admin support tooling that cannot expose raw user prompts/responses by default.
14. Privacy/export/delete handling for account data.
15. Security monitoring for abuse, high spend, provider failures, and quota bypass attempts.

## Extension Permissions And Configuration

Likely required:

- Add one Aviso backend host permission, for example `https://api.aviso.example/*`, after the production domain is chosen.
- Add UI configuration for default Aviso AI vs BYOK advanced route.
- Add message types for quota state, login required, subscription required, and hosted route errors.

Possibly required, pending implementation design:

- `identity` permission if Chrome Identity APIs are chosen for OAuth-style login.
- A web-accessible login redirect or external login page if auth is handled through hosted web flow.
- `downloads` permission only if screenshot save cannot be implemented through a user-mediated download path without it.

Not approved by this draft:

- `<all_urls>` host permissions beyond the existing content-script matches.
- Broad remote-link fetching permissions.
- `tabs`, `scripting`, `tabGroups`, `offscreen`, microphone, or `clipboardRead`.
- Any additional provider host unless BYOK provider expansion gets a separate decision.

Any permission or manifest change must be recorded as a separate implementation decision before code changes.

## Anonymous Quota Options

| Option | Description | Pros | Risks |
|--------|-------------|------|-------|
| Local random install id | Generate a random id locally and use it for anonymous quota. | Lowest friction, minimal personal data, easy to reset. | Easy to reset/abuse; weak quota enforcement. |
| Backend-issued anonymous token | Backend issues a signed anonymous token after first contact. | Better integrity, can rotate and rate-limit. | Still abusable; introduces server-side anonymous records. |
| Fingerprint-like device signals | Combine multiple browser/network/device signals. | Stronger abuse resistance. | High privacy risk; likely bad fit for trust and store review. |
| Login before any AI | No anonymous quota. | Simplest abuse control. | Violates v1.0 requirement to let users try useful AI before login. |

Recommendation:

- Use a backend-issued anonymous token backed by a locally stored random install id.
- Pair it with conservative quota, coarse IP rate limits, and spend caps.
- Avoid fingerprinting-style device identification for v1.0.
- Any fingerprinting-style abuse control must be handled as a separate privacy/security decision and cannot be treated as a V1-002 default recommendation.
- Make anonymous quota small enough that abuse risk is bounded, and make login the clean upgrade path.

## Login, Subscription, And Payment Options

Auth options:

| Option | Fit | Tradeoff |
|--------|-----|----------|
| Clerk | Good for fast SaaS-style user management and extension/web account flows. | Adds a third-party identity processor; billing coupling needs review. |
| Auth0 | Mature identity platform with broad enterprise features. | Heavier than needed for v1.0 consumer launch. |
| Supabase Auth | Good if Aviso also wants a Postgres-backed product backend. | More owned backend responsibility and security operations. |
| Custom auth | Maximum control. | Slowest and highest security risk for v1.0. |

Payment options:

| Option | Fit | Tradeoff |
|--------|-----|----------|
| Stripe Checkout/Billing | Strong default for subscriptions if Aviso can handle tax/compliance setup. | Aviso remains responsible for merchant/tax/compliance details. |
| Paddle | Good if Merchant of Record coverage is preferred. | More platform constraints and migration considerations. |
| Clerk Billing over Stripe | Fast if Clerk is chosen and a simple Stripe-backed subscription model is enough. | Less independent billing architecture; confirm extension/web flow support. |
| Custom payment flow | Not recommended. | Too much compliance and security surface. |

Recommendation:

- Preferred v1.0 default: Clerk for auth plus Stripe Checkout/Billing for subscriptions, if the business accepts Stripe merchant/tax responsibilities.
- Alternative if tax/Merchant of Record burden is more important than control: Paddle for billing plus a separate auth provider.
- Do not let the extension collect card details. Use hosted checkout.
- Do not implement login or billing until the user confirms vendor, pricing model, refund policy, countries, and tax/Merchant of Record preference.

## Logging And Retention Red Lines

Never record in project-owned persistent logs by default:

- API Keys or provider secrets.
- Raw prompts.
- Raw provider responses.
- Selected text.
- Page body.
- Full page URLs when not strictly needed.
- Screenshots, base64 images, or OCR text.
- Clipboard content.
- Custom template expanded content.
- Conversation history.
- Payment card details.

Allowed as metadata only, with retention limits:

- Request id.
- Anonymous or account id.
- Operation type such as `translate`, `summarize`, `image_explain`, or `custom`.
- Provider id and model id.
- Input size bucket.
- Output size bucket.
- Timing buckets.
- Quota units consumed.
- Error category.
- HTTP status bucket.
- Feature surface such as command palette, context menu, or inline translation.
- Coarse abuse/rate-limit counters.

Recommended retention:

- Operational request metadata: 30 days by default.
- Quota ledger and billing entitlement events: retain while account is active and as legally required.
- Security/rate-limit events: 90 days by default unless incident review requires longer.
- Raw AI content: no default retention. If support debugging ever needs raw content, require explicit user opt-in, narrow scope, expiration, and separate policy wording.

## BYOK Fallback

BYOK should remain available for:

- Power users who prefer direct provider accounts.
- Users who do not want an Aviso subscription.
- Users who need provider-specific models not covered by default Aviso AI.
- Cost-sensitive or privacy-sensitive users who accept direct provider terms.

Recommended v1.0 behavior:

- Move BYOK to an advanced settings section.
- Keep existing encrypted local key storage.
- Make the active route visible: "Aviso" vs "Your OpenAI key" / "Your Anthropic key" / "Your Doubao key".
- Keep manual single-provider connectivity checks for BYOK.
- Do not sync BYOK secrets.
- Do not migrate `contextai_api_keys` without a separate migration plan.
- BYOK requests should continue using existing provider `host_permissions`; default Aviso AI should use only the Aviso backend host.

## Privacy Policy And Chrome Web Store Impact

Privacy policy must change before v1.0 launch:

- Current "no project-owned server receives AI payloads" wording would no longer be true for default Aviso AI.
- Policy must explain what is sent to Aviso, what Aviso sends to providers, what remains local, and how BYOK differs.
- Policy must list subprocessors for auth, billing, infrastructure, and model providers.
- Policy must state retention periods for metadata, quota ledger, billing records, and support data.
- Policy must state that raw prompts/responses/screenshots/page content are not retained by default, if implemented that way.
- Policy must explain account deletion, data deletion, and support access boundaries.

Chrome Web Store declarations must change before v1.0 launch:

- Disclose transfer to Aviso backend for default AI features.
- Disclose provider subprocessors for AI processing.
- Keep broad content-script site access explanation aligned with actual in-page UI behavior.
- Keep provider `host_permissions` explanation for BYOK direct-provider mode if BYOK remains.
- Do not claim hosted AI, anonymous quota, login, subscription, or payment are live until implemented and validated.
- Do not claim OpenAI, Anthropic, or vision support unless current release checklist evidence exists.

## V1-003 To V1-009 Recommended Sequence

Recommended dependency order:

1. V1-003 quota/login/subscription UX planning can start after this draft is approved, but implementation must wait for auth/billing vendor confirmation.
2. V1-004 command palette main entry can proceed in parallel with V1-005 and V1-007 if it uses mocked quota states and does not call real hosted AI.
3. V1-005 screenshot enhancement can proceed after design confirmation; copy/save local actions can be separate from send-to-AI hosted routing.
4. V1-007 double-click dropdown shortcut can proceed after design confirmation because it is mostly local UI, as long as it does not introduce new permissions.
5. V1-008 BYOK settings cleanup should proceed before or alongside hosted route rollout so users can clearly see fallback choices.
6. V1-006 inline selection translation should wait for V1-002 approval and at least mocked quota/provider states, because inline translation depends on quota/login/provider error states.
7. V1-003 backend-linked implementation should land before real default Aviso AI can be enabled.
8. V1-009 public release copy and policy must wait until V1-002 to V1-008 implementation facts and validation evidence are available.

Recommended parallel lanes:

- UI lane: V1-004, V1-005 local copy/save states, V1-007, V1-008.
- Backend lane: V1-003 backend/auth/quota/billing/proxy foundation.
- Privacy/release lane: V1-009 draft updates can start early, but final copy must wait for implementation facts.

Blocking points:

- V1-006 and real hosted translation cannot ship before hosted route, quota, and privacy copy are implemented.
- "Send screenshot to AI" through default Aviso AI cannot ship before vision provider routing, quota, and screenshot privacy gates are implemented.
- Public release cannot proceed before V1-009 policy/store alignment and release checklist validation.

## Stop Conditions

Stop and ask the user before any V1-003 to V1-009 thread does the following:

- Adds or changes manifest permissions or host permissions.
- Adds backend, auth, billing, payment, quota, or provider proxy implementation.
- Chooses or signs up for a vendor.
- Stores or transmits provider API Keys outside current local BYOK storage.
- Runs real provider calls.
- Sends private page content, screenshots, raw prompt, raw response, or API Key to logs, docs, support tools, or remote services.
- Adds telemetry, analytics, tracking pixels, or remote logging.
- Changes privacy policy, Chrome Web Store statements, or public marketing copy from planned to live.
- Creates release artifacts, tags, store submissions, production deployments, commits, or pushes.

## Required User Confirmations

The user must confirm:

1. Is the recommended architecture accepted: Extension -> Aviso Backend -> Provider for default AI?
2. What is the production backend domain that the extension may call?
3. Which auth provider should be used: Clerk, Auth0, Supabase Auth, or another option?
4. Which payment path should be used: Stripe direct, Paddle Merchant of Record, Clerk Billing, or another option?
5. Which countries/regions should subscriptions support at v1.0 launch?
6. What anonymous quota size and reset period are acceptable?
7. What logged-in free quota and paid quota should exist?
8. Should anonymous quota use only local random id plus backend token, or require login earlier for abuse control?
9. Which provider should power default Aviso AI first?
10. Are raw prompts/responses/screenshots/page bodies prohibited from backend persistent logs by default?
11. What metadata retention windows are acceptable for operations, quota, billing, and security events?
12. Should BYOK remain direct-provider from the extension, or eventually route through Aviso backend?
13. Should history remain local-only for v1.0, or should account sync be considered later?
14. Is any new extension permission acceptable for login or screenshot save, or must those flows avoid new permissions?
15. Who approves final privacy policy, terms, refund policy, and Chrome Web Store declarations?

## Implementation Status

Not implemented:

- Default Aviso AI.
- Anonymous quota.
- Login.
- Subscription.
- Payment.
- Provider proxy.
- Backend request logging.
- Account deletion/export.
- v1.0 public policy rewrite.
- Chrome Web Store v1.0 declarations.

Current implementation remains BYOK direct-provider plus local storage.

## Validation Status

Not validated:

- Hosted Aviso AI route.
- Anonymous quota enforcement.
- Auth flow.
- Billing/subscription flow.
- Provider proxy behavior.
- Backend logging redaction.
- Privacy policy accuracy for hosted AI.
- Chrome Web Store declarations for hosted AI.

Current validated evidence remains limited to the existing internal dogfood and provider-specific release checklist records.

## Release Readiness

This draft is not release-ready.

v1.0 public release remains blocked until:

- V1-002 is approved.
- Backend/auth/quota/billing/provider proxy are implemented.
- Extension hosted-route behavior is implemented and tested.
- BYOK fallback remains tested.
- Privacy policy and Chrome Web Store declarations match final behavior.
- Store assets are sanitized.
- Real provider and hosted-route validation evidence exists.
- Release checklist, package, tag, and rollback gates are complete.

## External References Consulted

- Chrome Web Store Developer Program Policies and disclosure requirements.
- Chrome Web Store User Data / Limited Use guidance.
- Stripe Checkout and subscription documentation.
- Clerk Billing documentation.
- Auth0 user management documentation.
- Supabase Auth documentation.
- Paddle subscription and Merchant of Record documentation.
