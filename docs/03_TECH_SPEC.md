# Aviso Technical Specification

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal technical baseline plus v0.2-alpha technical constraints

## Stack

- Browser extension framework: Plasmo `0.90.5`
- Runtime: Chrome Manifest V3
- UI: React 18
- Language: TypeScript
- Providers: OpenAI SDK, Anthropic SDK, 豆包 / 火山方舟 through OpenAI-compatible API
- Document extraction: `@mozilla/readability`
- Local encryption helper: `crypto-js`

## Directory Structure

| Path              | Purpose                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/background/` | MV3 background logic: context menus, command routing, AI request handling, bookmarks, history, frame-aware delivery.            |
| `src/contents/`   | Content scripts: floating window, command palette, selection toolbar, clipboard sensing, iframe bridge, readability extraction. |
| `src/popup/`      | Popup settings UI for providers, API Keys, toggles, templates, history, and privacy copy.                                       |
| `src/utils/`      | Shared helpers for storage, errors, intent parsing, image source validation, template expansion, page truncation, timing logs.  |
| `src/types/`      | Message, history, settings, and template types.                                                                                 |
| `tests/`          | Unit tests plus manual and iframe validation fixtures.                                                                          |
| `docs/brand/`     | Visual reference assets and HTML/CSS/JS examples, not production runtime code.                                                  |

## Runtime Components

### Background

`src/background/index.ts` registers extension listeners and routes messages:

- `AI_REQUEST`
- `CANCEL_AI_REQUEST`
- `SHOW_FLOATING_WINDOW`
- `VALIDATE_PROVIDER_CONNECTIVITY`
- `PARSE_INTENT`
- `SEARCH_BOOKMARKS`
- `REQUEST_OPEN_COMMAND_PALETTE`
- `REQUEST_CLIPBOARD_TOAST`
- history management messages
- template update messages

`src/background/context-menus.ts` owns context menu registration and click behavior. It creates the Aviso root menu, built-in actions, dynamic custom-template items, and model radio items.

`src/background/frame-router.ts` centralizes frame-aware delivery. It sends display messages to the top frame first, with source-frame fallback when necessary.

`src/background/ai-client.ts` resolves provider/model routes through `src/utils/model-registry.ts` and streams chunks back to the floating UI.

For V2-004, `src/background/ai-client.ts` also exposes a manual provider connectivity path through `handleProviderConnectivityTest`. It uses the same provider route metadata, sends only a fixed public test prompt, and returns a summary object instead of raw provider content.

For V2-006, `src/background/context-menus.ts` adds the manual `复制当前上下文` page/selection menu item. It requests existing page extraction from the clicked frame, formats title, URL, optional selection, and truncated page text with `src/utils/page-content.ts`, then asks the content script to write the text to the clipboard. This path does not call `AI_REQUEST`, provider connectivity, model routing, history, storage writes, or perf summaries.

For V2-007, `src/background/context-menus.ts` keeps translation scoped to selected text only. The right-click selection item `翻译“%s”` still opens the floating window with `operation=translate`, while the previous page-context translate item is removed so an empty page click cannot send the page URL as translation input.

### Content Scripts

| Script            | Frame scope                | Purpose                                                                       |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `floating.tsx`    | top frame only             | Shows single in-page result UI and receives stream chunks.                    |
| `command.tsx`     | top frame only             | Opens command palette, searches history/bookmarks, and starts AI requests.    |
| `toolbar.tsx`     | all frames                 | Shows selection toolbar near selected text, including iframe selections.      |
| `clipboard.tsx`   | all frames                 | Detects copy events and asks background to show top-level toast when allowed. |
| `frame-bridge.ts` | all frames, document start | Lets iframe focus contexts request the top-level command palette.             |
| `readability.ts`  | all frames, document idle  | Extracts current frame/page text for summary flows.                           |

### Popup

`src/popup/index.tsx` provides:

- model selection
- OpenAI / Anthropic / 豆包 API Key fields
- manual single-provider connectivity test buttons and summary display
- 豆包 endpoint / model field
- feature toggles
- custom template editor
- history management
- inline privacy explanation

### UI Language Localization

V1-013 is a planned public-launch requirement and is not implemented in the current build.

Required technical constraints:

- Default UI language resolution should use Chrome UI language for Chinese / English, such as `chrome.i18n.getUILanguage()`.
- The Settings override should be stored as a non-secret field inside existing `chrome.storage.sync/contextai_settings`, not as a new storage key.
- `auto` should resolve `zh-*` Chrome UI languages to Chinese UI and non-Chinese Chrome UI languages to English UI until more locales are approved.
- The localization layer should cover Popup, command palette, floating result panel, selection toolbar, inline translation card, double-click menu, native context menus, toasts/errors, screenshot overlay/toolbars if kept, and manifest-facing copy if Chrome `_locales` is needed.
- Changing UI language should refresh native context menus, similar to template/model menu sync.
- UI language must stay separate from translation target-language settings and must not affect provider prompts except where user-facing UI copy is intentionally localized.
- This requirement must not add permissions, host permissions, dependencies, provider routes, backend calls, hosted AI, provider proxy, telemetry, analytics, storage key migration, API Key behavior changes, or remote localization services.

## Message Flow

1. User triggers an action through context menu, toolbar, command palette, clipboard, or history.
2. The trigger sends `SHOW_FLOATING_WINDOW` to background or directly to the display frame.
3. Background uses `sendMessageToDisplayFrame` to prefer the top frame.
4. Floating UI opens immediately and either starts `AI_REQUEST` or waits for page-content extraction.
5. Background handles `AI_REQUEST`, resolves settings/API Keys, calls the provider, and streams `AI_STREAM_CHUNK`.
6. Floating UI renders chunks and can save final output to local history.

Follow-up speed guard is part of the floating-window flow:

- Follow-up requests build a bounded `priorContext` from recent non-empty chat messages instead of resending the full conversation history.
- The default budget is 4 recent messages, 600 characters per user segment, 1200 characters per assistant segment, and 3000 characters for the prior-context body.
- The floating UI uses “等待模型响应…” for model wait states. If the current request has no assistant text after 9 seconds, it shows “模型响应较慢，可继续等待或停止” while keeping the same request active.
- The user can stop the current wait. The floating UI marks the request inactive, stops loading, ignores later chunks/errors for that requestId, and sends `CANCEL_AI_REQUEST` to background.
- Background keeps an in-memory requestId to `AbortController` map for active AI requests. Cancellation sends an abort signal to the OpenAI / Anthropic SDK request where supported; no new provider, permission, dependency, or storage key is introduced.

Manual provider connectivity is separate from the floating-window flow:

1. User clicks a provider-specific test button in the Popup API Key page.
2. Popup sends `VALIDATE_PROVIDER_CONNECTIVITY` with the single provider id.
3. Background checks host permission, local encrypted API Key availability, and provider endpoint/model config.
4. Background sends the fixed public test prompt only to the selected provider.
5. Popup displays the returned summary fields; raw prompt, raw response, API Key, page content, screenshots, and clipboard content are not displayed or stored by this flow.

Copy current context is separate from the floating-window and provider flows:

1. User clicks the right-click menu item `复制当前上下文`.
2. Background requests `EXTRACT_PAGE_CONTENT` from the clicked frame and combines it with the tab/frame title, URL, and optional selected text.
3. `formatCurrentContext` returns Markdown-like structured text and applies the same page-body truncation boundary as page summary.
4. Background sends `WRITE_CURRENT_CONTEXT_TO_CLIPBOARD` to the content script.
5. Content script writes to the user clipboard with existing clipboard write capability and shows a success/failure toast through `SHOW_COPY_CONTEXT_TOAST`.

Translation uses the existing floating-window and provider flow:

1. User triggers translation from selected text through the context menu or selection toolbar, or types a local command such as `翻译 hello` in the command palette.
2. The command palette still uses local intent parsing only; for `translate`, it passes the stripped target text as `userMessage`.
3. Floating UI opens with a translation-specific title, user bubble, waiting copy, and error prefix.
4. Background validates that `selectionText` or `userMessage` contains text before provider start.
5. `src/utils/translation.ts` provides the translation prompt and formats the provider user content as `待翻译文本` only. Page URL, link URL, and page body are not included as translation input.

## Provider Registry And Selection

`src/utils/model-registry.ts` is the V2-003 registry surface for provider and model metadata. It intentionally covers only the current approved provider set:

| Provider id | Display name    | SDK path          | Host permission                       | Vision marker   | Endpoint/model config                          |
| ----------- | --------------- | ----------------- | ------------------------------------- | --------------- | ---------------------------------------------- |
| `openai`    | OpenAI          | OpenAI SDK        | `https://api.openai.com/*`            | supported       | Not required.                                  |
| `anthropic` | Anthropic       | Anthropic SDK     | `https://api.anthropic.com/*`         | supported       | Not required.                                  |
| `doubao`    | 豆包 / 火山方舟 | OpenAI-compatible | `https://ark.cn-beijing.volces.com/*` | model-dependent | Requires `doubaoModel` endpoint/model setting. |

