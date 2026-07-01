import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  APPROVED_PROVIDER_HOST_PERMISSIONS,
  buildProviderConfigRoute,
  DEEPSEEK_BASE_URL,
  DEFAULT_MODEL_ID,
  DOUBAO_BASE_URL,
  GEMINI_BASE_URL,
  getReasoningControlBlockReason,
  HUNYUAN_BASE_URL,
  LEGACY_PROVIDER_CONFIG_IDS,
  MODEL_REGISTRY,
  MOONSHOT_BASE_URL,
  OPENROUTER_BASE_URL,
  PROVIDER_PRIMARY_MODEL,
  PROVIDER_REGISTRY,
  resolveFastModelRouteForOperation,
  resolveModelRoute
} from "../src/utils/model-registry.ts"
import {
  buildConnectivityPreflightSummary,
  buildConnectivityTestPayload,
  buildConnectivityValidationSummary,
  categorizeConnectivityError,
  CONNECTIVITY_TEST_PROMPT,
  getConnectivityModelId,
  getConnectivityTimingSummary,
  hasPrivateContextPayload,
  isProviderHostPermissionPresent,
  parseConnectivityLatencyMs,
  resolveConnectivitySpeedGrade
} from "../src/utils/provider-connectivity.ts"
import {
  bucketScreenshotDataUrl,
  clampScreenshotToolbarPosition,
  getImageInputBlockReason,
  getScreenshotVisionBlockReason,
  isSupportedScreenshotDataUrl,
  normalizeScreenshotCaptureError,
  normalizeScreenshotRegion
} from "../src/utils/screenshot.ts"
import {
  bucketInputSize,
  buildHostedFirstRequestPerfSummary,
  buildPerfSummary,
  buildSelectionTtftAggregate,
  buildSelectionTtftDogfoodRow,
  categorizePerfError,
  sanitizeTimingDetails
} from "../src/utils/timing.ts"
import "./helpers/register-aliases.ts"

test("connectivity route 每次只解析当前 provider", () => {
  const openai = resolveModelRoute(getConnectivityModelId("openai"), {})
  const anthropic = resolveModelRoute(getConnectivityModelId("anthropic"), {})
  const doubao = resolveModelRoute(getConnectivityModelId("doubao"), {
    doubaoModel: "ep-test"
  })

  assert.equal(openai.provider.id, "openai")
  assert.equal(openai.requestModel, "gpt-4o-mini")
  assert.equal(anthropic.provider.id, "anthropic")
  assert.equal(anthropic.requestModel, "claude-haiku-4-5-20251001")
  assert.equal(doubao.provider.id, "doubao")
  assert.equal(doubao.requestModel, "ep-test")
  assert.equal(getConnectivityModelId("gemini"), "")
  assert.equal(getConnectivityModelId("hunyuan"), "")
})

test("connectivity host permission 检查只匹配 provider registry 元数据", () => {
  assert.equal(
    isProviderHostPermissionPresent(
      PROVIDER_REGISTRY.openai,
      APPROVED_PROVIDER_HOST_PERMISSIONS
    ),
    true
  )
  assert.equal(
    isProviderHostPermissionPresent(PROVIDER_REGISTRY.anthropic, [
      "https://ark.cn-beijing.volces.com/*"
    ]),
    false
  )
})

test("connectivity 摘要固定为脱敏字段，不记录 raw prompt/response", () => {
  const summary = buildConnectivityValidationSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    hostPermissionPresent: true,
    result: "failure",
    latencyNote: "未发起：API Key 未配置。",
    errorCategory: "api_key_missing",
    notes: "请先保存当前 provider 的 API Key，再手动测试连接。"
  })

  assert.deepEqual(summary, {
    provider: "openai",
    model_or_endpoint: "gpt-4o-mini",
    action: "provider_connectivity_test",
    trigger: "manual_settings_provider_button",
    host_permission_present: true,
    result: "failure",
    latency_note: "未发起：API Key 未配置。",
    error_category: "api_key_missing",
    secret_leak_check: "pass",
    raw_prompt_logged: "no",
    raw_response_logged: "no",
    private_page_data_logged: "no",
    notes: "请先保存当前 provider 的 API Key，再手动测试连接。"
  })
})

