# Issue 003: V1-004 Public Launch Issue Map

Status: superseded planning reference. Not approved for implementation.

Date: 2026-06-03

Sources:

- `docs/specs/aviso-v1-public-launch.md`
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`
- `docs/decisions/003-v1-quota-login-subscription.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/02_PRD.md`
- `docs/03_TECH_SPEC.md`
- `docs/04_ROADMAP.md`
- `docs/06_RISK_REGISTER.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `docs/issues/001-project-takeover-baseline.md`
- `docs/issues/002-v2-provider-host-permission-handoff.md`

## Summary

This issue map originally turned the hosted-AI v1.0 public launch requirements into follow-up development threads. It does not implement v1.0.

2026-06-05 scope override: v1.0 is now re-scoped to a simplified BYOK basic launch. Hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, backend, remote link-body fetching, and web search are future-state only. Screenshot ordinary-user promotion is paused until the owner decides whether to hide, remove, or keep it internal-only.

Current product truth:

- Aviso is still `v0.1 internal dogfood / 内部试用版` with v0.2-alpha BYOK direct-provider improvements.
- Hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, backend, remote link-body fetching, and web search are not part of v1.0 basic launch implementation.
- Current scope override: Popup v1 settings panel work must be judged against the BYOK direct-provider basic version, not older hosted-AI/account drafts. `appearanceTheme` is allowed only as a non-secret field inside existing `chrome.storage.sync/contextai_settings`; no new storage key or API Key migration is authorized.
- V1-006 inline translation has a P0 implementation and passed user QA; V1-008 default model configuration state passed user QA.
- V1-005 screenshot local action toolbar exists in code, but screenshot entry strategy is paused for ordinary users and must not be treated as store-ready.
- V1-007 double-click dropdown shortcut now has a low-risk local MVP implementation: default-off setting, compact menu, existing action reuse, and unsafe target exclusions. This does not imply hosted AI, quota/login, subscription/payment, provider proxy, public release readiness, or loaded-extension manual QA are complete.
- V1-013 UI language localization is now a public-launch requirement: default UI language follows Chrome UI language for Chinese / English, with a Settings override for `自动` / `中文` / `English`. This is not implemented yet and is separate from translation target-language settings.
- V1-002 and V1-003 are decision drafts only. They are not approvals to implement backend, auth, payment, quota, hosted AI, privacy policy rewrite, manifest changes, or public release.
- Provider host permission approval, code implementation, live validation, public claim readiness, and public release readiness must remain separate.

Planning conclusion:

- The next useful step is a controlled issue sequence, not a homepage redesign or public launch copy refresh.
- UI/state work may start with mocked data after product/design review.
- Backend, auth, quota, subscription, payment, and provider proxy are removed from the v1.0 basic launch path and must wait for a future owner decision to reopen.
- Website and public copy should stay conservative until implementation facts and validation evidence are stable.

## Non-Scope For This Issue

- No `src/*` changes.
- No `website/*` changes.
- No `package.json`, manifest, permission, host permission, or dependency changes.
- No backend, auth, billing, payment, quota, provider proxy, or hosted AI implementation.
- No real provider API calls.
- No API Key access, migration, logging, or output.
- No `/login/`, `/pricing/`, release artifact, tag, store submission, commit, push, or deployment.
- No claim that v1.0 planned capabilities are live.

## Requirement, Decision, Implementation, Validation, Release Split

| Layer | Meaning | Current state | Allowed next step |
|---|---|---|---|
| Requirement | Product direction from `docs/specs/aviso-v1-public-launch.md`. | Exists. | Use as planning source. |
| Decision draft | Architecture, quota, auth, billing, privacy, and subscription recommendation. | V1-002 and V1-003 exist as drafts, not approvals. | Review, refine, and get owner confirmation. |
| Implementation | Code, backend, UI, contracts, policies, or manifest changes. | Not started for v1.0. | Start only in scoped threads with stop conditions. |
| Validation | Tests, manual QA, backend QA, privacy/logging evidence, provider evidence. | Not available for v1.0 hosted AI. | Add validation per slice after implementation. |
| Release readiness | Store copy, policy, screenshots, package, tag, rollback, launch approval. | Blocked. | Draft only; final copy waits for facts. |

