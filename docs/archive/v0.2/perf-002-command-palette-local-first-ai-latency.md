# Aviso PERF-002 Command Palette Local-First AI Latency UX

Status: implemented / automated validation passed
Updated: 2026-06-17

## Goal

Make the command palette feel instant under BYOK by keeping local actions on the
primary path and making provider-backed AI calls explicit, non-implicit choices.

The command palette must behave like a local control surface first, not a chat
box that sends every unclear input to the current model.

## Background

Recent local dogfood showed that Aviso's internal AI relay path is already fast
while the current BYOK provider route can have multi-second first-token latency.
For command-palette workflows, model latency should not block local history,
bookmark, local AI conversation, URL, or current-page action candidates.

Existing baseline:

- Local intent parsing already runs in `src/utils/intent.ts`.
- Command palette already searches browser history, bookmarks, and local Aviso
  conversations without sending those local results to a provider.
- Open URL, history, bookmarks, local conversation restore, current page
  translate, and current page summary are confirm-first.

Known UX gap:

- When no local result exists, Enter can still fall back to sending the raw query
  to the AI provider.
- This makes ordinary command/search input feel blocked by BYOK model latency
  and can surprise users with a model call.

## Scope

- Preserve local-first command palette behavior.
- Show deterministic local candidates immediately where possible.
- Make provider-backed AI a visible candidate, not an implicit no-result Enter
  fallback.
- Enter behavior should prefer selected local candidates. If there are no
  results, it should show a local-first notice or AI candidate rather than
  silently calling the provider.
- Keep explicit AI actions available for commands such as `ask ai ...`,
  `翻译 ...`, `解释 ...`, `润色 ...`, and selected AI candidates.
- Keep current page translate and summary confirm-first.
- Keep local history, bookmarks, and local AI conversation search local-only.
- Update tests and manual acceptance notes as needed.

## Non-Scope

- No backend, proxy, hosted model, provider gateway, telemetry, analytics, or
  remote logging.
- No manifest permission or host permission changes.
- No automatic provider fallback, retry across models, or extra provider calls.
- No sending browser history, bookmarks, local AI conversations, full URLs, page
  bodies, or raw search queries to the provider unless the user explicitly
  selects an AI action.
- No redesign of the whole command palette visual system.

## Desired UX

### Local Query

When the user types a normal query such as:

```text
openrouter
history openrouter
书签 react
打开 https://example.com
```

The command palette should show local candidates and confirm-first actions.
Pressing Enter should select the highlighted candidate, not call AI.

### No Local Result

When the user types a query with no local result and no explicit AI intent,
the command palette should not automatically call AI.

Preferred behavior:

- Show a neutral notice that no local candidates were found.
- Do not offer a default AI fallback candidate for generic no-result input,
  even when AI is connected.
- Pressing Enter should keep the user on the local-first empty notice and must
  not call the provider.

### Explicit AI Intent

When the user types:

```text
ask ai what is TTFT
翻译 hello
解释 Transformer
润色 这句话
```

The command palette may show an AI candidate. Selecting it or pressing Enter
when it is highlighted may call the provider.

## Acceptance Criteria

- Command palette local search remains usable without any AI service configured.
- Generic no-result queries do not send to the provider on Enter.
- Generic no-result queries do not provide a default AI fallback candidate; they
  only show the local-first empty notice.
- Explicit AI intents still create visible AI candidates when AI is configured.
- AI provider calls from the command palette only happen after a visible AI
  candidate or explicit AI command is selected.
- If AI is not connected, selecting an AI candidate only shows the setup notice
  and does not send a provider request.
- Browser history, bookmarks, and local AI conversations are never included in
  AI payloads.
- Unsafe URL blocking and confirm-first open behavior remain intact.
- Current page translate and current page summary still require explicit
  candidate selection before page content extraction/provider call.
- Existing tests pass.
- New or updated tests cover:
  - no-result Enter does not directly call `handleSendToAI`;
  - generic no-result search does not generate an `ask-ai` fallback candidate
    that Enter can auto-select;
  - explicit AI intent still creates/selects an AI candidate;
  - command palette remains local-first and search-only when AI is disconnected.

## Validation Plan

Run:

```bash
git diff --check
npm test
npx tsc --noEmit -p tsconfig.wxt.json
npm run build:wxt
```

Manual smoke:

- Open command palette.
- Type a normal unmatched query and press Enter. It should not open a floating AI
  result automatically.
- Type `ask ai what is TTFT` and select the AI candidate. It should open the
  result panel only after the explicit AI action.
- Type `打开 https://example.com`. It should show a confirm-first open candidate
  and not navigate automatically.
- Type `打开 javascript:alert(1)`. It should not show an executable open
  candidate.

## Implementation Notes / 2026-06-17

- Command-palette Enter now only selects the highlighted visible candidate.
- Generic no-result input no longer calls the provider implicitly.
- Generic no-result input shows only the local-first empty notice and does not
  create a default AI fallback candidate.
- Explicit AI intents such as `ask ai ...`, `翻译 ...`, `解释 ...`, and
  `润色 ...` continue to create visible AI candidates.
- Existing visible AI operation candidates can still be selected explicitly.
- If AI is not connected, selecting an AI candidate shows the existing setup
  notice and does not send a provider request.
- URL safety checks and confirm-first URL/page candidates remain unchanged.

Automated validation:

- `git diff --check` passed.
- `npm test` passed, 172 tests.
- `npx tsc --noEmit -p tsconfig.wxt.json` passed.
- `npm run build:wxt` passed.

## Stop Lines

Stop and return to CTO/user before:

- Adding permissions, host permissions, dependencies, backend, proxy, telemetry,
  analytics, or remote logging.
- Changing API Key storage behavior.
- Automatically sending local search results or no-result generic queries to a
  provider.
- Adding automatic fallback/retry across models.
- Broadly redesigning popup or command-palette layout outside this issue.
