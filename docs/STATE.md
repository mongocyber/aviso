# Aviso State

Updated: 2026-08-01

This is the L1 current-facts registry for Aviso. Other docs should link here instead of repeating release state, Chrome Web Store state, or hosted-AI live status.

## Release Line

- Product identity: Aviso is a Chrome MV3 extension built with React 18 and TypeScript; local dev/build still use Plasmo paths, while the canonical release package is generated through the WXT package gate at a separate canonical output path.
- Build-tool classification: Plasmo `0.90.5` is a direct dev dependency, not a runtime dependency; no resolved dependency versions changed in the local lockfile regeneration for this classification change.
- Current upload/package version: `0.1.1`; `package.json`, manifest, and Popup-visible version are aligned to `0.1.1`.
- Default usable path: BYOK direct-provider remains the default path; users provide their own API Keys and the browser extension calls approved provider hosts directly.
- Optional hosted path: Aviso AI / hosted AI is included in the `0.1.1` production-candidate package and only runs after the user explicitly chooses it and signs in.
- Chrome Web Store state: owner uploaded and submitted `0.1.1`; Chrome Web Store rejected the 2026-07-07 submission for product-description keyword issues; listing copy was cleaned, owner reports the latest `0.1.1` package was reuploaded, and owner confirmed on 2026-07-08 that it has entered Chrome Web Store review again.
- Public release state: Aviso is not publicly listed, not Chrome Web Store approved, has no formal store link, and has no final owner release approval.
- Website state: owner website review and production deployment evidence passed on 2026-07-03 for the configured website URL `https://aviso-nine.vercel.app`; website deployment does not equal Chrome Web Store approval or extension public release.
- Internal labels: `v0.2` and `v0.3` are historical/internal planning and issue-group labels only, not separate upload versions or public product versions.

## Current Focus

- Current blocker: wait for the final Chrome Web Store review result for the cleaned/reuploaded `0.1.1` package.
- Next action: once the owner confirms the final CWS review result, update this file plus the matching release evidence docs before changing any public release wording.
- V013 Supabase Auth migration: MON-121 is a default-disabled frontend foundation. It keeps the provider-neutral adapter, hosted-session v2 migration, and safe failure mapping, but does not add a Supabase host permission, does not fill a Supabase project origin or anon key, and does not enable live Supabase sign-in. Exact Supabase origin/anon key, redirect allowlist, and manifest activation remain owner-gated follow-up work.
- V013 Creem checkout/subscription-status frontend MVP: MON-124 adds signed-in hosted-account checkout and customer-portal entry points against the frozen backend contract. The extension requests backend-created `/v1/billing/checkout` and `/v1/billing/portal` URLs, validates trusted Creem origins before opening them, and refreshes plan status from `/v1/me`; it does not construct prices, customer IDs, subscription IDs, portal URLs, or local entitlements. Real Creem credentials, live charges, backend merge/deploy, and public billing launch remain separate gates.
- V013 account deletion frontend: MON-43 consumes the frozen authenticated backend contract `POST /v1/account/deletion` with `{ confirm: true }` and response states `accepted`, `processing`, `completed`, and `retry`. The extension never calls Supabase Admin APIs, never requires a service-role credential, and clears only hosted session/sign-in state after accepted deletion or invalid/expired/401 hosted auth state; BYOK storage remains untouched.

## Gates

| Gate | 状态 | 证据 |
| --- | --- | --- |
| Chrome Web Store backend review state confirmed | `passed` | Owner confirmed on 2026-07-08 that the cleaned/reuploaded `0.1.1` package entered Chrome Web Store review again; [CURRENT_GATE](./ai/CURRENT_GATE.md), [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md) |
| Chrome Web Store approved | `pending` | [CURRENT_GATE](./ai/CURRENT_GATE.md), [release gates](./planning/v0.3/release-gates.md) |
| Formal Chrome Web Store link recorded | `pending` | [CURRENT_GATE](./ai/CURRENT_GATE.md), [STATUS](../STATUS.md) |
| Final owner release approval | `pending` | [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md), [release gates](./planning/v0.3/release-gates.md) |
| `v0.1.1` tag and GitHub Release created | `not-started` | [STATUS](../STATUS.md) |
| Website owner review and production deployment evidence | `passed` | [STATUS](../STATUS.md), [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md) |
| Owner-loaded hosted-AI production-candidate smoke | `passed` | [STATUS](../STATUS.md), [release status](./planning/v0.3/status.md) |
| Creem billing live launch | `pending` | MON-124 is frontend-only contract consumption with local mocks; backend Creem PR #23 is not merged here, no real credentials or live charges were used, and public billing launch remains owner-gated. |
| Local supply-chain baseline | `passed` | `node scripts/check-supply-chain-baseline.mjs` before CI/submit install plus `npm run supply-chain:check`; [baseline](./security/supply-chain-baseline.json), [testing](./architecture/testing.md) |
| Fresh registry dependency audit | `pending` | External pending; local baseline does not run `npm audit` or claim zero vulnerabilities. |

