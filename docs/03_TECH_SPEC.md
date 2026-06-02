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

| Path | Purpose |
|------|---------|
| `src/background/` | MV3 background logic: context menus, command routing, AI request handling, bookmarks, history, frame-aware delivery. |
| `src/contents/` | Content scripts: floating window, command palette, selection toolbar, clipboard sensing, iframe bridge, readability extraction. |
| `src/popup/` | Popup settings UI for providers, API Keys, toggles, templates, history, and privacy copy. |
| `src/utils/` | Shared helpers for storage, errors, intent parsing, image source validation, template expansion, page truncation, timing logs. |
| `src/types/` | Message, history, settings, and template types. |
| `tests/` | Unit tests plus manual and iframe validation fixtures. |
| `docs/brand/` | Visual reference assets and HTML/CSS/JS examples, not production runtime code. |

## Runtime Components

### Background

`src/background/index.ts` registers extension listeners and routes messages:

- `AI_REQUEST`
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

### Content Scripts

| Script | Frame scope | Purpose |
|--------|-------------|---------|
| `floating.tsx` | top frame only | Shows single in-page result UI and receives stream chunks. |
| `command.tsx` | top frame only | Opens command palette, searches history/bookmarks, and starts AI requests. |
| `toolbar.tsx` | all frames | Shows selection toolbar near selected text, including iframe selections. |
| `clipboard.tsx` | all frames | Detects copy events and asks background to show top-level toast when allowed. |
| `frame-bridge.ts` | all frames, document start | Lets iframe focus contexts request the top-level command palette. |
| `readability.ts` | all frames, document idle | Extracts current frame/page text for summary flows. |

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

## Message Flow

1. User triggers an action through context menu, toolbar, command palette, clipboard, or history.
2. The trigger sends `SHOW_FLOATING_WINDOW` to background or directly to the display frame.
3. Background uses `sendMessageToDisplayFrame` to prefer the top frame.
4. Floating UI opens immediately and either starts `AI_REQUEST` or waits for page-content extraction.
5. Background handles `AI_REQUEST`, resolves settings/API Keys, calls the provider, and streams `AI_STREAM_CHUNK`.
6. Floating UI renders chunks and can save final output to local history.

Manual provider connectivity is separate from the floating-window flow:

1. User clicks a provider-specific test button in the Popup API Key page.
2. Popup sends `VALIDATE_PROVIDER_CONNECTIVITY` with the single provider id.
3. Background checks host permission, local encrypted API Key availability, and provider endpoint/model config.
4. Background sends the fixed public test prompt only to the selected provider.
5. Popup displays the returned summary fields; raw prompt, raw response, API Key, page content, screenshots, and clipboard content are not displayed or stored by this flow.

## Provider Registry And Selection

`src/utils/model-registry.ts` is the V2-003 registry surface for provider and model metadata. It intentionally covers only the current approved provider set:

| Provider id | Display name | SDK path | Host permission | Vision marker | Endpoint/model config |
|-------------|--------------|----------|-----------------|---------------|-----------------------|
| `openai` | OpenAI | OpenAI SDK | `https://api.openai.com/*` | supported | Not required. |
| `anthropic` | Anthropic | Anthropic SDK | `https://api.anthropic.com/*` | supported | Not required. |
| `doubao` | 豆包 / 火山方舟 | OpenAI-compatible | `https://ark.cn-beijing.volces.com/*` | model-dependent | Requires `doubaoModel` endpoint/model setting. |

| Model choice | Code path | Validation status |
|--------------|-----------|-------------------|
| `gpt-4o-mini` / `gpt-4o` | OpenAI SDK | Implemented, not live-validated. |
| `claude-*` | Anthropic SDK | Implemented, not live-validated. |
| `doubao` | OpenAI SDK with 火山方舟 base URL and user endpoint | Implemented; user confirmed API usability. |

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

| Data | Storage area | Key | Notes |
|------|--------------|-----|-------|
| Settings | `chrome.storage.sync` | `contextai_settings` | Keeps legacy namespace for compatibility after rename. |
| API Keys | `chrome.storage.local` | `contextai_api_keys` | Encrypted with CryptoJS AES using extension-specific key material. |
| History | `chrome.storage.local` | `contextai_history` | Stores local request/response history entries. |

The `contextai_*` keys are intentionally retained for upgrade compatibility. A migration would need a separate plan to avoid losing local user data.

## Permissions

Current manifest permissions from `package.json`:

- `contextMenus`
- `activeTab`
- `storage`
- `bookmarks`
- `clipboardWrite`

Current host permissions:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`

Aviso does not currently request broad host permissions for arbitrary page fetching.

## Error Handling And Timing

- `src/utils/errors.ts` normalizes provider and network errors into readable Chinese messages.
- `src/utils/image-src.ts` blocks unsupported image inputs before provider calls when possible.
- `src/utils/timing.ts` logs lightweight `[Aviso timing]` milestones such as trigger, floating shown, background received, provider start, first chunk, and done.

## Testing

Current test and manual assets:

- `tests/unit.test.ts`: unit coverage for clipboard type detection, sensitive filtering, template expansion, error normalization, image source validation, local intent parsing, page truncation, provider/model route resolution, approved host boundaries, and provider connectivity summary rules.
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
- Docusaurus or public docs build.
- Release automation such as release-please, commitlint, or husky.

## v0.2-alpha Technical Delta

The desktop draft `/Users/jonyliu/Desktop/TECH_SPEC_v0.2_delta.md` is a planning input only. It must be corrected against the current repository before any development agent uses it as an implementation spec.

### Correct Current File Names And Contracts

Use the existing project structure:

| Draft name to avoid | Current project file |
|---------------------|----------------------|
| `src/contents/command-palette.tsx` | `src/contents/command.tsx` |
| `src/contents/clipboard-sensor.tsx` | `src/contents/clipboard.tsx` |
| `src/contents/page-reader.ts` | `src/contents/readability.ts` |

Background messages currently use the `action` field in `src/types/messages.ts`. New v0.2 messages should extend the existing `MessageRequest` union instead of introducing a parallel `type`-based protocol.

### Permission Baseline

The current `package.json` manifest permissions are:

- `contextMenus`
- `activeTab`
- `storage`
- `bookmarks`
- `clipboardWrite`

The current `host_permissions` list contains only the approved provider hosts:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`

The desktop v0.2 draft incorrectly treats `history`, `commands`, `scripting`, `clipboardRead`, and `tabs` as already present. They are not present in the current manifest.

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
- Result caching may be added only with a clear key design that includes operation, input, target language, provider, model, endpoint/base URL, and template version where relevant. A clear-cache control is required if caching ships.
- Screenshot-to-AI should use the existing `activeTab` user-triggered boundary where possible. If the implementation needs broader capture, scripting, or tab permissions, stop and record the decision before code changes.
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
- 2026-06-02: In V2-002A, recorded approved OpenAI / Anthropic provider host permissions for V2-003 as a docs-only decision.
- 2026-06-02: Added v0.2-alpha technical delta constraints and corrected the desktop draft assumptions about file names, message contracts, manifest permissions, host permissions, storage, and MVP boundaries.
- 2026-06-01: Created Phase 1 internal technical specification from current code structure and package manifest.
