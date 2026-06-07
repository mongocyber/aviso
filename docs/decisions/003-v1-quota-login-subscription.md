# Decision 003: v1.0 Quota, Login, Subscription, And BYOK Draft

Date: 2026-06-03

Status: paused future-state decision draft. Not approved for implementation.

2026-06-05 owner scope override: login, subscription, payment, anonymous quota, hosted Aviso AI, and provider proxy are explicitly removed from v1.0 basic launch. This document remains a historical/future reference only and must not be used as current implementation or QA scope.

Baseline: v0.1 internal dogfood / v0.2-alpha implementation state as documented in `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/specs/aviso-v1-public-launch.md`, and `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`.

## Context

Aviso currently uses a BYOK direct-provider model:

- Users configure their own provider API Keys.
- API Keys remain encrypted in `chrome.storage.local` under the existing `contextai_api_keys` key.
- AI requests are sent directly from the browser extension to OpenAI, Anthropic, or 豆包 / 火山方舟.
- Aviso has no project-owned backend, account system, anonymous quota, login, subscription, billing, payment, telemetry, or project-owned provider proxy.

The v1.0 public launch direction changes the default product path:

- First-time users should be able to use a limited amount of default Aviso AI before login.
- Quota exhaustion should guide users toward login and subscription, not force provider setup first.
- BYOK should remain available as an advanced fallback for users who prefer their own provider accounts.
- Local-only browser actions should remain available without login or provider configuration when possible.

This draft defines the V1-003 product decision surface only. It does not implement quota, login, subscription, payment, backend, hosted AI, provider proxy, manifest changes, public policy changes, or Chrome Web Store changes.

## Requirement Boundary

This draft records:

- Anonymous first-use flow.
- Quota consumption rules.
- Access Prompt behavior after quota exhaustion.
- Logged-in free quota and paid subscription relationship.
- Long-term BYOK fallback behavior.
- Local-only action boundaries.
- UI states and copy principles.
- Candidate pricing and quota parameters for owner confirmation.
- Implementation split, validation gates, and stop conditions.

This draft does not implement:

- Backend, auth, session, quota, entitlement, billing, payment, or provider proxy code.
- Any `src/*`, `website/*`, `package.json`, manifest, permission, or host permission change.
- Any new dependency.
- Any real provider API call.
- Any API Key access, migration, logging, or storage change.
- Any public statement that anonymous quota, login, subscription, payment, or hosted Aviso AI is live.

## Decision Draft

Recommended product direction:

1. Keep first-use AI available without login through a small anonymous Aviso AI quota.
2. Consume quota only for AI-processing actions routed through default Aviso AI.
3. Keep local-only actions available without quota, login, subscription, or BYOK.
4. When anonymous quota is exhausted, show one Access Prompt with four clear paths: login, view plans, use own API Key, or cancel.
5. After login, grant an account-linked free quota that is larger and more durable than anonymous quota.
6. Paid subscription should increase predictable usage and remove the need for provider API Key setup for most users.
7. BYOK should remain a permanent advanced route, not a temporary migration fallback.
8. BYOK requests should not consume Aviso hosted quota, but users must understand that provider costs and provider terms apply to them.
9. Do not use fingerprinting-style device identification as the default anonymous quota control.
10. Treat pricing, quota numbers, auth vendor, payment vendor, backend domain, privacy policy, and store declarations as separate owner-confirmed release gates.

## Product Relationship

| Path | User identity | Route | Quota / cost | Product role |
|------|---------------|-------|--------------|--------------|
| Anonymous default AI | No login | Extension -> Aviso backend -> Provider | Small anonymous quota | First useful experience after install. |
| Logged-in free | Account | Extension -> Aviso backend -> Provider | Account-linked free quota | Continuity and stronger upgrade path. |
| Paid subscription | Account + active entitlement | Extension -> Aviso backend -> Provider | Paid monthly quota or fair-use allowance | Main v1.0 monetization path. |
| BYOK fallback | Optional account; provider key stored locally | Extension -> user's provider | No Aviso hosted quota consumed | Advanced, privacy/cost/provider-specific route. |
| Local-only | No identity required | Browser-local extension action | No quota consumed | Utility path that works without AI access. |

