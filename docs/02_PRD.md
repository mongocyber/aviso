# Aviso Product Requirements Document

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal PRD baseline plus approved v0.2-alpha planning scope

## Product Summary

Aviso is an in-browser AI assistant for Chrome. It lets users use AI on selected text, page content, links, images, clipboard text, history, and bookmarks without leaving the current page.

The current product is not a public release candidate. It is a v0.1 internal dogfood build with implemented core flows, user-reported A-G manual validation, and known release gates still open.

## Target User

The initial target user is a knowledge worker who reads, researches, edits, and summarizes web content in the browser and wants AI help in the current page context.

This version assumes users can provide their own API Keys and understand that model responses depend on the selected provider, network, key validity, input length, and provider load.

## User Problems

- Copying content into a separate AI chat breaks context and flow.
- Browser research often mixes selection, page, link, image, bookmark, and clipboard contexts.
- Existing AI tools often hide where data goes or require a remote account system.
- Long waits feel broken if the UI does not immediately show that a model request has started.

## Product Goals

- Let the user invoke AI from the object they are interacting with.
- Keep the response in the current page through a floating window.
- Keep data flow transparent: no Aviso backend, no telemetry, API Keys stored locally.
- Keep permissions small enough for a credible public-release path.
- Provide enough internal docs and release gates to continue safely after v0.1.

## Non-Goals

- Do not make a public website or Docusaurus docs in Phase 1.
- Do not create a backend service, proxy, account system, analytics, or telemetry.
- Do not promise model responses will be instant.
- Do not fetch arbitrary remote link content in v0.1.
- Do not support every image source in v0.1.
- Do not run automatic or unapproved OpenAI / Anthropic validation. V2-004 validation is approved only as a user-triggered, single-provider test with safe test keys and summary-only records.

## v0.1 Functional Scope

| Feature | Current status | Notes |
|---------|----------------|-------|
| Context menu | Implemented | Supports selection explain/translate/polish/summarize, page summary, link summary by URL, image explain, model switch, and custom templates. |
| Selection toolbar | Implemented | Supports explain, translate, polish, summarize, and send to AI. Injected into all frames. |
| Command palette | Implemented | Mac uses `Command+Shift+Space`; Windows/Linux use `Ctrl+Shift+Space`. Searches history/bookmarks and can send no-result input to AI. |
| Clipboard sensing | Implemented | Detects copied text, skips sensitive domains/content, and routes toast display to the top-level page. |
| Floating window | Implemented | Shows streaming output, waiting states, copy, save, dedupe, and follow-up entry points. |
| Popup settings | Implemented | Supports model selection, API Key entry, 豆包 endpoint, feature toggles, custom templates, history, and privacy copy. |
| History | Implemented | Saves result entries locally, supports search, pin, delete, and clear. |
| Templates | Implemented | Supports add/edit/delete, context assignment, and `{{selection}}`, `{{url}}`, `{{page}}` substitution. |
| Iframe routing | Implemented | Supports iframe toolbar, iframe context menu, iframe command shortcut bridge, top-level floating UI, and local iframe fixture. |
| Image explain boundary | Implemented | Supports `http/https` image URLs and PNG/JPEG/WebP base64 data URLs; rejects unsupported sources with a readable error. |

## Verification Status

| Item | Status | Evidence |
|------|--------|----------|
| Unit tests | Verified previously | Current test suite covers clipboard detection, sensitive filtering, templates, errors, image source parsing, local intent parsing, and page truncation. |
| Type check | Verified previously | `npx tsc --noEmit` passed during baseline verification. |
| Build | Verified previously | `npm run build` produced `build/chrome-mv3-prod` outside the default sandbox; sandbox build may fail with `Operation not permitted`. |
| Manual A-G QA | Verified by user feedback | User reported A-G basic pass for internal dogfood. Detailed Chrome version, OS, screenshots, and step notes remain incomplete. |
| 豆包 / 火山方舟 | Verified by user feedback | User confirmed API usability. This Phase 1 docs work did not run a real API call. |
| OpenAI | Host permission implemented; live call unverified | Code and model registry route exist. V2-003 added `https://api.openai.com/*`, but no approved live-call record exists. |
| Anthropic | Host permission implemented; live call unverified | Code and model registry route exist. V2-003 added `https://api.anthropic.com/*`, but no approved live-call record exists. |

## Public Release Gates

Before public release, Aviso still needs:

- OpenAI minimal real-call validation through the approved V2-004 manual single-provider flow with a safe test key.
- Anthropic minimal real-call validation through the approved V2-004 manual single-provider flow with a safe test key.
- V2-004 live validation records before claiming OpenAI or Anthropic support.
- A fresh provider and error-behavior record for 豆包 / 火山方舟.
- `npm run package` and the final extension zip.
- Chrome Web Store screenshots, description, support copy, and privacy declarations.
- Public privacy policy page consistent with Popup copy and actual implementation.
- Git tag and rollback point.
- Final permission and host-permission audit.
- Final secret/API Key leakage check on docs, screenshots, build output, and release artifacts.

## v0.1 Known Limitations