| Model choice             | Code path                                           | Validation status                          |
| ------------------------ | --------------------------------------------------- | ------------------------------------------ |
| `gpt-4o-mini` / `gpt-4o` | OpenAI SDK                                          | Implemented, not live-validated.           |
| `claude-*`               | Anthropic SDK                                       | Implemented, not live-validated.           |
| `doubao`                 | OpenAI SDK with 火山方舟 base URL and user endpoint | Implemented; user confirmed API usability. |

Default model is `gpt-4o-mini`. Unknown non-Claude model IDs continue to fall back to the OpenAI route for compatibility with any existing saved OpenAI model value.

## Provider Connectivity Tests

`src/utils/provider-connectivity.ts` defines the V2-004 connectivity summary contract, fixed public test prompt, provider-to-test-model mapping, host permission check helper, and error category mapping.

Connectivity summary fields:

- `provider`
- `model_or_endpoint`
- `action`
- `trigger`
- `host_permission_present`
- `result`
- `latency_note`
- `error_category`
- `secret_leak_check`
- `raw_prompt_logged`
- `raw_response_logged`
- `private_page_data_logged`
- `notes`

The Popup adds one test button per approved provider. It disables concurrent tests and has a local timeout fallback so the UI does not stay stuck if background does not return a response.

## Storage