## Anonymous First-Use Flow

Recommended flow:

1. User installs Aviso.
2. User opens the command palette, right-click menu, selection toolbar, inline translation, or screenshot send-to-AI action.
3. If no active BYOK route is selected, the first AI request uses the default Aviso AI route.
4. Extension asks the backend for anonymous quota state using a backend-issued anonymous token backed by a locally stored random install id.
5. If quota is available, the request proceeds and quota is consumed after the backend accepts the AI-processing request.
6. The UI shows a lightweight quota state only when useful, such as after first use, when quota is low, or when quota is exhausted.
7. When anonymous quota is exhausted, Aviso shows the Access Prompt instead of silently failing or forcing provider setup.

Recommended first-use copy principles:

- Use "Aviso" as the default AI label.
- Avoid explaining billing internals before the user hits a limit.
- Avoid calling the user "trial expired" on first use; use "今日/本周期免费次数已用完" style copy after exhaustion.
- Keep BYOK available but secondary: "使用自己的 API Key" rather than "必须配置 API Key".

## Quota Consumption Rules

Quota should be consumed by AI-processing actions routed through default Aviso AI.

Consumes Aviso quota:

- Command palette direct AI questions.
- Explain, polish, summarize, or custom-template actions when routed through default Aviso AI.
- Page summary when page text is sent to default Aviso AI.
- Short inline translation when routed through default Aviso AI.
- Long translation routed to the result panel when routed through default Aviso AI.
- Screenshot send-to-AI when a selected screenshot is sent through default Aviso AI.
- Follow-up messages in the result panel when routed through default Aviso AI.
- Retry actions that create a new accepted backend AI request.

Does not consume Aviso hosted quota:

- Opening Popup, command palette, result panel, selection toolbar, or double-click menu.
- Searching local history or bookmarks.
- Copying an AI result.
- Saving local history.
- Managing templates.
- Changing settings.
- Copy current context to clipboard.
- Screenshot select, cancel, retry selection, copy image, or save image locally.
- Provider connectivity test for BYOK, if it uses the user's own provider key.
- BYOK AI requests made directly to the user's provider.
- Failed requests rejected before backend AI processing starts, such as empty input, unsupported model for screenshot, missing required payload, or local validation failure.

Recommended accounting principle:

- Start with a simple request-unit model for product copy.
- Internally, backend may map request units to cost tiers by operation type and input/output size buckets.
- Do not expose raw token accounting to ordinary users in v1.0 UI unless support needs it.

## Access Prompt After Quota Exhaustion

When anonymous quota is exhausted, show a single Access Prompt with four routes:

| Option | Primary user value | Result |
|--------|--------------------|--------|
| Login | Continue with account-linked free quota. | Starts login flow. After login, retry or return to the original action if safe. |
| View plans | See paid subscription options. | Opens pricing/plan view after product owner confirms route and pricing. |
| Use own API Key | Continue through BYOK without Aviso hosted quota. | Opens advanced BYOK settings with provider choice and connection-test guidance. |
| Cancel | Return to page without sending data. | Closes prompt and preserves local-only actions. |

Prompt copy principles:

- State the limit plainly: "本周期 Aviso 免费 AI 次数已用完。"
- Do not shame the user or imply data was already sent.
- Make login the recommended next step for ordinary users.
- Make plans visible but not required for users who only want a free account quota.
- Make BYOK understandable: "用你自己的模型 API Key 继续使用；费用和数据处理由你的 provider 账户负责。"
- Always include cancel.

## Logged-In Free Quota And Subscription Relationship

Recommended relationship:

- Anonymous quota is for product discovery and should be small.
- Logged-in free quota is for continuity, abuse control, and a better upgrade path.
- Paid subscription should provide predictable usage and better limits, not just remove a hostile blocker.
- BYOK remains available regardless of subscription status.