## Issue Map

### Current Recommended Basic Launch Sequence

1. Scope cleanup: update docs, QA, and release copy to BYOK basic launch.
2. Screenshot entry decision: hide, remove, or keep internal-only before ordinary-user QA.
3. Basic UI QA: Popup, command palette, result panel/history, double-click menu, template context menu sync, inline translation, BYOK provider state.
4. UI language localization: default to Chrome UI language for Chinese / English and add the Settings override before final English-user QA.
5. Store assets redo: rebuild screenshots and promo assets for the BYOK basic launch; current assets remain placeholders.
6. Release gate: OpenAI / Anthropic native validation, final package/scan, Chrome Web Store privacy declaration, tag, and rollback point.

The issue map below is retained as historical planning detail. Treat hosted AI, quota, login, subscription, payment, provider proxy, and hosted-route copy as future-state only.

### V1 Popup High-Fidelity Settings Panel

Goal:

Bring the actual Popup closer to `docs/design/v1-popup-settings-panel-draft.html` for the BYOK basic launch while preserving the current direct-provider, local-history, and template behavior.

In scope:

- Four Popup tabs: `设置`, `AI 服务`, `记录`, `指令`.
- `设置` tab header with Aviso brand, Popup-only theme switcher, and version number.
- Non-secret `appearanceTheme: "light" | "dark" | "system"` saved in existing `chrome.storage.sync/contextai_settings`, default `system`.
- Current model card with status badge, manual test control, model dropdown, configured-service options, and `添加 AI 服务` entry.
- Compact common feature rows for toolbar, command palette, clipboard prompt, double-click entry, and inline translation with same-row language selector.
- Local-available cards for copy context, search records, and restore conversation.
- `AI 服务` tab with intro card, service configuration title, add-provider dropdown, provider configuration cards, masked key handling, config/test status, and privacy boundary card.
- `记录` tab with autosave intro card, clear-all button, row title, summary, time, restore-on-click, and delete.
- `指令` tab with intro card, instruction cards, edit/delete, and add button.

Out of scope:

- No command panel redesign in this issue.
- No screenshot entry restoration.
- No hosted Aviso AI, login, quota, subscription, payment, backend, provider proxy, remote link-body fetch, web search, telemetry, new dependency, new permission, new storage key, or API Key migration.
- No real provider API validation and no reading or outputting full API Keys.

Acceptance criteria:

