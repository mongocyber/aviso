# Content Surfaces Contract

## Responsibility

Content surfaces render Aviso inside webpages and send user-triggered actions to background. They should keep UI state local, use shadow hosts, and avoid automatic provider calls from passive page observation.

## Key Files

- `src/contents/toolbar.tsx` registers the all-frame selection toolbar content script and defines toolbar operations: explain, translate, polish, summarize, and send.
- `src/contents/double-click-menu.tsx` registers the optional all-frame double-click menu. The feature remains default-off.
- `src/contents/clipboard.tsx` registers the all-frame clipboard host and copy-current-context writer. Passive Clipboard Sense remains default-off and only attaches the copy listener after settings explicitly enable it.
- `src/contents/command.tsx` registers the top-frame command palette content script.
- `src/contents/command.tsx:60` defines command result types for local AI history, ask AI, bookmarks, browser history, local actions, open URL, and page actions.
- `src/contents/floating.tsx:40` registers the floating result panel.
- `src/contents/floating.tsx:58` defines floating panel state, including loading, errors, hosted sign-in notice, request id, reasoning text, and conversation messages.
- `src/contents/readability.ts` keeps all-frame extraction available only for user-triggered page/editable extraction.
- `src/contents/frame-bridge.ts` keeps all-frame iframe shortcut bridging for command palette open requests.
- `src/types/messages.ts:116` defines the message payload that opens the floating window.

## Invariants

- User-triggered actions are required before reading page content or sending AI requests.
- Existing iframe user-triggered surfaces must stay all-frame in both Plasmo `config` and WXT entrypoints: selection toolbar / inline translation, optional double-click menu, clipboard host / copy writer, Readability extraction, and iframe command shortcut bridging.
- Command palette UI, floating result panel, and screenshot selector must stay top-frame only unless owner approval explicitly changes the frame boundary.
- Passive Clipboard Sense defaults off when the setting is missing. Its copy listener must not be permanently registered while disabled, and settings changes must add or remove the listener.
- Cross-frame copy-current-context may extract from the source frame, but DOM clipboard fallback is fail-closed: every caller must pass an explicit fallback decision, and only confirmed top-frame sources may opt in.
- Content-script `matches` are an approved maximum boundary, not a permanent exact `<all_urls>` requirement. Source, Plasmo-generated, WXT-generated, and canonical final manifests must keep parity so future narrowing is allowed only when every path narrows together.
- Command palette open-url and page actions must stay confirm-first and must use URL safety helpers.
- The floating result panel must not show image URLs/base64 in the user bubble for image operations.
- Screenshot is not a normal public entry; keep it on the internal right-click path unless [docs/STATE.md](../STATE.md) gates and owner approval change.
- Content scripts should use existing shared UI tokens from `src/styles/aviso.tsx` and i18n helpers from `src/utils/i18n.ts`.

## Current Match Boundary

All current content scripts still use `<all_urls>` as the maximum approved match boundary because Aviso is a webpage-context assistant, but the frame boundary differs by surface:

- `toolbar`: arbitrary-page and iframe selection toolbar / inline translation.
- `double-click-menu`: optional arbitrary-page and iframe double-click menu; default-off.
- `clipboard`: arbitrary-page and iframe clipboard host / copy writer; passive Clipboard Sense listener default-off.
- `command`: arbitrary-page command palette UI; top-frame only.
- `floating`: arbitrary-page result panel for user-triggered actions; top-frame only.
- `screenshot`: right-click internal screenshot selector on the current page; top-frame only.
- `readability`: user-triggered page / editable extraction from the source frame.
- `frame-bridge`: keyboard shortcut forwarding from focused iframes to the top-frame command palette.

## Extension Points

- Add a visible webpage tool by adding a content script under `src/contents/`, a WXT/Plasmo entrypoint when needed, message types in `src/types/messages.ts`, and focused tests.
- Add a new operation by updating toolbar/button maps, floating labels, AI payload assembly, and provider/hosted routing support.
- Add frame-aware behavior through `src/contents/frame-bridge.ts` and background frame routing, not ad hoc cross-frame messaging.

## Checks

```bash
npm test
npx tsc --noEmit
```

Use `tests/extension-surface.test.ts` and `tests/manual-test.html` for visible-surface coverage and owner manual QA.