Recommended flow:

1. Anonymous user exhausts quota.
2. User logs in.
3. Backend links the session to an account and grants logged-in free quota if eligible.
4. If logged-in free quota is available, the original action can continue after user confirmation or explicit retry.
5. If logged-in free quota is exhausted, show subscription-required state with plan view and BYOK fallback.
6. If paid subscription is active, use paid entitlement for default Aviso AI.
7. If subscription lapses, return to logged-in free quota if available, otherwise show subscription-required state while preserving BYOK and local-only actions.

Do not implement payment collection inside the extension. Use hosted checkout after vendor and policy confirmation.

## BYOK Fallback

BYOK should remain a long-term advanced path for:

- Users who do not want an Aviso subscription.
- Users who prefer direct provider data flow.
- Users who need provider-specific models not included in default Aviso AI.
- Users who already have provider credits or enterprise provider accounts.
- Users who want tighter cost control and accept provider setup complexity.

Recommended BYOK behavior:

- Keep existing encrypted local key storage until a separate migration is approved.
- Keep BYOK settings in an advanced section, not as the first-run default.
- Show active route clearly: "Aviso" or "你的 OpenAI / Anthropic / 豆包 Key".
- Let users switch active route intentionally.
- Keep manual single-provider connectivity tests for BYOK.
- BYOK requests should not consume Aviso hosted quota.
- BYOK should remain available when anonymous, logged-in free, or paid quota is exhausted.
- BYOK should also remain available for subscribers who prefer a specific external provider for a specific task.

Recommended prompt moments for BYOK:

- Quota exhausted Access Prompt.
- Settings advanced section.
- Provider-specific unsupported-model error, such as screenshot-to-AI requiring a vision-capable provider.
- User explicitly chooses "use my own provider" from account or quota UI.

Avoid prompting BYOK:

- Before the first successful anonymous AI use.
- As the primary explanation for every quota warning.
- In local-only flows.

## Local-Only Actions

Local-only actions should work without Aviso quota, login, subscription, payment, or provider API Key where browser permissions allow.

Recommended local-only actions:

- Open command palette.
- Search local extension history.
- Search bookmarks.
- Copy current context to clipboard.
- Screenshot select/cancel/retry.
- Screenshot copy image.
- Screenshot save locally, if implemented without an unacceptable new permission.
- Copy result text already present in the UI.
- Manage templates, settings, and history.

Local-only copy principles:

- State what happens locally: "复制到剪贴板" / "保存到本地".
- Do not imply AI processing.
- Do not show quota warnings for local-only actions.
- If a local-only action needs a new permission, record a separate permission decision before implementation.

## UI States

| State | Meaning | Recommended UI behavior | Example copy direction |
|-------|---------|-------------------------|------------------------|
| `quota_available` | Current default Aviso AI route can run. | Minimal or quiet display; optional remaining quota after first use. | "Aviso AI 可用" / "剩余额度充足". |
| `quota_low` | User is close to limit. | Soft banner or small inline note, no modal. | "免费额度快用完了，登录后可继续使用更多额度。" |
| `quota_exhausted` | Current quota pool is used up. | Show Access Prompt before sending AI data. | "本周期 Aviso 免费 AI 次数已用完。" |
| `login_required` | Login is needed to continue default Aviso AI. | Offer login, plans, BYOK, cancel. | "登录后可继续使用账号免费额度。" |
| `subscription_required` | Account free quota is exhausted and paid entitlement is needed for default Aviso AI. | Offer plans, BYOK, cancel. | "升级后可继续使用 Aviso AI；也可以使用自己的 API Key。" |
| `BYOK_active` | Active route uses user's provider key. | Show route badge and provider-specific failures. | "正在使用你的 OpenAI Key，不消耗 Aviso 额度。" |
| `local_only` | Action does not call AI. | No quota banner; show local success/failure only. | "已复制到剪贴板" / "已保存到本地". |

