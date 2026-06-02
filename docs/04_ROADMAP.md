# Aviso Roadmap

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal planning baseline plus approved v0.2-alpha issue map

## Roadmap Principle

Aviso should move from internal dogfood to public release through evidence, not uncontrolled feature expansion. v0.2-alpha may improve the dogfood product, but it must keep permissions, privacy claims, and release gates explicit.

## Current Milestones

| Phase                       | Status      | Goal                                                                                   | Notes                                                                                              |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| v0.1 implementation         | Done        | Core extension flows exist.                                                            | Main code baseline is committed locally.                                                           |
| v0.1 internal dogfood       | In progress | Use current build internally and record real issues.                                   | A-G manual QA user feedback is basically passed; detailed environment evidence remains incomplete. |
| Phase 1 internal docs       | In progress | Create production-grade internal docs as the source for future public docs.            | This document set is part of that phase.                                                           |
| Public release preparation  | Not started | Prepare provider validation, package, privacy policy, store assets, tag, and rollback. | No store submission yet.                                                                           |
| v0.2-alpha product planning | Active      | Convert the desktop v0.2 drafts into a narrower internal dogfood issue map.            | High-permission Agent, tab, translation-fallback, and voice work is outside the MVP.               |

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

| Issue                                                | Priority | Goal                                                                                                                                                                     | Depends on             | Execution mode                                                                                                 |
| ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| V2-001 scope and technical spec cleanup              | P0       | Keep PRD, tech spec, roadmap, privacy, risk, and release checklist aligned with the approved v0.2-alpha MVP.                                                             | Product-owner approval | Docs-only, single thread                                                                                       |
| V2-002 provider validation plan and permission audit | P0       | Decide exact host permissions and validation protocol for OpenAI, Anthropic, and 豆包 / 火山方舟 without exposing secrets.                                               | V2-001                 | Decision docs complete; no manifest change in V2-002A                                                          |
| V2-003 minimal model registry and routing            | P0       | Route tasks to existing provider/model choices while preserving current defaults and local API Key storage.                                                              | V2-002A decision docs  | Implemented; live provider calls not run                                                                       |
| V2-004 manual connectivity test UI                   | P0       | Let users test configured providers on demand, with latency and readable failure reasons.                                                                                | V2-003                 | Implemented; live evidence still user-triggered                                                                |
| V2-004B latency baseline                             | P0       | Add a redacted request-level local console summary for ordinary AI requests so slow replies can be attributed to UI, background, provider first chunk, done, or failure. | V2-004                 | Implemented; no provider/model/token/permission changes                                                        |
| V2-004C follow-up speed guard                        | P0       | Reduce perceived wait for follow-ups and long first-token delays through bounded prior context, clearer waiting copy, slow hint, and stop waiting.                       | V2-004B                | Implemented; installed-extension QA completed; no provider/model/permission changes                            |
| V2-005 screenshot to AI                              | P1       | Capture a user-selected visible-page region and send it to a vision-capable configured model.                                                                            | V2-004C                | Implemented for internal dogfood; loaded-extension UI QA completed; real vision provider validation still open |
| V2-006 copy current context                          | P1       | Copy title, URL, optional selection, and truncated page text as clean structured text.                                                                                   | V2-001                 | Implemented for internal dogfood; installed-extension QA completed                                             |
| V2-007 translation MVP                               | P1       | Improve selection translation and floating-window translation output without third-party default fallback.                                                               | V2-003                 | Implemented for internal dogfood; installed-extension UI QA pending                                            |
| V2-008 theme and Aviso panel polish                  | P2       | Add theme setting and user-facing panel naming changes without breaking shortcuts or iframe behavior.                                                                    | V2-001                 | Single implementation thread                                                                                   |
| V2-009 high-permission discovery backlog             | P3       | Separately evaluate multi-tab aggregation, tab grouping, voice input, full-page translation, YouTube subtitles, and remote-link body extraction.                         | V2-001                 | Read-only discovery / decision docs                                                                            |

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

### V2-004C Implementation

V2-004C adds a speed guard for ordinary and follow-up floating-window requests:

- Follow-up requests no longer resend the full visible conversation. They send a bounded `priorContext` containing recent non-empty chat messages only, with per-role and total character limits.
- The model wait copy is now “等待模型响应…”, while page extraction still uses “正在读取页面内容…” before the AI request starts.
- If the current request has no assistant text after 9 seconds, the floating UI shows a slow-response hint and offers stop waiting.
- Stop waiting immediately stops the UI loading state and ignores later chunks/errors for that requestId. Background sends an abort signal to the provider request when it is still active.
- `[Aviso perf]` can classify stopped requests as `user_cancelled`, without logging raw prompts, responses, page text, selected text, full URLs, images/base64, screenshots, or API Keys.
- This slice adds no provider, dependency, manifest permission, host permission, model default change, API Key storage change, cache, or model summarization call.
- Installed-extension UI QA has covered follow-up, slow-response hint, and stop waiting for internal dogfood. Provider first-token latency can still vary by model, network, key state, provider load, and input length.

