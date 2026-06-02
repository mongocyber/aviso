import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  detectType,
  isSensitive,
  isSensitiveDomain
} from "../src/utils/clipboard-detect.ts"
import { normalizeError } from "../src/utils/errors.ts"
import {
  DEFAULT_FOLLOW_UP_CONTEXT_BUDGET,
  buildFollowUpPriorContext
} from "../src/utils/follow-up-context.ts"
import {
  parseSupportedImageSrc,
  UNSUPPORTED_IMAGE_SRC_MESSAGE
} from "../src/utils/image-src.ts"
import { parseIntentLocally, parseUserIntent } from "../src/utils/intent.ts"
import {
  APPROVED_PROVIDER_HOST_PERMISSIONS,
  DEFAULT_MODEL_ID,
  DOUBAO_BASE_URL,
  MODEL_REGISTRY,
  PROVIDER_REGISTRY,
  resolveModelRoute
} from "../src/utils/model-registry.ts"
import {
  formatCurrentContext,
  MAX_PAGE_CONTENT_CHARS,
  truncatePageContent
} from "../src/utils/page-content.ts"
import {
  buildConnectivityTestPayload,
  buildConnectivityValidationSummary,
  categorizeConnectivityError,
  CONNECTIVITY_TEST_PROMPT,
  getConnectivityModelId,
  hasPrivateContextPayload,
  isProviderHostPermissionPresent
} from "../src/utils/provider-connectivity.ts"
import {
  bucketScreenshotDataUrl,
  getScreenshotVisionBlockReason,
  isSupportedScreenshotDataUrl,
  normalizeScreenshotRegion
} from "../src/utils/screenshot.ts"
import {
  SLOW_FIRST_CHUNK_MS,
  shouldShowSlowResponseHint
} from "../src/utils/response-guard.ts"
import { expandTemplate } from "../src/utils/template.ts"
import {
  bucketInputSize,
  buildPerfSummary,
  categorizePerfError
} from "../src/utils/timing.ts"

test("detectType 识别 URL", () => {
  assert.equal(detectType("https://example.com/path?q=1"), "url")
})

test("detectType 识别多行代码", () => {
  assert.equal(detectType("function f() {\n  return 1;\n}"), "code")
})

test("detectType 识别中文", () => {
  assert.equal(detectType("这是一段中文文本"), "chinese")
})

test("detectType 识别英文", () => {
  assert.equal(detectType("Hello world"), "english")
})

test("detectType 纯符号归为 other", () => {
  assert.equal(detectType("123 456 789"), "other")
})

test("isSensitive 命中手机号/身份证/密码/token", () => {
  assert.equal(isSensitive("我的手机是 13800138000"), true)
  assert.equal(isSensitive("11010119900307391X"), true)
  assert.equal(isSensitive("password: hunter2"), true)
  assert.equal(isSensitive("token=abcdefghijklmnopqrstuvwxyz123"), true)
})

test("isSensitive 放行普通文本", () => {
  assert.equal(isSensitive("今天天气不错，适合写代码"), false)
})

test("isSensitiveDomain 命中银行/支付域名", () => {
  assert.equal(isSensitiveDomain("https://bank.example.com"), true)
  assert.equal(isSensitiveDomain("https://www.alipay.com/x"), true)
  assert.equal(isSensitiveDomain("https://news.example.com"), false)
})

test("expandTemplate 替换 selection/url/page", () => {
  const out = expandTemplate(
    "翻译：{{selection}}（来源 {{url}}）正文 {{page}}",
    { selection: "hello", url: "http://a.com", page: "正文内容" }
  )
  assert.equal(out, "翻译：hello（来源 http://a.com）正文 正文内容")
})

test("expandTemplate 缺失变量替换为空串且大小写/空格不敏感", () => {
  const out = expandTemplate("X{{ SELECTION }}Y{{url}}", {})
  assert.equal(out, "XY")
})

