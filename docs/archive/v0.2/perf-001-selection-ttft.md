# Aviso PERF-001 Selection TTFT Optimization

Status: opened / implementation complete / local dogfood captured / target missed on current route
Updated: 2026-06-16

## Goal

Improve perceived latency for cold-provider selection translate and selection explain.

Target:

- Primary: cold-provider first visible provider chunk p50 under 1.5 seconds.
- Stretch: cold-provider first visible provider chunk p50 under 1 second.
- If a supported reasoning or thinking model emits reasoning before final answer text, the collapsible thinking state may count as first visible provider progress, but it must not be described as the first translated word.

## Scope

- Use the existing `buildPerfSummary` summary fields for local dogfood timing.
- Keep dogfood rows summary-only: provider, model_or_endpoint, operation, input_size_bucket, t_ui_visible_ms, t_provider_start_ms, t_first_chunk_ms, t_done_ms, and error_category.
- Derive dogfood rows with `buildSelectionTtftDogfoodRow`; compute local p50/p95 with `buildSelectionTtftAggregate`.
- Implement provider/model-gated reasoning or thinking request parameters only inside the current BYOK direct-provider path.
- Render reasoning/thinking stream deltas as a temporary collapsible "思考中" state in the current floating panel.
- Reuse existing default provider config and `fastProviderConfigId` routing. Do not add per-operation storage.
- This is a new PERF-001 experiment scope. It does not change current v0.2 public release wording unless owner separately approves that wording update.

## Non-Scope

- No provider additions.
- No manifest permission or host permission changes.
- No storage schema or `contextai_*` key migration.
- No backend, proxy, remote service, telemetry, analytics, or remote logging.
- No raw prompt, raw response, private page body, full URL, screenshot/base64, clipboard content, API key, or provider raw error evidence.
- No public p50/p95 speed claim until owner-approved dogfood evidence exists.

## Baseline Method

Manual sampling is allowed only as owner-approved local dogfood. Each row is one user action.

Do not include cache hits in provider TTFT sampling. Translation cache hits can be recorded separately as cache behavior, not provider latency.

Rows are eligible for p50/p95 only when:

- `operation` is `selection_translate` or `selection_explain`.
- `t_provider_start_ms` and `t_first_chunk_ms` are both present.
- `error_category` is `none`.

Rows missing provider start or first chunk are excluded from p50/p95 and kept only as exclusion evidence. This prevents cache hits, pre-provider failures, user cancellations, and missing-first-chunk attempts from being counted as provider TTFT.

### Owner-Approved Local Dogfood Checklist

Before sampling:

- Owner explicitly approves local dogfood for one provider/model route.
- Use only non-sensitive public text snippets. Do not use private page bodies, private URLs, screenshots, clipboard secrets, customer data, or API keys as evidence.
- Open local DevTools only to inspect Aviso's summary logs. Do not copy raw network request/response bodies.
- Clear or avoid the short translation memory cache path between provider TTFT attempts. If the console shows `translation_cache_hit`, exclude that action from provider TTFT.
- Keep the current provider config and fast provider config routing; do not add a provider, host permission, storage key, backend, proxy, telemetry, or analytics.

Recommended minimum sample shape after owner approval:

- 5 cold selection translate attempts on the approved thinking/reasoning model.
- 5 cold selection explain attempts on the approved thinking/reasoning model.
- Optional comparison: 5 cold selection translate attempts on the same provider's non-thinking fast/default route, only if already configured.

For each user action:

1. Select a short public text snippet.
2. Trigger selection translate or explain through the existing UI.
3. Copy only the `[Aviso perf]` summary object fields needed for the row below.
4. If the first visible stream event was reasoning/thinking, note `reasoning_visible_before_answer=yes`; otherwise note `no`.
5. If any stop-line evidence appears, stop sampling and do not continue.

| Date       | Build / commit                    | Provider | Model / endpoint              | Operation           | Input bucket | t_ui_visible_ms | t_provider_start_ms | t_first_chunk_ms | t_done_ms | Error category | Notes                                      |
| ---------- | --------------------------------- | -------- | ----------------------------- | ------------------- | ------------ | --------------: | ------------------: | ---------------: | --------: | -------------- | ------------------------------------------ |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_explain   | 0-500        |              84 |                  88 |             2433 |      9397 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_explain   | 0-500        |              63 |                  66 |             2687 |     11830 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_explain   | 0-500        |               4 |                   5 |             2556 |      8647 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_explain   | 0-500        |               2 |                   3 |             2058 |      9689 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_explain   | 0-500        |               3 |                   4 |             1612 |      9295 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_translate | 0-500        |               7 |                   9 |             4657 |      6547 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_translate | 0-500        |               4 |                   6 |             3881 |      5778 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_translate | 0-500        |               2 |                   4 |            10101 |     13978 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_translate | 0-500        |               3 |                   5 |             4233 |     11159 | none           | No visible thinking state observed.        |
| 2026-06-16 | local build / owner-assisted reload | doubao   | doubao-seed-2-0-lite-260428   | selection_translate | 0-500        |               3 |                   4 |             4531 |      7864 | none           | No visible thinking state observed.        |

### 2026-06-16 Local Dogfood Attempt

Owner approved local dogfood with the configured Doubao / Volcano Ark route, summary-only fields only. API Key values, endpoint values, selected text, raw prompts, raw provider responses, page bodies, screenshots, clipboard contents, and full URLs were not copied into this document.

Result after owner-assisted reload: captured summary-only rows, but target missed on the current route.

