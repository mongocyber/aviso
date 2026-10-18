import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { validateBackgroundMessageBoundary } from "../src/background/message-boundary.ts"
import {
  detectType,
  isSensitive,
  isSensitiveDomain
} from "../src/utils/clipboard-detect.ts"
import {
  getTemplateParentMenuContexts,
  normalizeTemplateMenuContexts
} from "../src/utils/context-menu-templates.ts"
import {
  buildSafeErrorLog,
  EMPTY_PROVIDER_ANSWER_ERROR,
  normalizeError,
  OUTPUT_BUDGET_EXHAUSTED_ERROR
} from "../src/utils/errors.ts"
import {
  MAX_DATA_IMAGE_URL_CHARS,
  parseSupportedImageSrc,
  UNSUPPORTED_IMAGE_SRC_MESSAGE
} from "../src/utils/image-src.ts"
import { parseIntentLocally, parseUserIntent } from "../src/utils/intent.ts"
import {
  formatCurrentContext,
  MAX_PAGE_CONTENT_CHARS,
  truncatePageContent
} from "../src/utils/page-content.ts"
import {
  hasDefaultModelChanged,
  hasUiLanguageChanged,
  haveProviderConfigMenusChanged,
  haveTemplatesChanged
} from "../src/utils/settings-change.ts"
import {
  AI_STREAM_LIMIT_ERROR_MESSAGE,
  AiStreamResourceLimitError,
  limitAsyncIterableStream
} from "../src/utils/stream-limits.ts"
import { expandTemplate } from "../src/utils/template.ts"
import {
  buildTranslationSystemPrompt,
  buildTranslationUserContent,
  createTranslationStreamChunkFilter,
  formatTranslationError,
  formatTranslationUserBubble,
  getInlineTranslationRoute,
  getTranslationNoFirstChunkTimeoutError,
  getTranslationNoFirstChunkWaitingText,
  getTranslationMaxOutputTokens,
  getTranslationSourceText,
  getTranslationTargetLabel,
  INLINE_TRANSLATION_MAX_CHARS,
  INLINE_TRANSLATION_MAX_LINES,
  normalizeTranslationTargetLanguage,
  resolveTranslationTargetLanguageForText,
  sanitizeTranslationPayload,
  sanitizeTranslationOutputText,
  TRANSLATION_EMPTY_INPUT_ERROR,
  TRANSLATION_NO_FIRST_CHUNK_NOTICE_MS,
  TRANSLATION_NO_FIRST_CHUNK_TIMEOUT_MS,
  TRANSLATION_SYSTEM_PROMPT,
  TRANSLATION_WAITING_TEXT
} from "../src/utils/translation.ts"
import { isBlockedBrowserOpenUrlInput } from "../src/utils/url-safety.ts"
import "./helpers/register-aliases.ts"

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

