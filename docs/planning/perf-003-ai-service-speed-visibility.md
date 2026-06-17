# Aviso PERF-003 AI Service Speed Visibility

Status: implemented / automated checks passed / owner smoke pending
Updated: 2026-06-17

## Goal

Make BYOK model speed visible in the AI Service configuration card so users can
understand whether a configured model is fast enough for their workflow.

This is a perception and diagnostics improvement. It does not claim to reduce
provider latency.

## Background

PERF-001 showed that local relay overhead is small while current BYOK provider
routes can still have multi-second first-token latency. Users need a quick
surface-level signal on each AI service card, plus a compact expanded detail
view with useful timing fields.

The existing connection test already returns a summary-only
`ConnectivityValidationSummary`. Current config records keep test pass/fail and
`testedAt`, but do not expose a model speed grade on the card.

## Scope

- Add a speed grade pill on each AI Service card outer surface.
- Use only the latest local connection-test summary or persisted last-test
  metadata already available in the popup.
- Show a neutral unknown state when there is no useful timing.
- Keep detailed timing in the existing expandable connectivity detail area.
- Prefer concise fields:
  - local processing / test setup time when available;
  - first-token time when available;
  - total completion time when available;
  - last tested time;
  - tested model/provider;
  - privacy-safe note that timing is local summary only.
- Keep the existing raw diagnostic rows only if they remain useful; remove noisy
  fields from the default expanded view when replaced by clearer timing rows.
- Update Chinese and English copy.
- Update focused tests.

## Non-Scope

- No backend, proxy, hosted model, provider gateway, telemetry, analytics, or
  remote logging.
- No manifest permission or host permission changes.
- No API Key storage changes or migration.
- No raw prompt, raw response, page body, full URL, clipboard content, API Key,
  screenshot, or private context logging.
- No automatic benchmark loop or background recurring tests.
- No model recommendation or routing based on speed.
- No claim that provider latency is solved.

## Speed Grade Semantics

The outer card should show one compact pill:

- `未测速 / Not tested`: no usable timing data.
- `较快 / Fast`: recent successful timing is good enough for quick tasks.
- `一般 / Moderate`: usable but noticeable waiting.
- `较慢 / Slow`: user should expect waiting.
- `失败 / Failed`: last test failed.

The exact thresholds may be implementation-local, but they must be deterministic
and documented in code or tests. They should be based on real summary timing
when available, not model names or provider guesses.

Implemented thresholds:

- `Fast / 较快`: completion time <= 1500 ms.
- `Moderate / 一般`: completion time > 1500 ms and <= 3500 ms.
- `Slow / 较慢`: completion time > 3500 ms.
- `Failed / 失败`: last local connection test failed.
- `Not tested / 未测速`: no local summary timing is available, even if the
  config exists.

Data source:

- Current popup session: the latest redacted
  `ConnectivityValidationSummary.latency_note` or optional summary-only timing
  fields.
- Persisted config metadata: optional summary-only `testCompletionMs`,
  `testFirstTokenMs`, and `testLocalProcessingMs` fields written after a manual
  connection test. These fields are local timing summaries only; there is no
  storage migration and no raw prompt, response, key, page body, clipboard,
  screenshot, or URL storage.
- Legacy `latency_note` strings such as `耗时约 4800 ms` are parsed
  conservatively. Date-only strings such as `上次通过：...` are not treated as
  timing.

If the current connectivity summary only has a human-readable `latency_note`,
the implementation may parse the existing safe summary string conservatively.
If exact first-token and total timing are not available yet, show `暂无数据` for
those fields rather than inventing values.

## Desired UX

Outer card:

```text
豆包 / 火山方舟 1    [默认] [上次通过] [较慢]
豆包 / 火山方舟 · doubao-seed-2-0-lite-260428
```

Expanded connection detail:

```text
上次连接测试通过       收起详情
速度等级              较慢
首 token              暂无数据
完成时间              4.8s
本地处理              暂无数据
测试时间              2026-06-17 14:12
测试模型              doubao-seed-2-0-lite-260428
说明                  基于本机最近一次手动连接测试；不上传测速数据。
```

## Acceptance Criteria

- Each AI Service card shows exactly one speed pill based on local last-test
  data.
- Unknown/not-tested configs do not imply speed.
- Failed configs show failure rather than a speed grade.
- Successful configs with timing show `Fast`, `Moderate`, or `Slow`.
- Expanded details include useful timing fields without exposing raw prompts,
  raw responses, keys, page bodies, clipboard content, screenshots, or private
  URLs.
- No model recommendation text is shown.
- No new backend, telemetry, permissions, dependencies, or storage migrations are
  introduced.
- Existing provider connection tests still work.
- Existing command-palette PERF-002 changes are not modified.

## Validation Plan

Run:

```bash
git diff --check
npm test
npx tsc --noEmit -p tsconfig.wxt.json
npm run build:wxt
```

Manual smoke:

- Open Popup > AI Service.
- For a config with no test, verify the card shows `未测速`.
- Run a connection test, then verify the card shows a speed grade or `失败`.
- Expand details and verify timing fields are concise and privacy-safe.
- Switch light/dark theme and verify text contrast remains readable.

## Stop Lines

Stop and return to CTO/user before:

- Adding any backend, proxy, telemetry, analytics, remote logging, dependency,
  manifest permission, host permission, API Key storage change, or migration.
- Sending local history, bookmarks, local AI conversations, page bodies,
  screenshots, clipboard content, raw prompts, raw provider responses, full URLs,
  or API Keys to any new destination.
- Adding model recommendation or automatic routing based on speed.
- Claiming the BYOK provider itself is faster.
