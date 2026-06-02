# Aviso Roadmap

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal planning baseline plus approved v0.2-alpha issue map

## Roadmap Principle

Aviso should move from internal dogfood to public release through evidence, not uncontrolled feature expansion. v0.2-alpha may improve the dogfood product, but it must keep permissions, privacy claims, and release gates explicit.

## Current Milestones

| Phase | Status | Goal | Notes |
|-------|--------|------|-------|
| v0.1 implementation | Done | Core extension flows exist. | Main code baseline is committed locally. |
| v0.1 internal dogfood | In progress | Use current build internally and record real issues. | A-G manual QA user feedback is basically passed; detailed environment evidence remains incomplete. |
| Phase 1 internal docs | In progress | Create production-grade internal docs as the source for future public docs. | This document set is part of that phase. |
| Public release preparation | Not started | Prepare provider validation, package, privacy policy, store assets, tag, and rollback. | No store submission yet. |
| v0.2-alpha product planning | Active | Convert the desktop v0.2 drafts into a narrower internal dogfood issue map. | High-permission Agent, tab, translation-fallback, and voice work is outside the MVP. |

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
- Fresh provider validation notes for 豆包 / 火山方舟 are complete through V2-004 manual single-provider validation.
- Chrome version, OS, date, screenshots or concise evidence for manual QA.
- `npm run package` and final zip verification.
- Public privacy policy page.
- Chrome Web Store screenshots, description, support copy, and permission declarations.
- Git tag and rollback point.
- Final secret/API Key leakage check.

## v0.2-alpha Issue Map

| Issue | Priority | Goal | Depends on | Execution mode |
|-------|----------|------|------------|----------------|
| V2-001 scope and technical spec cleanup | P0 | Keep PRD, tech spec, roadmap, privacy, risk, and release checklist aligned with the approved v0.2-alpha MVP. | Product-owner approval | Docs-only, single thread |
| V2-002 provider validation plan and permission audit | P0 | Decide exact host permissions and validation protocol for OpenAI, Anthropic, and 豆包 / 火山方舟 without exposing secrets. | V2-001 | Decision docs complete; no manifest change in V2-002A |
| V2-003 minimal model registry and routing | P0 | Route tasks to existing provider/model choices while preserving current defaults and local API Key storage. | V2-002A decision docs | Implemented; live provider calls not run |
| V2-004 manual connectivity test UI | P0 | Let users test configured providers on demand, with latency and readable failure reasons. | V2-003 | Implemented; live evidence still user-triggered |
| V2-004B latency baseline | P0 | Add a redacted request-level local console summary for ordinary AI requests so slow replies can be attributed to UI, background, provider first chunk, done, or failure. | V2-004 | Implemented; no provider/model/token/permission changes |
| V2-005 screenshot to AI | P1 | Capture a user-selected visible-page region and send it to a vision-capable configured model. | V2-002, V2-003 | Plan mode because capture and image data flow affect privacy |
| V2-006 copy current context | P1 | Copy title, URL, optional selection, and truncated page text as clean structured text. | V2-001 | Single implementation thread |
| V2-007 translation MVP | P1 | Improve selection translation and floating-window translation output without third-party default fallback. | V2-003 | Single implementation thread |
| V2-008 theme and Aviso panel polish | P2 | Add theme setting and user-facing panel naming changes without breaking shortcuts or iframe behavior. | V2-001 | Single implementation thread |
| V2-009 high-permission discovery backlog | P3 | Separately evaluate multi-tab aggregation, tab grouping, voice input, full-page translation, YouTube subtitles, and remote-link body extraction. | V2-001 | Read-only discovery / decision docs |

### V2-002A Decision Docs

V2-002A is docs-only and records the provider host permission decision for the next implementation slices.

Acceptance:

- `docs/decisions/001-v2-provider-host-permissions.md` records approved OpenAI / Anthropic host permissions and the retained Ark Beijing gateway.
- `docs/issues/002-v2-provider-host-permission-handoff.md` gives V2-003 and V2-004 execution agents a direct boundary.
- Existing docs distinguish approved host permission decisions from unimplemented manifest changes and unverified live provider calls.
- No code, manifest, dependency, package, API Key, release, tag, or Git remote action is performed in V2-002A.