| Data     | Storage area           | Key                  | Notes                                                              |
| -------- | ---------------------- | -------------------- | ------------------------------------------------------------------ |
| Settings | `chrome.storage.sync`  | `contextai_settings` | Keeps legacy namespace for compatibility after rename.             |
| API Keys | `chrome.storage.local` | `contextai_api_keys` | Encrypted with CryptoJS AES using extension-specific key material. |
| History  | `chrome.storage.local` | `contextai_history`  | Stores local request/response history entries.                     |

The `contextai_*` keys are intentionally retained for upgrade compatibility. A migration would need a separate plan to avoid losing local user data.

## Permissions

Current manifest permissions from `package.json`:

- `contextMenus`
- `activeTab`
- `storage`
- `history`
- `bookmarks`
- `clipboardWrite`

Current host permissions:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`

Aviso does not currently request broad host permissions for arbitrary page fetching.

## Screenshot To AI

V2-005 implements an internal dogfood screenshot-to-AI MVP without changing manifest permissions:

- Entry point: the right-click page menu item `截图提问` under the Aviso root menu.
- Selection flow: `src/contents/screenshot.tsx` displays a visible-page region overlay. Cancel or Escape exits without calling `captureVisibleTab` or any provider.
- Capture flow: after user confirmation, the overlay is hidden, background handles `CAPTURE_VISIBLE_TAB` with `chrome.tabs.captureVisibleTab`, and the content script crops the selected region in memory with canvas.
- AI flow: the cropped image is sent through the existing floating-window `image_explain` path with `imageSource=screenshot-region`. The user bubble displays only `截图区域`, not the data URL.
- Privacy boundary: screenshot/base64 is not stored in `chrome.storage`, history input, files, docs, console logs, release artifacts, or validation records. The screenshot request does not attach the full page URL to the provider payload.
- Provider boundary: screenshot images are allowed only for routes that are vision-capable. 豆包 / 火山方舟 remains `model-dependent`; the current endpoint is blocked for screenshot understanding until a vision-capable endpoint is explicitly validated.

## Copy Current Context

V2-006 implements an internal dogfood copy-context MVP without changing manifest permissions:

- Entry point: the right-click page/selection menu item `复制当前上下文` under the Aviso root menu.
- Content format: Markdown-like text containing title, URL, optional selected text, and page text.
- Extraction: page text reuses the existing `EXTRACT_PAGE_CONTENT` content-script path and `truncatePageContent` default 5000 character boundary.
- Clipboard flow: `src/contents/clipboard.tsx` writes the formatted text to the clipboard using `navigator.clipboard.writeText` with a DOM copy fallback.
- Feedback: the same content script shows visible success/failure toast messages.
- Privacy boundary: copied content is not sent to AI providers, not persisted in history or `chrome.storage`, not logged to console, not written to files or docs, and not included in perf summaries or telemetry.

## Translation MVP

V2-007 improves the existing translation action without changing providers or permissions:

- Entry points: selected-text context menu, selection toolbar, and command palette local intent such as `翻译 hello`.
- Provider path: reuses the current configured provider/model, `operation=translate`, streaming chunks, history, model routing, and existing max-token boundary for translate.
- Prompt behavior: automatically translates mainly Chinese input to English and other input to Chinese, asks for the translated text only, and preserves meaning, tone, format, names, numbers, links, code snippets, and line breaks.
- Input boundary: selected text or command-palette user input only. It does not translate the full DOM, page URL, link URL, remote link body, YouTube subtitles, screenshots, or page body.
- UI behavior: floating title shows translation, the user bubble labels the text as `待翻译文本`, waiting copy says `正在翻译…`, and errors are prefixed with `翻译失败`.
- Privacy and permission boundary: no manifest permission, host permission, provider, dependency, third-party translation service, cache, telemetry, storage key, default model, token limit, or API Key storage change.

## Theme And Panel Polish

V2-008 improves visual consistency without changing runtime data flow:

- `src/styles/aviso.tsx` now carries shared theme tokens for radius, focus ring, accent surfaces, and danger surfaces.
- Popup, floating result panel, command palette, selection toolbar, clipboard/copy-context toast, and screenshot overlay reuse those tokens for borders, hover/focus, selected states, waiting states, and error states.
- User-facing naming is tightened around `划词工具栏`, `结果面板`, and `命令面板`; internal `contextai_*` IDs and storage keys remain unchanged for compatibility.
- Screenshot overlay styling is aligned with Aviso theme, but the capture contract is unchanged: user drag-selects a visible region, confirms, then the existing screenshot-to-AI path runs.
- This slice adds no manifest permission, host permission, provider, dependency, storage migration, theme storage setting, telemetry, cache, package, tag, release action, or provider validation call.

## Error Handling And Timing

- `src/utils/errors.ts` normalizes provider and network errors into readable Chinese messages.
- `src/utils/image-src.ts` blocks unsupported image inputs before provider calls when possible.
- `src/utils/timing.ts` logs lightweight `[Aviso timing]` milestones such as trigger, floating shown, background received, provider start, first chunk, and done.
- V2-004B adds one local-console `[Aviso perf]` summary per ordinary floating-window AI request. The summary contains only fixed redacted fields: `trigger`, `provider`, `model_or_endpoint`, `input_size_bucket`, `context_type`, `t_ui_visible_ms`, `t_background_received_ms`, `t_provider_start_ms`, `t_first_chunk_ms`, `t_done_ms`, and `error_category`.
- `input_size_bucket` is bucketed as `0-500`, `501-2000`, `2001-5000`, or `5001+`; raw prompt text, selected text, page content, full URLs, image/base64 payloads, provider responses, and API Keys are not included in the perf summary.
- `context_type` is limited to `selection`, `page_summary`, `image_explain`, `command`, `follow_up`, or `unknown`. Missing timing marks are represented as `null` so failed, first-chunk-missing, and done-missing paths remain diagnosable without inventing raw data.
- V2-004C adds `user_cancelled` as a perf error category for stopped/aborted requests. It is a fixed category only; the raw prompt, raw response, page content, selected text, full URL, image/base64, screenshot, and API Key remain excluded.
- `[Aviso perf]` is not persisted to `chrome.storage` and is not sent to a remote logging or telemetry service.
- V2-005 adds screenshot capture/crop timing marks and image-size/region buckets only. Raw image data, base64, page URLs, selected text, prompts, responses, and API Keys are not logged.
- V2-007 keeps translation perf summaries on the existing redacted `[Aviso perf]` path. Translation source text is counted only by size bucket; raw text, page URL, link URL, page body, prompts, responses, screenshots, and API Keys are not logged or persisted.
- V2-008 keeps existing perf and privacy behavior unchanged. Visual polish must not add raw-content logging, storage writes, remote calls, or telemetry.
- V1-013 UI language localization must not log Chrome UI language, raw UI interactions, raw prompt, raw response, page content, selected text, full URL, screenshot/base64, clipboard content, provider output, or API Key, and must not send localization state to providers or remote services.

## Testing

Current test and manual assets:

- `tests/unit.test.ts`: unit coverage for clipboard type detection, sensitive filtering, template expansion, error normalization, image source validation, local intent parsing, page truncation, provider/model route resolution, approved host boundaries, and provider connectivity summary rules.
- V2-006 unit coverage includes copy-context formatting, body truncation, missing-field fallbacks, and manifest permission boundary checks.
- V2-007 unit coverage includes local translation intent target extraction, translation prompt shape, translation payload input boundary, user-visible translation copy, and the unchanged manifest permission boundary.
- V2-008 is a CSS/theme and user-visible copy polish. It is covered by type check and build; no new pure logic test was added because provider payloads, permissions, storage keys, routing, and message contracts are unchanged.
- V1-013 should add focused coverage for locale resolution, Settings override, surface copy lookup, native context-menu rebuild trigger, and manifest permission boundary when implemented.
- `tests/manual-test.html`: A-G manual QA fixture.
- `tests/iframe-fixture.html`: iframe validation fixture for Hugging Face Spaces / Gradio-like embedding behavior.

Recommended verification before release:

```bash
npm test
npx tsc --noEmit
npm run build
npm run package
```

`npx tsc --noEmit` is the root extension type check. The Docusaurus `website/` subproject has its own `website/tsconfig.json` and is excluded from the root extension check. `npm run build` may fail in the default sandbox with `Operation not permitted`; the known successful path is running the same command outside the sandbox.

## Not Implemented In v0.1

- Project backend or provider proxy.
- Remote link body fetching.
- Universal image capture/conversion.
- Provider benchmarking matrix.
- Remote performance telemetry or persisted performance logs.
- Docusaurus or public docs build.
- Release automation such as release-please, commitlint, or husky.

## v0.2-alpha Technical Delta

The desktop draft `/Users/jonyliu/Desktop/TECH_SPEC_v0.2_delta.md` is a planning input only. It must be corrected against the current repository before any development agent uses it as an implementation spec.

### Correct Current File Names And Contracts

Use the existing project structure:

| Draft name to avoid                 | Current project file          |
| ----------------------------------- | ----------------------------- |
| `src/contents/command-palette.tsx`  | `src/contents/command.tsx`    |
| `src/contents/clipboard-sensor.tsx` | `src/contents/clipboard.tsx`  |
| `src/contents/page-reader.ts`       | `src/contents/readability.ts` |

Background messages currently use the `action` field in `src/types/messages.ts`. New v0.2 messages should extend the existing `MessageRequest` union instead of introducing a parallel `type`-based protocol.

### Permission Baseline

The current `package.json` manifest permissions are:

- `contextMenus`
- `activeTab`
- `storage`
- `history`
- `bookmarks`
- `clipboardWrite`

The current `host_permissions` list contains only the approved provider hosts:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`