test("connectivity speed grade uses local summary timing only", () => {
  const fast = buildConnectivityValidationSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    hostPermissionPresent: true,
    result: "success",
    latencyNote: "已发起并收到 provider 响应，耗时约 1200 ms。",
    errorCategory: "none",
    notes: "仅发送固定公开短句。"
  })
  const moderate = buildConnectivityValidationSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    hostPermissionPresent: true,
    result: "success",
    latencyNote: "已发起并收到 provider 响应，耗时约 2.4 秒。",
    errorCategory: "none",
    notes: "仅发送固定公开短句。"
  })
  const slow = buildConnectivityValidationSummary({
    provider: "doubao",
    modelOrEndpoint: "doubao-seed-2-0-lite-260428",
    hostPermissionPresent: true,
    result: "success",
    latencyNote: "已发起并收到 provider 响应，耗时约 4800 ms。",
    errorCategory: "none",
    notes: "仅发送固定公开短句。"
  })
  const failed = buildConnectivityValidationSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    hostPermissionPresent: true,
    result: "failure",
    latencyNote: "已发起但 provider 未通过，耗时约 800 ms。",
    errorCategory: "unauthorized",
    notes: "provider 返回失败。"
  })
  const noTiming = buildConnectivityValidationSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    hostPermissionPresent: true,
    result: "success",
    latencyNote: "上次通过：2026-06-17T06:12:00.000Z",
    errorCategory: "none",
    notes: "上次手动连接测试通过。"
  })

  assert.equal(parseConnectivityLatencyMs("耗时约 4800 ms。"), 4800)
  assert.equal(parseConnectivityLatencyMs("took about 2.4 seconds"), 2400)
  assert.equal(
    parseConnectivityLatencyMs("上次通过：2026-06-17T06:12:00.000Z"),
    undefined
  )
  assert.equal(getConnectivityTimingSummary(slow).completionMs, 4800)
  assert.equal(resolveConnectivitySpeedGrade(), "untested")
  assert.equal(resolveConnectivitySpeedGrade(fast), "fast")
  assert.equal(resolveConnectivitySpeedGrade(moderate), "moderate")
  assert.equal(resolveConnectivitySpeedGrade(slow), "slow")
  assert.equal(resolveConnectivitySpeedGrade(failed), "failed")
  assert.equal(resolveConnectivitySpeedGrade(noTiming), "untested")
})

test("connectivity 字段缺失时生成未发起的脱敏摘要", () => {
  const missingKey = buildConnectivityPreflightSummary({
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    errorCategory: "api_key_missing",
    notes: "请先填写并保存当前 AI 服务的 API Key。"
  })
  const missingEndpoint = buildConnectivityPreflightSummary({
    provider: "doubao",
    modelOrEndpoint: "未配置",
    errorCategory: "endpoint_or_model_missing",
    notes: "请填写豆包 / 火山方舟接入点 ID 后再保存或测试。"
  })

  assert.equal(missingKey.result, "failure")
  assert.equal(missingKey.latency_note, "未发起：API Key 未配置。")
  assert.equal(missingEndpoint.result, "failure")
  assert.equal(missingEndpoint.latency_note, "未发起：模型或接入点未配置。")
  assert.equal(missingEndpoint.raw_prompt_logged, "no")
  assert.equal(missingEndpoint.raw_response_logged, "no")
})