test("popup template edit replaces the current card instead of adding a second form", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(
    popupSource,
    /const renderTemplateForm = \(formDraft: PromptTemplate, key\?: string\)/
  )
  assert.match(
    popupSource,
    /settings\.templates\.map\(\(template\) =>\s+draft\?\.id === template\.id \? \(\s+renderTemplateForm\(draft, template\.id\)/s
  )
  assert.match(
    popupSource,
    /draft && !settings\.templates\.some\(\(t\) => t\.id === draft\.id\) \? \(\s+renderTemplateForm\(draft\)/s
  )
})

test("settings change detects template add edit delete for context menu refresh", () => {
  const template = {
    id: "tpl-oriental-hotel",
    name: "东方饭店",
    prompt: "按东方饭店口吻改写：{{selection}}",
    contexts: ["selection"]
  }

  assert.equal(
    haveTemplatesChanged({ templates: [] }, { templates: [template] }),
    true
  )
  assert.equal(
    haveTemplatesChanged(
      { templates: [template] },
      { templates: [{ ...template, name: "东方饭店新版" }] }
    ),
    true
  )
  assert.equal(
    haveTemplatesChanged({ templates: [template] }, { templates: [] }),
    true
  )
})

test("settings change keeps model radio sync separate from template refresh", () => {
  const templates = [
    {
      id: "tpl-oriental-hotel",
      name: "东方饭店",
      prompt: "{{selection}}",
      contexts: ["selection"]
    }
  ]

  assert.equal(
    haveTemplatesChanged(
      { defaultModel: "gpt-4o-mini", templates },
      { defaultModel: "doubao", templates }
    ),
    false
  )
  assert.equal(
    hasDefaultModelChanged(
      { defaultModel: "gpt-4o-mini", templates },
      { defaultModel: "doubao", templates }
    ),
    true
  )
})

test("settings change detects provider config menu updates", () => {
  const previous = {
    defaultProviderConfigId: "cfg-openai-a",
    providerConfigs: [
      {
        id: "cfg-openai-a",
        provider: "openai" as const,
        displayName: "OpenAI Work",
        model: "gpt-4o-mini",
        createdAt: 1,
        updatedAt: 1
      }
    ]
  }
  const renamed = {
    ...previous,
    providerConfigs: [
      {
        ...previous.providerConfigs[0],
        displayName: "OpenAI Personal"
      }
    ]
  }
  const selected = {
    ...previous,
    defaultProviderConfigId: "cfg-openai-b"
  }

  assert.equal(haveProviderConfigMenusChanged(previous, renamed), true)
  assert.equal(haveProviderConfigMenusChanged(previous, selected), true)
  assert.equal(haveProviderConfigMenusChanged(previous, previous), false)
})

test("template context menu parent only appears where children can appear", () => {
  const selectionTemplate = {
    id: "tpl-selection",
    name: "选区模板",
    prompt: "{{selection}}",
    contexts: ["selection"]
  }
  const pageTemplate = {
    id: "tpl-page",
    name: "页面模板",
    prompt: "{{page}}",
    contexts: ["page"]
  }

  assert.deepEqual(normalizeTemplateMenuContexts(["unknown"]), ["selection"])
  assert.deepEqual(getTemplateParentMenuContexts([selectionTemplate]), [
    "selection"
  ])
  assert.deepEqual(
    getTemplateParentMenuContexts([selectionTemplate, pageTemplate]),
    ["selection", "page"]
  )
})

test("normalizeError 401 与无效 key 文案", () => {
  assert.match(normalizeError({ status: 401 }), /API Key 无效/)
  assert.match(normalizeError(new Error("Invalid API key")), /API Key 无效/)
})

test("normalizeError 限流与网络", () => {
  assert.match(normalizeError({ status: 429 }), /频繁|额度/)
  assert.match(normalizeError(new Error("fetch failed")), /网络/)
})

test("normalizeError 不透传未知错误原文", () => {
  assert.equal(
    normalizeError(new Error("something odd")),
    "请求失败，请稍后再试。"
  )
})

test("normalizeError 保留空回答安全提示", () => {
  assert.equal(
    normalizeError(new Error(EMPTY_PROVIDER_ANSWER_ERROR)),
    EMPTY_PROVIDER_ANSWER_ERROR
  )
  assert.equal(
    normalizeError(new Error(OUTPUT_BUDGET_EXHAUSTED_ERROR)),
    OUTPUT_BUDGET_EXHAUSTED_ERROR
  )
})

test("normalizeError 和安全日志摘要不泄漏 provider raw error body", () => {
  const sensitiveMessage = [
    "Provider 500 raw body",
    "https://private.example.com/path?token=abc",
    "sk-test-raw-provider-token-123456",
    '{"error":{"message":"customer private draft"}}',
    "客户并购计划草稿"
  ].join(" ")
  const err = Object.assign(new Error(sensitiveMessage), { status: 500 })
  const normalized = normalizeError(err)
  const logSummary = buildSafeErrorLog(err)
  const serializedLog = JSON.stringify(logSummary)

  assert.equal(normalized, "AI 服务返回错误，请稍后再试或检查设置。")
  assert.deepEqual(logSummary, {
    category: "provider_error",
    status: 500
  })

  for (const sensitiveFragment of [
    "private.example.com",
    "token=abc",
    "sk-test-raw-provider-token",
    "customer private draft",
    "客户并购计划草稿",
    "raw body"
  ]) {
    assert.equal(normalized.includes(sensitiveFragment), false)
    assert.equal(serializedLog.includes(sensitiveFragment), false)
  }
})

test("background global error logging uses safe error summaries", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(backgroundSource, /buildSafeErrorLog\(err\)/)
  assert.match(backgroundSource, /const error = normalizeError\(err\)/)
  assert.match(backgroundSource, /validateBackgroundMessageBoundary/)
  assert.match(backgroundSource, /error: "Unknown action"/)
  assert.doesNotMatch(backgroundSource, /Unknown action: \$\{/)
  assert.doesNotMatch(
    backgroundSource,
    /err instanceof Error \? err\.message : String\(err\)/
  )
  assert.doesNotMatch(
    backgroundSource,
    /console\.error\("\[Aviso\] Unhandled error in message handler:", error\)/
  )
})

test("background message boundary validates sender id, frame and action policy", () => {
  const previousChrome = (globalThis as any).chrome
  ;(globalThis as any).chrome = { runtime: { id: "aviso-extension-id" } }

  const topFrameSender = {
    id: "aviso-extension-id",
    tab: {
      id: 42,
      url: "https://private.example.com/path?token=abc"
    },
    frameId: 0,
    url: "https://private.example.com/path?token=abc"
  } as chrome.runtime.MessageSender

  try {
    assert.deepEqual(
      validateBackgroundMessageBoundary(
        {
          action: "AI_REQUEST",
          requestId: "req-test",
          payload: { operation: "translate", selectionText: "hello" }
        },
        topFrameSender
      ),
      { ok: true, action: "AI_REQUEST" }
    )

    assert.deepEqual(
      validateBackgroundMessageBoundary(
        { action: "SEARCH_BROWSER_HISTORY", query: "private note" },
        topFrameSender
      ),
      { ok: true, action: "SEARCH_BROWSER_HISTORY" }
    )

    assert.deepEqual(
      validateBackgroundMessageBoundary(
        { action: "SEARCH_BOOKMARKS", query: "private note" },
        topFrameSender
      ),
      { ok: true, action: "SEARCH_BOOKMARKS" }
    )

    assert.deepEqual(
      validateBackgroundMessageBoundary(
        { action: "GET_HISTORY" },
        { id: "aviso-extension-id" } as chrome.runtime.MessageSender
      ),
      { ok: true, action: "GET_HISTORY" }
    )

    const unknown = validateBackgroundMessageBoundary(
      { action: "https://private.example.com/do-not-log?token=abc" },
      topFrameSender
    )
    assert.equal(unknown.ok, false)
    if (unknown.ok === false) {
      assert.equal(unknown.log.action, "unknown")
      assert.equal(unknown.log.reason, "unknown_action")
      assert.equal(JSON.stringify(unknown).includes("private.example.com"), false)
      assert.equal(JSON.stringify(unknown).includes("token=abc"), false)
    }

    const wrongExtension = validateBackgroundMessageBoundary(
      { action: "AI_REQUEST", requestId: "req-test", payload: {} },
      { ...topFrameSender, id: "other-extension-id" }
    )
    assert.equal(wrongExtension.ok, false)
    if (wrongExtension.ok === false) {
      assert.equal(wrongExtension.log.reason, "wrong_extension_id")
    }

    const subFrameCapture = validateBackgroundMessageBoundary(
      { action: "CAPTURE_VISIBLE_TAB", payload: { requestId: "req-test" } },
      { ...topFrameSender, frameId: 3 }
    )
    assert.equal(subFrameCapture.ok, false)
    if (subFrameCapture.ok === false) {
      assert.equal(subFrameCapture.log.reason, "subframe_not_allowed")
      assert.equal(JSON.stringify(subFrameCapture).includes("private.example.com"), false)
      assert.equal(JSON.stringify(subFrameCapture).includes("token=abc"), false)
    }

    for (const action of [
      "SEARCH_BROWSER_HISTORY",
      "SEARCH_BOOKMARKS"
    ] as const) {
      const subFrameSearch = validateBackgroundMessageBoundary(
        { action, query: "private note" },
        { ...topFrameSender, frameId: 3 }
      )
      assert.equal(subFrameSearch.ok, false)
      if (subFrameSearch.ok === false) {
        assert.equal(subFrameSearch.log.reason, "subframe_not_allowed")
        assert.equal(JSON.stringify(subFrameSearch).includes("private.example.com"), false)
        assert.equal(JSON.stringify(subFrameSearch).includes("token=abc"), false)
      }
    }
  } finally {
    ;(globalThis as any).chrome = previousChrome
  }
})

test("background warning logs outside global handler use safe error summaries", () => {
  const sources = [
    "../src/background/frame-router.ts",
    "../src/background/command-actions.ts",
    "../src/background/context-menus.ts"
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))

  for (const source of sources) {
    assert.match(source, /buildSafeErrorLog/)
    assert.doesNotMatch(
      source,
      /err instanceof Error \? err\.message : String\(err\)/
    )
    assert.doesNotMatch(source, /String\(err\)/)
    assert.doesNotMatch(source, /error:\s*error\.message/)
    assert.doesNotMatch(
      source,
      /console\.(warn|error)\([\s\S]*?(err\.message|String\(err\))/
    )
  }
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

test("parseSupportedImageSrc rejects oversized base64 before decode", () => {
  const previousAtob = globalThis.atob
  let atobCalled = false
  globalThis.atob = ((data: string) => {
    atobCalled = true
    return previousAtob(data)
  }) as typeof atob

  try {
    const tooLargePng = `data:image/png;base64,${"A".repeat(MAX_DATA_IMAGE_URL_CHARS)}`
    assert.equal(parseSupportedImageSrc(tooLargePng), null)
    assert.equal(atobCalled, false)

    const error = normalizeError(new Error(UNSUPPORTED_IMAGE_SRC_MESSAGE))
    assert.equal(error, UNSUPPORTED_IMAGE_SRC_MESSAGE)
    assert.doesNotMatch(error, /data:image|base64|AAAA/)
  } finally {
    globalThis.atob = previousAtob
  }
})

test("parseIntentLocally 识别常见中文命令", () => {
  assert.equal(parseIntentLocally("翻译 hello world").action, "translate")
  assert.equal(parseIntentLocally("总结这篇文章").action, "summarize")
  assert.equal(parseIntentLocally("润色 这句话").action, "polish")
  assert.equal(parseIntentLocally("解释 Transformer").action, "explain")
})

test("parseIntentLocally 翻译命令保留待翻译文本", () => {
  assert.deepEqual(parseIntentLocally("翻译 hello world"), {
    action: "translate",
    target: "hello world",
    params: {}
  })
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

test("parseIntentLocally 识别 command palette 本地意图", () => {
  assert.deepEqual(parseIntentLocally("history aviso"), {
    action: "history_search",
    target: "aviso",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("书签 react"), {
    action: "bookmark_search",
    target: "react",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("在书签里找 YouTube"), {
    action: "bookmark_search",
    target: "YouTube",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("从书签打开 YouTube"), {
    action: "bookmark_search",
    target: "YouTube",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("从历史记录打开 YouTube"), {
    action: "history_search",
    target: "YouTube",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("在历史里找 YouTube"), {
    action: "history_search",
    target: "YouTube",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("打开我的书签"), {
    action: "open_bookmarks",
    target: "打开我的书签",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("打开书签"), {
    action: "open_bookmarks",
    target: "打开书签",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("show my bookmarks"), {
    action: "open_bookmarks",
    target: "show my bookmarks",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("open bookmarks"), {
    action: "open_bookmarks",
    target: "open bookmarks",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("打开历史记录"), {
    action: "open_history",
    target: "打开历史记录",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("浏览历史"), {
    action: "open_history",
    target: "浏览历史",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("open history"), {
    action: "open_history",
    target: "open history",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("show history"), {
    action: "open_history",
    target: "show history",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("帮我打开YouTube"), {
    action: "navigate",
    target: "YouTube",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("打开 javascript:alert(1)"), {
    action: "navigate",
    target: "javascript:alert(1)",
    params: {}
  })
  assert.deepEqual(parseIntentLocally("对话 provider"), {
    action: "conversation_search",
    target: "provider",
    params: {}
  })
  assert.equal(parseIntentLocally("翻译当前页面").action, "translate_page")
  assert.equal(parseIntentLocally("总结这个页面。").action, "summarize_page")
  assert.equal(
    parseIntentLocally("summarize current page").action,
    "summarize_page"
  )
  assert.deepEqual(parseIntentLocally("ask ai what is TTFT"), {
    action: "ask_ai",
    target: "what is TTFT",
    params: {}
  })
})

test("command palette URL safety marks unsafe open inputs", () => {
  assert.equal(isBlockedBrowserOpenUrlInput("javascript:alert(1)"), true)
  assert.equal(isBlockedBrowserOpenUrlInput("data:text/html,hi"), true)
  assert.equal(isBlockedBrowserOpenUrlInput("file:///etc/passwd"), true)
  assert.equal(isBlockedBrowserOpenUrlInput("chrome-extension://id/a.html"), true)
  assert.equal(isBlockedBrowserOpenUrlInput("https://user:pass@example.com"), true)
  assert.equal(isBlockedBrowserOpenUrlInput("https://example.com"), false)
  assert.equal(isBlockedBrowserOpenUrlInput("example.com"), false)
  assert.equal(isBlockedBrowserOpenUrlInput("YouTube"), false)
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

test("translation prompt 只要求输出译文且保留中英互译", () => {
  assert.match(TRANSLATION_SYSTEM_PROMPT, /只输出译文/)
  assert.match(TRANSLATION_SYSTEM_PROMPT, /主要是中文/)
  assert.match(TRANSLATION_SYSTEM_PROMPT, /否则翻译成.*中文/)
  assert.doesNotMatch(TRANSLATION_SYSTEM_PROMPT, /Google|百度|有道|fallback/i)
})

test("translation payload 只使用选区或用户输入，不混入 URL 和页面正文", () => {
  const payload = {
    operation: "translate",
    selectionText: "Hello world",
    userMessage: "翻译 ignored",
    pageUrl: "https://private.example.com/path",
    linkUrl: "https://private.example.com/link",
    pageContent: "private page body"
  }

  assert.equal(getTranslationSourceText(payload), "Hello world")
  assert.equal(
    buildTranslationUserContent(payload),
    "待翻译文本：\nHello world"
  )
  assert.doesNotMatch(
    buildTranslationUserContent(payload),
    /private\.example|private page body/
  )

  const sanitized = sanitizeTranslationPayload(payload)
  assert.equal(sanitized.pageUrl, undefined)
  assert.equal(sanitized.linkUrl, undefined)
  assert.equal(sanitized.pageContent, undefined)
  assert.equal(sanitized.selectionText, "Hello world")
  assert.equal(sanitized.userMessage, undefined)
})

test("translation payload trims user input and removes non-translation context", () => {
  const sanitized = sanitizeTranslationPayload({
    operation: "translate",
    userMessage: "  翻译 this local text  ",
    pageUrl: "https://private.example.com/path",
    linkUrl: "https://private.example.com/link",
    srcUrl: "https://private.example.com/image.png",
    pageContent: "private page body",
    priorContext: "previous private conversation"
  })

  assert.equal(sanitized.selectionText, undefined)
  assert.equal(sanitized.userMessage, "翻译 this local text")
  assert.equal(sanitized.pageUrl, undefined)
  assert.equal(sanitized.linkUrl, undefined)
  assert.equal(sanitized.srcUrl, undefined)
  assert.equal(sanitized.pageContent, undefined)
  assert.equal(sanitized.priorContext, undefined)
})

test("translation display 文案明确翻译状态和失败反馈", () => {
  assert.equal(TRANSLATION_WAITING_TEXT, "正在翻译…")
  assert.equal(TRANSLATION_NO_FIRST_CHUNK_NOTICE_MS, 10_000)
  assert.equal(TRANSLATION_NO_FIRST_CHUNK_TIMEOUT_MS, 30_000)
  assert.equal(
    TRANSLATION_EMPTY_INPUT_ERROR,
    "没有可翻译的文本：请先选中文字，或在命令面板输入“翻译 + 文本”。"
  )
  assert.equal(formatTranslationUserBubble(" hello "), "待翻译文本：\nhello")
  assert.equal(formatTranslationUserBubble("  "), "")
  assert.equal(
    formatTranslationError("API Key 未配置"),
    "翻译失败：API Key 未配置"
  )
  assert.equal(
    formatTranslationError("翻译失败：网络错误"),
    "翻译失败：网络错误"
  )
  assert.equal(
    formatTranslationError("API key missing", "en"),
    "Translation failed: API key missing"
  )
  assert.equal(
    formatTranslationError("Translation failed: network error", "en"),
    "Translation failed: network error"
  )
  assert.match(
    getTranslationNoFirstChunkWaitingText("zh-CN"),
    /继续等待中/
  )
  assert.match(
    getTranslationNoFirstChunkTimeoutError("zh-CN"),
    /更快的 BYOK 模型/
  )
  assert.match(
    getTranslationNoFirstChunkTimeoutError("en"),
    /faster BYOK model/
  )
})

test("translation target language prompt supports explicit targets", () => {
  assert.equal(normalizeTranslationTargetLanguage("bad-value"), "auto")
  assert.equal(getTranslationTargetLabel("en"), "英文")
  assert.equal(buildTranslationSystemPrompt("auto"), TRANSLATION_SYSTEM_PROMPT)
  assert.match(buildTranslationSystemPrompt("en"), /翻译成自然、准确的英文/)
  assert.match(buildTranslationSystemPrompt("ja"), /翻译成自然、准确的日文/)
  assert.equal(
    resolveTranslationTargetLanguageForText(
      "auto",
      "Today we are introducing new ways to work."
    ),
    "zh-CN"
  )
  assert.equal(
    resolveTranslationTargetLanguageForText("auto", "今天我们发布新的工作方式。"),
    "en"
  )
  assert.equal(
    resolveTranslationTargetLanguageForText("fr", "Hello world"),
    "fr"
  )
  assert.doesNotMatch(
    buildTranslationSystemPrompt("fr"),
    /Google|百度|有道|fallback/i
  )
})

test("translation output filter removes model meta reasoning and keeps only translation", () => {
  const source = "这是候选版本，不代表公开上线。"

  assert.equal(
    sanitizeTranslationOutputText(
      [
        "The user wants me to translate the selected text.",
        "Key terms:",
        "- candidate",
        source,
        "译文：이것은 후보 버전이며 공개 출시를 의미하지 않습니다."
      ].join("\n"),
      source
    ),
    "이것은 후보 버전이며 공개 출시를 의미하지 않습니다."
  )

  const filter = createTranslationStreamChunkFilter(source)
  assert.deepEqual(
    filter({ text: "先判断语境。", done: false, kind: "reasoning" }),
    []
  )
  assert.deepEqual(
    filter({
      text: "The user wants me to translate the selected text.\nKey terms:\n- candidate\n",
      done: false
    }),
    []
  )
  assert.deepEqual(
    filter({
      text: "译文：이것은 후보 버전이며",
      done: false
    }),
    [
      {
        text: "이것은 후보 버전이며",
        done: false,
        kind: "answer"
      }
    ]
  )
  assert.deepEqual(
    filter({
      text: " 공개 출시를 의미하지 않습니다.",
      done: true
    }),
    [
      {
        text: " 공개 출시를 의미하지 않습니다.",
        done: false,
        kind: "answer"
      },
      {
        text: "",
        done: true,
        kind: "answer"
      }
    ]
  )
})

test("inline translation routing keeps selected text in the inline card", () => {
  assert.deepEqual(getInlineTranslationRoute(" hello "), {
    route: "inline",
    reason: "short_text"
  })
  assert.deepEqual(getInlineTranslationRoute(""), {
    route: "result-panel",
    reason: "empty"
  })
  assert.deepEqual(
    getInlineTranslationRoute("x".repeat(INLINE_TRANSLATION_MAX_CHARS + 1)),
    {
      route: "inline",
      reason: "too_long"
    }
  )
  assert.deepEqual(
    getInlineTranslationRoute(
      Array(INLINE_TRANSLATION_MAX_LINES + 2)
        .fill("x")
        .join("\n")
    ),
    {
      route: "inline",
      reason: "too_many_lines"
    }
  )
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

test("BYOK async stream guard rejects oversized events and idle reads safely", async () => {
  async function* oversizedStream() {
    yield { text: "small" }
    yield { text: "raw provider payload".repeat(20) }
  }

  await assert.rejects(
    async () => {
      for await (const _event of limitAsyncIterableStream(oversizedStream(), {
        limits: { maxEventChars: 32 },
        getEventChars: (event) => JSON.stringify(event).length,
        getOutputText: (event) => event.text
      })) {
        // Guarded stream should reject before yielding the oversized event.
      }
    },
    (err) => {
      assert.ok(err instanceof AiStreamResourceLimitError)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      assert.doesNotMatch(err.message, /raw provider payload/)
      return true
    }
  )

  async function* idleStream() {
    await new Promise((resolve) => setTimeout(resolve, 20))
    yield { text: "late" }
  }

  await assert.rejects(
    async () => {
      for await (const _event of limitAsyncIterableStream(idleStream(), {
        limits: { idleTimeoutMs: 5, overallTimeoutMs: 20 },
        getEventChars: (event) => JSON.stringify(event).length
      })) {
        // The first read should time out before any event is yielded.
      }
    },
    AiStreamResourceLimitError
  )
})
