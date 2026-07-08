# Provider Routing Contract

## Responsibility

Provider routing decides whether a request uses BYOK direct-provider or the optional hosted route, validates local config before calls, and preserves provider-specific request behavior without turning configuration support into live-validation claims.

## Key Files

- `src/background/ai-client.ts:102` handles user-triggered provider connectivity tests.
- `src/background/ai-client.ts:113` checks host permission before connectivity calls.
- `src/background/ai-client.ts:134` blocks connectivity calls without an API Key.
- `src/background/hosted-chat-routing.ts:48` routes hosted only when `payload.aiRoute === "hosted"`.
- `src/background/hosted-chat-routing.ts:52` builds hosted chat requests and rejects image operations for hosted chat.
- `src/background/hosted-chat-routing.ts:78` runs hosted streaming chat and requires a usable session.
- `src/utils/provider-configs.ts:74` merges current provider configs with legacy configs.
- `src/utils/provider-configs.ts:158` defines whether a provider config is ready for selection.

## Invariants

- BYOK direct-provider remains the default user path.
- Hosted chat is explicit and session-gated; lack of hosted session must not break BYOK.
- Missing host permission, API Key, model, or endpoint must block calls before provider traffic.
- Provider configuration support is not live provider validation.
- Real provider calls and new provider hosts require owner approval when outside an explicitly approved local validation task.
- Hosted chat does not support image explain or screenshot-region payloads unless the backend contract and release boundaries explicitly change.

## Extension Points

- New BYOK provider: update model registry, provider configs, host permission, Popup UI, storage behavior, i18n/copy, tests, docs, and CWS permission explanation.
- New hosted operation: update hosted backend contract first, then `hosted-chat-routing`, content surfaces, tests, and `docs/STATE.md` if capability status changes.
- New connectivity behavior: keep payload public/synthetic and summary-only.

## Checks

```bash
npm test
npx tsc --noEmit
npm run check:manifests
```

Use `tests/model-provider.test.ts`, `tests/hosted-ai.test.ts`, and `tests/connectivity-perf-screenshot.test.ts` first.