test("connectivity 错误分类覆盖 key、限流、网络、超时和 provider 错误", () => {
  assert.equal(categorizeConnectivityError({ status: 401 }), "unauthorized")
  assert.equal(categorizeConnectivityError({ status: 429 }), "rate_limited")
  assert.equal(
    categorizeConnectivityError(new Error("fetch failed")),
    "network_error"
  )
  assert.equal(categorizeConnectivityError(new Error("timeout")), "timeout")
  assert.equal(categorizeConnectivityError({ status: 500 }), "provider_error")
})

test("perf input size 只输出分桶", () => {
  assert.equal(bucketInputSize(0), "0-500")
  assert.equal(bucketInputSize(500), "0-500")
  assert.equal(bucketInputSize(501), "501-2000")
  assert.equal(bucketInputSize(2000), "501-2000")
  assert.equal(bucketInputSize(2001), "2001-5000")
  assert.equal(bucketInputSize(5000), "2001-5000")
  assert.equal(bucketInputSize(5001), "5001+")
})

test("timing details redact URLs and raw text fields", () => {
  const sanitized = sanitizeTimingDetails({
    frameId: 3,
    operation: "summarize",
    context: "page",
    source: "command-palette",
    frameUrl: "https://private.example.com/path?q=secret",
    pageUrl: "file:///Users/me/private.html",
    linkUrl: "https://private.example.com/link",
    srcUrl: "data:image/png;base64,QUJDRA==",
    selectionText: "selected private text",
    pageContent: "private page body",
    rawPrompt: "prompt body",
    rawResponse: "response body",
    error: "failed at https://private.example.com/path?q=secret"
  })

  assert.equal(sanitized.frameId, 3)
  assert.equal(sanitized.operation, "summarize")
  assert.equal(sanitized.context, "page")
  assert.equal(sanitized.source, "command-palette")
  assert.equal(sanitized.frameUrlPresent, true)
  assert.equal(sanitized.pageUrlPresent, true)
  assert.equal(sanitized.linkUrlPresent, true)
  assert.equal(sanitized.srcUrlPresent, true)
  assert.equal(sanitized.selectionTextChars, "selected private text".length)
  assert.equal(sanitized.pageContentChars, "private page body".length)
  assert.equal(sanitized.rawPromptChars, "prompt body".length)
  assert.equal(sanitized.rawResponseChars, "response body".length)
  assert.equal(sanitized.error, "failed at [url omitted]")
  assert.deepEqual(
    Object.keys(sanitized).filter((key) => /Url$|url$/i.test(key)),
    []
  )
  assert.equal(JSON.stringify(sanitized).includes("private.example.com"), false)
  assert.equal(
    JSON.stringify(sanitized).includes("selected private text"),
    false
  )
  assert.equal(JSON.stringify(sanitized).includes("private page body"), false)
})

test("perf summary 字段固定且按 trigger 计算阶段耗时", () => {
  const summary = buildPerfSummary({
    trigger: "toolbar",
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
    operation: "translate",
    inputChars: 1200,
    contextType: "selection",
    timing: {
      triggerAt: 1000,
      floatingShownAt: 1040,
      backgroundReceivedAt: 1125,
      providerRequestStartedAt: 1300,
      firstChunkAt: 1900,
      doneAt: 2600
    },
    errorCategory: "none"
  })

  assert.deepEqual(Object.keys(summary), [
    "trigger",
    "provider",
    "model_or_endpoint",
    "operation",
    "input_size_bucket",
    "context_type",
    "t_ui_visible_ms",
    "t_background_received_ms",
    "t_provider_start_ms",
    "t_first_chunk_ms",
    "t_done_ms",
    "error_category"
  ])
  assert.deepEqual(summary, {
    trigger: "toolbar",
    provider: "openai",
    model_or_endpoint: "gpt-4o-mini",
    operation: "translate",
    input_size_bucket: "501-2000",
    context_type: "selection",
    t_ui_visible_ms: 40,
    t_background_received_ms: 125,
    t_provider_start_ms: 300,
    t_first_chunk_ms: 900,
    t_done_ms: 1600,
    error_category: "none"
  })
})

