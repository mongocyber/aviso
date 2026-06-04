# Aviso Privacy And Security

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal privacy and security baseline plus v0.2-alpha planning notes; not a public privacy policy

## Current Privacy Model

Aviso has no project-owned backend. The extension runs in the user's browser and sends AI requests directly to the selected provider.

Current provider options in code:

- OpenAI
- Anthropic
- 豆包 / 火山方舟

OpenAI and Anthropic code paths and host permissions are implemented but not live-validated. 豆包 / 火山方舟 has passed the V2-004 manual single-provider connectivity test with summary-only evidence.

## Data Stored Locally

| Data     | Where stored                                      | Protection / notes                                                                |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| API Keys | `chrome.storage.local` under `contextai_api_keys` | Encrypted with CryptoJS AES before storage.                                       |
| Settings | `chrome.storage.sync` under `contextai_settings`  | Includes model choice, feature toggles, templates, and 豆包 endpoint/model value. |
| History  | `chrome.storage.local` under `contextai_history`  | Stores local request and output history.                                          |

The internal `contextai_*` key names are retained for compatibility after the Aviso rename.

## Data Sent To Providers

Depending on user action, provider requests may include:

- selected text
- user-entered prompt
- current page URL
- selected link URL
- supported image URL or supported base64 image data
- extracted current page text for page summary
- custom template prompt after placeholder expansion

Aviso does not claim that model providers avoid retaining data. Provider behavior depends on the user's selected provider and account terms.

## Data Not Sent To Aviso

Aviso does not currently send data to a project-owned server because no project-owned server exists.

The project currently does not add:

- telemetry
- analytics SDKs
- tracking pixels
- account identifiers
- project-owned logging service
- project-owned model proxy

## Permissions

Current browser permissions:

- `contextMenus`: create Aviso right-click menu entries.
- `activeTab`: interact with the current active tab after user action.
- `storage`: store settings, API Keys, and history.
- `bookmarks`: search bookmarks from the command palette.
- `clipboardWrite`: support copy actions from the floating UI.

Current content script site access:

- `content_scripts.matches` uses `<all_urls>` so Aviso can show the selection toolbar, command palette, in-page result panel, clipboard prompt, iframe bridge, and screenshot selection UI on webpages where the user invokes the extension.
- This site access is not used for arbitrary remote link-body fetching, ads, telemetry, analytics, project-owned logging, or sending page content to an Aviso server.
- Page content is sent to a model provider only when the user manually triggers an AI action that needs that content.

Current host permissions:

- `https://api.openai.com/*`: required for direct OpenAI API calls.
- `https://api.anthropic.com/*`: required for direct Anthropic API calls.
- `https://ark.cn-beijing.volces.com/*`: required for 豆包 / 火山方舟 OpenAI-compatible API calls.

Aviso does not currently request broad host permissions for arbitrary remote page fetching.

## Security Controls

- API Keys are encrypted before local storage.
- Sensitive clipboard content and sensitive domains are filtered before clipboard toast behavior.
- Unsupported image sources are rejected with readable errors before model calls when possible.
- Page content is truncated to 5000 characters by default before submission.
- Error messages are normalized to avoid leaking provider internals or sensitive remote image URLs.
- Provider connectivity tests are manual, single-provider, and summary-only. They use a fixed public prompt and do not include page content, selected text, links, images, screenshots, clipboard content, raw provider responses, or API Keys in the displayed validation summary.
- V2-004B performance summaries are local-console only. `[Aviso perf]` logs include fixed fields, input-size buckets, coarse context types, timing marks, and error categories; they do not include raw prompts, raw responses, selected text, page content, full URLs, image/base64 payloads, screenshots, or API Keys.
- Performance summaries are not persisted to `chrome.storage` and are not sent to telemetry, analytics, a project-owned server, or any remote logging service.
- V2-004C follow-up speed guard sends only a bounded recent `priorContext` instead of the full visible conversation history. Slow-response and stop-waiting UI states do not log raw prompts, raw responses, page content, selected text, full URLs, images/base64, screenshots, or API Keys. Stopped requests may be classified as `user_cancelled` in local `[Aviso perf]` summaries only.
- V2-005 screenshot-to-AI is user-triggered and confirmation-gated. The extension captures only after the user selects a visible region and confirms, crops the image in memory, does not persist screenshot/base64 data, and does not attach the full page URL to the screenshot provider payload.
- V2-006 copy current context is user-triggered from the right-click menu. It writes structured title, URL, optional selected text, and truncated page text to the user's clipboard only; it does not call AI providers, save to history, write to `chrome.storage`, log copied content, or send telemetry.
- V2-007 translation is limited to selected text or command-palette user input. It reuses the existing configured provider/model and does not include page URL, link URL, remote link body, page body, screenshots, clipboard content, or full-page DOM content as translation input.
- V2-008 theme / panel polish changes only visible UI styling and naming. It does not add stored theme settings, storage migrations, permissions, providers, dependencies, telemetry, cache, provider validation calls, or new data sent to providers.
- V1-008 BYOK settings cleanup changes only the Popup settings information architecture. The `AI` tab marks Aviso AI as planned / unavailable in the current version and keeps OpenAI, Anthropic, and 豆包 / 火山方舟 Key fields plus manual provider connectivity tests under an advanced BYOK section. It does not add hosted AI, login, quota, subscription, payment, backend, provider proxy, storage keys, permissions, providers, dependencies, telemetry, analytics, or real provider validation calls.
- Build artifacts, `node_modules`, environment files, caches, and key-like files are ignored by Git.
- Chrome Web Store listing copy must disclose both the provider `host_permissions` and the broad content-script site access used for in-page UI surfaces.

