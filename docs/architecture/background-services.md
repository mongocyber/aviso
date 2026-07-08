# Background Services Contract

## Responsibility

The background service worker owns privileged Chrome APIs, AI request routing, context menus, history operations, hosted sign-in exchange, frame messaging, stream dispatch, runtime config caching, and safe error logging.

## Key Files

- `src/background/index.ts:44` imports AI request and provider-connectivity handlers.
- `src/background/index.ts:50` imports context-menu registration and frame-aware page actions.
- `src/background/index.ts:57` imports frame routing helpers for display-frame and source-frame messages.
- `src/background/index.ts:62` imports local history CRUD/search handlers.
- `src/background/index.ts:70` imports hosted Google sign-in handling.
- `src/background/index.ts:113` resolves whether an AI request should remain BYOK or route to hosted AI.
- `src/types/messages.ts:68` defines the background message union.

## Invariants

- Sender tab and frame identity must be resolved in background, not trusted from arbitrary content payloads.
- BYOK remains the default route unless a usable hosted session and selected hosted provider config make hosted routing explicit.
- Stream chunks must be dispatched to the intended frame and request id.
- Error logs must stay sanitized; do not log raw prompts, raw responses, page bodies, screenshots/base64, API Keys, clipboard content, or full URLs.
- Context menu and screenshot paths must preserve the current screenshot boundary from [docs/STATE.md](../STATE.md).

## Extension Points

- New message actions require an update to `MessageRequest` in `src/types/messages.ts` and a background handler branch in `src/background/index.ts`.
- New page actions should reuse frame routing helpers rather than directly broadcasting to every frame.
- New AI operations must align route selection, result panel behavior, history behavior, and provider/hosted constraints.

## Checks

```bash
npm test
npx tsc --noEmit
```

Use `tests/conversation-runtime.test.ts`, `tests/extension-surface.test.ts`, `tests/hosted-ai.test.ts`, and `tests/core-utils.test.ts` as the first places to look for coverage.