test("hosted first request perf summary separates local and provider timing", () => {
  const summary = buildHostedFirstRequestPerfSummary({
    reason: "session_written",
    trigger: "inline-translation",
    operation: "translate",
    inputChars: 320,
    contextType: "selection",
    timing: {
      triggerAt: 1000,
      aiRequestSentAt: 1050,
      hostedWarmupStartedAt: 1010,
      hostedWarmupDoneAt: 1060,
      hostedRouteResolutionStartedAt: 1060,
      hostedRouteResolvedAt: 1085,
      providerRequestStartedAt: 1120,
      firstChunkAt: 1700,
      doneAt: 2100
    },
    errorCategory: "none"
  })

  assert.deepEqual(summary, {
    metric: "hosted_first_request",
    reason: "session_written",
    trigger: "inline-translation",
    operation: "translate",
    input_size_bucket: "0-500",
    context_type: "selection",
    hosted_first_request_ttft_ms: 700,
    hosted_first_request_total_ms: 1100,
    hosted_first_request_error_ms: null,
    hosted_warmup_ms: 50,
    hosted_route_resolution_ms: 25,
    hosted_frontend_to_chat_request_ms: 120,
    hosted_network_provider_ttft_ms: 580,
    error_category: "none"
  })
})

test("selection TTFT dogfood rows only keep approved summary fields and aggregate cold provider samples", () => {
  const summaries = [
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "translate",
      inputChars: 240,
      contextType: "selection",
      timing: {
        triggerAt: 1000,
        floatingShownAt: 1020,
        providerRequestStartedAt: 1080,
        firstChunkAt: 1800,
        doneAt: 2300
      },
      errorCategory: "none"
    }),
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "translate",
      inputChars: 260,
      contextType: "selection",
      timing: {
        triggerAt: 2000,
        floatingShownAt: 2020,
        providerRequestStartedAt: 2070,
        firstChunkAt: 3200,
        doneAt: 3600
      },
      errorCategory: "none"
    }),
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "explain",
      inputChars: 300,
      contextType: "selection",
      timing: {
        triggerAt: 3000,
        floatingShownAt: 3020,
        providerRequestStartedAt: 3070,
        firstChunkAt: 4700,
        doneAt: 5000
      },
      errorCategory: "none"
    }),
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "translate",
      inputChars: 220,
      contextType: "selection",
      timing: {
        triggerAt: 4000,
        floatingShownAt: 4010
      },
      errorCategory: "missing_first_chunk"
    }),
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "translate",
      inputChars: 210,
      contextType: "selection",
      timing: {
        triggerAt: 4500,
        floatingShownAt: 4510,
        firstChunkAt: 4520,
        doneAt: 4530
      },
      errorCategory: "none"
    }),
    buildPerfSummary({
      trigger: "toolbar",
      provider: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      operation: "summarize",
      inputChars: 220,
      contextType: "page_summary",
      timing: {
        triggerAt: 5000,
        providerRequestStartedAt: 5020,
        firstChunkAt: 5400
      },
      errorCategory: "none"
    })
  ]
  const row = buildSelectionTtftDogfoodRow(summaries[0])

  assert.deepEqual(Object.keys(row ?? {}), [
    "provider",
    "model_or_endpoint",
    "operation",
    "input_size_bucket",
    "t_ui_visible_ms",
    "t_provider_start_ms",
    "t_first_chunk_ms",
    "t_done_ms",
    "error_category"
  ])
  assert.deepEqual(row, {
    provider: "doubao",
    model_or_endpoint: "doubao-seed-1-6-thinking",
    operation: "selection_translate",
    input_size_bucket: "0-500",
    t_ui_visible_ms: 20,
    t_provider_start_ms: 80,
    t_first_chunk_ms: 800,
    t_done_ms: 1300,
    error_category: "none"
  })
  assert.equal(buildSelectionTtftDogfoodRow(summaries[5]), null)

  assert.deepEqual(buildSelectionTtftAggregate(summaries), {
    operation: "selection_all",
    sample_count: 3,
    p50_first_chunk_ms: 1200,
    p95_first_chunk_ms: 1700,
    excluded_count: 2
  })
  assert.deepEqual(
    buildSelectionTtftAggregate(summaries, "selection_translate"),
    {
      operation: "selection_translate",
      sample_count: 2,
      p50_first_chunk_ms: 800,
      p95_first_chunk_ms: 1200,
      excluded_count: 2
    }
  )
})

