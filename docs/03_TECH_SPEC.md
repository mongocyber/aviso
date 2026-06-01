# Aviso Technical Specification

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal technical baseline; pending engineering review

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

## Open Questions

- Should `clipboard.tsx` remain all-frame, or should it be narrowed after more iframe dogfood evidence?
- Should `contextai_*` storage keys be migrated before public release?
- Should provider SDK use in-browser `dangerouslyAllowBrowser` remain the long-term architecture, or should v0.2 evaluate a privacy-preserving proxy?

## Changelog

- 2026-06-01: Created Phase 1 internal technical specification from current code structure and package manifest.