- Installed Aviso extension was owner-reloaded from Chrome extensions.
- Route visible in Aviso UI: AI available, Doubao / Volcano Ark 1, last passed.
- Test page: local public manual fixture only.
- Eligible summary rows: 10.
- Initial issue: Chrome's extension-detail page rendered blank in this session, so the installed Aviso extension could not be safely reloaded through the Chrome UI.
- Follow-up reload path: Chrome was restarted after rebuilding both WXT (`npm run build:wxt`) and Plasmo (`npm run build`) outputs. The public local test page loaded the Aviso toolbar and floating result panel after restart.
- Observed blocker after reload: selection explain requests completed in the floating panel, but Chrome dogfood logs still did not expose `[Aviso perf]` summary JSON. No summary-only row could be copied without relying on raw provider/network details.
- Follow-up retry after adding response and final-chunk summary forwarding still produced 0 `[Aviso perf]` rows in the page console after a completed selection explain action.
- Chrome automation could not inspect extension management or extension-origin pages in this session; both resolved to a blank automation page, so the current installed extension script could not be safely verified or reloaded through automation.
- The current Chrome main process did not expose a `--load-extension` path, so the loaded Aviso instance is treated as a profile-installed unpacked extension whose exact local source path was not verified. Do not assume the current Chrome instance has loaded the rebuilt Plasmo or WXT output until owner-assisted extension reload evidence exists.
- Owner then manually reloaded Aviso in Chrome extensions. After refreshing the local public test page, Aviso content scripts reinjected and `[Aviso perf]` summary JSON became visible in the page console.
- Actual sampled route was `doubao-seed-2-0-lite-260428`, not an explicitly named thinking model route. No visible "思考中" state was observed during the sampled actions.
- The UI relay path was fast in the captured rows: `t_provider_start_ms` was 3-88 ms for explain and 4-9 ms for translate, so the measured delay is after provider start rather than before provider start.
- Safety correction: the tested toolbar was confirmed as Aviso via `#aviso-toolbar-host`. Other installed translation-extension warnings appeared in the same console but were ignored and not counted as PERF-001 evidence.
- Observed latency signal from the earlier local run: one selection translate attempt remained in waiting state for more than 30 seconds without a visible reasoning panel before later completing in the UI.
- Stop decision: do not claim the TTFT target as passed on the current route. To validate the original thinking-model acceptance, the owner must switch the relevant default or fast route to the intended thinking endpoint, then rerun the same summary-only sample method.

Checks run during this implementation pass:

- `npm test` -> 165 passing tests.
- `npx tsc --noEmit -p tsconfig.wxt.json` -> pass.
- `git diff --check` -> pass.
- `npm run build:wxt` -> pass.
- `npm run build` -> pass after running outside the sandbox because Plasmo build is blocked by sandbox permissions.

Aggregate:

| Date       | Build / commit                    | Operation           | Eligible samples | p50 t_first_chunk_ms | p95 t_first_chunk_ms | Excluded rows | Notes                                                                 |
| ---------- | --------------------------------- | ------------------- | ---------------: | -------------------: | -------------------: | ------------: | --------------------------------------------------------------------- |
| 2026-06-16 | local build / owner-assisted reload | selection_explain   |                5 |                 2433 |                 2687 |             0 | Current route missed p50 < 1500 ms and no visible thinking state.     |
| 2026-06-16 | local build / owner-assisted reload | selection_translate |                5 |                 4531 |                10101 |             0 | Current route missed p50 < 1500 ms and no visible thinking state.     |
| 2026-06-16 | local build / owner-assisted reload | selection_all       |               10 |                 2687 |                10101 |             0 | UI/provider-start overhead was small; delay is after provider start.  |

### Local Interpretation Rules

- Primary pass requires `selection_all.p50_first_chunk_ms < 1500`.
- Stretch pass requires `selection_all.p50_first_chunk_ms < 1000`.
- If answer text is still slow but reasoning/thinking deltas appear visibly earlier, record that as perceived-wait improvement only; do not call it first translated word.
- If `t_provider_start_ms` is already high before provider call, investigate UI relay/runtime/cache/content-extraction path before changing model parameters.
- If provider queueing, network, or non-model causes dominate, stop this issue and reopen attribution instead of adding more request parameters.

### Stop During Sampling If

- Any log, screenshot, or copied note contains raw prompt, raw response, page body, full URL, screenshot/base64, clipboard content, or API key.
- A change would require manifest permissions, host permissions, API key storage behavior, storage schema, backend/proxy, telemetry, analytics, or remote logging.
- Cache hits are the dominant path and provider TTFT cannot be isolated.
- The measured bottleneck is before `t_provider_start_ms`, or unrelated to model-side thinking/reasoning behavior.

## Acceptance

- Current unit tests do not regress.
- New unit tests cover reasoning/thinking parameter gating and reasoning stream delta parsing.
- New unit tests cover summary-only dogfood row shape and p50/p95 aggregation excluding non-provider TTFT rows.
- Unsupported provider/model routes do not send reasoning or thinking request parameters.
- Reasoning/thinking deltas do not enter saved conversation history by default.
- Perf summaries remain summary-only and do not include forbidden evidence.

## Stop Lines

Stop and ask the owner before any of these:

- Manifest permission or host permission changes.
- API Key storage or encryption behavior changes.
- Storage schema or namespace changes.
- Backend, proxy, telemetry, analytics, or remote logging.
- Live provider validation or TTFT sampling outside owner-approved local dogfood.
- Evidence that the latency bottleneck is not model-side, such as UI relay, content extraction, network, cache, or provider queueing dominating the timing.