- Popup visually matches the draft structure closely enough that all four tabs are recognizable by layout, not only by copy.
- Theme switch changes the Popup settings panel only and persists as a non-secret setting.
- Unconfigured providers do not look selectable in the Settings model dropdown.
- Provider cards never expose full real keys after load; masked values are acceptable.
- Records and instructions preserve existing local history and template behavior.
- Docs, QA checklist, STATUS, and release checklist record remaining loaded-extension QA.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`
- Confirm manifest `permissions` and `host_permissions` are unchanged.

Stop conditions:

- Stop before adding permissions, dependencies, backend/auth/payment/quota/hosted AI/provider proxy, new storage keys, API Key migration, real network validation, full-key output, workspace reset, commit, push, or release.

### V1-004 Command Palette Main Entry

Goal:

Make the command palette useful for v1.0 basic launch by surfacing quick actions, direct instructions, local search, BYOK route state, and local actions without presenting quota/login/subscription as live.

In scope:

- Read current command palette behavior and existing `src/contents/command.tsx` patterns.
- Design or implement mocked UI states for: available, loading, empty, quota low, quota exhausted, login required, subscription required, BYOK active, local-only.
- Add quick-action planning for screenshot, copy context, custom templates, and page summary.
- Keep history/bookmark search useful but visually secondary to the main action model.

Out of scope:

- Real backend, auth, quota, subscription, payment, hosted AI, or provider proxy.
- New routes, website copy, manifest changes, permissions, dependencies, API Key migration, real provider calls.
- Public claim that command palette quota/login states are live.

Dependencies:

- Requires V1-001 design package confirmation or an explicit owner-approved mocked-state design slice.
- Can proceed before backend implementation if all quota/auth/subscription data is mocked.

Risk: Medium.

Recommended execution:

- Codex for state model, existing component integration, tests, and docs.
- Claude Code only after design direction exists, for component polish or layout variants.

Acceptance criteria:

- Command palette can display quick actions and mocked access states without real network calls.
- Local-only actions do not show quota/login blockers.
- BYOK-active state is visually distinct from default Aviso AI state.
- Tests cover state mapping and local-only routing where logic changes.
- Docs and status explicitly say this is mocked or UI-only if no backend exists.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `npm run build` when UI/runtime files change
- Manual loaded-extension QA for keyboard navigation, quick actions, quota state display, and no accidental provider call.

Stop conditions:

- Stop before adding real backend calls, new host permissions, auth permissions, provider calls, telemetry, storage migrations, or public copy claims.

### V1-005 Screenshot Enhancement

Goal:

Extend the current screenshot overlay so a selected region can be copied, saved locally, cancelled/retried, or sent to AI with clear states.

In scope:

- Reuse the existing V2-005 visible-region overlay.
- Add or plan the post-selection toolbar: copy image, save image, cancel, retry, send to AI.
- Preserve in-memory screenshot handling and no screenshot/base64 persistence.
- Separate local copy/save from AI send and quota/provider states.

Out of scope:

- Separate screenshot popup.
- Prompt field in P0 overlay unless separately approved.
- Full-page scrolling capture.
- New `downloads` permission unless a decision doc approves it.
- Real hosted AI route, provider proxy, real provider validation, or screenshot retention.

Dependencies:

- Requires design confirmation for toolbar states.
- Local copy/save can start earlier than hosted send-to-AI if no new permission is needed.
- Send-to-AI through default Aviso AI waits for V1-002/V1-003 approval and hosted route contract.

Risk: Medium for local actions; High for AI send, permission, or privacy changes.

Recommended execution:

- Codex for overlay reuse, clipboard/download feasibility, state handling, tests, and privacy docs.
- Claude Code for final toolbar visual polish after design is confirmed.

Acceptance criteria:

- Copy/save/cancel/retry states are visible and recoverable.
- Local copy/save do not consume quota and do not ask users to login.
- Screenshot/base64 is not written to history, storage, docs, logs, telemetry, files, or release artifacts.
- Any need for `downloads` permission is recorded as a separate owner decision before implementation.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Manual QA for cancel, retry, copy success/failure, save success/failure, send-to-AI unsupported model, quota, and login-required states.

Stop conditions:

- Stop before new permissions, broad capture behavior, screenshot persistence, real provider calls, hosted AI wiring, or public release claims.

### V1-006 Inline Selection Translation

Goal:

Translate short selected text inline near the selection, while routing long or unsuitable content to the result panel.

In scope:

- Inline translation card states: loading, translated, copy, retry, error, quota, login-required, provider-not-configured, send to result panel.
- Routing rules for short inline text, long text, unsafe replacement contexts, and result panel fallback.
- Preserve input boundary: selected text or user-entered text only.
- Replacement feasibility review for editable contexts, with safe replace disabled by default if uncertain.

Out of scope:

- Full-page DOM translation.
- Third-party translation fallback.
- Page URL, link URL, page body, screenshot, clipboard, or remote-link body as translation input.
- Real hosted translation without V1-002/V1-003 approvals.

Dependencies:

- Requires V1-001 design package and mocked quota/provider state contract.
- Real hosted route depends on V1-002/V1-003 approval and backend contract.

Risk: High because it combines UI, privacy boundaries, provider routing, quota/login states, iframes, and page-edit safety.

Recommended execution:

- Start with Codex read-only/plan thread for routing and safety matrix.
- Then Codex implementation with mocked states.
- Claude Code should only polish card visuals after behavior and states are accepted.

Acceptance criteria:

- Short selected text can display a compact inline translation card.
- Long or unsuitable content routes to result panel.
- Copy action works without extra provider calls.
- Replace is allowed only in explicitly safe editable contexts, or remains disabled with clear copy.
- Tests prove translation payload excludes page URL, link URL, page body, screenshot, clipboard, and full DOM.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Manual QA across normal pages, dark pages, iframes, editable fields, long selections, quota/login/provider errors, and result-panel routing.

Stop conditions:

- Stop before full-page translation, third-party fallback, broad host permissions, raw-content logging, real hosted route, provider calls, or unsafe replacement behavior.

### V1-007 Double-Click Dropdown Shortcut

Goal:

Add a compact double-click contextual menu using dropdown/right-click menu styling, not the horizontal selection toolbar.

Implementation note:

2026-06-04 local MVP is implemented with a default-off setting and existing action reuse. Remaining v1.0 work is loaded-extension manual QA, final design review, and any later decision about changing the default state.

In scope:

- Menu actions: screenshot, copy context, custom template, page summary.
- Conditional actions for valid selections: translate, explain, polish, summarize.
- Settings toggle to disable the shortcut.
- Close on `Esc`, outside click, scroll, or action completion.
- Avoid text inputs, password fields, code editors, and `contenteditable`.

Out of scope:

- Replacing the selection toolbar.
- Native browser behavior overrides that make text selection unreliable.
- New permissions, hosted AI, quota implementation, payment, backend, or provider changes.

Dependencies:

- Requires design confirmation for dropdown style and safe gesture rules.
- Can proceed in parallel with V1-004 and V1-005 if it avoids shared core routing changes or coordinates with them.

Risk: Medium.

Recommended execution:

- Codex for gesture safety, settings toggle, runtime integration, and tests.
- Claude Code for compact menu styling after component behavior is stable.

Acceptance criteria:

- Menu appears only when the double-click gesture is safe and predictable.
- Disabled setting fully suppresses the menu.
- Conditional actions match current selection validity.
- Existing selection toolbar and context menu behavior are not broken.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Manual QA on text selection, ordinary pages, iframes, inputs, editors, scroll/outside click, and disabled setting.

Stop conditions:

- Stop before adding permissions, changing core provider routing, implementing hosted AI, or introducing page-wide capture beyond existing user-triggered flows.

### V1-008 BYOK Settings Cleanup

Goal:

Keep BYOK as an advanced fallback while making settings clearer for a future default Aviso AI path.

In scope:

- Read current Popup settings IA and storage boundary.
- Draft or implement UI grouping for: default Aviso account, advanced BYOK providers, privacy, templates, history.
- Add active-route labeling such as "Aviso" vs "Your OpenAI key" only where states are mocked or real data exists.
- Preserve manual single-provider connectivity checks for BYOK.

Out of scope:

- API Key storage migration.
- Syncing secrets.
- New provider hosts.
- Hosted AI, login, subscription, payment, backend, or provider proxy implementation.
- Public copy that implies default Aviso AI is live.

Dependencies:

- Can proceed with mocked/default-disabled Aviso route labels after design confirmation.
- Real account route depends on V1-002/V1-003 approval and backend/auth decisions.

Risk: Medium.

Recommended execution:

- Codex for settings IA implementation, storage-boundary tests, and docs.
- Claude Code for settings visual review once the information architecture is stable.

Acceptance criteria:

- Existing BYOK keys remain in encrypted local storage under the current key.
- Non-secret settings remain in sync storage.
- Users can still test one configured BYOK provider manually.
- Any "Aviso" default route is clearly marked unavailable, planned, or mocked until backend exists.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Manual QA for existing provider setup, manual connectivity UI, route labels, privacy copy, templates, and history.

Stop conditions:

- Stop before reading or migrating API Keys, adding auth/backend calls, changing manifest permissions, syncing secrets, or claiming hosted AI availability.

### V1-003 Backend API Contract And Quota Foundation

Goal:

Define the backend contract required for default Aviso AI, anonymous quota, logged-in quota, entitlement, provider proxy, redacted logging, and data deletion/export.

In scope:

- API contract docs for quota state, anonymous token, AI request, entitlement state, hosted route errors, webhook events, deletion/export.
- Synthetic backend implementation plan or scaffold only if owner explicitly approves.
- Metadata-only logging schema with raw-content exclusion.
- Abuse, spend cap, rate limit, and retention matrix.

Out of scope:

- Choosing vendors without owner confirmation.
- Payment implementation.
- Real provider proxy calls.
- Production deployment.
- API Key handling or provider secrets.
- Extension manifest changes.

Dependencies:

- Requires owner approval of V1-002/V1-003 direction before implementation.
- API contract docs can start now as docs-only or plan-only.

Risk: High.

Recommended execution:

- Codex plan/docs-only first.
- Implementation should be a separate backend repo or clearly isolated service thread only after owner confirms stack, vendor, domain, and secrets boundary.
- Claude Code is not the primary tool for backend contracts.

Acceptance criteria:

- Contract separates anonymous, logged-in free, subscriber, BYOK, and local-only states.
- Raw prompts, raw responses, selected text, page bodies, screenshots, clipboard content, full URLs, API Keys, and provider responses are excluded from persistent logs by default.
- Quota ledger records units and metadata only.
- Provider proxy errors are normalized into user-safe categories.

Validation:

- Docs review for contract completeness.
- Later implementation must include backend unit/integration tests with synthetic data.
- Later security/privacy review before any real payload traffic.

Stop conditions:

- Stop before real backend deployment, vendor signup, secrets, real provider calls, production domain, database migration, telemetry, or payment wiring.

### V1-003 Auth, Subscription, And Payment

Goal:

Implement or plan the account, login, subscription, hosted checkout, entitlement, and account lifecycle path for v1.0.

In scope:

- Owner-confirmed auth and payment vendor plan.
- Login/session UX and extension/web handoff design.
- Hosted checkout and entitlement state model.
- Account deletion/export and support boundaries.

Out of scope:

- Card collection inside the extension.
- Custom payment flow.
- Fingerprinting-style anonymous identity.
- Payment vendor signup or production configuration without owner confirmation.
- Public pricing page claims before final pricing is approved.

Dependencies:

- Requires owner confirmation of auth vendor, payment vendor, countries, pricing, tax/Merchant of Record responsibility, refund policy, and support policy.
- Must follow the backend quota contract.

Risk: High.

Recommended execution:

- Product-confirmation thread first.
- Codex implementation only after vendors and policy are confirmed.
- Claude Code can later polish login/access prompt UI, not own payment architecture.

Acceptance criteria:

- Login, plan, BYOK, and cancel paths are available from Access Prompt.
- Entitlement state is backend-authoritative.
- Payment card details never touch the extension or Aviso backend if hosted checkout is used.
- Subscription expired and fallback states are covered.

Validation:

- Synthetic auth/billing tests.
- Webhook entitlement tests.
- Manual QA for login success/failure, checkout cancel/success, expired subscription, BYOK fallback, and local-only actions.
- Privacy/store copy review after implementation facts exist.

Stop conditions:

- Stop before vendor choice, production secrets, payment setup, new extension permissions, redirect routes, public pricing route, or live billing activity.

### V1-013 UI Language Localization

Goal:

Make Aviso default to the user's Chrome UI language for Chinese / English before public release, while keeping a Settings override for `自动` / `中文` / `English`.

In scope:

- Add a non-secret UI language preference inside existing `chrome.storage.sync/contextai_settings`.
- Resolve `自动` from Chrome UI language: `zh-*` shows Chinese UI; non-Chinese Chrome UI languages show English UI until more locales are approved.
- Localize user-facing extension UI surfaces: Popup, command palette, result panel, selection toolbar, inline translation card, double-click menu, native context menus, screenshot overlay/toolbars if kept, toasts/errors, and extension manifest copy if needed.
- Keep UI language separate from the inline translation target-language selector.

Out of scope:

- Translation target-language behavior, model output language, provider routing, provider prompts, backend, hosted AI, provider proxy, login, quota, subscription, payment, telemetry, analytics, permissions, host permissions, dependencies, storage key migration, or API Key handling.
- Website localization; handle that separately if public website bilingual support becomes required.

Dependencies:

- Should land after the current Popup/settings IA is stable enough to host the language selector.
- Should land before V1-009 final public release copy, screenshots, and English-user QA.

Risk: Medium for UI consistency; low for privacy and permissions if kept local.

Recommended execution:

- Codex implementation thread with a shared i18n helper/dictionaries, focused tests, and loaded-extension QA.
- Avoid scattering one-off copy switches across components.

Acceptance criteria:

- Fresh Chinese Chrome install defaults to Chinese UI.
- Fresh English Chrome install defaults to English UI.
- Settings exposes `自动` / `中文` / `English`, and explicit choices override Chrome UI language.
- Native context menus update after language changes.
- Translation target-language setting remains separate.
- No new permission, dependency, provider, backend, hosted AI, provider proxy, telemetry, storage key migration, or API Key behavior change is introduced.

Validation:

- `npm test`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`
- Inspect built manifest permissions and host permissions.
- Loaded-extension QA for Auto / Chinese / English modes.

