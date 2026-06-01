import { test } from "node:test"
import assert from "node:assert/strict"

import {
  detectType,
  isSensitive,
  isSensitiveDomain
} from "../src/utils/clipboard-detect.ts"
import { parseIntentLocally, parseUserIntent } from "../src/utils/intent.ts"
import {
  MAX_PAGE_CONTENT_CHARS,
  truncatePageContent
} from "../src/utils/page-content.ts"
import { expandTemplate } from "../src/utils/template.ts"
import { normalizeError } from "../src/utils/errors.ts"
import {
  UNSUPPORTED_IMAGE_SRC_MESSAGE,
  parseSupportedImageSrc
} from "../src/utils/image-src.ts"

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
  assert.doesNotMatch(out, /miro\.medium\.com|Request id|Timeout while downloading/i)
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
  assert.deepEqual(parseSupportedImageSrc("data:image/png;base64,iVBORw0KGgo="), {
    kind: "base64",
    url: "data:image/png;base64,iVBORw0KGgo=",
    mediaType: "image/png",
    data: "iVBORw0KGgo="
  })
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
