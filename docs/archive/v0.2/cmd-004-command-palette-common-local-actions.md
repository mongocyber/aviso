# Aviso CMD-004 Command Palette Common Local Actions

Status: implemented / pending verification
Updated: 2026-06-17

## Goal

Make the command palette understand common user phrasing for local browser
actions, especially bookmarks, history, and opening locally known sites.

The command palette should feel like a practical browser control surface, not a
strict prefix-only search box.

## Background

Current local intent parsing supports terse prefixes such as `书签 react`,
`历史 openrouter`, and `open https://example.com`. It misses common phrases such
as:

- `帮我打开YouTube`
- `打开我的书签`
- `打开浏览历史`
- `在书签里找 react`
- `从历史记录打开 YouTube`
- `show my bookmarks`
- `open history`

PERF-002 intentionally made generic no-result input local-first and non-AI by
default. CMD-004 must preserve that behavior.

## Scope

- Enrich local intent parsing for common Chinese and English command phrasing.
- Add local candidates for opening Chrome bookmark and history pages when the
  user asks to open the manager/list itself.
- For natural open requests with non-URL targets, search local history and
  bookmarks using the target text instead of returning empty results.
- Keep URL opening confirm-first.
- Keep browser history, bookmarks, and local AI conversation results local-only.
- Update focused tests.

## Non-Scope

- No web search.
- No AI intent parsing for generic commands.
- No automatic provider calls for no-result input.
- No backend, proxy, telemetry, analytics, new dependency, or permission change.
- No broad site directory or remote URL lookup.
- No screenshot/vision changes.

## Acceptance Criteria

- `打开我的书签`, `打开书签`, `show my bookmarks`, `open bookmarks` show a
  local action candidate for the Chrome bookmarks page.
- `打开历史记录`, `浏览历史`, `show history`, `open history` show a local action
  candidate for the Chrome history page.
- `帮我打开YouTube` and similar natural open requests search local history and
  bookmarks for `YouTube` candidates if the target is not a safe URL.
- `在书签里找 YouTube` searches bookmarks only.
- `从历史记录打开 YouTube` searches history only.
- Unsafe URL input such as `打开 javascript:alert(1)` remains blocked.
- Generic no-result Enter still does not call AI and does not create default AI
  fallback candidates.

## Validation Plan

Run:

```bash
git diff --check
npm test
npx tsc --noEmit -p tsconfig.wxt.json
npm run build:wxt
```

Manual smoke:

- Open command palette and type `打开我的书签`.
- Type `打开历史记录`.
- Type `帮我打开YouTube` on a profile that has YouTube in history or bookmarks.
- Type `打开 javascript:alert(1)`.

## Stop Lines

Stop before:

- Adding any new permission, dependency, backend, proxy, telemetry, analytics, or
  remote lookup.
- Reintroducing implicit AI fallback for no-result input.
- Sending browser history, bookmarks, or local AI conversation entries to the AI
  provider.