test("normalizeError 401 与无效 key 文案", () => {
  assert.match(normalizeError({ status: 401 }), /API Key 无效/)
  assert.match(normalizeError(new Error("Invalid API key")), /API Key 无效/)
})

test("normalizeError 限流与网络", () => {
  assert.match(normalizeError({ status: 429 }), /频繁|额度/)
  assert.match(normalizeError(new Error("fetch failed")), /网络/)
})

test("normalizeError 透传未知错误原文", () => {
  assert.equal(normalizeError(new Error("something odd")), "something odd")
})

test("normalizeError 隐藏无效 image_url 底层错误", () => {
  assert.equal(
    normalizeError(new Error("400 Invalid base64 image_url")),
    UNSUPPORTED_IMAGE_SRC_MESSAGE
  )
})

test("normalizeError 隐藏远程图片下载失败的底层 URL", () => {
  const out = normalizeError(
    new Error(
      "400 Timeout while downloading url: https://miro.medium.com/v2/image.jpeg Request id: abc"
    )
  )

  assert.match(out, /模型无法读取这张网页图片/)
  assert.doesNotMatch(
    out,
    /miro\.medium\.com|Request id|Timeout while downloading/i
  )
})

test("parseSupportedImageSrc 放行 http/https 图片来源", () => {
  assert.deepEqual(parseSupportedImageSrc("https://example.com/a.png"), {
    kind: "remote",
    url: "https://example.com/a.png"
  })
  assert.deepEqual(parseSupportedImageSrc("http://example.com/a.webp"), {
    kind: "remote",
    url: "http://example.com/a.webp"
  })
})

test("parseSupportedImageSrc 放行 PNG/JPEG/WebP base64 data URL", () => {
  assert.deepEqual(
    parseSupportedImageSrc("data:image/png;base64,iVBORw0KGgo="),
    {
      kind: "base64",
      url: "data:image/png;base64,iVBORw0KGgo=",
      mediaType: "image/png",
      data: "iVBORw0KGgo="
    }
  )
  assert.equal(
    parseSupportedImageSrc("data:image/jpeg;base64,/9j/")?.mediaType,
    "image/jpeg"
  )
  assert.equal(
    parseSupportedImageSrc("data:image/webp;base64,UklGRgAAAABXRUJQ")
      ?.mediaType,
    "image/webp"
  )
})

test("parseSupportedImageSrc 拦截 SVG/blob/file/chrome-extension 和无效 base64", () => {
  assert.equal(parseSupportedImageSrc("data:image/svg+xml,%3Csvg%3E"), null)
  assert.equal(parseSupportedImageSrc("blob:https://example.com/abc"), null)
  assert.equal(parseSupportedImageSrc("file:///tmp/a.png"), null)
  assert.equal(parseSupportedImageSrc("chrome-extension://id/a.png"), null)
  assert.equal(parseSupportedImageSrc("data:image/png;base64,not base64"), null)
  assert.equal(parseSupportedImageSrc("data:image/png;base64,aGVsbG8="), null)
})

test("parseIntentLocally 识别常见中文命令", () => {
  assert.equal(parseIntentLocally("翻译 hello world").action, "translate")
  assert.equal(parseIntentLocally("总结这篇文章").action, "summarize")
  assert.equal(parseIntentLocally("润色 这句话").action, "polish")
  assert.equal(parseIntentLocally("解释 Transformer").action, "explain")
})