## Known Gaps Before Public Release

- Public privacy policy page exists and has been aligned with the current Popup copy, implemented provider host permissions, and v0.2-alpha data-flow boundaries. Final Chrome Web Store declaration alignment is still not complete.
- Chrome Web Store privacy declarations are drafted in `docs/store/chrome-web-store-submission-draft.md` but not yet entered in the dashboard or owner-approved.
- OpenAI live validation is not complete.
- Anthropic live validation is not complete.
- OpenAI and Anthropic host permission manifest changes and manual validation UI are implemented, but validation records are still missing.
- 豆包 / 火山方舟 validation is recorded only as a summary. Do not add screenshots, API Keys, raw prompts, raw responses, or private page content to public docs or store assets.
- Provider validation evidence should be recorded without exposing keys, private pages, or raw sensitive content.
- Store screenshots must be sanitized.
- Current source, Git history, and `build/chrome-mv3-prod.zip` passed local common API Key pattern scans on 2026-06-03. Source and zip were rescanned after the privacy-consistency update; store screenshots, store assets, and final release artifacts still need a final leakage scan.

## v0.2-alpha Privacy Notes

v0.2-alpha planning keeps the v0.1 privacy model: no project-owned backend, no telemetry, no analytics, and no automatic provider calls without user action.

### Planned Or Candidate Data Flows

| Capability | Data involved | Privacy stance |
|------------|---------------|----------------|
| Provider connectivity test | Fixed public test prompt, selected provider endpoint, user API Key | Implemented as a user-triggered single-provider action. Do not run all tests automatically when settings opens. Do not log raw prompts, raw responses, keys, private webpages, or private screenshots. |
| Model routing | Feature route IDs, provider/model IDs, non-secret settings | Store route configuration in `chrome.storage.sync`; keep API Keys encrypted in `chrome.storage.local`. |
| Latency baseline | Redacted trigger/provider/model labels, input-size bucket, coarse context type, timing marks, error category | Implemented in V2-004B as local-console summaries only. Do not persist or transmit these logs, and do not add raw text, full URLs, images/base64, screenshots, responses, or keys. |
| Follow-up speed guard | Recent bounded prior conversation excerpt, user follow-up question, requestId, cancellation state | Implemented in V2-004C with character budgets, slow-first-chunk hint, stop waiting, background abort signal, and fixed `user_cancelled` category. Do not log raw conversation text, page content, selected text, full URLs, images/base64, screenshots, responses, or keys. |
| Screenshot to AI | User-selected visible-page image region and optional prompt | Implemented in V2-005 for internal dogfood with right-click trigger, region selection, explicit confirmation, in-memory crop, no screenshot/base64 persistence, no full page URL in the screenshot provider payload, and no new manifest permissions. Loaded-extension QA is still required before release claims. |
| Copy current context | Page title, URL, optional selection, truncated page text | Implemented in V2-006. Copies to the user's clipboard only. No provider call unless the user separately sends it to AI. No history/storage/log/telemetry persistence. |
| Translation MVP | Selected text or command-palette user input, provider/model choice | Implemented in V2-007 through the existing provider flow. Third-party translation fallback, full-page DOM translation, link-body translation, and YouTube subtitles are not in MVP. Page URL, link URL, page body, screenshots, clipboard content, and raw provider responses are not added to translation input or logs. |
| Theme / panel polish | Existing visible UI state only | Implemented in V2-008. No new user data, provider payload, storage key, permission, host permission, remote call, telemetry, cache, or API Key behavior is introduced. |
| BYOK settings cleanup | Existing settings UI labels, current selected model/provider route, existing API Key fields and manual connectivity summaries | Implemented in V1-008 as Popup IA/copy only. Aviso AI is shown as planned/unavailable; BYOK remains the current direct-provider path. API Keys remain encrypted in `chrome.storage.local/contextai_api_keys`; non-secret settings remain in `chrome.storage.sync/contextai_settings`. |
| Local result cache | Operation, input hash/content depending on implementation, output, provider/model metadata, expiry time | Requires TTL, clear-cache control, and privacy copy before shipping. |