Stop conditions:

- Stop before permissions, dependencies, backend/remote localization calls, telemetry, provider calls, storage migration, public release claims, store submission, package, tag, push, or deploy.

### V1-009 Public Release Copy And Policy

Goal:

Prepare final privacy policy, Chrome Web Store declarations, screenshots, release notes, support copy, and launch readiness only after implementation facts are stable.

In scope:

- Early draft matrix of copy impacts from V1-002 to V1-008 and V1-013.
- Store privacy declaration checklist.
- Screenshot sanitization rules.
- Release evidence checklist for hosted AI, BYOK, quota, auth, payment, screenshot, translation, command palette, double-click, and UI language.

Out of scope:

- Updating website production pages before core behavior is fact-stable.
- Creating `/login/` or `/pricing/` routes.
- Store submission, tag, package, push, or production launch.
- Claims that planned v1.0 capabilities are live.

Dependencies:

- Drafting can start early.
- Final copy must wait for V1-002 to V1-008 plus V1-013 implementation facts, validation evidence, final manifest, privacy approvals, and release checklist completion.

Risk: High for public trust and policy accuracy.

Recommended execution:

- Codex docs-only draft/review thread early.
- Claude Code or Product Design only after stable product behavior, for homepage/design refresh and screenshot composition.
- Final release gate should be a separate CTO/Gate review.

