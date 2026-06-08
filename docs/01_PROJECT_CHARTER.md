# Aviso Project Charter

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal source of truth; pending product-owner review

## Purpose

Aviso is a Chrome MV3 browser extension that lets users invoke AI from the page they are already reading or editing. It combines context menu actions, a selection toolbar, a command palette, clipboard sensing, and an in-page floating result window.

The project is currently frozen as a v0.1 internal dogfood baseline. It is suitable for small internal use and continued observation, but it is not yet ready for public Chrome Web Store release.

## Product Boundary

Aviso does not run a project-owned backend. AI requests are sent directly from the extension to the selected model provider using the user's own API Key.

The current product principles are:

- Keep browser permissions narrow.
- Keep API Keys local to the browser.
- Do not add telemetry, analytics, or a project-owned proxy service.
- Do not run real provider calls without explicit approval.
- Treat internal docs as the source of truth; public website docs will be derived later.

## Current State Matrix

| Area | Status | Notes |
|------|--------|-------|
| v0.1 implementation | Implemented | Main extension flows exist in `src/`, with Popup, background, content scripts, utilities, tests, and manual fixtures. |
| A-G manual QA | Verified by user feedback | User reported A-G manual checks basically passed for internal dogfood. Chrome version, OS, screenshots, and detailed per-step notes are still not fully recorded. |
| 豆包 / 火山方舟 | Verified by user feedback | User confirmed the API path is usable. This run did not execute a real API call. |
| OpenAI | Unverified | Code path exists, but no approved real minimal call has been recorded. |
| Anthropic | Unverified | Code path exists, but no approved real minimal call has been recorded. |
| Public release | Not released | Chrome Web Store submission, public privacy policy, store assets, package zip, tag, and rollback point are still pending. |
| Git baseline | Established | Local baseline commit exists: `3dc7ea3 chore: establish v0.1 internal dogfood baseline`. No remote, push, or tag has been created in this phase. |

## In Scope For v0.1 Internal Dogfood

- Context menu actions for selection, page, link, image, video, editable, and custom template contexts.
- Selection toolbar actions for selected text.
- Command palette with Chrome browsing history search, bookmark search, Aviso AI conversation search, and no-result AI fallback.
- Clipboard sensing with sensitive-domain and sensitive-content filtering.
- Floating AI result window with streaming output, copy, save, and follow-up.
- Popup settings for model selection, API Keys, feature toggles, templates, history, and inline privacy explanation.
- Iframe-aware routing for toolbar, context menu, command palette, clipboard toast, and single top-level UI.
- Local unit tests and manual A-G validation fixture.

## Out Of Scope For v0.1

- Public Chrome Web Store release.
- Docusaurus site, Vercel deployment, release-please, commitlint, husky, or other release automation.
- A project-owned backend, proxy, account system, telemetry, analytics, or server-side storage.
- Broad host permissions for arbitrary page or remote-link fetching.
- Guaranteed fast first token from model providers.
- Universal image understanding for every webpage image source.
- Real OpenAI or Anthropic validation without explicit user approval.

## v0.2 Candidates

- Remote link body extraction with an explicit permission decision.
- More reliable image explanation through browser-local capture or conversion.
- Long-document summarization beyond the current 5000-character default truncation.
- Provider validation matrix covering OpenAI, Anthropic, and 豆包 with error classification and latency notes.
- Public release engineering: package zip, privacy policy, store assets, tag, rollback plan, and public changelog.
- Optional internal storage key migration away from `contextai_*`, with a safe compatibility plan.

## Documentation System

This Phase 1 document set is internal. It should remain factual and conservative. Future Docusaurus or website pages should be adapted from these docs into user-facing language, not treated as the original source.

Primary internal docs:

- `docs/01_PROJECT_CHARTER.md`
- `docs/02_PRD.md`
- `docs/03_TECH_SPEC.md`
- `docs/04_ROADMAP.md`
- `docs/05_RELEASE_PLAN.md`
- `docs/06_RISK_REGISTER.md`
- `docs/07_PRIVACY_AND_SECURITY.md`

## Open Questions

- What level of provider latency is acceptable for public release messaging?
- Should remote link summarization remain out of scope, or should v0.2 accept broader host permissions?
- Should internal `contextai_*` storage keys be migrated before public release, or kept for compatibility?
- What public privacy policy host will be used for Chrome Web Store submission?

## Changelog

- 2026-06-01: Created Phase 1 internal project charter from current v0.1 internal dogfood baseline.