### V2-003 Implementation

V2-003 adds the minimal registry/routing surface needed by V2-004:

- Registry covers only OpenAI, Anthropic, and 豆包 / 火山方舟.
- Default model remains `gpt-4o-mini`.
- `claude*` routes to Anthropic; `doubao` routes to the Ark Beijing OpenAI-compatible base URL plus the user-configured endpoint/model; unknown non-Claude models retain OpenAI fallback compatibility.
- Manifest host permissions now include only `https://api.openai.com/*`, `https://api.anthropic.com/*`, and `https://ark.cn-beijing.volces.com/*`.
- API Keys remain encrypted in `chrome.storage.local`; no provider connectivity test or real API call is included.

### V2-004 Implementation

V2-004 adds the manual provider connectivity surface:

- Popup API Key page has one “测试连接” action per approved provider.
- Each click tests only the selected provider.
- Background uses `VALIDATE_PROVIDER_CONNECTIVITY` and returns a summary object.
- The test payload uses only the fixed public prompt and no page, clipboard, screenshot, link, or selection context.
- Summary fields explicitly state that raw prompt, raw response, private page data, screenshots, and API Keys are not logged by this flow.

Live provider evidence remains separate. 豆包 / 火山方舟 has passed the V2-004 manual single-provider check; OpenAI / Anthropic still require native provider API Keys before they can be claimed as validated.

### V2-004B Implementation

V2-004B adds the latency baseline for ordinary floating-window AI requests:

- Each request emits at most one local console `[Aviso perf]` summary.
- The summary uses fixed redacted fields and input-size buckets only.
- The timing stages cover UI visible, background received, provider request start, first chunk, done, and error/missing-stage categories.
- It does not run real providers during implementation, does not add OpenRouter, does not add dependencies or permissions, and does not change provider routing, model defaults, token limits, API Key storage, or `contextai_*` storage keys.
- V2-004 manual connectivity-test summaries remain separate and unchanged.

### Backlog Requiring Separate Approval

These items remain valid product ideas but should not be pulled into v0.2-alpha MVP by default:

- Remote link body summary with broader host permissions.
- Full-page DOM translation and YouTube subtitle translation.
- Google Translate / 百度 / 有道 default fallback.
- Multi-tab aggregation with `tabs` / `scripting`.
- Tab grouping with `tabGroups`.
- Voice input with `offscreen` and microphone access.
- Internal `contextai_*` storage namespace migration.

## Not Planned For v0.1

- Public website.
- Release automation setup.
- Broad feature expansion.
- Backend service.
- Analytics or telemetry.
- Store submission.
- Real API validation without approval.

## Suggested Next Sequence

1. Finish V2-001 docs-only scope cleanup.
2. Use V2-002A decision docs as the boundary for provider host permissions.
3. Decide whether v0.2-alpha should proceed before v0.1 public-release gates are closed.
4. Keep public provider claims limited to 豆包 / 火山方舟 until OpenAI / Anthropic native-key checks are completed.
5. Implement P1 user-facing improvements in the order: screenshot to AI, copy context, translation MVP.
6. Keep public release preparation separate: package, provider evidence, privacy policy, store assets, tag, and rollback.

## Open Questions

- Should v0.2-alpha implementation start before v0.1 public-release gates are closed?
- Which P1 improvement should be first after P0 provider/model work: screenshot, copy context, or translation MVP?
- Should public release wait for both OpenAI and Anthropic validation, or can a provider-limited release be acceptable?
- What dogfood issue format should be used for real-page bugs?

## Changelog

- 2026-06-02: Added V2-002A provider host permission decision docs and V2-003 / V2-004 handoff boundaries.
- 2026-06-02: Marked V2-003 registry/routing implementation complete while keeping live provider validation in V2-004.
- 2026-06-02: Marked V2-004 manual connectivity test UI implemented while keeping real provider evidence as a release gate.
- 2026-06-02: Marked V2-004B latency baseline implemented as local-console redacted perf summaries for ordinary AI requests.
- 2026-06-02: Replaced the broad v0.2 candidate backlog with a v0.2-alpha issue map, recommended sequence, and high-permission discovery backlog.
- 2026-06-01: Created Phase 1 roadmap from current internal dogfood baseline and release checklist.