test("perf summary 对未完成 timing 兼容并标记缺失阶段", () => {
  const firstChunkMissing = buildPerfSummary({
    trigger: "command-palette",
    provider: "doubao",
    modelOrEndpoint: "doubao-seed-2-0-lite-260428",
    inputChars: 80,
    contextType: "command",
    timing: {
      triggerAt: 10,
      backgroundReceivedAt: 20,
      providerRequestStartedAt: 30,
      doneAt: 100
    },
    errorCategory: "missing_first_chunk"
  })

  const doneMissing = buildPerfSummary({
    trigger: "context-menu",
    provider: "anthropic",
    modelOrEndpoint: "claude-haiku-4-5-20251001",
    inputChars: 7000,
    contextType: "page_summary",
    timing: {
      triggerAt: 10,
      floatingShownAt: 10,
      backgroundReceivedAt: 20,
      providerRequestStartedAt: 30,
      firstChunkAt: 60
    },
    errorCategory: "missing_done"
  })

  assert.equal(firstChunkMissing.t_first_chunk_ms, null)
  assert.equal(firstChunkMissing.error_category, "missing_first_chunk")
  assert.equal(doneMissing.t_done_ms, null)
  assert.equal(doneMissing.input_size_bucket, "5001+")
  assert.equal(doneMissing.error_category, "missing_done")
})

test("perf summary 脱敏兜底不输出 URL、base64 或未知 provider", () => {
  const summary = buildPerfSummary({
    trigger: "https://private.example.com/path?token=secret",
    provider: "https://api.example.com",
    modelOrEndpoint: "https://api.example.com/model?key=secret",
    inputChars: 42,
    contextType: "image_explain",
    timing: {},
    errorCategory: "unknown_error"
  })

  assert.equal(summary.trigger, "unknown")
  assert.equal(summary.provider, "unknown")
  assert.equal(summary.model_or_endpoint, "redacted_endpoint")
  assert.equal(JSON.stringify(summary).includes("private.example.com"), false)
  assert.equal(JSON.stringify(summary).includes("secret"), false)
})

test("perf summary accepts approved v0.2 provider ids without payload details", () => {
  for (const [provider, modelOrEndpoint] of [
    ["deepseek", "deepseek-chat"],
    ["gemini", "gemini-2.5-flash"],
    ["hunyuan", "hunyuan-lite"]
  ] as const) {
    const summary = buildPerfSummary({
      trigger: "toolbar",
      provider,
      modelOrEndpoint,
      inputChars: 123,
      contextType: "selection",
      timing: {
        triggerAt: 1000,
        floatingShownAt: 1005,
        providerRequestStartedAt: 1100,
        firstChunkAt: 1450,
        doneAt: 1800
      },
      errorCategory: "none"
    })

    assert.equal(summary.provider, provider)
    assert.equal(summary.model_or_endpoint, modelOrEndpoint)
    assert.equal(summary.input_size_bucket, "0-500")
    assert.equal(JSON.stringify(summary).includes("selectionText"), false)
    assert.equal(JSON.stringify(summary).includes("rawPrompt"), false)
    assert.equal(JSON.stringify(summary).includes("rawResponse"), false)
  }
})