State rules:

- Quota state should be tied to the active route.
- BYOK-active requests should not display Aviso quota exhaustion as the main failure.
- Local-only states should not ask users to login.
- Subscription-required should never hide BYOK or local-only fallback paths.
- Unsupported-model errors are separate from quota errors.

## Candidate Price And Quota Parameters

These are draft candidates for owner review. They are not approved pricing, not launch copy, and not implementation requirements.

| Candidate | Anonymous quota | Logged-in free quota | Paid plan draft | Best fit | Main risk |
|-----------|-----------------|----------------------|-----------------|----------|-----------|
| Conservative | 3 AI requests per 24 hours | 20 AI requests per month | USD 5-8 / month for 300-500 request units | Lowest cost exposure and abuse risk. | May feel too limited for real evaluation. |
| Standard | 5 AI requests per 24 hours | 50 AI requests per month | USD 9-12 / month for 1,000 request units | Balanced public launch default. | Requires cost modeling and clear overage/fair-use rules. |
| Generous | 10 AI requests per 24 hours | 100 AI requests per month | USD 15-20 / month for 2,000+ request units | Stronger activation and trial experience. | Higher abuse and provider spend risk. |

Recommended starting point for discussion:

- Use the Standard candidate as the product default for planning.
- Keep internal backend spend caps stricter than user-visible quota.
- Treat screenshot/vision and long-page actions as higher-cost request units once cost data exists.
- Confirm whether paid plan should be request-unit based, fair-use based, or a hybrid.

Open pricing decisions:

- Final currency and supported countries/regions.
- Monthly vs annual plan.
- Whether to offer a free account tier indefinitely.
- Whether paid users get hard caps, soft fair-use, or paid overage.
- Refund policy and tax/Merchant of Record responsibility.

## Abuse And Cost Risk

Main risks:

- Anonymous quota can be reset by reinstalling or clearing local storage.
- High-cost operations such as screenshot/vision, long page summary, and repeated retries can create provider spend spikes.
- Attackers may automate extension/backend requests.
- Login and subscription systems introduce account abuse, payment abuse, refund abuse, and support load.
- Overly invasive anonymous identification can damage trust and Chrome Web Store review posture.

Recommended controls:

- Backend-issued anonymous token tied to a locally stored random install id.
- Conservative anonymous quota.
- Coarse IP/network rate limits.
- Backend spend caps by day and provider.
- Operation allowlist and payload size limits.
- Higher unit cost for expensive operations.
- Account-level rate limits after login.
- Payment webhooks and entitlement ledger for subscriptions.
- Metadata-only abuse logs with retention limits.
- Manual review tools that do not expose raw prompts/responses/screenshots/page bodies by default.

Not recommended as default:

- Fingerprinting-style device identification.
- Silent background AI calls to use up quota.
- Recording raw prompts or raw responses for abuse control by default.
- Forcing login before any AI use, because that contradicts the v1.0 requirement.

## Privacy Policy And Chrome Web Store Impact

This decision would require privacy and store copy changes before launch because default Aviso AI changes the current no-backend model.

Privacy policy impacts:

- Explain default Aviso AI data flow: extension -> Aviso backend -> provider.
- Explain BYOK data flow separately: extension -> user's provider.
- Explain what remains local-only.
- Define quota ledger, account, subscription, and metadata retention.
- State that raw prompts, raw responses, screenshots, page bodies, selected text, full URLs, API Keys, and provider responses are not retained in project-owned persistent logs by default, if implemented that way.
- List auth, billing, infrastructure, and model provider subprocessors.
- Explain account deletion, data export, support access, and billing record handling.

Chrome Web Store impacts:

- Store privacy declarations must disclose transfer to Aviso backend for default AI features.
- Provider host permissions remain explainable for BYOK direct-provider mode.
- Any new Aviso backend host permission must be declared and justified.
- Any auth-related or download-related permission must be separately decided before implementation.
- Public copy must not say "no data leaves the browser" for v1.0 default AI.
- Public copy must not claim anonymous quota, login, subscription, payment, or hosted AI are live until implemented and validated.

