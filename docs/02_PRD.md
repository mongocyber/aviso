# Aviso Product Requirements Document

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal PRD baseline; pending product-owner review

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
- Do not validate OpenAI or Anthropic without explicit approval and safe test keys.

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
| OpenAI | Unverified | Code exists, but no approved live-call record exists. |
| Anthropic | Unverified | Code exists, but no approved live-call record exists. |

## Public Release Gates

Before public release, Aviso still needs:

- OpenAI minimal real-call validation with explicit approval.
- Anthropic minimal real-call validation with explicit approval.
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
- OpenAI and Anthropic are implemented but not validated live.
- Current internal validation is user-reported; public release needs stricter environment and evidence capture.

## v0.2 Candidates

- Browser-local image capture or conversion for stronger image explain success rate.
- Long-page chunking, continuation, or structured page extraction.
- Remote link content extraction after a product decision on host permissions.
- Provider matrix with model defaults, latency bands, and readable failure taxonomy.
- Public docs generated from this internal source set.
- Internal storage key migration plan, only if migration risk is acceptable.

## Open Questions

- Which provider should be recommended for first public users?
- What minimum Chrome version and OS matrix should be officially supported?
- Should public release happen before OpenAI and Anthropic are both live-validated?
- Should public copy mention 豆包 / 火山方舟 as a supported provider before a formal validation record is added?

## Changelog

- 2026-06-01: Created Phase 1 internal PRD from current source, docs, release checklist, and test structure.