test("perf summary accepts OpenRouter provider id without payload details", () => {
  const summary = buildPerfSummary({
    trigger: "toolbar",
    provider: "openrouter",
    modelOrEndpoint: "openai/gpt-4o-mini",
    inputChars: 123,
    contextType: "selection",
    timing: {
      triggerAt: 1000,
      floatingShownAt: 1005,
      providerRequestStartedAt: 1100,
      firstChunkAt: 1450,
      doneAt: 1800
    },
    errorCategory: "none"
  })

  assert.equal(summary.provider, "openrouter")
  assert.equal(summary.model_or_endpoint, "openai/gpt-4o-mini")
  assert.equal(JSON.stringify(summary).includes("selectionText"), false)
  assert.equal(JSON.stringify(summary).includes("rawPrompt"), false)
  assert.equal(JSON.stringify(summary).includes("rawResponse"), false)
})

test("perf summary accepts Gemini and Hunyuan provider ids without payload details", () => {
  for (const provider of ["gemini", "hunyuan"] as const) {
    const summary = buildPerfSummary({
      trigger: "toolbar",
      provider,
      modelOrEndpoint:
        provider === "gemini" ? "gemini-2.5-flash" : "hunyuan-lite",
      inputChars: 123,
      contextType: "selection",
      timing: {
        triggerAt: 1000,
        floatingShownAt: 1005,
        providerRequestStartedAt: 1100,
        firstChunkAt: 1450,
        doneAt: 1800
      },
      errorCategory: "none"
    })

    assert.equal(summary.provider, provider)
    assert.equal(JSON.stringify(summary).includes("selectionText"), false)
    assert.equal(JSON.stringify(summary).includes("rawPrompt"), false)
    assert.equal(JSON.stringify(summary).includes("rawResponse"), false)
  }
})

test("perf 错误分类覆盖 key、限流、网络、超时和 provider 错误", () => {
  assert.equal(
    categorizePerfError(new Error("OpenAI API Key 未配置")),
    "api_key_missing"
  )
  assert.equal(categorizePerfError({ status: 401 }), "unauthorized")
  assert.equal(categorizePerfError({ status: 429 }), "rate_limited")
  assert.equal(categorizePerfError(new Error("fetch failed")), "network_error")
  assert.equal(categorizePerfError(new Error("timeout")), "timeout")
  assert.equal(categorizePerfError({ status: 503 }), "provider_error")
  const abortError = new Error("user_cancelled")
  abortError.name = "AbortError"
  assert.equal(categorizePerfError(abortError), "user_cancelled")
})

test("screenshot region 归一化并过滤过小区域", () => {
  assert.deepEqual(normalizeScreenshotRegion(120, 90, 20, 10, 300, 200), {
    x: 20,
    y: 10,
    width: 100,
    height: 80
  })
  assert.deepEqual(normalizeScreenshotRegion(-10, -10, 400, 240, 300, 200), {
    x: 0,
    y: 0,
    width: 300,
    height: 200
  })
  assert.equal(normalizeScreenshotRegion(10, 10, 18, 18, 300, 200), null)
})

test("screenshot toolbar 贴近选区底部居中并夹取到视口内", () => {
  assert.deepEqual(
    clampScreenshotToolbarPosition(
      { x: 200, y: 100, width: 300, height: 120 },
      { width: 900, height: 700 },
      { width: 240, height: 72 }
    ),
    { left: 230, top: 230 }
  )

  assert.deepEqual(
    clampScreenshotToolbarPosition(
      { x: 720, y: 620, width: 120, height: 60 },
      { width: 800, height: 700 },
      { width: 240, height: 72 }
    ),
    { left: 548, top: 538 }
  )

  assert.deepEqual(
    clampScreenshotToolbarPosition(
      { x: 280, y: 410, width: 300, height: 220 },
      { width: 900, height: 700 },
      { width: 240, height: 72 }
    ),
    { left: 310, top: 548 }
  )
})