test("parseIntentLocally 识别搜索和导航命令", () => {
  assert.deepEqual(parseIntentLocally("打开 github.com"), {
    action: "navigate",
    target: "github.com",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("search plasmo extension"), {
    action: "search",
    target: "plasmo extension",
    params: {}
  })
})

test("parseIntentLocally 未命中时降级为搜索", () => {
  assert.deepEqual(parseIntentLocally("Aviso 为什么回复慢"), {
    action: "search",
    target: "Aviso 为什么回复慢",
    params: {}
  })
})

test("parseUserIntent 使用本地解析，不依赖 background 模型请求", async () => {
  assert.deepEqual(await parseUserIntent("翻译 hello"), {
    action: "translate",
    target: "hello",
    params: {}
  })
})

test("truncatePageContent 保守截断长正文", () => {
  const longText = "x".repeat(MAX_PAGE_CONTENT_CHARS + 100)
  const out = truncatePageContent(longText)

  assert.match(out, /正文过长已截断/)
  assert.ok(out.length < longText.length)
  assert.ok(out.startsWith("x".repeat(100)))
})

test("formatCurrentContext 输出可粘贴的结构化上下文", () => {
  const out = formatCurrentContext({
    title: "Example Page",
    url: "https://example.com/article",
    selectionText: "selected paragraph",
    pageContent: "main article body"
  })

  assert.equal(
    out,
    [
      "# 当前页面上下文",
      "",
      "标题：Example Page",
      "URL：https://example.com/article",
      "",
      "## 选中文本",
      "selected paragraph",
      "",
      "## 页面正文",
      "main article body"
    ].join("\n")
  )
})

test("formatCurrentContext 对长正文明确截断", () => {
  const out = formatCurrentContext({
    title: "Long Page",
    url: "https://example.com/long",
    pageContent: "x".repeat(12),
    maxPageContentChars: 8
  })

  assert.match(out, /## 页面正文（已截断到 8 字符）/)
  assert.match(out, /正文过长已截断/)
})

test("formatCurrentContext 缺失字段使用可读兜底且不输出空选区", () => {
  const out = formatCurrentContext({
    title: "",
    url: "",
    selectionText: "  ",
    pageContent: ""
  })

  assert.match(out, /标题：未命名页面/)
  assert.match(out, /URL：未知 URL/)
  assert.match(out, /未能读取页面正文。/)
  assert.doesNotMatch(out, /## 选中文本/)
})

test("model registry 仅覆盖当前批准的三类 provider", () => {
  assert.deepEqual(Object.keys(PROVIDER_REGISTRY).sort(), [
    "anthropic",
    "doubao",
    "openai"
  ])
  assert.deepEqual(Object.keys(MODEL_REGISTRY).sort(), [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "doubao",
    "gpt-4o",
    "gpt-4o-mini"
  ])
  assert.equal(
    PROVIDER_REGISTRY.openai.hostPermission,
    "https://api.openai.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.anthropic.hostPermission,
    "https://api.anthropic.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.doubao.hostPermission,
    "https://ark.cn-beijing.volces.com/*"
  )
})

test("resolveModelRoute 默认回到 gpt-4o-mini / OpenAI", () => {
  const route = resolveModelRoute(undefined, {})

  assert.equal(route.selectedModel, DEFAULT_MODEL_ID)
  assert.equal(route.requestModel, DEFAULT_MODEL_ID)
  assert.equal(route.provider.id, "openai")
  assert.equal(route.isFallback, false)
})

test("resolveModelRoute 保持 claude 与未知模型兼容路由", () => {
  const claudeRoute = resolveModelRoute("claude-custom-test", {})
  const openaiRoute = resolveModelRoute("gpt-4.1-mini", {})

  assert.equal(claudeRoute.provider.id, "anthropic")
  assert.equal(claudeRoute.requestModel, "claude-custom-test")
  assert.equal(claudeRoute.isFallback, true)
  assert.equal(openaiRoute.provider.id, "openai")
  assert.equal(openaiRoute.requestModel, "gpt-4.1-mini")
  assert.equal(openaiRoute.isFallback, true)
})

test("resolveModelRoute 将 doubao 路由到 Ark OpenAI-compatible endpoint", () => {
  const configured = resolveModelRoute("doubao", {
    doubaoModel: " ep-2026-test "
  })
  const missing = resolveModelRoute("doubao", {})

  assert.equal(configured.provider.id, "doubao")
  assert.equal(configured.provider.sdk, "openai-compatible")
  assert.equal(configured.provider.baseURL, DOUBAO_BASE_URL)
  assert.equal(configured.requestModel, "ep-2026-test")
  assert.equal(configured.missingConfig, undefined)
  assert.equal(missing.missingConfig, "doubaoModel")
})

test("package host_permissions 精确匹配批准 provider 边界", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual(
    [...pkg.manifest.host_permissions].sort(),
    [...APPROVED_PROVIDER_HOST_PERMISSIONS].sort()
  )
})

test("package 普通权限保持最小边界且包含 clipboardWrite", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual([...pkg.manifest.permissions].sort(), [
    "activeTab",
    "bookmarks",
    "clipboardWrite",
    "contextMenus",
    "storage"
  ])
})

test("connectivity test payload 只包含固定公开短句，不带页面私有上下文", () => {
  const payload = buildConnectivityTestPayload()

  assert.equal(payload.userMessage, CONNECTIVITY_TEST_PROMPT)
  assert.equal(hasPrivateContextPayload(payload), false)
  assert.equal(payload.selectionText, undefined)
  assert.equal(payload.priorContext, undefined)
  assert.equal(payload.pageContent, undefined)
  assert.equal(payload.srcUrl, undefined)
  assert.equal(payload.pageUrl, undefined)
})

test("connectivity 私有上下文检查覆盖追问 priorContext", () => {
  assert.equal(
    hasPrivateContextPayload({
      operation: "custom",
      userMessage: CONNECTIVITY_TEST_PROMPT,
      priorContext: "用户：上一轮私有上下文"
    }),
    true
  )
})

test("follow-up 上下文只保留最近消息并限制片段长度", () => {
  const longAssistant = "a".repeat(
    DEFAULT_FOLLOW_UP_CONTEXT_BUDGET.maxAssistantChars + 200
  )
  const context = buildFollowUpPriorContext([
    { role: "user", content: "旧问题" },
    { role: "assistant", content: "旧回答" },
    { role: "user", content: "最近问题一" },
    { role: "assistant", content: longAssistant },
    { role: "user", content: "最近问题二" },
    { role: "assistant", content: "最近回答二" }
  ])

  assert.match(context, /最近问题一/)
  assert.match(context, /最近回答二/)
  assert.doesNotMatch(context, /旧问题|旧回答/)
  assert.match(context, /已截断/)
  assert.ok(
    context.length <=
      DEFAULT_FOLLOW_UP_CONTEXT_BUDGET.maxTotalChars +
        "以下是最近对话节选（已按长度裁剪）：\n".length
  )
})

test("follow-up 上下文空消息不产生 priorContext", () => {
  assert.equal(
    buildFollowUpPriorContext([
      { role: "user", content: " " },
      { role: "assistant", content: "" }
    ]),
    ""
  )
})

test("慢响应提示只在等待且首段未返回超过阈值时出现", () => {
  assert.equal(
    shouldShowSlowResponseHint({
      loading: true,
      hasFirstChunk: false,
      elapsedMs: SLOW_FIRST_CHUNK_MS
    }),
    true
  )
  assert.equal(
    shouldShowSlowResponseHint({
      loading: true,
      hasFirstChunk: true,
      elapsedMs: SLOW_FIRST_CHUNK_MS + 1
    }),
    false
  )
  assert.equal(
    shouldShowSlowResponseHint({
      loading: false,
      hasFirstChunk: false,
      elapsedMs: SLOW_FIRST_CHUNK_MS + 1
    }),
    false
  )
})

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

test("perf summary 字段固定且按 trigger 计算阶段耗时", () => {
  const summary = buildPerfSummary({
    trigger: "toolbar",
    provider: "openai",
    modelOrEndpoint: "gpt-4o-mini",
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