Acceptance criteria:

- Copy distinguishes current, planned, implemented, validated, and released states.
- Privacy policy explains default Aviso AI and BYOK as different data flows if hosted AI ships.
- Store declarations match actual manifest, permissions, data flows, subprocessors, and retention.
- Screenshots contain no API Keys, private pages, private accounts, raw prompts, raw responses, or sensitive data.

Validation:

- `git diff --check` for docs.
- Later website build if `website/*` changes.
- Final leakage scan after screenshots, store assets, package, and release artifacts exist.
- Final owner launch approval.

Stop conditions:

- Stop before changing public copy from planned to live, creating routes, publishing, submitting store materials, tagging, packaging, pushing, or deploying.

## First Recommended Threads

### Thread A: V1-004 Mocked Command Palette States

Execution mode: Codex implementation thread, preferably plan first.

Goal:

Build or plan command palette v1.0 states using mocked quota/login/provider data only.

Must read:

- `AGENTS.md` rules from the task prompt if no file exists.
- `CLAUDE.md`
- `STATUS.md`
- `docs/specs/aviso-v1-public-launch.md`
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`
- `docs/decisions/003-v1-quota-login-subscription.md`
- Existing command palette files and tests.

Scope:

- `src/contents/command.tsx`, related state helpers/tests, and docs only if implementation is approved.
- Mocked local states only.

Out of scope:

- Backend/auth/payment/quota/provider proxy.
- Manifest, permissions, host permissions, dependencies, provider calls, website, release.

Checks:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`