test("screenshot selected region stays transparent", () => {
  const screenshotSource = readFileSync(
    new URL("../src/contents/screenshot.tsx", import.meta.url),
    "utf8"
  )

  assert.match(screenshotSource, /session\.root\.style\.background = hasRegion/)
  assert.match(screenshotSource, /hasRegion\s+\?\s+"transparent"/)
  assert.match(screenshotSource, /background: "transparent"/)
  assert.doesNotMatch(screenshotSource, /background: ui\.accentSoft/)
})

test("screenshot capture permission error uses readable file-page guidance", () => {
  const message = normalizeScreenshotCaptureError(
    new Error("Either the '<all_urls>' or 'activeTab' permission is required."),
    "file:///tmp/qa.html"
  )

  assert.match(message, /本地文件页面没有截图权限/)
  assert.match(message, /允许访问文件网址/)
  assert.doesNotMatch(message, /<all_urls>|activeTab|permission is required/i)
})

test("screenshot data URL 只识别常见位图并输出大小分桶", () => {
  assert.equal(
    isSupportedScreenshotDataUrl("data:image/png;base64,QUJDRA=="),
    true
  )
  assert.equal(
    isSupportedScreenshotDataUrl("data:image/svg+xml;base64,PHN2Zy8+"),
    false
  )
  assert.equal(
    bucketScreenshotDataUrl("data:image/png;base64," + "A".repeat(100)),
    "0-250kb"
  )
  assert.equal(
    bucketScreenshotDataUrl("data:image/png;base64," + "A".repeat(400_000)),
    "250kb-1mb"
  )
})

test("screenshot vision gate 拦截 model-dependent 豆包截图路线", () => {
  const openaiRoute = resolveModelRoute("gpt-4o-mini", {})
  const doubaoRoute = resolveModelRoute("doubao", {
    doubaoModel: "doubao-seed-2-0-lite-260428"
  })

  assert.equal(getScreenshotVisionBlockReason(openaiRoute), null)
  assert.match(
    getScreenshotVisionBlockReason(doubaoRoute) ?? "",
    /尚未验证截图理解/
  )
})

test("model-dependent providers block remote image explain before provider calls", () => {
  const openaiRoute = resolveModelRoute("gpt-4o-mini", {})
  const payload = {
    operation: "image_explain",
    imageSource: "remote-image",
    srcUrl: "https://example.com/image.png"
  } as const

  assert.equal(getImageInputBlockReason(payload, openaiRoute), null)

  for (const provider of [
    "deepseek",
    "moonshot",
    "openrouter",
    "gemini",
    "hunyuan"
  ] as const) {
    const route = buildProviderConfigRoute({
      id: `cfg-${provider}`,
      provider,
      displayName: PROVIDER_REGISTRY[provider].displayName,
      model:
        provider === "deepseek"
          ? "deepseek-chat"
          : provider === "moonshot"
            ? "moonshot-v1-8k"
            : provider === "openrouter"
              ? "openai/gpt-4o-mini"
              : provider === "gemini"
                ? "gemini-2.5-flash"
                : "hunyuan-lite",
      createdAt: 100,
      updatedAt: 100
    })

    assert.match(
      getImageInputBlockReason(payload, route) ?? "",
      /尚未验证图片理解/
    )
  }
})

test("perf summary 允许 screenshot trigger 且支持图片输入错误分类", () => {
  const summary = buildPerfSummary({
    trigger: "screenshot",
    provider: "doubao",
    modelOrEndpoint: "doubao-seed-2-0-lite-260428",
    inputChars: 9000,
    contextType: "image_explain",
    timing: {
      triggerAt: 10,
      screenshotCaptureStartedAt: 20,
      screenshotCaptureReadyAt: 40,
      screenshotCropReadyAt: 55
    },
    errorCategory: "unsupported_image_input"
  })

  assert.equal(summary.trigger, "screenshot")
  assert.equal(summary.input_size_bucket, "5001+")
  assert.equal(summary.error_category, "unsupported_image_input")
})