## Capabilities

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| Right-click menu, selection toolbar, command palette, clipboard prompt, in-page result panel, history, custom instructions, and Popup settings | `implemented` | Product surface summary is maintained in [STATUS](../STATUS.md) and [README](../README.md). |
| Content-script frame minimization | `implemented` | MON-41 keeps existing user-triggered iframe behavior all-frame for the selection toolbar / inline translation, optional double-click menu, clipboard host / copy writer, Readability extraction, and iframe command-palette bridge. Command palette UI, result panel, and screenshot selector remain top-frame only. Clipboard Sense is default-off for missing settings and for historical `enableClipboardSense: true` values without `clipboardSenseConsentVersion: 1`; it registers the copy listener only when enabled, consent-versioned, and stamped with the current revocation epoch, and removes it when disabled. DOM clipboard fallback is explicit top-frame opt-in only. Manifest/package evidence lives in [content surfaces](./architecture/content-surfaces.md), [runtime contract](./architecture/extension-runtime.md), [manifest checks](../scripts/check-extension-manifests.mjs), and [surface tests](../tests/extension-surface.test.ts). Generated package facts must come from local build/package checks; owner desktop loaded-extension review remains pending. |
| BYOK direct-provider requests | `implemented` | Provider and storage boundaries are recorded in [STATUS](../STATUS.md) and [privacy/security](./privacy-and-security.md). |
| Multiple provider configurations and manual model ID editing | `implemented` | Provider status and live-validation boundaries are recorded in [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md). |
| Chinese and English UI plus manifest localization | `implemented` | Locale and manifest status are recorded in [STATUS](../STATUS.md). |
| Canonical production package directory and zip | `implemented` | `npm run package` generates `build/canonical-chrome-mv3-prod` and `build/canonical-chrome-mv3-prod.zip`; Plasmo local `npm run build` remains isolated at `build/chrome-mv3-prod`. Release package evidence is recorded in [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md). |
| Local supply-chain baseline command | `implemented` | `npm run supply-chain:check` validates package/lock consistency, SHA-256 hashes, tracked baseline schema, direct dependency inventory, Plasmo dev classification, unresolved/closed High/Critical ledger schema, stable riskId continuity, affected-package semantic fingerprints, structured fresh-audit artifact binding, strict UTC review/audit/closure calendar dates, fresh-audit evidence instants, merge-base package/lock base diff, and sanitized JSON evidence; CI/submit run the dependency-free Node checker immediately after checkout and before setup/install. Evidence: [checker](../scripts/check-supply-chain-baseline.mjs), [baseline](./security/supply-chain-baseline.json), [CI workflow](../.github/workflows/ci.yml), and [submit workflow](../.github/workflows/submit.yml). |
| Optional Aviso AI / hosted AI candidate path | `implemented` | Candidate-only path; public/live limits are recorded in [CURRENT_GATE](./ai/CURRENT_GATE.md). |
| Supabase Auth frontend foundation | `configured-only` | MON-121 keeps the adapter/storage/message foundation default-disabled. Exact Supabase project origin/anon key, redirect allowlist, live sign-in validation, and manifest host-permission activation are owner-gated follow-up work. |
| Creem checkout/subscription-status frontend MVP | `implemented` | Signed-in hosted users can request backend-created checkout/portal URLs and refresh plan status from `/v1/me`. The frontend validates Creem origins before opening returned URLs and never grants entitlement from URL params or client-side prices. Live billing remains gated. |
| Hosted account deletion UI | `implemented` | Frontend-only implementation against the frozen backend contract `POST /v1/account/deletion` with bearer hosted auth and two-step confirmation. Backend route availability remains a separate backend merge/deployment fact; frontend tests use local mocks only. |
| Chrome Web Store public install | `unverified` | Review state and approval are pending; see [CURRENT_GATE](./ai/CURRENT_GATE.md). |
| Subscription/payment live launch and public anonymous quota | `not-planned` | Live billing/charges need separate owner approval and backend/deployment evidence before this status changes. Public anonymous quota remains not planned. |
| Telemetry, analytics SDK, web search, and remote link-body fetching | `not-planned` | Current public/store copy says these are not included; see [STORE_LISTING_COPY](../store-assets/chrome-web-store/STORE_LISTING_COPY.md). |

## Boundaries（不做 / 不能宣称）