Stop conditions:

- Stop before any real network, provider, auth, payment, permission, or public-copy change.

### Thread B: V1-003 Backend API Contract

Execution mode: Codex docs-only / plan thread.

Goal:

Produce an API contract and validation matrix for default Aviso AI, quota, entitlement, and provider proxy.

Scope:

- Docs only under `docs/specs`, `docs/decisions`, or `docs/issues` as approved by owner.

Out of scope:

- Backend implementation, vendor signup, secrets, production domain, real provider calls, extension manifest.

Checks:

- `git diff --check`
- `git status --short`

Stop conditions:

- Stop before implementation, deployment, vendor selection, secrets, provider traffic, or privacy copy finalization.

### Thread C: Privacy And Store Policy Draft Matrix

Execution mode: Codex docs-only / subagent review.

Goal:

Create a matrix of how v1.0 default Aviso AI changes privacy policy, store declarations, subprocessors, retention, and screenshots.

Scope:

- Internal docs only. Keep all v1.0 items planned, not live.

Out of scope:

- Website production copy, Chrome Web Store submission, final public privacy policy, screenshots.

Checks:

- `git diff --check`
- `git status --short`

Stop conditions:

- Stop before public copy claims, store submission, production deployment, or any raw sensitive evidence.

### Thread D: BYOK Settings Cleanup Feasibility

