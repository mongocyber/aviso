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

| Data | Where stored | Protection / notes |
|------|--------------|--------------------|
| API Keys | `chrome.storage.local` under `contextai_api_keys` | Encrypted with CryptoJS AES before storage. |
| Settings | `chrome.storage.sync` under `contextai_settings` | Includes model choice, feature toggles, templates, and 豆包 endpoint/model value. |
| History | `chrome.storage.local` under `contextai_history` | Stores local request and output history. |

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
- Build artifacts, `node_modules`, environment files, caches, and key-like files are ignored by Git.

## Known Gaps Before Public Release

- Public privacy policy page is not prepared.
- Chrome Web Store privacy declarations are not prepared.
- OpenAI live validation is not complete.
- Anthropic live validation is not complete.
- OpenAI and Anthropic host permission manifest changes and manual validation UI are implemented, but validation records are still missing.
- 豆包 / 火山方舟 validation is recorded only as a summary. Do not add screenshots, API Keys, raw prompts, raw responses, or private page content to public docs or store assets.
- Provider validation evidence should be recorded without exposing keys, private pages, or raw sensitive content.
- Store screenshots must be sanitized.
- Final secret/API Key leakage scan should run on docs, screenshots, build output, and package artifact.

## v0.2-alpha Privacy Notes

v0.2-alpha planning keeps the v0.1 privacy model: no project-owned backend, no telemetry, no analytics, and no automatic provider calls without user action.

### Planned Or Candidate Data Flows

| Capability | Data involved | Privacy stance |
|------------|---------------|----------------|
| Provider connectivity test | Fixed public test prompt, selected provider endpoint, user API Key | Implemented as a user-triggered single-provider action. Do not run all tests automatically when settings opens. Do not log raw prompts, raw responses, keys, private webpages, or private screenshots. |
| Model routing | Feature route IDs, provider/model IDs, non-secret settings | Store route configuration in `chrome.storage.sync`; keep API Keys encrypted in `chrome.storage.local`. |
| Latency baseline | Redacted trigger/provider/model labels, input-size bucket, coarse context type, timing marks, error category | Implemented in V2-004B as local-console summaries only. Do not persist or transmit these logs, and do not add raw text, full URLs, images/base64, screenshots, responses, or keys. |
| Screenshot to AI | User-selected visible-page image region and optional prompt | Must be explicitly triggered by the user. Show clear feedback and do not write screenshot data to logs, docs, or screenshots. |
| Copy current context | Page title, URL, optional selection, truncated page text | Copies to the user's clipboard only. No provider call unless the user separately sends it to AI. |
| Translation MVP | Selected text, target language, provider/model choice | Use existing provider flow first. Third-party translation fallback is not in MVP until host permissions and public copy are approved. |
| Local result cache | Operation, input hash/content depending on implementation, output, provider/model metadata, expiry time | Requires TTL, clear-cache control, and privacy copy before shipping. |

### v0.2-alpha Permission Principles

- OpenAI and Anthropic provider host permissions are implemented in V2-003. Any other new `host_permissions` require a documented provider or translation decision before implementation.
- `tabs`, `scripting`, `tabGroups`, `offscreen`, microphone access, and broad remote-link fetching are not part of the v0.2-alpha MVP.
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

- Where will the public privacy policy be hosted?
- Should public release include all provider options if only 豆包 has been user-confirmed?
- Is API Key local encryption sufficient for public messaging, or should the product explain browser-local risk more explicitly?
- Should history be optional or default-on for public release?
- Should local AI/translation cache be default-on, default-off, or unavailable until public release copy is finalized?
- What screenshot confirmation UX is enough before sending a selected region to a provider?

## Changelog

- 2026-06-02: Updated V2-003 provider host implementation status and kept OpenAI / Anthropic live validation as a V2-004 gate.
- 2026-06-02: Updated V2-004 privacy status after adding manual single-provider connectivity UI and summary-only validation fields.
- 2026-06-02: Added V2-004B privacy controls for local-only redacted performance summaries.
- 2026-06-02: Recorded approved OpenAI / Anthropic provider hosts as later implementation scope, with manual single-provider validation and no secret/raw-content logging.
- 2026-06-02: Added v0.2-alpha privacy notes covering provider checks, model routing, screenshot-to-AI, copy context, translation MVP, local cache, and high-permission non-scope.
- 2026-06-01: Created Phase 1 internal privacy and security baseline from current implementation and release checklist.