### v0.2-alpha Permission Principles

- OpenAI and Anthropic provider host permissions are implemented in V2-003. Any other new `host_permissions` require a documented provider or translation decision before implementation.
- `tabs`, `scripting`, `tabGroups`, `offscreen`, microphone access, and broad remote-link fetching are not part of the v0.2-alpha MVP.
- Copy current context must continue using the existing `clipboardWrite` boundary and must not add `clipboardRead`, broader page host permissions, cache, telemetry, or provider calls.
- Translation must continue using the existing provider host boundary and must not add Google/Baidu/Youdao fallback, broad page host permissions, full-page DOM translation, remote-link body fetching, cache, telemetry, or raw-content logging without a separate decision.
- Theme / panel polish must remain visual-only. Do not use it to introduce persisted theme settings, storage namespace migration, telemetry, cache, new provider calls, or public release claims.
- If a future issue needs one of those permissions, create a decision note first and update this document, `docs/06_RISK_REGISTER.md`, and `RELEASE_CHECKLIST.md`.
- Chrome Web Store and public privacy copy must match the final manifest, not the planning draft.

## Not In v0.1

- Server-side account system.
- Project-owned provider proxy.
- Telemetry or analytics.
- Remote link body fetching through broad host permissions.
- Full internal storage namespace migration.
- v0.2-alpha MVP does not include default Google/Baidu/Youdao translation fallback, multi-tab aggregation, tab grouping, or voice input.

## Open Questions

- Should public release include all provider options if only 豆包 has been user-confirmed?
- Is API Key local encryption sufficient for public messaging, or should the product explain browser-local risk more explicitly?
- Should history be optional or default-on for public release?
- Should local AI/translation cache be default-on, default-off, or unavailable until public release copy is finalized?
- What screenshot confirmation UX is enough before sending a selected region to a provider?
- What exact Chrome Web Store privacy declaration wording should be used for the final public submission?

## Changelog

- 2026-06-04: Added V1-008 BYOK settings cleanup privacy note confirming Popup IA/copy-only changes, planned/unavailable Aviso AI wording, unchanged local encrypted API Key storage, unchanged non-secret sync settings, unchanged manual redacted connectivity tests, and no hosted/backend/auth/quota/payment implementation.
- 2026-06-03: Aligned Popup privacy copy and public privacy policy with the current provider host permissions, direct-provider data flow, v0.2-alpha feature privacy boundaries, and current leakage-scan state.
- 2026-06-03: Added Chrome Web Store submission draft and explicit disclosure note for `<all_urls>` content-script site access.
- 2026-06-03: Added Chrome Web Store Limited Use wording to the public privacy policy draft.
- 2026-06-02: Updated V2-003 provider host implementation status and kept OpenAI / Anthropic live validation as a V2-004 gate.
- 2026-06-02: Updated V2-004 privacy status after adding manual single-provider connectivity UI and summary-only validation fields.
- 2026-06-02: Added V2-004B privacy controls for local-only redacted performance summaries.
- 2026-06-02: Added V2-004C privacy controls for bounded follow-up context, slow-response hint, stop waiting, background abort signal, and local-only `user_cancelled` classification.
- 2026-06-02: Added V2-005 screenshot-to-AI privacy controls for confirmation-gated visible-region capture, in-memory crop, no persistence, and no full page URL in screenshot provider payloads.
- 2026-06-02: Added V2-006 copy-current-context privacy controls for manual clipboard-only writes, structured formatting, truncation, visible feedback, and no AI/provider/storage/logging path.
- 2026-06-02: Added V2-007 translation privacy controls for selected/user-input-only translation, existing provider flow, no third-party fallback, no page-context translation, and no permission expansion.
- 2026-06-03: Added V2-008 theme / panel polish privacy controls confirming no new data flow, storage, permission, provider call, telemetry, cache, or release claim.
- 2026-06-02: Recorded approved OpenAI / Anthropic provider hosts as later implementation scope, with manual single-provider validation and no secret/raw-content logging.
- 2026-06-02: Added v0.2-alpha privacy notes covering provider checks, model routing, screenshot-to-AI, copy context, translation MVP, local cache, and high-permission non-scope.
- 2026-06-01: Created Phase 1 internal privacy and security baseline from current implementation and release checklist.