Backend impacts:

- Needs quota state endpoint, AI request endpoint, auth/session handling, entitlement lookup, subscription webhook handling, provider proxy, rate limiting, spend caps, metadata-only logs, and data deletion/export paths.

Extension UI impacts:

- Needs route state, quota display, low/exhausted prompt, login-required prompt, subscription-required prompt, BYOK active badge, local-only state handling, settings IA update, and retry/resume behavior after login.

## Acceptance Criteria

Planning acceptance:

- Decision draft clearly distinguishes planned V1-003 behavior from current implementation.
- Anonymous first-use flow is documented.
- Quota consumption and non-consumption rules are documented.
- Access Prompt options include login, view plans, use own API Key, and cancel.
- Logged-in free quota and paid subscription relationship is documented.
- BYOK is retained as a long-term advanced fallback.
- Local-only actions are explicitly not quota-consuming.
- Candidate quota/pricing parameters include conservative, standard, and generous options and are marked as needing owner confirmation.
- Abuse and cost risks avoid fingerprinting-style device identification as the default recommendation.
- UI states cover `quota_available`, `quota_low`, `quota_exhausted`, `login_required`, `subscription_required`, `BYOK_active`, and `local_only`.
- Privacy policy, Chrome Web Store, backend, and extension UI impacts are documented.
- Required user confirmations are listed.

Implementation acceptance, after owner approval:

- No anonymous quota, login, subscription, payment, or hosted AI path is enabled without backend/auth/billing decisions.
- Extension never consumes quota for local-only actions.
- Quota and entitlement state is backend-authoritative for default Aviso AI.
- BYOK requests do not consume Aviso hosted quota.
- Access Prompt appears before sending a default-AI request when quota is exhausted.
- API Keys remain local encrypted BYOK secrets unless a separate migration decision is approved.
- No raw prompts, raw responses, screenshots, page bodies, selected text, full URLs, API Keys, or provider responses are persisted in project-owned logs by default.

Validation acceptance, after implementation:

- Unit tests cover quota-state mapping, route-state mapping, local-only non-consumption, BYOK non-consumption, and Access Prompt branching.
- Manual QA covers anonymous first use, quota low, quota exhausted, login path, plan path, BYOK path, cancel path, subscriber active, subscription expired, BYOK active, and local-only actions.
- Backend QA proves quota enforcement, rate limits, spend caps, entitlement lookup, webhook updates, and raw-content logging exclusion using synthetic data.
- Chrome Web Store and privacy policy copy match the final implementation and manifest.

Release readiness:

- This draft is not release-ready.
- v1.0 release remains blocked until V1-002 and V1-003 decisions are approved, implementation is complete, validation evidence exists, privacy/store declarations match actual behavior, release checklist gates are closed, and owner confirms public launch.

## V1-003 Implementation Split Recommendation

Recommended split after owner approval:

1. V1-003A quota/login/subscription final product spec
   - Docs-only.
   - Finalize quota unit model, copy, plans, confirmation questions, and acceptance matrix.

2. V1-003B mocked extension access states
   - Extension UI only with mocked quota/login/subscription/BYOK/local-only states.
   - No backend, auth, billing, payment, or real provider change.
   - Useful for design QA and interaction review.

3. V1-003C backend quota contract
   - API contract and backend implementation for anonymous token, quota state, usage ledger, rate limits, and spend caps.
   - No payment integration yet.

4. V1-003D auth integration
   - Login/session flow after auth vendor confirmation.
   - Requires manifest and privacy review if new extension permission or redirect flow is needed.

5. V1-003E subscription and payment integration
   - Hosted checkout, entitlement sync, webhook handling, subscription states, refund/cancel policy.
   - No card collection inside extension.

6. V1-003F extension-backend wiring
   - Real quota state, Access Prompt branching, retry/resume behavior, route selection, and BYOK fallback.

