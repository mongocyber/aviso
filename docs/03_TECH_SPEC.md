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
- `PARSE_INTENT`
- `SEARCH_BOOKMARKS`
- `REQUEST_OPEN_COMMAND_PALETTE`
- `REQUEST_CLIPBOARD_TOAST`
- history management messages
- template update messages

`src/background/context-menus.ts` owns context menu registration and click behavior. It creates the Aviso root menu, built-in actions, dynamic custom-template items, and model radio items.

`src/background/frame-router.ts` centralizes frame-aware delivery. It sends display messages to the top frame first, with source-frame fallback when necessary.

`src/background/ai-client.ts` chooses the provider based on the selected model and streams chunks back to the floating UI.

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

## Provider Selection

| Model choice | Code path | Validation status |
|--------------|-----------|-------------------|
| `gpt-4o-mini` / `gpt-4o` | OpenAI SDK | Implemented, not live-validated. |
| `claude-*` | Anthropic SDK | Implemented, not live-validated. |
| `doubao` | OpenAI SDK with 火山方舟 base URL and user endpoint | Implemented; user confirmed API usability. |

Default model is `gpt-4o-mini`.

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

Current host permission:

- `https://ark.cn-beijing.volces.com/*`

Aviso does not currently request broad host permissions for arbitrary page fetching.

## Error Handling And Timing

- `src/utils/errors.ts` normalizes provider and network errors into readable Chinese messages.
- `src/utils/image-src.ts` blocks unsupported image inputs before provider calls when possible.
- `src/utils/timing.ts` logs lightweight `[Aviso timing]` milestones such as trigger, floating shown, background received, provider start, first chunk, and done.

## Testing

Current test and manual assets:

- `tests/unit.test.ts`: unit coverage for clipboard type detection, sensitive filtering, template expansion, error normalization, image source validation, local intent parsing, and page truncation.
- `tests/manual-test.html`: A-G manual QA fixture.
- `tests/iframe-fixture.html`: iframe validation fixture for Hugging Face Spaces / Gradio-like embedding behavior.

Recommended verification before release:

```bash
npm test
npx tsc --noEmit
npm run build
npm run package
```

`npm run build` may fail in the default sandbox with `Operation not permitted`; the known successful path is running the same command outside the sandbox.

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

The current `host_permissions` list only contains:

- `https://ark.cn-beijing.volces.com/*`

The desktop v0.2 draft incorrectly treats `history`, `commands`, `scripting`, `clipboardRead`, `tabs`, `https://api.openai.com/*`, and `https://api.anthropic.com/*` as already present. They are not present in the current manifest. Any new permission or host permission must be documented as a product/security decision before implementation.

### Storage And API Keys

Keep the existing split:

- API Keys: encrypted values in `chrome.storage.local` under `contextai_api_keys`.
- Settings: non-secret settings in `chrome.storage.sync` under `contextai_settings`.
- History: local records in `chrome.storage.local` under `contextai_history`.

Do not store provider API Keys inside a synced model-route object. New model-routing settings may reference provider/model IDs, but the secret values must remain in encrypted local storage.

### v0.2-alpha Implementation Constraints

- Model routing should first support existing providers: OpenAI, Anthropic, and 豆包 / 火山方舟.
- Provider connectivity checks must be explicit user-triggered checks, or directly tied to a just-edited key. Settings-page open must not automatically spend tokens across all configured providers.
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
- Which host permissions should be added first for OpenAI and Anthropic live validation, and should they be added before or during the provider-validation issue?
- Should the first v0.2 model-routing implementation support only existing providers, or add one approved OpenAI-compatible provider in the same slice?

## Changelog

- 2026-06-02: Added v0.2-alpha technical delta constraints and corrected the desktop draft assumptions about file names, message contracts, manifest permissions, host permissions, storage, and MVP boundaries.
- 2026-06-01: Created Phase 1 internal technical specification from current code structure and package manifest.
