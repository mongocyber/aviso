# Issue 002: V2-002A Provider Host Permission Decision Handoff

Status: Ready for V2-003 / V2-004 planning

Date: 2026-06-02

Decision source: `docs/decisions/001-v2-provider-host-permissions.md`

## Summary

V2-002 provider permission audit is complete. The product owner approved documenting the host permission decision for v0.2-alpha provider work.

Current manifest host permission remains:

- `https://ark.cn-beijing.volces.com/*`

Approved for a later implementation task:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`

This issue is a handoff document only. This docs task does not change source code, `package.json`, manifest permissions, dependencies, build artifacts, API Keys, or release state.

## V2-003 Handoff

Goal: implement minimal model registry and routing for existing providers.

Allowed provider boundary:

- OpenAI via `https://api.openai.com/*`
- Anthropic via `https://api.anthropic.com/*`
- 豆包 / 火山方舟 via `https://ark.cn-beijing.volces.com/*`

Implementation constraints:

- Keep default model behavior unless the V2-003 task explicitly changes it.
- Keep API Keys encrypted in `chrome.storage.local`.
- Store non-secret provider/model route settings only.
- Do not add broad webpage host permissions.
- Do not add remote-link body fetching.
- Do not add third-party translation fallback.
- Do not add multi-tab, tab grouping, voice, microphone, offscreen, or broad scripting work.

Acceptance for V2-003:

- Manifest host permission changes, if made, are limited to the approved OpenAI and Anthropic provider hosts plus the existing Ark Beijing gateway.
- Provider registry/routing documentation is updated in PRD, tech spec, risk, privacy/security, release checklist, and status.
- No provider is claimed as verified unless a validation record exists.

## V2-004 Handoff

Goal: add manual connectivity testing for one configured provider at a time.

Allowed behavior:

- User clicks a test action for a single provider.
- The test uses a minimal non-private prompt.
- UI returns readable success or failure state.
- Optional latency note is summarized.

Forbidden behavior:

- Do not automatically test all providers on settings-page open.
- Do not run background recurring tests.
- Do not record API Keys.
- Do not record raw prompts.
- Do not record raw responses.
- Do not record private webpage content.
- Do not include screenshots or logs that expose private data.

Acceptance for V2-004:

- Tests are manual and single-provider.
- Validation records are summary-only and secret-free.
- Public release copy and checklist claim only providers that have passed validation.
- Failed provider checks produce readable error categories without leaking provider internals or secrets.

## Still Out Of MVP

- Remote link body fetching.
- Broad host permission for arbitrary webpages.
- Multi-tab aggregation.
- Tab grouping.
- Voice input.
- Third-party translation fallback.
- YouTube subtitle translation.
- Complex full-page DOM translation.
- `contextai_*` storage namespace migration.

## Current Gate State

| Gate | State |
|------|-------|
| Provider host permission product decision | Approved and documented. |
| Manifest host permission implementation | Not done; belongs to V2-003. |
| OpenAI live connectivity validation | Not done; belongs to V2-004. |
| Anthropic live connectivity validation | Not done; belongs to V2-004. |
| 豆包 / 火山方舟 structured validation record | Not refreshed; belongs to V2-004 or release prep. |
| Public provider claims | Limited to validated providers only. |