7. V1-003G privacy/store/release alignment
   - Update privacy policy, Chrome Web Store declarations, public copy, release checklist, and validation evidence.

Recommended sequencing:

- V1-003A and V1-003B can start before backend implementation.
- V1-003C must precede real hosted AI quota enforcement.
- V1-003D and V1-003E require owner confirmation of vendors and payment policy.
- V1-003G must be last for final public claims, although drafts can start early.

## Stop Conditions

Stop and ask the owner before any follow-up thread:

- Adds or changes manifest permissions or host permissions.
- Implements backend, auth, billing, payment, quota, provider proxy, or hosted AI.
- Chooses or signs up for an auth, billing, infrastructure, or provider vendor.
- Runs real provider API calls.
- Reads, migrates, prints, logs, or stores API Keys.
- Sends raw prompt, raw response, selected text, page body, screenshot, clipboard content, full URL, or provider response to logs, docs, support tooling, or remote services.
- Adds telemetry, analytics, tracking pixels, or remote logging.
- Changes public privacy policy, Chrome Web Store declarations, pricing page, or marketing copy from planned to live.
- Creates release artifacts, tags, store submissions, production deployments, commits, or pushes.

## Required User Confirmations

The owner must confirm:

1. Should the Standard candidate be used as the starting quota/pricing model, or should Conservative or Generous be used?
2. What final anonymous quota size and reset period should v1.0 use?
3. What final logged-in free quota should v1.0 use?
4. Should paid subscription be hard request-unit quota, fair-use, or hybrid?
5. What monthly price range is acceptable for the first paid plan?
6. Which countries/regions should paid subscriptions support at launch?
7. Which auth vendor should be used?
8. Which payment vendor should be used, and who owns tax/Merchant of Record responsibility?
9. What production backend domain may the extension call?
10. Which provider/model should power default Aviso AI first?
11. Are screenshot/vision and long-page actions charged as higher-cost units?
12. Should anonymous quota use backend-issued anonymous token plus locally stored random id as recommended?
13. Are fingerprinting-style device identifiers explicitly excluded from v1.0 default abuse control?
14. Should BYOK remain direct-provider forever, or only for v1.0?
15. Should logged-in users be able to use both paid Aviso AI and BYOK in parallel?
16. Should history remain local-only for v1.0?
17. Who approves final terms, privacy policy, refund policy, support policy, and Chrome Web Store declarations?

## Implementation Status

Not implemented:

- Anonymous quota.
- Logged-in free quota.
- Quota ledger.
- Login.
- Auth session.
- Subscription.
- Payment.
- Hosted checkout.
- Default Aviso AI backend route.
- Provider proxy.
- Access Prompt.
- Quota UI.
- BYOK-vs-Aviso route badge.
- Privacy policy rewrite for hosted AI.
- Chrome Web Store declarations for hosted AI.

Current implementation remains BYOK direct-provider plus local-only browser extension actions.

## Validation Status

Not validated:

- Anonymous first-use quota.
- Quota consumption and non-consumption rules.
- Access Prompt branching.
- Login flow.
- Logged-in free quota.
- Subscription-required flow.
- Payment/checkout.
- Entitlement sync.
- BYOK fallback inside quota-exhausted states.
- Backend abuse controls.
- Backend raw-content logging exclusion.
- Privacy/store accuracy for hosted AI.

Current validated evidence remains limited to the existing internal dogfood and provider-specific release checklist records.

## Release Readiness

This draft is not release-ready.

v1.0 public release remains blocked until:

- V1-002 and V1-003 are approved by the owner.
- Backend/auth/quota/billing/provider proxy are implemented.
- Extension UI and hosted route behavior are implemented and tested.
- BYOK fallback remains tested and clearly labeled.
- Privacy policy and Chrome Web Store declarations match final behavior.
- Store assets are sanitized.
- Real provider and hosted-route validation evidence exists.
- Release checklist, package, tag, rollback, and owner launch approval gates are complete.
