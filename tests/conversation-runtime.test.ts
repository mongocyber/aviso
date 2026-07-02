import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  clearPageContentMemoryCache,
  getCachedPageContent,
  getPageContentMemoryCacheStatsForTests,
  setCachedPageContent
} from "../src/background/page-content-cache.ts"
import {
  AI_CONTEXT_LIMITS,
  applyAIContextBudget
} from "../src/utils/ai-context.ts"
import {
  appendConversationTurn,
  historyEntryFromConversation,
  MAX_CONVERSATION_HISTORY_ENTRIES,
  sanitizeConversationMessages,
  sortAndTrimConversations,
  upsertConversationHistoryEntry
} from "../src/utils/conversation-history.ts"
import {
  buildFollowUpPriorContext,
  DEFAULT_FOLLOW_UP_CONTEXT_BUDGET
} from "../src/utils/follow-up-context.ts"
import { parseIntentLocally, parseUserIntent } from "../src/utils/intent.ts"
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
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS,
  SLOW_MODEL_RESPONSE_TEXT
} from "../src/utils/response-guard.ts"
import {
  buildTranslationSystemPrompt,
  buildTranslationUserContent,
  formatTranslationError,
  formatTranslationUserBubble,
  getInlineTranslationRoute,
  getTranslationMaxOutputTokens,
  getTranslationSourceText,
  getTranslationTargetLabel,
  INLINE_TRANSLATION_MAX_CHARS,
  INLINE_TRANSLATION_MAX_LINES,
  normalizeTranslationTargetLanguage,
  sanitizeTranslationPayload,
  TRANSLATION_EMPTY_INPUT_ERROR,
  TRANSLATION_SYSTEM_PROMPT,
  TRANSLATION_WAITING_TEXT
} from "../src/utils/translation.ts"
import "./helpers/register-aliases.ts"

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

test("conversation history 默认最多保留最近 20 条", () => {
  assert.equal(MAX_CONVERSATION_HISTORY_ENTRIES, 20)
})

test("conversation history 裁剪最旧记录并保留最新 20 条", () => {
  const entries = Array.from({ length: 22 }, (_, index) => ({
    id: `conversation-${index}`,
    trigger: "toolbar" as const,
    operation: "custom",
    input: `q-${index}`,
    output: `a-${index}`,
    timestamp: index,
    updatedAt: index
  }))
  const trimmed = sortAndTrimConversations(entries)

  assert.equal(trimmed.length, 20)
  assert.deepEqual(trimmed.map((entry) => entry.id).slice(0, 3), [
    "conversation-21",
    "conversation-20",
    "conversation-19"
  ])
  assert.equal(
    trimmed.some((entry) => entry.id === "conversation-0"),
    false
  )
})

test("conversation history 保留 pinned 并只裁剪普通最近 20 条", () => {
  const entries = Array.from({ length: 22 }, (_, index) => ({
    id: `conversation-${index}`,
    trigger: "toolbar" as const,
    operation: "custom",
    input: `q-${index}`,
    output: `a-${index}`,
    timestamp: index,
    updatedAt: index
  }))
  const pinnedOld = {
    id: "pinned-old",
    trigger: "toolbar" as const,
    operation: "custom",
    input: "saved q",
    output: "saved a",
    timestamp: -1,
    updatedAt: -1,
    pinned: true
  }
  const trimmed = sortAndTrimConversations([...entries, pinnedOld])

  assert.equal(trimmed.length, 21)
  assert.equal(
    trimmed.some((entry) => entry.id === "pinned-old"),
    true
  )
  assert.equal(trimmed.filter((entry) => !entry.pinned).length, 20)
  assert.equal(
    trimmed.some((entry) => entry.id === "conversation-0"),
    false
  )
})

test("conversation history upsert 同一面板生命周期并保留 pinned", () => {
  const first = historyEntryFromConversation({
    id: "panel-1",
    trigger: "toolbar",
    operation: "custom",
    messages: [
      { role: "user", content: "第一问" },
      { role: "assistant", content: "第一答" }
    ],
    createdAt: 100,
    updatedAt: 110,
    pinned: true
  })
  const second = historyEntryFromConversation({
    id: "panel-1",
    trigger: "toolbar",
    operation: "custom",
    messages: [
      { role: "user", content: "第一问" },
      { role: "assistant", content: "第一答" },
      { role: "user", content: "追问" },
      { role: "assistant", content: "追答" }
    ],
    createdAt: 100,
    updatedAt: 120
  })
  const updated = upsertConversationHistoryEntry([first], second)

  assert.equal(updated.length, 1)
  assert.equal(updated[0].id, "panel-1")
  assert.equal(updated[0].pinned, true)
  assert.equal(updated[0].input, "追问")
  assert.equal(updated[0].output, "追答")
  assert.equal(updated[0].messages?.length, 4)
})

