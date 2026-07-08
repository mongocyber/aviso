# Testing Map

## Default Check Set

Use the smallest check set that covers the change.

```bash
git diff --check
npm run docs:check
npm test
npx tsc --noEmit
```

Use heavier checks only when relevant:

```bash
npm run build
npm run package
npm run verify:release-candidate
cd website && npm run build
```

## Test Files

| File | Covers |
| --- | --- |
| `tests/core-utils.test.ts` | Utilities, storage-adjacent pure logic, i18n helpers, URL and text behavior. |
| `tests/model-provider.test.ts` | Provider registry, provider config routing, model IDs, provider availability. |
| `tests/hosted-ai.test.ts` | Hosted session/account behavior, hosted route constraints, hosted error handling. |
| `tests/popup-settings.test.ts` | Popup settings, provider config UX logic, defaults, user-facing settings behavior. |
| `tests/extension-surface.test.ts` | Extension visible-surface contracts and content-script level behavior. |
| `tests/conversation-runtime.test.ts` | Floating panel, conversation history, follow-up/runtime behavior. |
| `tests/connectivity-perf-screenshot.test.ts` | Connectivity preflight, performance summaries, screenshot/privacy boundaries. |
| `tests/unit.test.ts` | General unit coverage for shared logic. |
| `tests/manual-test.html` | Owner/manual loaded-extension walkthrough surface. |

## When To Add Tests

- Runtime behavior changes need focused unit tests and, when user-visible, loaded-extension/manual coverage notes.
- Provider, hosted AI, permission, storage, or privacy changes need tests plus [docs/STATE.md](../STATE.md) review.
- Website copy changes need `npm run docs:check` and `cd website && npm run build`.
- Release package or manifest changes need `npm run package` and `npm run check:manifests`; full release-candidate claims require `npm run verify:release-candidate`.

## Evidence Discipline

- Passing local checks proves only the surface they cover.
- Do not treat build/package success as Chrome Web Store approval, public release, real provider live validation, production deployment, or owner release approval.
- If a check is skipped because it needs network, GUI, secrets, CWS backend, or production owner action, record the missing external prerequisite instead of claiming it passed.