### V2-005 Implementation

V2-005 adds the screenshot-to-AI internal dogfood MVP:

- The first entry point is the right-click page menu item `截图提问`.
- The user must drag a visible-page region and confirm before `captureVisibleTab` runs.
- The extension hides the selection overlay before capture, crops the image in memory, and reuses the existing floating-window `image_explain` stream.
- The implementation adds no manifest permission, host permission, provider, dependency, storage key, cache, or telemetry.
- Screenshot/base64 data is not written to history input, `chrome.storage`, logs, docs, files, or release artifacts; the provider payload does not include the full page URL.
- 豆包 / 火山方舟 screenshot understanding remains blocked until a vision-capable endpoint is explicitly validated.
- Loaded-extension UI QA has covered cancel, confirm, 豆包 / 火山方舟 unverified-vision endpoint blocking, and Service Worker Console `[Aviso perf]` visibility. Real vision provider validation is still required before treating this as a release-ready feature.

### V2-006 Implementation

V2-006 adds the copy-current-context internal dogfood MVP:

- The first entry point is the right-click page/selection menu item `复制当前上下文`.
- The copied text is Markdown-like structured context: page title, page URL, selected text when present, and page body.
- Page body extraction reuses the existing `EXTRACT_PAGE_CONTENT` content-script path and the same default 5000 character truncation boundary.
- Clipboard writing uses the existing content script and `clipboardWrite` permission path; no manifest permission, host permission, provider, dependency, storage key, cache, telemetry, package, tag, or release action is added.
- The copy flow does not call `AI_REQUEST`, does not call any provider, does not emit `[Aviso perf]`, and does not write copied content to history, `chrome.storage`, files, docs, console, or release artifacts.
- Visible success/failure toast feedback is shown through the existing page UI layer. Installed-extension QA has covered the right-click copy-current-context internal dogfood main path.

### V2-007 Implementation

V2-007 improves translation as an existing AI operation, not as a separate translation service:

- Entry points remain selected text and user input: right-click selected text, selection toolbar, and command palette input such as `翻译 hello`.
- Command palette translation continues to use local intent parsing and sends the stripped target text to the floating-window translate flow.
- The translation prompt now asks for automatic Chinese-to-English / non-Chinese-to-Chinese translation and only the translated text, preserving meaning, tone, formatting, names, numbers, links, code snippets, and line breaks.
- Floating-window translation copy is more explicit: title `翻译文本`, user bubble `待翻译文本`, waiting state `正在翻译…`, and errors prefixed with `翻译失败`.
- The previous page-context right-click translation item is removed to avoid empty-selection requests that translate only a page URL.
- The implementation adds no manifest permission, host permission, provider, dependency, third-party translation fallback, cache, telemetry, package, tag, release action, default model change, token-limit change, API Key storage change, or `contextai_*` storage-key migration.
- Installed-extension UI QA still needs a dogfood record for right-click selection translation, toolbar translation, and command palette `翻译 hello`.

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
5. Implement P1 user-facing improvements in the order: screenshot to AI, copy context, translation MVP. Screenshot and copy context are now implemented for internal dogfood; translation MVP remains next.
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
- 2026-06-02: Marked V2-004C follow-up speed guard implemented with bounded prior context, slow-response hint, stop waiting, background abort signal, and `user_cancelled` classification.
- 2026-06-02: Marked V2-005 screenshot-to-AI internal dogfood MVP implemented while keeping loaded-extension QA and release claims open.
- 2026-06-02: Recorded V2-005 loaded-extension UI QA for cancel, confirm, 豆包 / 火山方舟 unverified-vision blocking, and Service Worker Console `[Aviso perf]` visibility.
- 2026-06-02: Marked V2-006 copy current context internal dogfood MVP implemented with installed-extension QA now completed for the internal dogfood main path.
- 2026-06-02: Recorded installed-extension QA completion for V2-004C follow-up speed guard and V2-006 copy current context based on user feedback.
- 2026-06-02: Replaced the broad v0.2 candidate backlog with a v0.2-alpha issue map, recommended sequence, and high-permission discovery backlog.
- 2026-06-01: Created Phase 1 roadmap from current internal dogfood baseline and release checklist.