test("conversation append 新 AI action 时保留旧内容并追加新 turn", () => {
  const existing = [
    { role: "user" as const, content: "先解释这段", operation: "explain" },
    { role: "assistant" as const, content: "解释结果", operation: "explain" }
  ]
  const messages = appendConversationTurn(existing, {
    userContent: "待翻译文本：\nhello",
    requestId: "req-translate",
    operation: "translate",
    trigger: "toolbar"
  })

  assert.equal(messages.length, 4)
  assert.equal(messages[0].content, "先解释这段")
  assert.equal(messages[1].content, "解释结果")
  assert.equal(messages[2].content, "待翻译文本：\nhello")
  assert.equal(messages[2].operation, "translate")
  assert.equal(messages[2].trigger, "toolbar")
  assert.equal(messages[3].role, "assistant")
  assert.equal(messages[3].reqId, "req-translate")
  assert.equal(messages[3].operation, "translate")
})

test("conversation upsert 同 session 不丢旧 messages，只更新同一条记录", () => {
  const initialMessages = [
    { role: "user" as const, content: "先解释这段" },
    { role: "assistant" as const, content: "解释结果" }
  ]
  const appendedMessages = appendConversationTurn(initialMessages, {
    userContent: "待翻译文本：\nhello",
    requestId: "req-translate",
    operation: "translate",
    trigger: "toolbar"
  })
  const first = historyEntryFromConversation({
    id: "same-panel",
    trigger: "toolbar",
    operation: "explain",
    messages: initialMessages,
    createdAt: 100,
    updatedAt: 110
  })
  const second = historyEntryFromConversation({
    id: "same-panel",
    trigger: "toolbar",
    operation: "translate",
    messages: appendedMessages,
    createdAt: 100,
    updatedAt: 120
  })
  const updated = upsertConversationHistoryEntry([first], second)

  assert.equal(updated.length, 1)
  assert.equal(updated[0].id, "same-panel")
  assert.equal(updated[0].messages?.length, 4)
  assert.equal(updated[0].messages?.[0].content, "先解释这段")
  assert.equal(updated[0].messages?.[1].content, "解释结果")
  assert.equal(updated[0].messages?.[2].content, "待翻译文本：\nhello")
  assert.equal(updated[0].operation, "translate")
})

test("conversation history 新面板生命周期创建新记录", () => {
  const first = historyEntryFromConversation({
    id: "panel-1",
    trigger: "toolbar",
    operation: "custom",
    messages: [{ role: "assistant", content: "第一条" }],
    createdAt: 100,
    updatedAt: 100
  })
  const second = historyEntryFromConversation({
    id: "panel-2",
    trigger: "toolbar",
    operation: "custom",
    messages: [{ role: "assistant", content: "第二条" }],
    createdAt: 200,
    updatedAt: 200
  })
  const updated = upsertConversationHistoryEntry([first], second)

  assert.deepEqual(
    updated.map((entry) => entry.id),
    ["panel-2", "panel-1"]
  )
})

test("conversation history 不保留截图或图片 base64 data URL", () => {
  const messages = sanitizeConversationMessages([
    {
      role: "assistant",
      content: "image=data:image/png;base64,iVBORw0KGgo= done"
    }
  ])

  assert.equal(messages[0].content, "image=[图片内容已省略] done")
})

test("conversation history 保存和恢复完整多轮 messages", () => {
  const entry = historyEntryFromConversation({
    id: "conversation-1",
    trigger: "toolbar",
    operation: "polish",
    url: "https://example.com",
    messages: [
      { role: "user", content: "第一问" },
      { role: "assistant", content: "第一答" },
      { role: "user", content: "追问" },
      { role: "assistant", content: "追答" }
    ],
    createdAt: 100,
    updatedAt: 200,
    pinned: true
  })

  assert.equal(entry.input, "追问")
  assert.equal(entry.output, "追答")
  assert.equal(entry.pinned, true)
  assert.equal(entry.messages?.length, 4)
  assert.deepEqual(
    entry.messages?.map((message) => message.content),
    ["第一问", "第一答", "追问", "追答"]
  )
})

