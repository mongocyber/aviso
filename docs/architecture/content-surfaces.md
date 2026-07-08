# Content Surfaces Contract

## Responsibility

Content surfaces render Aviso inside webpages and send user-triggered actions to background. They should keep UI state local, use shadow hosts, and avoid automatic provider calls from passive page observation.

## Key Files

- `src/contents/toolbar.tsx:47` registers the all-frame selection toolbar content script.
- `src/contents/toolbar.tsx:101` defines toolbar operations: explain, translate, polish, summarize, and send.
- `src/contents/command.tsx:36` registers the top-frame command palette content script.
- `src/contents/command.tsx:60` defines command result types for local AI history, ask AI, bookmarks, browser history, local actions, open URL, and page actions.
- `src/contents/floating.tsx:40` registers the floating result panel.
- `src/contents/floating.tsx:58` defines floating panel state, including loading, errors, hosted sign-in notice, request id, reasoning text, and conversation messages.
- `src/types/messages.ts:116` defines the message payload that opens the floating window.

## Invariants

- User-triggered actions are required before reading page content or sending AI requests.
- Command palette open-url and page actions must stay confirm-first and must use URL safety helpers.
- The floating result panel must not show image URLs/base64 in the user bubble for image operations.
- Screenshot is not a normal public entry; keep it on the internal right-click path unless [docs/STATE.md](../STATE.md) gates and owner approval change.
- Content scripts should use existing shared UI tokens from `src/styles/aviso.tsx` and i18n helpers from `src/utils/i18n.ts`.

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