The desktop v0.2 draft incorrectly treats `commands`, `scripting`, `clipboardRead`, and `tabs` as already present. They are not present in the current manifest. `history` was later added for local command-palette browsing-history search and must remain documented as local-only.

Any other new permission or host permission still requires a separate product/security decision before implementation.

### Storage And API Keys

Keep the existing split:

- API Keys: encrypted values in `chrome.storage.local` under `contextai_api_keys`.
- Settings: non-secret settings in `chrome.storage.sync` under `contextai_settings`.
- History: local records in `chrome.storage.local` under `contextai_history`.

Do not store provider API Keys inside a synced model-route object. New model-routing settings may reference provider/model IDs, but the secret values must remain in encrypted local storage.

### v0.2-alpha Implementation Constraints

- Model routing supports existing providers only: OpenAI, Anthropic, and 豆包 / 火山方舟.
- Provider connectivity checks are explicit user-triggered checks. Settings-page open must not automatically spend tokens across all configured providers.
- V2-004 tests one provider at a time and must not auto-test all configured providers.
- Provider validation records must not include API Keys, raw prompts, raw responses, private webpages, or screenshots with private data.
- V2-004B latency baseline is limited to local console summaries for ordinary floating-window AI requests. It must not change provider routing, model defaults, token limits, API Key storage, storage key names, or manifest permissions.
- V2-004C follow-up speed guard is limited to context budgeting, waiting copy, slow-first-chunk hint, UI stop/ignore behavior, background abort signal, and fixed `user_cancelled` classification. It must not add model summarization, caching, new provider calls, new dependencies, new permissions, or raw-content logging.
- V2-005 screenshot-to-AI is limited to the existing `activeTab` boundary and right-click user trigger. It must not add `tabs`, `scripting`, `<all_urls>` host permissions, new providers, new dependencies, screenshot persistence, or full-page scrolling capture.
- V2-006 copy current context is limited to manual right-click clipboard writes. It must not call providers, trigger `AI_REQUEST`, persist copied text, add permissions, add host permissions, add dependencies, or log raw copied content.
- V2-008 theme and panel polish is limited to user-facing UI consistency. It must not add a stored theme setting, migrate `contextai_*` keys, introduce a new design system dependency, or change provider/data-flow contracts.
- Result caching may be added only with a clear key design that includes operation, input, target language, provider, model, endpoint/base URL, and template version where relevant. A clear-cache control is required if caching ships.
- Translation MVP should reuse existing floating-window and selection flows first. Full-page DOM translation, YouTube subtitle translation, and third-party translation engines are separate discovery items.
- No new dependency should be added unless the executing agent proves the existing browser storage APIs are insufficient for the approved slice.

