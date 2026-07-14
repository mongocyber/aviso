# CLAUDE.md

Aviso is a Chrome MV3 extension built with Plasmo, WXT packaging, React 18, and TypeScript. It provides user-triggered AI actions in the current page through context menus, selection UI, a command palette, Popup settings, and in-page result panels.

Current facts live in [docs/STATE.md](./docs/STATE.md). This file is L0 kernel guidance and should not carry release version, Chrome Web Store state, hosted-AI live state, or other volatile status values.

## Read First

- Read [docs/STATE.md](./docs/STATE.md) before deciding current product status, release gates, public wording, or hosted-AI boundaries.
- For release evidence, cross-check [STATUS.md](./STATUS.md), [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md), [docs/ai/CURRENT_GATE.md](./docs/ai/CURRENT_GATE.md), and [docs/planning/v0.3/release-gates.md](./docs/planning/v0.3/release-gates.md).
- For product behavior, read the directly relevant source, tests, and product docs before editing.

## Stop Lines

Get owner approval before any action that would:

- Change `manifest` permissions, host permissions, storage-key behavior, production config, OAuth/provider setup, or API Key handling.
- Add dependencies, providers, telemetry, analytics SDKs, external network calls, backend services, payment, subscription, anonymous quota, web search, or remote link-body fetching.
- Read, print, store, or write raw API Keys, raw prompts, raw provider responses, private page bodies, screenshots/base64, full URLs, clipboard content, or sensitive logs.
- Submit to Chrome Web Store, change public store copy, publish/deploy production, create release tags, create GitHub Releases, or claim public release approval.
- Reframe internal/candidate evidence as public live, release-ready, CWS-approved, or broadly available.

## Product Boundaries

- BYOK direct-provider is the default path: users provide their own API Keys and the extension calls approved provider hosts directly.
- Optional hosted AI is candidate-only until [docs/STATE.md](./docs/STATE.md) gates say otherwise.
- API Keys stay in `chrome.storage.local/contextai_api_keys`; this is local encryption/obfuscation, not protection against a compromised machine or readable browser profile.
- Non-secret settings stay in `chrome.storage.sync/contextai_settings`; local history stays in `chrome.storage.local/contextai_history`.
- Screenshot remains an internal right-click path only, not a normal public entry or selling point.

## Change Discipline

- Keep diffs small, focused, and consistent with existing names and architecture.
- Do not rewrite unrelated code or reformat unrelated files.
- Do not use `git add .`; stage files by explicit whitelist if staging is requested.
- Update [docs/STATE.md](./docs/STATE.md) when behavior, release gates, storage/data boundaries, public wording, or owner decisions change.
- Prefer executable checks over prose evidence.

## Checks

```bash
git diff --check
npm run docs:check
npm test
npx tsc --noEmit
npm run build
npm run package
```

`npm run build` can hit Plasmo sandbox limits in restricted environments; rerun in an allowed local environment when build evidence is required. Website changes need a separate `cd website && npm run build`.

Doc system: ai-doc-kit v1.9.1 (L + production + ai-product)