- Do not say Chrome Web Store approved, publicly listed, formally installable, or release-ready until the matching Gates are passed with evidence.
- Do not say hosted AI, Aviso AI, provider proxy, subscription/payment, or public anonymous quota is live.
- Do not imply telemetry, analytics SDK, web search, remote link-body fetching, advertising, or remote content logging is included.
- Do not expand manifest permissions, host permissions, storage-key behavior, production config, public copy, CWS submission state, provider calls, or secrets handling without owner approval.
- Do not add Supabase host permissions, Supabase project origins, anon keys, redirect allowlists, or live Supabase sign-in behavior before the owner-gated activation follow-up.
- Do not write raw API Keys, raw prompts, raw provider responses, private page bodies, screenshot/base64 payloads, full URLs, clipboard content, or sensitive logs into docs, console, storage, release artifacts, or remote services.
- Do not present screenshot as an ordinary-user primary entry or public selling point; it remains an internal right-click path only.
- Do not treat the local supply-chain baseline or unresolved High/Critical ledger state as a fresh registry audit, closure evidence, or zero-vulnerability claim; fresh registry audit remains external pending.

## Storage & Data

| 数据 | 位置 | 敏感级别 | 规则 |
| --- | --- | --- | --- |
| BYOK API Keys | `chrome.storage.local/contextai_api_keys` | secret | Not plaintext; local encryption/obfuscation only, not protection against a compromised machine or readable browser profile. |
| Non-secret settings | `chrome.storage.sync/contextai_settings` plus `chrome.storage.sync/contextai_clipboard_sense_revocation_epoch` | normal | Sync-safe settings only. Clipboard Sense requires `enableClipboardSense: true`, `clipboardSenseConsentVersion: 1`, and `clipboardSenseConsentEpoch` matching the separate revocation epoch; missing epoch migrates as `0`, and historical true values without the consent marker normalize disabled. |
| Local AI conversation history | `chrome.storage.local/contextai_history` | user content | Local storage only; do not log raw prompts/responses into docs or remote systems. |
| Hosted-AI session/account state | `chrome.storage.local/aviso_hosted_session` plus `chrome.storage.local/aviso_hosted_sign_in_result` | sensitive session | Used only for the user-selected hosted path, including backend-normalized account tier/quota display. Invalid, expired, 401, or accepted account-deletion states may clear these hosted keys only; BYOK API keys remain separate. |
| Billing checkout/portal transient UI state | not persisted | normal | Popup-only status copy for checkout, portal, return, cancel, and safe error states. The extension does not store Creem customer IDs, subscription IDs, price IDs, or returned billing URLs. |
| Runtime short cache | in-memory only | transient | Used to reduce repeated preparation work; not persistent storage. |
| Website feedback submissions | Vercel Function to Resend and maintainer mailbox | user-submitted content | Includes only user-submitted issue text, optional tag, optional contact email, and user-uploaded redacted PNG/JPG images/screenshots. The endpoint rejects high-confidence API Keys, tokens, private-key blocks, private body markers, and original model input/output dumps before forwarding, and strips common PNG/JPG metadata. Do not submit secrets, private page bodies, customer data, unpublished documents, or unredacted screenshots. This is not extension telemetry. |

## Pointers

- Architecture map: [docs/architecture/README.md](./architecture/README.md)
- Testing and quality strategy: [docs/architecture/testing.md](./architecture/testing.md)
- Release and rollback rules: [docs/release/README.md](./release/README.md)
- Operations and incident response: [docs/operations/README.md](./operations/README.md)
- Security lifecycle: [docs/security/README.md](./security/README.md)
- Supply-chain baseline: [docs/security/supply-chain-baseline.json](./security/supply-chain-baseline.json)
- AI eval strategy: [docs/ai/evals.md](./ai/evals.md)
- Model/provider policy: [docs/ai/model-provider-policy.md](./ai/model-provider-policy.md)
- Current planning lane: [docs/planning/current/status.md](./planning/current/status.md)
- Current gate: [docs/ai/CURRENT_GATE.md](./ai/CURRENT_GATE.md)
- Status view: [STATUS.md](../STATUS.md)
- Release evidence/checklist: [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)
- Project context: [docs/ai/PROJECT_CONTEXT.md](./ai/PROJECT_CONTEXT.md)
- v0.3 release-closeout evidence: [docs/planning/v0.3/status.md](./planning/v0.3/status.md), [docs/planning/v0.3/release-gates.md](./planning/v0.3/release-gates.md)
- Public website docs: [website/docs](../website/docs/intro.md)
- Public website source: [homepage](../website/src/pages/index.tsx), [feedback page](../website/src/pages/feedback.tsx), [feedback API](../website/api/feedback.js), [website config](../website/docusaurus.config.ts)
- Chrome Web Store listing source: [store-assets/chrome-web-store/STORE_LISTING_COPY.md](../store-assets/chrome-web-store/STORE_LISTING_COPY.md)
