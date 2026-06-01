# Aviso Privacy And Security

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal privacy and security baseline; not a public privacy policy

## Current Privacy Model

Aviso has no project-owned backend. The extension runs in the user's browser and sends AI requests directly to the selected provider.

Current provider options in code:

- OpenAI
- Anthropic
- 豆包 / 火山方舟

OpenAI and Anthropic code paths are implemented but not live-validated. 豆包 / 火山方舟 API usability has been confirmed by user feedback, but this Phase 1 docs work did not run a real API call.

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

Current host permission:

- `https://ark.cn-beijing.volces.com/*`: required for 豆包 / 火山方舟 OpenAI-compatible API calls.

Aviso does not currently request broad host permissions for arbitrary remote page fetching.

## Security Controls

- API Keys are encrypted before local storage.
- Sensitive clipboard content and sensitive domains are filtered before clipboard toast behavior.
- Unsupported image sources are rejected with readable errors before model calls when possible.
- Page content is truncated to 5000 characters by default before submission.
- Error messages are normalized to avoid leaking provider internals or sensitive remote image URLs.
- Build artifacts, `node_modules`, environment files, caches, and key-like files are ignored by Git.

## Known Gaps Before Public Release

- Public privacy policy page is not prepared.
- Chrome Web Store privacy declarations are not prepared.
- OpenAI live validation is not complete.
- Anthropic live validation is not complete.
- Provider validation evidence should be recorded without exposing keys, private pages, or raw sensitive content.
- Store screenshots must be sanitized.
- Final secret/API Key leakage scan should run on docs, screenshots, build output, and package artifact.

## Not In v0.1

- Server-side account system.
- Project-owned provider proxy.
- Telemetry or analytics.
- Remote link body fetching through broad host permissions.
- Full internal storage namespace migration.

## Open Questions

- Where will the public privacy policy be hosted?
- Should public release include all provider options if only 豆包 has been user-confirmed?
- Is API Key local encryption sufficient for public messaging, or should the product explain browser-local risk more explicitly?
- Should history be optional or default-on for public release?

## Changelog

- 2026-06-01: Created Phase 1 internal privacy and security baseline from current implementation and release checklist.