### Draft Items Moved Out Of MVP

- Broad third-party translation fallback through Google Translate, 百度, or 有道.
- Multi-tab content aggregation requiring `tabs` / `scripting`.
- Tab grouping requiring `tabGroups`.
- Voice input requiring `offscreen` and microphone access.
- Full internal migration from `contextai_*` keys.

## Open Questions

- Should `clipboard.tsx` remain all-frame, or should it be narrowed after more iframe dogfood evidence?
- Should `contextai_*` storage keys be migrated before public release?
- Should provider SDK use in-browser `dangerouslyAllowBrowser` remain the long-term architecture, or should v0.2 evaluate a privacy-preserving proxy?
- Should the first v0.2 model-routing implementation support only existing providers, or add one approved OpenAI-compatible provider in the same slice?

## Changelog

- 2026-06-02: Implemented V2-003 provider/model registry, route fallback, approved host permissions, and root extension type-check boundary.
- 2026-06-02: Implemented V2-004 manual single-provider connectivity flow, summary-only validation contract, Popup UI, and tests.
- 2026-06-02: Implemented V2-004B local-console latency baseline with fixed redacted `[Aviso perf]` summaries for ordinary AI requests.
- 2026-06-02: Implemented V2-004C follow-up speed guard with bounded prior context, slow response hint, stop waiting, background abort signal, and fixed `user_cancelled` perf classification.
- 2026-06-02: Implemented V2-005 screenshot-to-AI internal dogfood MVP with right-click selection, in-memory crop, existing image flow reuse, and no new manifest permissions.
- 2026-06-02: Implemented V2-006 copy current context internal dogfood MVP with manual right-click clipboard write, structured Markdown formatting, page truncation, visible feedback, and no provider/storage/permission expansion.
- 2026-06-03: Implemented V2-008 theme and Aviso panel polish across Popup, result panel, command palette, selection toolbar, Toast, and screenshot overlay without changing permissions, storage, provider routing, or data flow.
- 2026-06-02: In V2-002A, recorded approved OpenAI / Anthropic provider host permissions for V2-003 as a docs-only decision.
- 2026-06-02: Added v0.2-alpha technical delta constraints and corrected the desktop draft assumptions about file names, message contracts, manifest permissions, host permissions, storage, and MVP boundaries.
- 2026-06-01: Created Phase 1 internal technical specification from current code structure and package manifest.