test("慢响应提示只在等待且首段未返回超过阈值时出现", () => {
  assert.equal(SLOW_FIRST_CHUNK_MS, 2000)
  assert.match(SLOW_MODEL_RESPONSE_TEXT, /请求已发出/)
  assert.match(SLOW_MODEL_RESPONSE_TEXT, /停止/)
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

test("dynamic loading status rotates by operation without claiming fake tools", () => {
  const loadingStatusSource = readFileSync(
    new URL("../src/utils/loading-status.ts", import.meta.url),
    "utf8"
  )

  assert.match(loadingStatusSource, /LOADING_STATUS_TICK_MS = 1200/)
  assert.match(loadingStatusSource, /已发送给模型，正在读取待翻译文本/)
  assert.match(loadingStatusSource, /模型正在生成译文/)
  assert.match(loadingStatusSource, /正在读取网页内容/)
  assert.match(loadingStatusSource, /正在提取页面重点/)
  assert.match(loadingStatusSource, /准备发送给模型/)
  assert.match(loadingStatusSource, /还在响应中/)
  assert.doesNotMatch(loadingStatusSource, /可随时停止等待/)
  assert.doesNotMatch(loadingStatusSource, /正在使用工具|正在查找网页/)
})

test("floating panel renders dynamic loading status while waiting", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )

  assert.match(floatingSource, /LOADING_STATUS_TICK_MS/)
  assert.match(floatingSource, /getDynamicLoadingStatusText/)
  assert.match(floatingSource, /context: state\.context/)
  assert.match(floatingSource, /setLoadingTick\(\(tick\) => tick \+ 1\)/)
})

test("reasoning stream renders as temporary UI state, not saved answer content", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(floatingSource, /chunk\.kind === "reasoning"/)
  assert.match(floatingSource, /reasoningText: appendReasoningText/)
  assert.match(floatingSource, /<ReasoningMessage/)
  assert.match(floatingSource, /messages: state.messages/)
  assert.doesNotMatch(floatingSource, /content: .*reasoningText/)
  assert.match(toolbarSource, /chunk\.kind === "reasoning"/)
  assert.match(toolbarSource, /statusText: tRef\.current\("model\.thinking"\)/)
})