Execution mode: Codex read-only / plan first.

Goal:

Assess how to make BYOK advanced without breaking current local key storage or provider validation.

Scope:

- Read current Popup/settings/storage code and propose the smallest implementation plan.

Out of scope:

- API Key migration, reading keys, syncing secrets, auth/backend, new provider, new permission, website.

Checks:

- Read-only report first. If later implemented: `npm test`, `npx tsc --noEmit`, `npm run build`.

Stop conditions:

- Stop before key migration, storage-key change, auth/backend wiring, provider calls, or permission changes.

## Can Run In Parallel

Safe now:

- Thread B: backend API contract docs-only.
- Thread C: privacy/store policy impact matrix docs-only.
- Thread D: BYOK settings cleanup feasibility read-only.

Safe after design confirmation:

- V1-004 mocked command palette states.
- V1-005 screenshot local copy/save toolbar.
- V1-007 double-click dropdown shortcut.
- V1-008 BYOK settings UI cleanup.

Needs careful coordination:

- V1-004, V1-007, and V1-008 may all touch user-facing state and settings copy.
- V1-005 and V1-006 may both touch overlay/card surfaces and quota/provider state helpers.

Must wait:

- Hosted Aviso AI implementation.
- Real quota enforcement.
- Auth/login.
- Subscription/payment.
- Provider proxy.
- Real hosted translation.
- Final website/homepage/public policy updates.
- Chrome Web Store submission.

## Must Wait For Product Or Design Confirmation

Product confirmation required:

- Final default architecture: Extension -> Aviso Backend -> Provider.
- Production backend domain.
- Auth vendor.
- Payment vendor.
- Countries/regions, pricing, tax/Merchant of Record, refund policy.
- Anonymous quota size, reset period, logged-in free quota, paid quota or fair-use model.
- Default provider/model for Aviso AI.
- Metadata retention windows.
- Whether history remains local-only.
- Whether any new extension permission is acceptable.
- Final privacy, terms, support, and Chrome Web Store declaration owner.

Design confirmation required:

- First-run and Access Prompt flow.
- Command palette main entry IA.
- Screenshot overlay post-selection toolbar.
- Inline translation card and replacement behavior.
- Double-click dropdown style and gesture rules.
- Settings IA for default account vs advanced BYOK.
- Quota banners, route badges, provider errors, login/subscription states.

## Codex Vs Claude Code

Use Codex for:

- Reading current implementation and maintaining source-of-truth docs.
- Issue maps, contracts, stop conditions, tests, and small scoped implementation.
- Backend API contract planning.
- Privacy/store policy matrices.
- Permission, storage, provider, and release-gate audits.

Use Claude Code for:

- Component style exploration after the product/design state model is stable.
- Homepage or website design only after core implementation facts are stable.
- Component visual audits, not backend/auth/payment decisions.

Current Claude Code recommendation:

- Do not ask Claude Code to redesign the homepage or write public launch copy now.
- If used now, limit it to design drafts or component audits for command palette, screenshot toolbar, inline translation card, double-click dropdown, quota/access prompt, and settings IA.
- Do not let design output become production `website/*` or `src/*` changes without a follow-up scoped implementation thread.

