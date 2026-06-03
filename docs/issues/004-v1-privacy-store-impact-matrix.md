# Issue 004: V1 Privacy And Store Impact Matrix

Status: docs-only internal matrix. Not approved for implementation or public copy.

Date: 2026-06-03

Scope: V1-009 release copy / policy preparation input only.

## Sources

- `CLAUDE.md`
- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/specs/aviso-v1-public-launch.md`
- `docs/issues/003-v1-public-launch-issue-map.md`
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`
- `docs/decisions/003-v1-quota-login-subscription.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `docs/store/chrome-web-store-submission-draft.md`
- `website/docs/privacy-policy.md` read only
- `website/docs/intro.md` read only

`AGENTS.md` was not present in this worktree; this matrix follows the AGENTS rules supplied in the task prompt.

## Purpose

This matrix records how the v1.0 default Aviso AI direction would affect privacy policy, Chrome Web Store disclosures, screenshots, store copy, and release gates.

It does not make any planned v1.0 capability live. It does not update public website pages, production privacy policy, Chrome Web Store drafts, screenshots, source code, manifest permissions, host permissions, package configuration, dependencies, release artifacts, Git commits, pushes, or store submissions.

## Current Truth Vs v1.0 Planned Truth

| Layer | Current v0.1 / v0.2-alpha truth | v1.0 planned direction | Copy rule |
| --- | --- | --- | --- |
| Product status | Internal dogfood. Not submitted to Chrome Web Store. | Public launch direction only. | Public copy must not imply launch is complete. |
| Default AI route | BYOK direct-provider from browser extension to user-selected provider. No Aviso backend. | Default Aviso AI route through an Aviso backend, then provider. | Final public copy must wait for implementation, validation, and policy approval. |
| User access | No account, login, anonymous quota, subscription, payment, or hosted checkout. | Anonymous free quota, login after quota, logged-in free quota, subscription, and BYOK fallback. | Planned only until backend/auth/billing are implemented and validated. |
| Provider validation | 豆包 / 火山方舟 has summary-only manual validation. OpenAI / Anthropic native calls remain unvalidated. | Hosted route and BYOK route both need current release evidence. | Do not claim unvalidated providers or vision support. |
| Privacy model | No project-owned server receives AI payloads. Local storage plus direct provider transfer. | Default Aviso AI would send user-triggered AI payloads to Aviso backend and provider subprocessors. | "No data leaves the browser" is not valid for either current provider requests or planned hosted AI. |
| Release materials | Store draft and public privacy page exist as preparation materials. Screenshots and final store declarations remain open. | V1-009 final copy, policy, declarations, screenshots, and release notes. | Final materials must follow actual manifest, implementation, validation, and owner approval. |

## Impact Matrix

| Capability | Current state | v1.0 planned state | Data leaves browser? | Destination | Local-only? | New permission / host permission impact | Chrome Web Store disclosure impact | Privacy policy impact | Screenshot / material impact | Release evidence required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Default Aviso AI | Not implemented. Current AI route is BYOK direct-provider. | Default route labeled "Aviso" via Aviso backend and provider proxy. | Yes, for user-triggered AI payloads. | Aviso backend, then model provider subprocessors. | No. | Likely one Aviso backend host permission after production origin is chosen. No provider expansion without separate decision. | Must disclose transfer to Aviso backend, AI subprocessors, website content processing, and any backend host permission. | Must replace current no-backend-only model with separate default Aviso AI and BYOK flows, retention, deletion/export, subprocessors, and support access. | Must not show as live until working route, quota, and validation exist. Any screenshot must use synthetic/public-safe content. | Approved architecture, backend route, manifest audit, metadata-only logging proof, provider/proxy validation, no raw-content retention proof, owner policy approval. |
| Anonymous quota | Not implemented. No Aviso quota exists. | Small free no-login quota before login. | Yes, quota state/anonymous token metadata; AI payload leaves only when an AI request proceeds. | Aviso backend. AI payload also goes through provider path if accepted. | No for quota-backed AI; local-only actions remain local. | Requires backend host. Any identity/fingerprinting-style mechanism needs separate privacy decision. | Must disclose anonymous identifiers, quota ledger, abuse/rate-limit metadata, and retention. | Must explain anonymous token/install id, quota units, retention, reset/delete limits, and that local-only actions do not consume quota. | Quota banners/prompts cannot appear as live in screenshots until implemented. Avoid showing exact quota numbers until approved. | Synthetic quota QA, abuse/spend cap evidence, metadata retention evidence, no raw payload in quota ledger, copy approval. |
| Login / account | Not implemented. No project account system. | Login after quota exhaustion, account-linked free quota, account lifecycle. | Yes, account/session data leaves browser. | Auth provider and Aviso backend. | No. | Possibly `identity` permission or hosted login redirect, depending on auth decision; not approved now. | Must disclose authentication data, auth processor, account data retention, deletion/export, and any new permission or redirect behavior. | Must explain account data, sessions, deletion/export, support access, and whether history remains local-only. | Account screenshots must use synthetic accounts and hide emails, tokens, account IDs, invoices, and private data. | Owner-chosen auth vendor, session flow QA, account deletion/export policy, manifest/permission review, privacy approval. |
| Subscription / payment | Not implemented. Store draft currently says no payment collected by Aviso. | Paid subscription via hosted checkout, entitlement state, subscription-required UI. | Yes, billing/account metadata leaves browser; card details should stay with hosted checkout provider. | Billing provider and Aviso backend entitlement store. | No. | Usually no extension payment permission if external hosted checkout is used; exact web/redirect flow needs decision. | Must disclose payment/subscription processor, pricing/entitlement behavior, refund/support policy, and whether extension collects payment data. | Must explain billing records, tax/Merchant of Record ownership, retention, cancellation/refund, and that card details do not touch extension/Aviso backend if true. | Pricing/subscription screenshots must wait for final pricing, supported regions, refund policy, and vendor confirmation. | Payment vendor approval, hosted checkout QA, webhook entitlement tests, billing retention policy, screenshot sanitization, owner legal/policy approval. |
| BYOK fallback | Implemented as direct provider mode with encrypted local API Keys. | Retained as advanced route; active route should distinguish "Aviso" vs user provider. | Yes, only when user triggers provider request. | User-selected provider directly from browser extension. | No for AI requests. Settings/key storage remains local. | Current provider host permissions are OpenAI, Anthropic, and Ark. Any new provider host requires separate decision. | Continue disclosing provider host permissions, API Key handling, website content sent to selected provider, and provider terms. | Must distinguish BYOK direct-provider flow from default Aviso AI. Keep API Keys local encrypted unless a separate migration is approved. | Screenshots may show BYOK settings only with masked fields and no real keys. Do not imply BYOK is required for all users if default AI ships. | Provider validation per provider, masked-key UI QA, storage boundary audit, host permission audit, no secret leakage scan. |
| Command palette | Implemented for shortcut, local history/bookmark search, direct questions, and existing AI routing. | Primary entry with quick actions, default Aviso AI/BYOK/local-only route states, quota and login prompts. | Sometimes. Local search stays local; AI actions send request content. | Current: user provider. Planned default route: Aviso backend then provider. | Partial. Search/history/bookmark and local actions can be local-only. | No new permission for UI states alone. Backend host only when real default Aviso AI is wired. | Must disclose website content/user activity processing for AI actions; local bookmark/history search should be explained separately. | Must say local-only command actions do not consume quota or send AI payloads; AI commands do. | Screenshots can draft mocked states internally only. Public screenshots must not show fake quota/login as live. | State mapping tests, keyboard/manual QA, route labeling QA, no accidental provider/backend call in local-only states. |
| Screenshot copy / save / send-to-AI | Screenshot-to-AI internal dogfood exists: user manually selects and confirms visible region; copy/save are not v1.0-complete. | Post-selection toolbar for copy image, save locally, cancel/retry, and send to AI. | Copy/save: no provider transfer if local-only. Send-to-AI: yes. | Copy/save: clipboard/local file path only. Send-to-AI current BYOK provider or planned Aviso backend then provider. | Copy/save/cancel/retry should be local-only. Send-to-AI is not local-only. | Save may require a `downloads` permission only if user-mediated download cannot avoid it; separate decision required. Hosted AI needs backend host. | Must disclose screenshot/image data processing only for send-to-AI, and local-only behavior for copy/save. Any `downloads` permission must be justified. | Must state screenshot/base64 is not persisted, logged, stored in history, or included in release artifacts; provider/backend transfer only after user confirmation. | Store screenshots must not contain private webpages or real screenshots. Do not claim vision provider validation until complete. | Cancel/copy/save/send QA, no screenshot persistence scan, vision provider validation, unsupported-model handling, permission decision if downloads needed, sanitized assets. |
| Inline translation | Current translation MVP uses selected text or command input and existing provider/result panel flow. No full-page DOM translation. | Short selected text translates inline; long/unsafe content routes to result panel. | Yes for AI translation request. | Current: user provider. Planned default route: Aviso backend then provider, unless BYOK active. | No for translation processing; copy result is local-only. | No new permission if selection-only. Any full-page translation or third-party fallback is out of scope and would need new review. | Must disclose selected/user-entered text transfer for translation and no third-party translation fallback if true. | Must keep input boundary: selected text or user-entered text only; no page URL/link URL/page body/screenshot/clipboard/full DOM as translation input. | Inline-card screenshots can show synthetic short text only. Do not imply full-page translation. | Payload exclusion tests, inline/result routing QA, iframe/dark-page QA, quota/provider error QA, no raw text in logs. |
| Double-click menu | Not implemented. Existing selection toolbar and right-click menu remain. | Dropdown-style contextual shortcut with local and AI actions, settings toggle, safe gesture rules. | Only if user chooses an AI action from the menu. | AI route follows active route; local actions stay browser-local. | Partial. Opening menu is local-only. | No new permission expected for UI. Stop before changing provider routing or adding page-wide capture. | Usually no new disclosure for menu itself, but any triggered action must match existing AI/local disclosures. | Must explain safe user-triggered behavior if it materially changes access surfaces; no automatic AI calls. | Public screenshots can show menu only after implementation; must not imply actions are automatic. | Gesture safety QA, disabled setting QA, no trigger inside inputs/password/code/contenteditable, no automatic AI request evidence. |
| History / templates / settings | Implemented local extension storage. API Keys local encrypted; settings sync; history local. | Settings IA separates default Aviso account, BYOK, privacy, templates, and history. History remains local-only unless later account-sync decision. | Mostly no. Data leaves browser only if template content is used in an AI request or account settings are later synced. | Current: browser storage and user provider for AI-expanded templates. Planned account data only after decision. | Mostly yes for management actions. | No new permission for IA cleanup. Any key migration, account sync, or secret sync requires separate decision. | Must disclose local storage, synced non-secret settings, local history, template expansion into AI payloads, and any account-sync change if later approved. | Must keep API Key storage and history/local settings boundaries accurate. Do not promise account sync unless implemented. | Screenshots must hide API Keys and avoid private history/template content. | Storage boundary tests, key masking QA, no secret sync, local history management QA, leakage scan. |

## Public Copy That Must Not Be Written Now

The following lines are blocked for public website, Chrome Web Store listing, screenshots, release notes, and marketing copy:

- "Aviso AI is available by default."
- "Use Aviso without an API Key."
- "Free AI credits are included."
- "Anonymous quota is live."
- "Login, account, subscription, payment, pricing, or plans are live."
- "OpenAI and Anthropic are verified."
- "Screenshot understanding is verified across vision providers."
- "No data leaves the browser."
- "Aviso never sends your data to a server" for v1.0 default AI.
- "Your data only stays local" for AI actions.
- "Full-page translation is supported."
- "Aviso uses Google/Baidu/Youdao translation fallback."
- "Screenshot save is supported" if the final copy/save/download implementation and permission decision are not done.
- "Chrome Web Store submission is complete."
- Any screenshot or caption that visually implies default Aviso AI, quota, login, subscription, pricing, or hosted checkout is live.

## Planned Copy That Can Be Drafted Internally

The following planned-language drafts are acceptable for internal V1-009 preparation only:

- "v1.0 is planned to introduce a default Aviso AI route, with BYOK retained as an advanced option."
- "The planned default Aviso AI flow would send user-triggered AI requests from the extension to Aviso backend, then to model providers."
- "Anonymous quota, login, and subscription are planned access states, not current product behavior."
- "Local-only actions such as copy context, screenshot copy/save, settings, templates, and history management should not consume hosted AI quota."
- "BYOK requests should remain a separate direct-provider data flow using the user's own provider account."
- "Final privacy policy, Chrome Web Store declarations, screenshots, and release copy must wait for implementation facts, manifest review, validation evidence, and owner approval."

## Final Policy And Store Copy Gate

Do not update `website/docs/privacy-policy.md`, public homepage/docs copy, Chrome Web Store dashboard fields, screenshots, or final release notes until all applicable gates below are closed:

1. V1-002 architecture/privacy decision approved by owner.
2. Backend origin, provider route, auth vendor, billing vendor, and retention rules confirmed.
3. Manifest permissions and host permissions finalized and audited.
4. Default Aviso AI, quota, login, subscription, BYOK fallback, screenshot, translation, command palette, double-click, settings/history/templates behaviors implemented or explicitly excluded.
5. Automated tests and manual loaded-extension QA completed for each included behavior.
6. Backend QA proves quota enforcement, rate limits, spend caps, entitlement state, and raw-content logging exclusion with synthetic data.
7. Provider and hosted-route validation evidence recorded as summary-only, without API Keys, raw prompts, raw responses, private page content, screenshots/base64, or provider transcripts.
8. Store screenshots and promo assets created from synthetic/public-safe data only.
9. Source, build, package, screenshots, promo assets, store copy, and release artifacts pass final leakage scan.
10. Chrome Web Store privacy declarations, public privacy policy, Popup copy, final manifest, screenshots, and store listing are cross-checked as one package.
11. Release package, tag, rollback point, and owner launch approval are complete.

## V1-009 Release Evidence Checklist

| Evidence area | Required before public claim |
| --- | --- |
| Default Aviso AI | Backend route contract, implementation, hosted route QA, provider proxy QA, redacted logging proof, subprocessor list, retention policy. |
| Anonymous quota | Anonymous token/install-id design, quota ledger proof, no raw-content ledger proof, abuse/rate-limit/spend cap evidence, quota UI QA. |
| Login/account | Auth vendor approval, session flow QA, account deletion/export/support boundary, any permission/redirect review. |
| Subscription/payment | Payment vendor approval, hosted checkout QA, webhook entitlement tests, refund/cancel/support policy, no card data in extension proof. |
| BYOK fallback | Existing encrypted local key storage audit, manual provider tests, active-route labeling QA, no secret leakage scan. |
| Command palette | Local-only vs AI action routing evidence, quota/provider state QA, keyboard/manual QA, no accidental network for local-only actions. |
| Screenshot | Cancel/retry/copy/save/send QA, no screenshot/base64 persistence proof, permission decision for save if needed, vision validation before vision claims. |
| Translation | Payload exclusion tests, inline/result routing QA, no third-party fallback proof, no page/full-DOM translation claim. |
| Double-click menu | Safe gesture QA, disabled toggle QA, no automatic AI call proof, no input/password/code/editor interference. |
| History/templates/settings | Storage boundary audit, key masking, no secret sync/migration unless approved, local history/template privacy copy. |
| Chrome Web Store | Final dashboard declaration screenshots or owner-filled checklist, final permission justifications, Limited Use wording, sanitized assets. |
| Public website/privacy | Policy and docs updated from final facts only, not from planned drafts; website build/checks if website files change. |

## Stop Conditions For Follow-Up Threads

Stop and ask the owner before any follow-up thread:

- Changes `src/*`, `website/*`, `package.json`, manifest, permissions, host permissions, dependencies, build/package artifacts, or release config.
- Implements or connects backend, auth, quota, subscription, payment, hosted checkout, provider proxy, production domain, or vendor signup.
- Reads, migrates, syncs, prints, logs, or stores API Keys.
- Runs real provider calls or hosted-route validation.
- Sends raw prompt, raw response, selected text, page body, screenshot/base64, clipboard content, full URL, private webpage content, or provider transcript to logs, docs, support tooling, or remote services.
- Adds telemetry, analytics, tracking pixels, ads, affiliate tracking, cache, or remote logging.
- Changes public privacy policy, Chrome Web Store declarations, marketing copy, screenshot captions, `/login/`, or `/pricing/` from planned to live.
- Creates store submissions, release artifacts, tags, commits, pushes, or deployments.

## Acceptance For This Matrix

- It is docs-only and internal.
- It separates current implementation from v1.0 planned behavior.
- It identifies whether each capability is local-only, direct-to-provider, or Aviso-backend-mediated.
- It flags Chrome Web Store, privacy policy, screenshot/material, permission, and evidence impact per capability.
- It provides public-copy prohibitions and internal planned-copy language.
- It keeps final public website, privacy policy, store copy, screenshots, and release claims blocked until implementation facts and validation evidence are stable.
