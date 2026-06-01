# Aviso Roadmap

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal planning baseline; pending product-owner review

## Roadmap Principle

Aviso should move from internal dogfood to public release through evidence, not feature expansion. The next steps should close release gates, capture provider behavior, and improve documentation before adding larger v0.2 capabilities.

## Current Milestones

| Phase | Status | Goal | Notes |
|-------|--------|------|-------|
| v0.1 implementation | Done | Core extension flows exist. | Main code baseline is committed locally. |
| v0.1 internal dogfood | In progress | Use current build internally and record real issues. | A-G manual QA user feedback is basically passed; detailed environment evidence remains incomplete. |
| Phase 1 internal docs | In progress | Create production-grade internal docs as the source for future public docs. | This document set is part of that phase. |
| Public release preparation | Not started | Prepare provider validation, package, privacy policy, store assets, tag, and rollback. | No store submission yet. |
| v0.2 product planning | Candidate | Decide next product bets after release gates are closed. | Must avoid turning v0.1 stabilization into uncontrolled feature work. |

## v0.1 Internal Dogfood Tasks

### Completed Or Implemented

- Core context menu, selection toolbar, command palette, clipboard, floating window, Popup, history, template, and iframe flows.
- Local unit test suite and manual A-G fixtures.
- User-reported A-G basic manual pass.
- User-confirmed 豆包 / 火山方舟 API usability.
- Local Git baseline commit.

### Still Needed Before Public Release

- OpenAI real minimal call validation.
- Anthropic real minimal call validation.
- Fresh provider validation notes for 豆包 / 火山方舟.
- Chrome version, OS, date, screenshots or concise evidence for manual QA.
- `npm run package` and final zip verification.
- Public privacy policy page.
- Chrome Web Store screenshots, description, support copy, and permission declarations.
- Git tag and rollback point.
- Final secret/API Key leakage check.

## v0.2 Candidate Backlog

| Candidate | Why it matters | Decision needed |
|-----------|----------------|-----------------|
| Remote link body summary | Users expect link summary to read actual content, not only receive a URL. | Accept broader host permissions or keep current boundary. |
| Browser-local image capture | Model-side URL download can fail due to anti-hotlinking, auth, timeout, or region limits. | Decide whether local capture/upload is acceptable. |
| Long-document summary | Current 5000-character truncation is safer and faster but incomplete for long pages. | Decide on chunking, continuation, or structured extraction. |
| Provider matrix | Public release needs clear behavior across OpenAI, Anthropic, and 豆包. | Define minimum models, latency notes, and error taxonomy. |
| Public docs site | Internal docs need user-facing adaptation. | Decide Docusaurus structure after internal docs stabilize. |
| Storage namespace migration | `contextai_*` keys are legacy-compatible but not brand-clean. | Decide if migration value outweighs local-data risk. |

## Not Planned For v0.1

- Public website.
- Release automation setup.
- Broad feature expansion.
- Backend service.
- Analytics or telemetry.
- Store submission.
- Real API validation without approval.

## Suggested Next Sequence

1. Review Phase 1 internal docs and correct factual gaps.
2. Decide whether to commit the docs-only changes.
3. Run release-prep verification in a separate task: tests, typecheck, build, package.
4. Perform approved provider validation with safe test keys.
5. Prepare privacy policy and store assets.
6. Create release tag and rollback point only after package and release materials are ready.
7. Derive public Docusaurus docs from these internal docs.

## Open Questions

- Which v0.2 candidate should be first after public-release gates are closed?
- Should public release wait for both OpenAI and Anthropic validation, or can a provider-limited release be acceptable?
- What dogfood issue format should be used for real-page bugs?

## Changelog

- 2026-06-01: Created Phase 1 roadmap from current internal dogfood baseline and release checklist.