## Website And Public Copy Pause Strategy

Do not make a homepage or public copy refresh in the next batch.

Reason:

- v1.0 capabilities are planned, not implemented.
- V1-002 and V1-003 are drafts, not approvals.
- Hosted AI changes the privacy model and Chrome Web Store declarations.
- Public copy can only be accurate after implementation, validation, final manifest, and policy facts exist.

Allowed now:

- Internal copy impact matrix.
- Draft wording clearly marked planned.
- Store/privacy checklist for future release gate.

Not allowed now:

- Homepage claims that default Aviso AI, anonymous quota, login, subscription, hosted route, or payment are live.
- `/login/` or `/pricing/` production routes.
- Store submission or production launch copy.

## Recommended Merge Sequence: V1-004 To V1-013

1. V1-004 docs/contract baseline and mocked command palette states.
2. V1-005 screenshot local copy/save states, excluding hosted send-to-AI if backend is not ready.
3. V1-007 double-click dropdown shortcut, coordinated with command palette action naming.
4. V1-008 BYOK settings cleanup, after route labels and mocked access states are stable.
5. V1-003 backend API contract docs, if not already merged; implementation only after owner confirmation.
6. V1-003 backend/quota/auth/payment implementation slices in order: quota contract, auth, billing, extension wiring.
7. V1-006 inline translation with mocked states first, then hosted route integration only after backend/quota/privacy gates.
8. V1-013 UI language localization before final English-user QA and public screenshots.
9. V1-009 public release copy and policy finalization last.

Conflict risks:

- V1-004 and V1-007 may conflict on command/action naming.
- V1-004, V1-006, and V1-008 may conflict on quota/provider state helpers.
- V1-005 and V1-006 may conflict on overlay/card positioning and shared tokens.
- V1-013 may touch most user-facing copy surfaces and should land after major IA churn but before screenshots and store copy.
- V1-008 and V1-009 may conflict on settings/privacy copy.
- Backend/auth/payment work should not merge into UI threads until contracts are stable.

Main-thread merge rules:

- One worktree per issue.
- Before merge, re-read current `STATUS.md`, `RELEASE_CHECKLIST.md`, relevant issue doc, and `git status --short`.
- Reject diffs that add unapproved permissions, dependencies, provider calls, API Key migration, telemetry, release actions, or public live claims.
- Run the smallest relevant checks after each merge. UI/code merges need `npm test`, `npx tsc --noEmit`, and usually `npm run build`.
- Docs-only merges need `git diff --check` and `git status --short`.
- Update `STATUS.md` and `RELEASE_CHECKLIST.md` only when facts actually change.
- Keep implementation complete, validation complete, and release-ready as separate statuses.

## Release Gate Reminders

v1.0 is not release-ready until all of the following are complete:

- V1-002 and V1-003 decisions are owner-approved.
- Backend/auth/quota/billing/provider proxy are implemented and validated.
- Extension hosted route and BYOK fallback are implemented and tested.
- Privacy policy and Chrome Web Store declarations match final behavior and manifest.
- Raw-content logging exclusion is validated.
- Store assets are sanitized and scanned.
- Real provider and hosted route validation evidence exists.
- Package, tag, rollback, and final owner launch approval are complete.

## Open Questions For Owner

1. Is the V1-002 default architecture approved: Extension -> Aviso Backend -> Provider?
2. What backend domain may the extension call?
3. Which auth vendor should v1.0 use?
4. Which payment vendor should v1.0 use, and who owns tax/Merchant of Record responsibility?
5. Which quota/pricing candidate should planning use: Conservative, Standard, or Generous?
6. Which provider/model powers default Aviso AI first?
7. Should history remain local-only for v1.0?
8. Are raw prompts, raw responses, screenshots, page bodies, selected text, full URLs, and API Keys prohibited from backend persistent logs by default?
9. Is any new extension permission acceptable for login or screenshot save?
10. Who approves final privacy policy, terms, refund policy, support copy, and Chrome Web Store declarations?
