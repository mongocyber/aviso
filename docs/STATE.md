# Aviso State

Updated: 2026-07-08

This is the L1 current-facts registry for Aviso. Other docs should link here instead of repeating release state, Chrome Web Store state, or hosted-AI live status.

## Release Line

- Product identity: Aviso is a Chrome MV3 extension built with React 18 and TypeScript; local dev/build still use Plasmo paths, while the canonical release package is generated through the WXT package gate.
- Current upload/package version: `0.1.1`; `package.json`, manifest, and Popup-visible version are aligned to `0.1.1`.
- Default usable path: BYOK direct-provider remains the default path; users provide their own API Keys and the browser extension calls approved provider hosts directly.
- Optional hosted path: Aviso AI / hosted AI is included in the `0.1.1` production-candidate package and only runs after the user explicitly chooses it and signs in.
- Chrome Web Store state: owner uploaded and submitted `0.1.1`; Chrome Web Store rejected the 2026-07-07 submission for product-description keyword issues; listing copy was cleaned, owner reports the latest `0.1.1` package was reuploaded, and the backend review state still needs confirmation.
- Public release state: Aviso is not publicly listed, not Chrome Web Store approved, has no formal store link, and has no final owner release approval.
- Website state: owner website review and production deployment evidence passed on 2026-07-03 for the configured website URL `https://aviso-nine.vercel.app`; website deployment does not equal Chrome Web Store approval or extension public release.
- Internal labels: `v0.2` and `v0.3` are historical/internal planning and issue-group labels only, not separate upload versions or public product versions.

## Current Focus

- Current blocker: confirm the Chrome Web Store backend review state and final review result for the cleaned/reuploaded `0.1.1` package.
- Next action: once the owner confirms the CWS backend state, update this file plus the matching release evidence docs before changing any public release wording.

## Gates

| Gate | 状态 | 证据 |
| --- | --- | --- |
| Chrome Web Store backend review state confirmed | `pending` | [CURRENT_GATE](./ai/CURRENT_GATE.md), [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md) |
| Chrome Web Store approved | `pending` | [CURRENT_GATE](./ai/CURRENT_GATE.md), [release gates](./planning/v0.3/release-gates.md) |
| Formal Chrome Web Store link recorded | `pending` | [CURRENT_GATE](./ai/CURRENT_GATE.md), [STATUS](../STATUS.md) |
| Final owner release approval | `pending` | [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md), [release gates](./planning/v0.3/release-gates.md) |
| `v0.1.1` tag and GitHub Release created | `not-started` | [STATUS](../STATUS.md) |
| Website owner review and production deployment evidence | `passed` | [STATUS](../STATUS.md), [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md) |
| Owner-loaded hosted-AI production-candidate smoke | `passed` | [STATUS](../STATUS.md), [release status](./planning/v0.3/status.md) |
| Billing/payment excluded from first hosted-AI release | `waived` | [STATUS](../STATUS.md), [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md) |

## Capabilities

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| Right-click menu, selection toolbar, command palette, clipboard prompt, in-page result panel, history, custom instructions, and Popup settings | `implemented` | Product surface summary is maintained in [STATUS](../STATUS.md) and [README](../README.md). |
| BYOK direct-provider requests | `implemented` | Provider and storage boundaries are recorded in [STATUS](../STATUS.md) and [privacy/security](./privacy-and-security.md). |
| Multiple provider configurations and manual model ID editing | `implemented` | Provider status and live-validation boundaries are recorded in [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md). |
| Chinese and English UI plus manifest localization | `implemented` | Locale and manifest status are recorded in [STATUS](../STATUS.md). |
| Canonical production package directory and zip | `implemented` | `npm run package` generates `build/chrome-mv3-prod` and `build/chrome-mv3-prod.zip`; release package evidence is recorded in [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md). |
| Optional Aviso AI / hosted AI candidate path | `implemented` | Candidate-only path; public/live limits are recorded in [CURRENT_GATE](./ai/CURRENT_GATE.md). |
| Chrome Web Store public install | `unverified` | Review state and approval are pending; see [CURRENT_GATE](./ai/CURRENT_GATE.md). |
| Subscription, payment, and public anonymous quota | `not-planned` | Excluded from the first hosted-AI release; see [RELEASE_CHECKLIST](../RELEASE_CHECKLIST.md). |
| Telemetry, analytics SDK, web search, and remote link-body fetching | `not-planned` | Current public/store copy says these are not included; see [STORE_LISTING_COPY](../store-assets/chrome-web-store/STORE_LISTING_COPY.md). |

## Boundaries（不做 / 不能宣称）

- Do not say Chrome Web Store approved, publicly listed, formally installable, or release-ready until the matching Gates are passed with evidence.
- Do not say hosted AI, Aviso AI, provider proxy, subscription/payment, or public anonymous quota is live.
- Do not imply telemetry, analytics SDK, web search, remote link-body fetching, advertising, or remote content logging is included.
- Do not expand manifest permissions, host permissions, storage-key behavior, production config, public copy, CWS submission state, provider calls, or secrets handling without owner approval.
- Do not write raw API Keys, raw prompts, raw provider responses, private page bodies, screenshot/base64 payloads, full URLs, clipboard content, or sensitive logs into docs, console, storage, release artifacts, or remote services.
- Do not present screenshot as an ordinary-user primary entry or public selling point; it remains an internal right-click path only.

## Storage & Data

| 数据 | 位置 | 敏感级别 | 规则 |
| --- | --- | --- | --- |
| BYOK API Keys | `chrome.storage.local/contextai_api_keys` | secret | Not plaintext; local encryption/obfuscation only, not protection against a compromised machine or readable browser profile. |
| Non-secret settings | `chrome.storage.sync/contextai_settings` | normal | Sync-safe settings only. |
| Local AI conversation history | `chrome.storage.local/contextai_history` | user content | Local storage only; do not log raw prompts/responses into docs or remote systems. |
| Hosted-AI session state | `chrome.storage.local/aviso_hosted_session` | sensitive session | Used only for the user-selected hosted path. |
| Runtime short cache | in-memory only | transient | Used to reduce repeated preparation work; not persistent storage. |
| Website feedback submissions | Vercel Function to Resend and maintainer mailbox | user-submitted content | Includes only user-submitted issue text, optional tag, optional contact email, and user-uploaded images/screenshots; do not submit API Keys, tokens, private page bodies, customer data, unpublished documents, or unredacted screenshots. This is not extension telemetry. |

## Pointers

- Architecture map: [docs/architecture/README.md](./architecture/README.md)
- Testing map: [docs/architecture/testing.md](./architecture/testing.md)
- Current planning lane: [docs/planning/current/status.md](./planning/current/status.md)
- Current gate: [docs/ai/CURRENT_GATE.md](./ai/CURRENT_GATE.md)
- Status view: [STATUS.md](../STATUS.md)
- Release evidence/checklist: [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)
- Project context: [docs/ai/PROJECT_CONTEXT.md](./ai/PROJECT_CONTEXT.md)
- v0.3 release-closeout evidence: [docs/planning/v0.3/status.md](./planning/v0.3/status.md), [docs/planning/v0.3/release-gates.md](./planning/v0.3/release-gates.md)
- Public website docs: [website/docs](../website/docs/intro.md)
- Public website source: [homepage](../website/src/pages/index.tsx), [feedback page](../website/src/pages/feedback.tsx), [feedback API](../website/api/feedback.js), [website config](../website/docusaurus.config.ts)
- Chrome Web Store listing source: [store-assets/chrome-web-store/STORE_LISTING_COPY.md](../store-assets/chrome-web-store/STORE_LISTING_COPY.md)
