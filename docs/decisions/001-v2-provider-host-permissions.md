# Decision 001: v0.2-alpha Provider Host Permissions

Date: 2026-06-02

Status: Approved for v0.2-alpha implementation planning

Baseline: v0.2-alpha planning commit `80cbc1e docs: define v0.2 alpha planning`

## Context

V2-002 provider permission audit found that the current manifest only allows the 豆包 / 火山方舟 Beijing gateway:

- `https://ark.cn-beijing.volces.com/*`

The codebase already contains OpenAI and Anthropic provider paths, but the manifest does not currently allow their production API hosts. Without explicit host permission decisions, V2-003 model routing and V2-004 connectivity testing would be ambiguous and could accidentally expand permissions without matching privacy, risk, and release documentation.

## Decision

The product owner approved adding these provider host permissions in a later implementation task:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`

The existing 豆包 / 火山方舟 Beijing gateway remains in scope:

- `https://ark.cn-beijing.volces.com/*`

This decision records approval only. It does not change `package.json`, the manifest, source code, dependencies, build output, or release artifacts.

## Reasons

- OpenAI and Anthropic are existing product/provider choices in the UI and code paths.
- V2-003 needs a clear provider registry and routing boundary before implementation.
- V2-004 needs exact provider hosts before adding manual connectivity checks.
- Documenting the decision first keeps Chrome permission prompts, privacy copy, risk tracking, and future store claims aligned.

## Scope

Approved scope:

- Document the approved OpenAI and Anthropic host permissions.
- Keep 豆包 / 火山方舟 fixed to the Beijing Ark gateway for this MVP slice.
- Allow V2-003 to add the approved host permissions when implementing provider registry/routing.
- Allow V2-004 to add user-triggered, single-provider connectivity tests after V2-003.
- Public release copy may claim only providers that have completed validation records.

## Non-Scope

Not approved in this decision:

- Broad remote-link body fetching.
- Broad webpage host permissions.
- Multi-tab aggregation or tab grouping.
- Voice input or microphone/offscreen permissions.
- Third-party translation fallback through Google Translate, 百度, 有道, or similar services.
- Public Chrome Web Store release, package zip, tag, or publishing action.
- Any automatic test across all providers.
- Any real provider API call during this docs task.

## Connectivity Test Constraints

V2-004 connectivity checks must follow these rules:

- The user must manually trigger the test for one provider at a time.
- Opening the settings page must not auto-test all configured providers.
- Tests must use a minimal non-private prompt.
- Records must summarize status, readable error category, and optional latency note.
- Records must not include API Keys, raw prompts, raw responses, private webpage content, screenshots with private data, or provider secrets.

## Risks And Mitigations

| Risk | Mitigation |
|------|------------|
| Chrome permission prompt becomes broader. | Add only the three provider hosts above and keep broad page-fetching hosts out of MVP. |
| Documentation claims a provider before it works. | Public release copy can mention only providers with validation records. |
| Connectivity tests leak secrets or private data. | Use manual single-provider tests, minimal prompts, and summary-only records. |
| 豆包 endpoint ambiguity expands scope. | Keep 豆包 fixed to `https://ark.cn-beijing.volces.com/*` for this MVP slice. |
| Future agent confuses approval with implementation. | Treat this decision as approval only; manifest changes belong to V2-003. |

## Execution Gates

Before V2-003 is accepted:

- Manifest/`package.json` changes must be limited to the approved provider host permissions if host changes are needed.
- No new provider host may be added without a new decision note.
- Existing API Key storage must stay encrypted in `chrome.storage.local`.
- Settings may store provider/model route IDs, but not secrets.

Before V2-004 is accepted:

- Connectivity tests must be explicit user actions.
- Tests must run one provider at a time.
- Validation records must be summary-only and secret-free.
- Public release checklist must still mark unvalidated providers as not claimable.

## Follow-Up

- V2-003: implement minimal model registry, routing, and approved host permission manifest change.
- V2-004: implement manual single-provider connectivity test UI and summary-only validation record format.
