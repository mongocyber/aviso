# Storage And Privacy Contract

## Responsibility

Storage and privacy rules define where user data lives, how sensitive data is handled, which local encryption boundary is real, and what must never enter docs, logs, release artifacts, or remote services.

## Key Files

- `src/utils/storage.ts:4` states API Key storage is local obfuscation, not a confidentiality boundary.
- `src/utils/storage.ts:48` reads non-secret settings from `chrome.storage.sync/contextai_settings`.
- `src/utils/storage.ts:75` reads API Keys from `chrome.storage.local/contextai_api_keys`.
- `src/utils/storage.ts:123` saves per-provider-config API Keys into local encrypted storage.
- `src/utils/hosted-session.ts:1` defines local and production hosted AI base URLs.
- `src/utils/hosted-session.ts:9` defines `aviso_hosted_session`.
- `src/utils/hosted-session.ts:131` reads hosted session state from `chrome.storage.local`.
- `src/utils/hosted-session.ts:143` validates hosted base URL before saving a session.

## Invariants

- API Keys are not plaintext, but this is local encryption/obfuscation only; do not claim machine-compromise resistance.
- Non-secret settings belong in Chrome sync storage; API Keys, local history, and hosted session state stay local.
- Hosted session tokens can be stored for hosted login state; raw Google `id_token` must not enter docs, logs, or durable project records.
- Do not store or log raw prompts, raw responses, private page bodies, screenshots/base64, clipboard content, BYOK API Keys, or full URLs.
- Storage-key migrations are owner-gated because they can affect user data.

## Extension Points

- New persisted data requires a row in [docs/STATE.md](../STATE.md) Storage & Data, a privacy/security doc update, and tests around migration/default behavior.
- New sensitive data types require log review and docs-check banned-claim or checklist coverage where possible.
- Hosted session changes should go through `src/utils/hosted-session.ts`, not scattered local-storage calls.

## Checks

```bash
npm test
npx tsc --noEmit
npm run docs:check
```

Use `tests/core-utils.test.ts`, `tests/hosted-ai.test.ts`, and `tests/conversation-runtime.test.ts` first.