- Provider first token can be slow.
- Page content is truncated to 5000 characters by default before model submission.
- Remote link summary passes the URL as context; it does not fetch the remote page body.
- Some remote image URLs may be accepted by format validation but still fail if the model provider cannot download them.
- OpenAI and Anthropic are implemented and their provider host permissions are present in the manifest, but live validation is not complete.
- Current internal validation is user-reported; public release needs stricter environment and evidence capture.

## v0.2-alpha Product Direction

v0.2-alpha is an internal dogfood iteration, not a public Chrome Web Store release. It should turn the existing v0.1 pain points into a smaller, safer development sequence before any broad Agent, voice, or multi-tab expansion.

The working source drafts reviewed for this scope were:

- `/Users/jonyliu/Desktop/Aviso_PRD_v0.2.md`
- `/Users/jonyliu/Desktop/TECH_SPEC_v0.2_delta.md`

Those drafts are useful inputs, but they are not the canonical project spec. This PRD is the canonical internal scope until replaced by a later approved project document.

### v0.2-alpha Goals

- Improve provider confidence through explicit validation records and readable error states.
- Improve image reliability through browser-local screenshot/capture paths, instead of relying only on model-side remote image URL downloads.
- Improve everyday translation and context-copy workflows without changing the privacy model or adding broad permissions by default.
- Keep v0.2-alpha suitable for internal dogfood while preserving a credible public-release path.

### v0.2-alpha Scope

| Priority | Capability | Scope |
|----------|------------|-------|
| P0 | Provider validation and permission audit | Host permission decision is approved for OpenAI, Anthropic, and 豆包 / 火山方舟. Record minimal live-call behavior only through user-triggered single-provider checks with safe test keys. |
| P0 | Minimal model registry and routing | Implemented in V2-003 for existing providers only. Registry exposes provider/model metadata for V2-004 and preserves current defaults. |
| P0 | Manual model connectivity test | Implemented in V2-004 as user-triggered single-provider checks with readable summary states and latency notes. It does not auto-test all keys on settings open. |
| P1 | Screenshot to AI | Add a user-triggered capture flow for visible-page regions and send base64 image input to a configured vision-capable model. |
| P1 | Copy current context | Let users copy a structured context bundle with title, URL, optional selection, and truncated page text. |
| P1 | Translation MVP | Improve selection translation and floating-window translation actions first. Page-wide DOM translation and YouTube subtitles are discovery/backlog until risk is reviewed. |
| P2 | Theme and Aviso panel naming | Improve UI consistency only after P0/P1 flows are stable. Preserve the existing keyboard shortcut behavior. |

### Explicit Non-Scope For v0.2-alpha MVP

- No broad remote-link body fetching without a separate host-permission decision.
- No default Google Translate / 百度 / 有道 fallback until privacy copy and host permissions are approved.
- No multi-tab aggregation, tab grouping, or voice input in the MVP. These require separate permission and privacy review.
- No `contextai_*` storage-key migration in the MVP; compatibility remains more important than internal brand cleanup.
- No public Chrome Web Store submission, release tag, or provider claims until the release checklist gates are closed.

### Acceptance Criteria

- All P0 changes keep API Keys in encrypted `chrome.storage.local`; settings stay in `chrome.storage.sync`.
- Connectivity tests are initiated by the user or by an immediately related key edit, not by passive settings-page opening.
- Provider validation records do not include API Keys, raw prompts, raw responses, private webpages, or screenshots with private data.
- Approved provider hosts are limited to `https://api.openai.com/*`, `https://api.anthropic.com/*`, and `https://ark.cn-beijing.volces.com/*` until a later decision changes this.
- Screenshot and translation features show clear user feedback when the selected provider/model cannot support the requested operation.
- Any new permission or host permission is documented in `docs/03_TECH_SPEC.md`, `docs/06_RISK_REGISTER.md`, `docs/07_PRIVACY_AND_SECURITY.md`, and `RELEASE_CHECKLIST.md` before implementation is accepted.

## Open Questions

- Which single additional OpenAI-compatible provider, if any, should be added first after the existing providers are stable?
- Should AI/translation result caching be enabled by default, and should users get a visible clear-cache control?
- What level of provider latency should be described as acceptable in public copy?
- Should public release be provider-limited if OpenAI or Anthropic validation is delayed?

## Changelog

- 2026-06-02: Implemented V2-003 minimal model registry/routing and landed approved OpenAI / Anthropic host permissions while keeping live validation as a V2-004 gate.
- 2026-06-02: Implemented V2-004 manual single-provider connectivity test UI and summary-only validation surface; real provider evidence still requires user-triggered live runs.
- 2026-06-02: In V2-002A, recorded the approved OpenAI / Anthropic provider host permission decision as docs-only, before V2-003 implementation.
- 2026-06-02: Converted the desktop v0.2 drafts into a narrower v0.2-alpha internal dogfood scope, with high-permission Agent, tab, translation-fallback, and voice features moved out of the MVP.
- 2026-06-01: Created Phase 1 internal PRD from current source, docs, release checklist, and test structure.