test("perf summary reaches content scripts through final stream chunks as JSON", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(aiClientSource, /perfSummary:\s*\n\s*done && opts\?\.logPerf/)
  assert.match(aiClientSource, /buildAIRequestPerfSummary/)
  assert.match(aiClientSource, /Promise<PerfSummary \| undefined>/)
  assert.match(
    aiClientSource,
    /if \(chunk\.perfSummary\) finalPerfSummary = chunk\.perfSummary/
  )
  assert.match(aiClientSource, /return finalPerfSummary/)
  assert.match(
    backgroundSource,
    /if \(chunk\.perfSummary\) perfSummary = chunk\.perfSummary/
  )
  assert.match(backgroundSource, /returnedPerfSummary/)
  assert.doesNotMatch(
    backgroundSource,
    /void sendMessageToFrame\(\s*\n\s*tabId,\s*\n\s*\{\s*\n\s*action: "AI_PERF_SUMMARY"/
  )
  assert.match(
    backgroundSource,
    /await sendMessageToFrame\(\s*\n\s*tabId,\s*\n\s*\{\s*\n\s*action: "AI_PERF_SUMMARY"/
  )
  assert.match(backgroundSource, /label: "ai-stream-perf-summary"/)
  assert.match(backgroundSource, /chunk: \{\s*\n\s*text: ""/)
  assert.match(backgroundSource, /perfSummary/)
  assert.match(
    toolbarSource,
    /if \(chunk\.perfSummary\)[\s\S]*if \(requestId !== inlineRequestRef\.current\) return/
  )
  assert.match(floatingSource, /chunk\.perfSummary/)
  assert.match(toolbarSource, /chunk\.perfSummary/)
  assert.match(
    floatingSource,
    /`\[Aviso perf\] \$\{JSON\.stringify\(chunk\.perfSummary\)\}`/
  )
  assert.match(
    toolbarSource,
    /`\[Aviso perf\] \$\{JSON\.stringify\(chunk\.perfSummary\)\}`/
  )
  assert.match(
    readFileSync(new URL("../src/utils/timing.ts", import.meta.url), "utf8"),
    /`\[Aviso perf\] \$\{JSON\.stringify\(summary\)\}`/
  )
})

test("inline translation uses shared two-second slow hint without fake output", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(toolbarSource, /const INLINE_TRANSLATION_DEBOUNCE_MS = 100/)
  assert.match(toolbarSource, /startInlineSlowHintTimer/)
  assert.match(toolbarSource, /shouldShowSlowResponseHint/)
  assert.match(toolbarSource, /statusText: tRef\.current\("model\.slow"\)/)
  assert.match(toolbarSource, /getDynamicLoadingStatusText/)
  assert.match(toolbarSource, /operation: "translate"/)
  assert.doesNotMatch(toolbarSource, /output: SLOW_MODEL_RESPONSE_TEXT/)
})

test("long inline translations stay in the current card", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )
  const showInlineTranslationBlock =
    toolbarSource.match(
      /const showInlineTranslationForSelection = \([\s\S]*?\n  \}/
    )?.[0] ?? ""

  assert.match(
    showInlineTranslationBlock,
    /warmRuntimeConfig\(requestId\)[\s\S]*inlineRequestRef\.current = requestId[\s\S]*setInlineCard\(\{[\s\S]*visible: true/
  )
  assert.doesNotMatch(showInlineTranslationBlock, /openTranslationResultPanel/)
  assert.doesNotMatch(showInlineTranslationBlock, /mode: "fallback"/)
})

test("selection toolbar lifecycle ignores stale cleared selections and keeps active cards on scroll", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )
  const i18nSource = readFileSync(
    new URL("../src/utils/i18n-core.ts", import.meta.url),
    "utf8"
  )

  assert.match(
    toolbarSource,
    /const handleScroll = \(event: Event\) => \{[\s\S]*if \(isInsideAvisoUI\(event\)\) return/
  )
  assert.match(
    toolbarSource,
    /if \(inlineCardVisibleRef\.current\) return[\s\S]*closeInlineCard\(\)/
  )
  assert.match(toolbarSource, /const INLINE_STALE_SELECTION_SUPPRESSION_MS = 1200/)
  assert.match(
    toolbarSource,
    /const staleInlineSelectionRef = useRef\(\{ text: "", until: 0 \}\)/
  )
  assert.match(
    toolbarSource,
    /const shouldIgnoreStaleInlineSelection = \(text: string\): boolean => \{[\s\S]*return text\.trim\(\) === stale\.text/
  )
  assert.match(
    toolbarSource,
    /if \(inlineEnabled && shouldIgnoreStaleInlineSelection\(text\)\) \{[\s\S]*closeInlineCard\(\)[\s\S]*return[\s\S]*\}/
  )
  assert.match(
    toolbarSource,
    /inlineCardVisibleRef\.current &&[\s\S]*text === inlineSourceTextRef\.current\.trim\(\)[\s\S]*return/
  )
  assert.match(
    toolbarSource,
    /const selectedText = window\.getSelection\(\)\?\.toString\(\)\.trim\(\) \?\? ""[\s\S]*if \(inlineCardVisibleRef\.current && selectedText\) \{[\s\S]*rememberStaleInlineSelection\(selectedText\)/
  )
  assert.match(
    toolbarSource,
    /inlineCardVisibleRef\.current = true[\s\S]*setInlineCard\(\{[\s\S]*visible: true/
  )
  assert.match(
    toolbarSource,
    /const closeInlineCard = \(cancel = true\) => \{[\s\S]*inlineCardVisibleRef\.current = false/
  )
  assert.match(toolbarSource, /pageScrollAtRef\.current = Date\.now\(\)/)
  assert.match(
    toolbarSource,
    /if \(Date\.now\(\) - pageScrollAtRef\.current < 500\) return/
  )
  assert.match(
    toolbarSource,
    /if \(inlineCardVisibleRef\.current\) return[\s\S]*const text = window\.getSelection\(\)\?\.toString\(\)\.trim\(\)/
  )
  assert.match(
    toolbarSource,
    /const text = window\.getSelection\(\)\?\.toString\(\)\.trim\(\) \?\? ""[\s\S]*if \(!inlineCardVisibleRef\.current\) closeInlineCard\(\)/
  )
  assert.match(
    toolbarSource,
    /document\.addEventListener\("selectionchange", handleSelectionChange\)/
  )
  assert.match(
    toolbarSource,
    /document\.removeEventListener\("selectionchange", handleSelectionChange\)/
  )
  assert.doesNotMatch(i18nSource, /建议点发给 AI/)
})

test("inline translation card is wider and grows before scrolling", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(toolbarSource, /const INLINE_CARD_WIDTH = 460/)
  assert.match(toolbarSource, /const INLINE_CARD_ESTIMATED_HEIGHT = 300/)
  assert.match(toolbarSource, /maxHeight: "min\(520px, calc\(100vh - 24px\)\)"/)
  assert.match(toolbarSource, /flex: "1 1 auto"[\s\S]*minHeight: 96/)
  assert.match(toolbarSource, /overflowY: "auto"/)
})

test("translation triggers avoid avoidable local waits without implicit command AI calls", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const retryBlock =
    toolbarSource.match(
      /const retryInlineTranslation = \(\) => \{[\s\S]*?\n  \}/
    )?.[0] ?? ""
  const toolbarOperationBlock =
    toolbarSource.match(
      /const handleOperation = \(op: Operation\) => \{[\s\S]*?\n  \}/
    )?.[0] ?? ""
  const commandEnterBlock =
    commandSource.match(
      /} else if \(e\.key === "Enter"\) \{[\s\S]*?\n    \}/
    )?.[0] ?? ""

  assert.doesNotMatch(retryBlock, /setTimeout/)
  assert.doesNotMatch(toolbarOperationBlock, /setTimeout/)
  assert.match(commandSource, /parseIntentLocally/)
  assert.match(commandSource, /buildIntentResults\(intent, q\)/)
  assert.match(commandSource, /type: "ask-ai"/)
  assert.match(commandEnterBlock, /handleSelect\(results\[selectedIndex\]\)/)
  assert.doesNotMatch(commandEnterBlock, /handleSendToAI\(/)
  assert.doesNotMatch(commandSource, /await parseUserIntent/)
})

test("AI output token budgets stay small for common short operations", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const tokenBudgetBlock =
    aiClientSource.match(
      /export function getMaxOutputTokens[\s\S]*?\n\}/
    )?.[0] ?? ""

  assert.match(tokenBudgetBlock, /getTranslationMaxOutputTokens\(payload\)/)
  assert.match(tokenBudgetBlock, /operation === "polish"\) return 768/)
  assert.match(tokenBudgetBlock, /return 1024/)
  assert.equal(
    getTranslationMaxOutputTokens({
      operation: "translate",
      selectionText: "hello"
    }),
    128
  )
  assert.equal(
    getTranslationMaxOutputTokens({
      operation: "translate",
      selectionText: "x".repeat(240)
    }),
    256
  )
  assert.equal(
    getTranslationMaxOutputTokens({
      operation: "translate",
      selectionText: "x".repeat(700)
    }),
    512
  )
})

test("AI context budget keeps selection requests compact", () => {
  const payload = applyAIContextBudget({
    operation: "explain",
    context: "selection",
    selectionText: "s".repeat(AI_CONTEXT_LIMITS.selectionChars + 50),
    userMessage: "u".repeat(AI_CONTEXT_LIMITS.userMessageChars + 50),
    priorContext: "p".repeat(AI_CONTEXT_LIMITS.priorContextChars + 50),
    pageContent: "private page body",
    pageUrl: "https://example.com/private"
  })

  assert.equal(payload.pageUrl, undefined)
  assert.equal(payload.pageContent, undefined)
  assert.match(payload.selectionText ?? "", /内容过长已截断/)
  assert.match(payload.userMessage ?? "", /内容过长已截断/)
  assert.match(payload.priorContext ?? "", /内容过长已截断/)
  assert.ok(
    (payload.selectionText?.length ?? 0) <=
      AI_CONTEXT_LIMITS.selectionChars + "\n…（内容过长已截断）".length
  )
})

test("AI context budget keeps page summary bounded", () => {
  const payload = applyAIContextBudget({
    operation: "summarize",
    context: "page",
    pageContent: "p".repeat(AI_CONTEXT_LIMITS.pageSummaryChars + 50),
    priorContext: "old private conversation",
    linkUrl: "https://example.com/link",
    srcUrl: "https://example.com/image.png"
  })

  assert.equal(payload.priorContext, undefined)
  assert.equal(payload.linkUrl, undefined)
  assert.equal(payload.srcUrl, undefined)
  assert.match(payload.pageContent ?? "", /内容过长已截断/)
  assert.ok(
    (payload.pageContent?.length ?? 0) <=
      AI_CONTEXT_LIMITS.pageSummaryChars + "\n…（内容过长已截断）".length
  )
})

test("AI prompts are concise and first-answer oriented", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.match(aiClientSource, /先用一句话给出核心解释/)
  assert.match(aiClientSource, /请直接输出润色后的文字/)
  assert.match(aiClientSource, /先给一句核心摘要/)
  assert.match(aiClientSource, /请直接回答用户问题，先给结论/)
})

test("page content cache is memory-only, bounded and URL-hashed", () => {
  const pageContentCacheSource = readFileSync(
    new URL("../src/background/page-content-cache.ts", import.meta.url),
    "utf8"
  )

  clearPageContentMemoryCache()
  setCachedPageContent(
    {
      tabId: 1,
      frameId: 0,
      pageUrl: "https://example.com/article#section"
    },
    "cached summary page content",
    1000
  )

  assert.equal(
    getCachedPageContent(
      {
        tabId: 1,
        frameId: 0,
        pageUrl: "https://example.com/article"
      },
      1500
    ),
    "cached summary page content"
  )
  assert.equal(
    getCachedPageContent(
      {
        tabId: 1,
        frameId: 0,
        pageUrl: "https://example.com/article"
      },
      62_000
    ),
    null
  )
  assert.equal(getPageContentMemoryCacheStatsForTests().entryCount, 0)
  assert.match(pageContentCacheSource, /PAGE_CONTENT_CACHE_TTL_MS = 60_000/)
  assert.match(pageContentCacheSource, /hashCacheValue\(normalizeUrl/)
  assert.doesNotMatch(pageContentCacheSource, /chrome\.storage/)
})

test("page summary paths parallelize page extraction and runtime warmup", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )
  const commandActionsSource = readFileSync(
    new URL("../src/background/command-actions.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const runtimeCacheSource = readFileSync(
    new URL("../src/background/ai-runtime-cache.ts", import.meta.url),
    "utf8"
  )

  for (const source of [contextMenuSource, commandActionsSource]) {
    assert.match(source, /const runtimeWarmup = getRuntimeConfigSnapshot/)
    assert.match(source, /const displayPromise = sendMessageToDisplayFrame/)
    assert.match(source, /const contentPromise = requestPageContent/)
    assert.match(
      source,
      /await Promise\.all\(\[displayPromise, contentPromise\]\)/
    )
    assert.match(source, /page_content_cache_hit/)
    assert.match(source, /AI_CONTEXT_LIMITS\.pageSummaryChars/)
  }
  assert.match(backgroundSource, /hostedWarmupStartedAt/)
  assert.match(backgroundSource, /hostedWarmupDoneAt/)
  assert.match(runtimeCacheSource, /clearPageContentMemoryCache/)
})

test("inline AI requests warm runtime config before provider calls", () => {
  const messageTypesSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(messageTypesSource, /action: "WARM_RUNTIME_CONFIG"/)
  assert.match(backgroundSource, /case "WARM_RUNTIME_CONFIG"/)
  assert.match(
    backgroundSource,
    /await Promise\.all\(\[getRuntimeConfigSnapshot\(\), readHostedSession\(\)\]\)/
  )
  assert.match(toolbarSource, /function warmRuntimeConfig\(requestId: string\)/)
  assert.match(toolbarSource, /action: "WARM_RUNTIME_CONFIG"/)
  assert.match(toolbarSource, /warmRuntimeConfig\(requestId\)/)
  assert.match(
    toolbarSource,
    /warmRuntimeConfig\(requestId\)[\s\S]*inlineRequestRef\.current = requestId/
  )
})

test("background batches stream chunks while flushing done and perf summaries", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(backgroundSource, /const STREAM_CHUNK_BATCH_MS = 40/)
  assert.match(backgroundSource, /const STREAM_CHUNK_BATCH_MAX_CHARS = 640/)
  assert.match(backgroundSource, /function createStreamChunkDispatcher/)
  assert.match(backgroundSource, /if \(chunk\.done \|\| chunk\.perfSummary\)/)
  assert.match(backgroundSource, /buffered\.kind !== chunk\.kind/)
  assert.match(
    backgroundSource,
    /setTimeout\(flushBuffered, STREAM_CHUNK_BATCH_MS\)/
  )
  assert.match(backgroundSource, /streamChunks\.push\(chunk\)/)
  assert.match(backgroundSource, /await streamChunks\.flush\(\)/)
  assert.doesNotMatch(
    backgroundSource,
    /void sendMessageToFrame\(\s*\n\s*tabId,\s*\n\s*\{\s*\n\s*action: "AI_STREAM_CHUNK"/
  )
})

test("floating toolbar requests run AI directly from background after display opens", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const showFloatingBlock =
    backgroundSource.match(
      /case "SHOW_FLOATING_WINDOW": \{[\s\S]*?case "WARM_RUNTIME_CONFIG"/
    )?.[0] ?? ""

  assert.match(backgroundSource, /async function runAIRequestToFrame/)
  assert.match(
    showFloatingBlock,
    /const shouldRunAIInBackground =[\s\S]*!request\.payload\.deferAiRequest && !request\.payload\.restore/
  )
  assert.match(showFloatingBlock, /deferAiRequest: true/)
  assert.match(showFloatingBlock, /const result = await sendMessageToDisplayFrame/)
  assert.match(
    showFloatingBlock,
    /const routed = await resolveRuntimeAiRouteForPayload/
  )
  assert.match(showFloatingBlock, /hostedWarmupDoneAt/)
  assert.match(showFloatingBlock, /await runAIRequestToFrame\(/)
  assert.match(
    showFloatingBlock,
    /responseFrameId: result\.frameId \?\? TOP_FRAME_ID/
  )
  assert.match(showFloatingBlock, /sendResponse\(aiResponse\)/)
})

test("background routes floating requests through hosted current-model fallback", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const showFloatingBlock =
    backgroundSource.match(
      /case "SHOW_FLOATING_WINDOW": \{[\s\S]*?case "WARM_RUNTIME_CONFIG"/
    )?.[0] ?? ""
  const aiRequestBlock =
    backgroundSource.match(
      /case "AI_REQUEST": \{[\s\S]*?case "SAVE_HISTORY"/
    )?.[0] ?? ""

  assert.match(backgroundSource, /readHostedSession\(\)/)
  assert.match(backgroundSource, /isHostedSessionUsable\(hostedSession\)/)
  assert.match(
    backgroundSource,
    /resolvePopupCurrentModelProviderConfigId\(\{/
  )
  assert.match(backgroundSource, /aiRoute: "hosted"/)
  assert.match(showFloatingBlock, /runtimeConfigSnapshot/)
  assert.match(showFloatingBlock, /hostedSession/)
  assert.match(showFloatingBlock, /payload: routedPayload/)
  assert.match(aiRequestBlock, /const routed = await resolveRuntimeAiRouteForPayload/)
  assert.match(aiRequestBlock, /payload: routed\.payload/)
})

test("floating conversation persistence waits for stream completion", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const persistenceEffectBlock =
    floatingSource.match(
      /useEffect\(\(\) => \{\s*clearTimeout\(conversationTimer\.current\)[\s\S]*?\n  \}, \[[\s\S]*?\n  \]\)/
    )?.[0] ?? ""

  assert.match(
    floatingSource,
    /const conversationPersistenceKey = state\.loading/
  )
  assert.match(persistenceEffectBlock, /currentState\.loading/)
  assert.match(
    persistenceEffectBlock,
    /persistConversation\(stateRef\.current\)/
  )
  assert.match(persistenceEffectBlock, /conversationPersistenceKey/)
  assert.doesNotMatch(persistenceEffectBlock, /\}, \[state\]\)/)
})

test("short translation memory cache is service-worker only and hashed", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const runtimeCacheSource = readFileSync(
    new URL("../src/background/ai-runtime-cache.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const translationCacheSource = readFileSync(
    new URL("../src/background/translation-cache.ts", import.meta.url),
    "utf8"
  )

  assert.match(translationCacheSource, /TRANSLATION_CACHE_TTL_MS/)
  assert.match(translationCacheSource, /TRANSLATION_CACHE_MAX_SOURCE_CHARS/)
  assert.match(translationCacheSource, /hashCacheValue\(sourceText\)/)
  assert.match(translationCacheSource, /hashCacheValue\(pageKey\)/)
  assert.match(translationCacheSource, /hashCacheValue\(routeKey\)/)
  assert.match(translationCacheSource, /input\.route\.provider\.id/)
  assert.match(translationCacheSource, /input\.route\.providerConfigId/)
  assert.match(translationCacheSource, /input\.route\.requestModel/)
  assert.doesNotMatch(translationCacheSource, /chrome\.storage/)
  assert.match(runtimeCacheSource, /clearTranslationMemoryCache/)
  assert.match(aiClientSource, /getCachedTranslation\(translationCacheKey\)/)
  assert.match(
    aiClientSource,
    /setCachedTranslation\(translationCacheKey, translationOutput\)/
  )
  assert.match(
    aiClientSource,
    /const route =[\s\S]*resolveFastModelRouteForOperation/
  )
  assert.match(aiClientSource, /getTranslationCacheKey\(\{[\s\S]*route,/)
  assert.match(
    backgroundSource,
    /pageUrl: routedPayload\.pageUrl \?\? sender\.tab\?\.url \?\? sender\.url/
  )
})

test("short translation cache key separates fast routes and hides raw inputs", async () => {
  const { getTranslationCacheKey } = await import(
    "../src/background/translation-cache.ts"
  )
  const sourceText = "Cache key sample text for short translation."
  const pageUrl = "https://example.com/private/path?q=secret#section"
  const payload = {
    operation: "translate",
    context: "selection",
    selectionText: sourceText,
    pageUrl
  } as const
  const defaultConfig = {
    id: "cfg-openai-default-cache",
    provider: "openai",
    displayName: "OpenAI Default Cache",
    model: "gpt-4o-mini",
    createdAt: 100,
    updatedAt: 100
  } as const
  const fastConfig = {
    id: "cfg-deepseek-fast-cache",
    provider: "deepseek",
    displayName: "DeepSeek Fast Cache",
    model: "deepseek-chat",
    createdAt: 200,
    updatedAt: 200
  } as const
  const otherFastConfig = {
    ...fastConfig,
    id: "cfg-deepseek-fast-cache-alt",
    displayName: "DeepSeek Fast Cache Alt"
  } as const
  const sameConfigDifferentModel = {
    ...fastConfig,
    model: "deepseek-reasoner"
  } as const
  const settings = {
    inlineTranslationTargetLanguage: "zh-CN",
    defaultModel: "gpt-4o-mini",
    defaultProviderConfigId: defaultConfig.id,
    fastProviderConfigId: fastConfig.id,
    providerConfigs: [defaultConfig, fastConfig],
    doubaoModel: ""
  } as const
  const defaultRoute = resolveModelRoute(undefined, settings)
  const fastRoute = resolveFastModelRouteForOperation(
    payload,
    settings,
    settings.providerConfigs
  )
  const otherFastRoute = buildProviderConfigRoute(otherFastConfig)
  const differentModelRoute = buildProviderConfigRoute(sameConfigDifferentModel)

  assert.ok(fastRoute)

  const cacheInput = {
    payload,
    settings: {
      inlineTranslationTargetLanguage: settings.inlineTranslationTargetLanguage
    },
    pageUrl
  }
  const defaultKey = getTranslationCacheKey({
    ...cacheInput,
    route: defaultRoute
  })
  const defaultKeyAgain = getTranslationCacheKey({
    ...cacheInput,
    route: defaultRoute
  })
  const fastKey = getTranslationCacheKey({
    ...cacheInput,
    route: fastRoute
  })
  const otherFastKey = getTranslationCacheKey({
    ...cacheInput,
    route: otherFastRoute
  })
  const differentModelKey = getTranslationCacheKey({
    ...cacheInput,
    route: differentModelRoute
  })

  assert.equal(defaultKey, defaultKeyAgain)
  assert.notEqual(defaultKey, fastKey)
  assert.notEqual(fastKey, otherFastKey)
  assert.notEqual(fastKey, differentModelKey)

  for (const key of [defaultKey, fastKey, otherFastKey, differentModelKey]) {
    assert.equal(typeof key, "string")
    assert.equal(key.includes(sourceText), false)
    assert.equal(key.includes(pageUrl), false)
    assert.equal(key.includes("gpt-4o-mini"), false)
    assert.equal(key.includes("deepseek-chat"), false)
    assert.equal(key.includes("deepseek-reasoner"), false)
  }
})
