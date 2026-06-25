import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { register } from "node:module"
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
  detectType,
  isSensitive,
  isSensitiveDomain
} from "../src/utils/clipboard-detect.ts"
import {
  describeCommandActionAccess,
  isCommandAccessBlocked
} from "../src/utils/command-access.ts"
import {
  getTemplateParentMenuContexts,
  normalizeTemplateMenuContexts
} from "../src/utils/context-menu-templates.ts"
import {
  appendConversationTurn,
  historyEntryFromConversation,
  MAX_CONVERSATION_HISTORY_ENTRIES,
  sanitizeConversationMessages,
  sortAndTrimConversations,
  upsertConversationHistoryEntry
} from "../src/utils/conversation-history.ts"
import {
  clampDoubleClickMenuPosition,
  hasValidDoubleClickSelection,
  isUnsafeDoubleClickTarget
} from "../src/utils/double-click-menu.ts"
import { buildSafeErrorLog, normalizeError } from "../src/utils/errors.ts"
import {
  buildFollowUpPriorContext,
  DEFAULT_FOLLOW_UP_CONTEXT_BUDGET
} from "../src/utils/follow-up-context.ts"
import {
  createHostedAiClient,
  createHostedAiSseParser,
  HostedAiClientError,
  normalizeHostedAiError,
  resolveHostedAiBaseUrl
} from "../src/utils/hosted-ai-client.ts"
import {
  buildHostedGoogleOAuthUrl,
  HostedGoogleOAuthError,
  HOSTED_GOOGLE_OAUTH_CLIENT_ID,
  parseHostedGoogleOAuthRedirect,
  requestHostedGoogleIdToken
} from "../src/utils/hosted-oauth.ts"
import {
  buildHostedAccountQuotaDisplay,
  clearHostedSession,
  deriveHostedAccountStatus,
  HOSTED_AI_DEFAULT_BASE_URL,
  HOSTED_AI_DEFAULT_MODEL,
  HOSTED_AI_LOCAL_BASE_URL,
  HOSTED_AI_PROVIDER_CONFIG_ID,
  HOSTED_AI_STAGING_BASE_URL,
  HOSTED_AI_STAGING_HOST_PERMISSION,
  HOSTED_SESSION_STORAGE_KEY,
  isByokBlockedByHostedSignIn,
  isHostedAiProviderConfigId,
  readHostedSession,
  requiresHostedSignInForRoute,
  saveHostedSession
} from "../src/utils/hosted-session.ts"
import {
  createI18n,
  getI18nMessage,
  normalizeUiLanguageSetting,
  resolveUiLanguage
} from "../src/utils/i18n.ts"
import {
  parseSupportedImageSrc,
  UNSUPPORTED_IMAGE_SRC_MESSAGE
} from "../src/utils/image-src.ts"
import { parseIntentLocally, parseUserIntent } from "../src/utils/intent.ts"
import {
  getModelAvailability,
  isProviderKeyConfigured
} from "../src/utils/model-availability.ts"
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
  formatCurrentContext,
  MAX_PAGE_CONTENT_CHARS,
  truncatePageContent
} from "../src/utils/page-content.ts"
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
  buildChatCompletionReasoningParams,
  extractReasoningDeltaText,
  shouldUseMaxCompletionTokens
} from "../src/utils/reasoning.ts"
import {
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS,
  SLOW_MODEL_RESPONSE_TEXT
} from "../src/utils/response-guard.ts"
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
  hasDefaultModelChanged,
  hasUiLanguageChanged,
  haveProviderConfigMenusChanged,
  haveTemplatesChanged
} from "../src/utils/settings-change.ts"
import { expandTemplate } from "../src/utils/template.ts"
import {
  bucketInputSize,
  buildPerfSummary,
  buildSelectionTtftAggregate,
  buildSelectionTtftDogfoodRow,
  categorizePerfError,
  sanitizeTimingDetails
} from "../src/utils/timing.ts"
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
import {
  isSafeBrowserOpenUrl,
  normalizeSafeBrowserOpenUrl
} from "../src/utils/url-safety.ts"

const testImportAliasHook = `
const testFileUrl = ${JSON.stringify(import.meta.url)}

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, target] of [
    ["~types/", "../src/types/"],
    ["~utils/", "../src/utils/"]
  ]) {
    if (!specifier.startsWith(alias)) continue

    const relativePath = specifier.slice(alias.length)
    const extension = /\\.[cm]?[tj]sx?$/.test(relativePath) ? "" : ".ts"
    return nextResolve(
      new URL(target + relativePath + extension, testFileUrl).href,
      context
    )
  }

  return nextResolve(specifier, context)
}
`

register(`data:text/javascript,${encodeURIComponent(testImportAliasHook)}`)

test("detectType 识别 URL", () => {
  assert.equal(detectType("https://example.com/path?q=1"), "url")
})

test("browser URL opening only allows http and https", () => {
  assert.equal(isSafeBrowserOpenUrl("https://example.com/path?q=1"), true)
  assert.equal(isSafeBrowserOpenUrl("http://example.com/path"), true)
  assert.equal(
    normalizeSafeBrowserOpenUrl("example.com/docs"),
    "https://example.com/docs"
  )
  assert.equal(
    normalizeSafeBrowserOpenUrl("localhost:3000"),
    "http://localhost:3000/"
  )
  assert.equal(isSafeBrowserOpenUrl("javascript:alert(1)"), false)
  assert.equal(isSafeBrowserOpenUrl("data:text/html,<script></script>"), false)
  assert.equal(isSafeBrowserOpenUrl("file:///Users/example/private.txt"), false)
  assert.equal(isSafeBrowserOpenUrl("chrome://extensions"), false)
  assert.equal(isSafeBrowserOpenUrl("about:blank"), false)
  assert.equal(isSafeBrowserOpenUrl("blob:https://example.com/id"), false)
  assert.equal(
    isSafeBrowserOpenUrl("chrome-extension://abc/options.html"),
    false
  )
  assert.equal(isSafeBrowserOpenUrl("not a url"), false)
})

test("double-click menu safety blocks editable and code-editor targets", () => {
  assert.equal(isUnsafeDoubleClickTarget({ tagName: "textarea" }), true)
  assert.equal(
    isUnsafeDoubleClickTarget({ tagName: "input", inputType: "password" }),
    true
  )
  assert.equal(
    isUnsafeDoubleClickTarget({ tagName: "div", isContentEditable: true }),
    true
  )
  assert.equal(
    isUnsafeDoubleClickTarget({
      tagName: "div",
      className: "monaco-editor"
    }),
    true
  )
  assert.equal(isUnsafeDoubleClickTarget({ tagName: "p" }), false)
})

test("double-click menu validates selection length and clamps placement", () => {
  assert.equal(hasValidDoubleClickSelection("a"), false)
  assert.equal(hasValidDoubleClickSelection(" hello "), true)
  assert.deepEqual(
    clampDoubleClickMenuPosition(
      { x: 390, y: 290 },
      { width: 400, height: 300 },
      { width: 120, height: 90 }
    ),
    { left: 268, top: 198 }
  )
})

test("basic launch hides screenshot from command palette and double-click menu", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const doubleClickSource = readFileSync(
    new URL("../src/contents/double-click-menu.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(commandSource.includes('title: "截图提问"'), false)
  assert.equal(doubleClickSource.includes('label="截图提问"'), false)
  assert.doesNotMatch(doubleClickSource, /\|\s*"screenshot"/)
  assert.doesNotMatch(doubleClickSource, /REQUEST_START_SCREENSHOT_SELECTION/)
  assert.doesNotMatch(doubleClickSource, /screenshot:\s*"image_explain"/)
})

test("command quick action layer removes screenshot action", () => {
  const commandAccessSource = readFileSync(
    new URL("../src/utils/command-access.ts", import.meta.url),
    "utf8"
  )
  const commandActionsSource = readFileSync(
    new URL("../src/background/command-actions.ts", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(commandAccessSource, /\|\s*"screenshot"/)
  assert.doesNotMatch(commandActionsSource, /actionId === "screenshot"/)
  assert.doesNotMatch(commandActionsSource, /startScreenshotQuickAction/)
  assert.doesNotMatch(commandActionsSource, /operation:\s*"image_explain"/)
  assert.doesNotMatch(
    commandActionsSource,
    /REQUEST_START_SCREENSHOT_SELECTION/
  )
})

test("screenshot request dead message is removed while context-menu path remains", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )
  const contextMenusSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )
  const screenshotSource = readFileSync(
    new URL("../src/contents/screenshot.tsx", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(backgroundSource, /REQUEST_START_SCREENSHOT_SELECTION/)
  assert.doesNotMatch(messageSource, /REQUEST_START_SCREENSHOT_SELECTION/)
  assert.match(messageSource, /action: "START_SCREENSHOT_SELECTION"/)
  assert.match(contextMenusSource, /MENU_ID_SCREENSHOT_ASK/)
  assert.match(contextMenusSource, /action: "START_SCREENSHOT_SELECTION"/)
  assert.match(screenshotSource, /START_SCREENSHOT_SELECTION/)
})

test("command palette guards bookmark and history URLs before opening", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )

  assert.match(commandSource, /isSafeBrowserOpenUrl\(item\.url\)/)
  assert.match(commandSource, /window\.open\(item\.url,\s*"_blank"\)/)
  assert.match(
    commandSource,
    /normalizeSafeBrowserOpenUrl\(item\.url \?\? ""\)/
  )
  assert.match(commandSource, /requiresConfirmation: true/)
  assert.doesNotMatch(
    commandSource,
    /if \(item\.url\) \{\s*window\.open\(item\.url,\s*"_blank"\)/
  )
})

test("command palette local candidates are confirm-first and local-only", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const commandActionsSource = readFileSync(
    new URL("../src/background/command-actions.ts", import.meta.url),
    "utf8"
  )
  const commandAccessSource = readFileSync(
    new URL("../src/utils/command-access.ts", import.meta.url),
    "utf8"
  )

  assert.match(commandSource, /buildIntentResults\(intent, q\)/)
  assert.match(commandSource, /intent\.action === "open_bookmarks"/)
  assert.match(commandSource, /intent\.action === "open_history"/)
  assert.match(commandSource, /type: "local-action"/)
  assert.match(commandSource, /actionId: "open_bookmarks"/)
  assert.match(commandSource, /actionId: "open_history"/)
  assert.match(commandSource, /actionId: "page_translate"/)
  assert.match(commandSource, /actionId: "page_summary"/)
  assert.match(commandSource, /RUN_COMMAND_QUICK_ACTION/)
  assert.match(commandSource, /restore: item\.restore/)
  assert.match(
    commandSource,
    /item\.type === "page-action" && !aiConnection\.connected/
  )
  assert.match(commandActionsSource, /chrome:\/\/bookmarks\//)
  assert.match(commandActionsSource, /chrome:\/\/history\//)
  assert.match(commandActionsSource, /chrome\.tabs\.create\(\{ url \}\)/)
  assert.match(commandAccessSource, /"open_bookmarks"/)
  assert.match(commandAccessSource, /"open_history"/)
  const handleSelectBlock =
    commandSource.match(
      /const handleSelect = async \(item: ResultItem\) => \{[\s\S]*?\n  \}\n\n  const handleSendToAI/
    )?.[0] ?? ""
  assert.doesNotMatch(
    handleSelectBlock,
    /trigger: "command-palette-history"[\s\S]*selectionText: item\.title/
  )
})

test("command palette Escape closes from the focused input handler", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const handleKeyDownBlock =
    commandSource.match(
      /const handleKeyDown = \(e: React\.KeyboardEvent\) => \{[\s\S]*?\n  \}\n\n  const handlePanelWheel/
    )?.[0] ?? ""

  assert.match(handleKeyDownBlock, /e\.key === "Escape"/)
  assert.match(handleKeyDownBlock, /setVisible\(false\)/)
  assert.match(handleKeyDownBlock, /e\.stopPropagation\(\)/)
})

test("command palette no-result Enter does not silently call AI", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const searchBlock =
    commandSource.match(
      /const nextResults = \[[\s\S]*?\n      if \(browserHistoryResults\.failed/
    )?.[0] ?? ""
  const handleKeyDownBlock =
    commandSource.match(
      /const handleKeyDown = \(e: React\.KeyboardEvent\) => \{[\s\S]*?\n  \}\n\n  const handlePanelWheel/
    )?.[0] ?? ""

  assert.match(handleKeyDownBlock, /e\.key === "Enter"/)
  assert.match(handleKeyDownBlock, /handleSelect\(results\[selectedIndex\]\)/)
  assert.match(handleKeyDownBlock, /command\.selectVisibleCandidate/)
  assert.doesNotMatch(handleKeyDownBlock, /handleSendToAI\(/)
  assert.match(searchBlock, /setResults\(nextResults\)/)
  assert.doesNotMatch(searchBlock, /buildAiFallbackResult/)
  assert.doesNotMatch(commandSource, /ask-ai-fallback/)
})

test("command palette AI actions are visible candidates with disconnected guard", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const buildIntentResultsBlock =
    commandSource.match(
      /function buildIntentResults\(intent: ParsedIntent, rawQuery: string\): ResultItem\[\] \{[\s\S]*?\n  function getAiIntentTitle/
    )?.[0] ?? ""
  const handleSelectBlock =
    commandSource.match(
      /const handleSelect = async \(item: ResultItem\) => \{[\s\S]*?\n  \}\n\n  const handleSendToAI/
    )?.[0] ?? ""
  const handleSendToAiBlock =
    commandSource.match(
      /const handleSendToAI = \(parsedIntent\?: ParsedIntent, overrideInput\?: string\) => \{[\s\S]*?\n  \}/
    )?.[0] ?? ""

  assert.match(buildIntentResultsBlock, /intent\.action === "ask_ai"/)
  assert.match(
    buildIntentResultsBlock,
    /"explain", "translate", "polish", "summarize"/
  )
  assert.match(buildIntentResultsBlock, /type: "ask-ai"/)
  assert.doesNotMatch(buildIntentResultsBlock, /fallback/)
  assert.match(handleSelectBlock, /command\.aiDisconnected/)
  assert.match(handleSendToAiBlock, /!aiConnection\.connected/)
  assert.match(handleSendToAiBlock, /command\.aiDisconnected/)
})

test("URL-bearing warning logs use presence fields instead of raw URLs", () => {
  const sources = [
    "../src/background/frame-router.ts",
    "../src/contents/frame-bridge.ts",
    "../src/contents/clipboard.tsx",
    "../src/contents/toolbar.tsx"
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))

  for (const source of sources) {
    assert.doesNotMatch(
      source,
      /console\.warn\([\s\S]*?frameUrl:\s*(window\.location\.href|frameUrl)/
    )
    assert.match(source, /frameUrlPresent/)
  }
})

test("readability listener only handles extraction without holding sync channel", () => {
  const readabilitySource = readFileSync(
    new URL("../src/contents/readability.ts", import.meta.url),
    "utf8"
  )

  assert.match(readabilitySource, /message\.action !== "EXTRACT_PAGE_CONTENT"/)
  assert.match(
    readabilitySource,
    /sendResponse\(\{ success: true, data: content \}\)/
  )
  assert.match(readabilitySource, /return false/)
  assert.doesNotMatch(readabilitySource, /return true/)
})

test("test script and submit workflow use Node 22 type stripping", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  const workflowSource = readFileSync(
    new URL("../.github/workflows/submit.yml", import.meta.url),
    "utf8"
  )

  assert.equal(
    packageJson.scripts.test,
    'node --experimental-strip-types --test "tests/**/*.test.ts"'
  )
  assert.equal(packageJson.engines.node, ">=22.6.0")
  assert.match(workflowSource, /node-version: 22\.x/)
})

test("bookmark search meta does not expose raw query", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const metaTypeBlock =
    backgroundSource.match(/type BookmarkSearchMeta = \{[\s\S]*?\n\}/)?.[0] ??
    ""

  assert.doesNotMatch(metaTypeBlock, /\n\s*query: string/)
  assert.doesNotMatch(backgroundSource, /query: trimmedQuery/)
  assert.doesNotMatch(backgroundSource, /query: ""/)
  assert.match(backgroundSource, /hasQuery: boolean/)
  assert.match(backgroundSource, /queryLength: number/)
  assert.match(backgroundSource, /queryLength: trimmedQuery\.length/)
  assert.doesNotMatch(
    backgroundSource,
    /console\.info\("\[Aviso\] Bookmark search:", meta\)/
  )
})

test("content script async handlers use current language and catch copy errors", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(floatingSource, /const tRef = useRef\(t\)/)
  assert.match(floatingSource, /tRef\.current = t/)
  assert.match(
    floatingSource,
    /try \{\s*await navigator\.clipboard\.writeText\(output\)/
  )
  assert.match(
    floatingSource,
    /error: tRef\.current\("translation\.copyError"\)/
  )

  assert.match(toolbarSource, /const languageRef = useRef\(language\)/)
  assert.match(toolbarSource, /const tRef = useRef\(t\)/)
  assert.match(toolbarSource, /languageRef\.current = language/)
  assert.match(toolbarSource, /tRef\.current = t/)
  assert.match(
    toolbarSource,
    /formatTranslationError\(error, languageRef\.current\)/
  )
  assert.match(toolbarSource, /tRef\.current\("model\.thinking"\)/)
})

test("command palette is a search panel without mock access cards", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(commandSource.includes("Mock access"), false)
  assert.equal(commandSource.includes("UI-only"), false)
  assert.equal(commandSource.includes("COMMAND_ACCESS_PREVIEWS"), false)
  assert.equal(commandSource.includes("buildQuickActions"), false)
  assert.equal(commandSource.includes("复制当前上下文"), false)
  assert.equal(commandSource.includes("总结当前页面"), false)
  assert.match(commandSource, /t\("command\.placeholder"\)/)
  assert.match(commandSource, /t\("command\.aiConnected"\)/)
  assert.match(commandSource, /t\("command\.aiDisconnected"\)/)
  assert.match(commandSource, /t\("command\.fillSelection"\)/)

  const inputArea =
    commandSource.match(
      /\{\/\* 输入框 \*\/\}[\s\S]*?<\/div>\n\n        \{\(canFillSelection \|\| aiNotice\)/
    )?.[0] ?? ""
  assert.match(inputArea, /aria-label="AI 状态"/)
  assert.match(inputArea, /name="shield"[\s\S]*\{statusLabel\}/)
  assert.match(inputArea, /maxWidth: "38%"/)
  assert.match(inputArea, /textOverflow: "ellipsis"/)
  assert.doesNotMatch(commandSource, /连接后可把无结果输入发给 AI/)
  assert.match(commandSource, /\{\(canFillSelection \|\| aiNotice\) && \(/)
})

test("command palette searches browser history, bookmarks, and AI conversations", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(messageSource, /SEARCH_BROWSER_HISTORY/)
  assert.match(backgroundSource, /chrome\.history\.search/)
  assert.match(backgroundSource, /startTime: 0/)
  assert.match(commandSource, /searchBrowserHistory\(searchTarget\)/)
  assert.match(commandSource, /searchChromeBookmarks\(searchTarget\)/)
  assert.match(commandSource, /searchAvisoHistory\(searchTarget\)/)
  assert.match(commandSource, /const shouldSearchOpenTarget =/)
  assert.match(
    commandSource,
    /intent\.action === "navigate"[\s\S]*!normalizeSafeBrowserOpenUrl\(searchTarget\)/
  )
  assert.match(commandSource, /shouldSearchOpenTarget/)
  assert.match(commandSource, /browser-history[\s\S]*command\.history/)
  assert.match(commandSource, /type: "browser-history"/)
  assert.match(commandSource, /type: "bookmark"/)
  assert.match(commandSource, /type: "ai-history"/)
})

test("popup adds local hosted account controls without hiding provider setup", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(popupSource.includes("BYOK"), false)
  assert.equal(popupSource.includes("Aviso AI"), false)
  assert.equal(popupSource.includes("匿名额度"), false)
  assert.equal(popupSource.includes("订阅"), false)
  assert.match(popupSource, /popup\.tabs\.api/)
  assert.match(popupSource, /popup\.hosted\.title/)
  assert.match(popupSource, /signInHosted/)
  assert.match(popupSource, /refreshHostedAccount/)
  assert.match(popupSource, /signOutHostedLocal/)
  assert.match(popupSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.match(popupSource, /HOSTED_AI_DEFAULT_BASE_URL/)
  assert.match(popupSource, /popup\.addAiService/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.match(popupSource, /popup\.templates\.title/)
  assert.equal(getI18nMessage("popup.tabs.api", "zh-CN"), "AI 服务")
  assert.equal(getI18nMessage("popup.addAiService", "en"), "Add AI service")
  assert.equal(getI18nMessage("popup.hosted.signIn", "en"), "Sign in")
  assert.match(popupSource, /"gemini"/)
  assert.match(popupSource, /"hunyuan"/)
  assert.match(popupSource, /popup\.provider\.gemini/)
  assert.match(popupSource, /popup\.provider\.hunyuan/)
  assert.equal(getI18nMessage("popup.provider.gemini", "en"), "Gemini")
  assert.equal(getI18nMessage("popup.provider.hunyuan", "zh-CN"), "腾讯混元")
  assert.equal(getI18nMessage("popup.templates.title", "zh-CN"), "常用指令")
})

test("popup surfaces explicit account chip and zero-state dual entry (MON-26)", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  // Persistent identity affordance: header account chip + account panel
  assert.match(popupSource, /accountPanelOpen/)
  assert.match(popupSource, /styles\.accountChip/)
  assert.match(popupSource, /styles\.accountPanel/)
  assert.match(popupSource, /hostedQuotaPercent/)
  // Zero-state dual entry (sign in for free quota OR add own key), not a wall
  assert.match(popupSource, /showZeroState/)
  // Zero-state opens on the AI services tab by default (smart default)
  assert.match(popupSource, /hasByokAtLoad/)
  assert.match(popupSource, /popup\.zero\.title/)
  assert.match(popupSource, /popup\.zero\.hosted\.cta/)
  assert.match(popupSource, /popup\.zero\.byok\.cta/)
  // Jargon stays in i18n, not hardcoded in source
  assert.equal(popupSource.includes("BYOK"), false)
  // Subscription stays deferred: no upgrade/checkout entry shipped
  assert.equal(popupSource.includes("升级"), false)
  assert.equal(/\bUpgrade\b/.test(popupSource), false)
  // i18n strings exist for the new surfaces
  assert.equal(getI18nMessage("popup.zero.title", "zh-CN"), "开始使用")
  assert.equal(
    getI18nMessage("popup.zero.hosted.cta", "en"),
    "Sign in / sign up"
  )
  assert.equal(
    getI18nMessage("popup.account.manage", "zh-CN"),
    "在 AI 服务中管理"
  )
})

test("hosted AI base URL is explicit and limited to local or staging", () => {
  assert.equal(resolveHostedAiBaseUrl(), null)
  assert.equal(resolveHostedAiBaseUrl(""), null)
  assert.equal(resolveHostedAiBaseUrl("https://api.aviso.app/v1"), null)
  assert.equal(resolveHostedAiBaseUrl("http://example.com/v1"), null)
  assert.equal(
    resolveHostedAiBaseUrl("https://aviso-backend-staging.vercel.app"),
    null
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://aviso-backend-staging.vercel.app/v1"),
    null
  )
  assert.equal(
    resolveHostedAiBaseUrl("https://aviso-backend-staging.vercel.app/v1/"),
    HOSTED_AI_STAGING_BASE_URL
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://127.0.0.1:3000/v1/"),
    "http://127.0.0.1:3000/v1"
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://localhost:3000/v1"),
    "http://localhost:3000/v1"
  )
})

test("hosted Google OAuth builds id-token auth URL without client secret", () => {
  const authUrl = buildHostedGoogleOAuthUrl({
    redirectUri: "https://extension-id.chromiumapp.org/",
    nonce: "nonce-1",
    state: "state-1"
  })
  const parsed = new URL(authUrl)

  assert.equal(parsed.origin, "https://accounts.google.com")
  assert.equal(parsed.pathname, "/o/oauth2/v2/auth")
  assert.equal(parsed.searchParams.get("client_id"), HOSTED_GOOGLE_OAUTH_CLIENT_ID)
  assert.equal(parsed.searchParams.get("redirect_uri"), "https://extension-id.chromiumapp.org/")
  assert.equal(parsed.searchParams.get("response_type"), "id_token")
  assert.equal(parsed.searchParams.get("response_mode"), "fragment")
  assert.equal(parsed.searchParams.get("scope"), "openid email profile")
  assert.equal(parsed.searchParams.get("prompt"), "select_account")
  assert.equal(parsed.searchParams.get("nonce"), "nonce-1")
  assert.equal(parsed.searchParams.get("state"), "state-1")
  assert.equal(parsed.searchParams.has("client_secret"), false)
})

test("hosted Google OAuth parses redirect id token and sanitizes failures", async () => {
  assert.equal(
    parseHostedGoogleOAuthRedirect(
      "https://extension-id.chromiumapp.org/#id_token=header.payload.sig&state=state-1",
      {
        expectedRedirectUri: "https://extension-id.chromiumapp.org/",
        expectedState: "state-1"
      }
    ),
    "header.payload.sig"
  )

  assert.throws(
    () =>
      parseHostedGoogleOAuthRedirect(
        "https://extension-id.chromiumapp.org/#id_token=secret-token&state=wrong",
        {
          expectedRedirectUri: "https://extension-id.chromiumapp.org/",
          expectedState: "state-1"
        }
      ),
    (error) =>
      error instanceof HostedGoogleOAuthError &&
      error.code === "state_mismatch" &&
      !error.message.includes("secret-token")
  )

  let launchedUrl = ""
  const token = await requestHostedGoogleIdToken({
    getRedirectUrl: () => "https://extension-id.chromiumapp.org/",
    nonce: "nonce-1",
    state: "state-1",
    getLastError: () => undefined,
    launchWebAuthFlow: (details, callback) => {
      launchedUrl = details.url
      callback(
        "https://extension-id.chromiumapp.org/#id_token=header.payload.sig&state=state-1"
      )
    }
  })

  assert.equal(token, "header.payload.sig")
  assert.match(launchedUrl, /response_type=id_token/)
  assert.doesNotMatch(launchedUrl, /client_secret/)
})

test("hosted AI client exposes auth, logout, me, and chat with scoped headers", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  const responseBody = `data: {"delta":"hello"}\n\ndata: {"done":true,"usage":{"tokens_in":1,"tokens_out":2}}\n\n`
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input, init })

    if (String(input).endsWith("/auth/logout")) {
      return new Response(null, { status: 204 })
    }

    if (String(input).endsWith("/chat")) {
      return new Response(responseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    }

    if (String(input).endsWith("/auth/google")) {
      return Response.json({
        session_token: "session-local",
        expires_at: "2026-06-18T00:00:00.000Z",
        user: {
          id: "u1",
          email: "u@example.com",
          tier: "free",
          region: "global"
        }
      })
    }

    return Response.json({
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free",
        region: "global"
      },
      quota: {
        unit: "tokens",
        monthly: {
          limit: 1000000,
          used: 10,
          resets_at: "2026-07-01T00:00:00.000Z"
        }
      },
      rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
      models: { available: ["free-small"], default: "free-small" }
    })
  }

  const client = createHostedAiClient({
    baseUrl: "http://127.0.0.1:3000/v1",
    fetchImpl,
    sessionToken: "session-local",
    createIdempotencyKey: () => "idem-local"
  })

  await client.authGoogle({ id_token: "mock-id-token" })
  await client.logout()
  await client.me()
  const events = []
  for await (const event of client.chatStream({
    operation: "translate",
    input: "hello",
    context: "selection",
    model: "free-small"
  })) {
    events.push(event)
  }

  assert.deepEqual(events, [
    { type: "delta", delta: "hello" },
    { type: "done", usage: { tokens_in: 1, tokens_out: 2 } }
  ])

  const chatCall = calls.find((call) => String(call.input).endsWith("/chat"))
  assert.ok(chatCall)
  const headers = new Headers(chatCall.init?.headers)
  assert.equal(headers.get("Authorization"), "Bearer session-local")
  assert.equal(headers.get("Idempotency-Key"), "idem-local")
  assert.equal(headers.get("Accept"), "text/event-stream")
  assert.equal(headers.has("X-Install-Id"), false)
})

test("hosted AI SSE parser handles chunked delta, done, and error events", () => {
  const parser = createHostedAiSseParser()
  assert.deepEqual(parser.push('data: {"delta":"hel'), [])
  assert.deepEqual(parser.push('lo"}\n\n'), [{ type: "delta", delta: "hello" }])
  assert.deepEqual(
    parser.push(
      'data: {"error":{"code":"quota_exceeded","message":"raw backend detail"},"done":true}\n\n'
    ),
    [
      {
        type: "error",
        error: normalizeHostedAiError("quota_exceeded")
      }
    ]
  )
  assert.deepEqual(parser.push('data: {"done":true}\n\n'), [{ type: "done" }])
  assert.deepEqual(parser.finish(), [])
})

test("hosted AI errors normalize to safe frontend categories", async () => {
  assert.deepEqual(normalizeHostedAiError("forbidden_model", 403), {
    code: "forbidden_model",
    status: 403,
    upgrade: undefined,
    category: "model_unavailable",
    action: "fallback_to_default_model",
    userMessage: "当前托管模型不可用，请重试默认模型或切换到自己的 API Key。"
  })
  assert.deepEqual(
    [
      [401, "unauthorized"],
      [402, "quota_exceeded"],
      [403, "forbidden_model"],
      [429, "rate_limited"],
      [502, "provider_error"],
      [503, "service_unavailable"]
    ].map(([status, code]) =>
      normalizeHostedAiError(undefined, status as number).code === code
    ),
    [true, true, true, true, true, true]
  )
  assert.equal(normalizeHostedAiError("unauthorized").action, "sign_in_again")
  assert.equal(
    normalizeHostedAiError("quota_exceeded").action,
    "switch_to_byok"
  )
  assert.equal(normalizeHostedAiError("rate_limited").action, "retry_later")
  assert.equal(
    normalizeHostedAiError("service_unavailable").action,
    "retry_or_switch_to_byok"
  )
  assert.equal(
    normalizeHostedAiError("provider_error").category,
    "provider_unavailable"
  )

  const client = createHostedAiClient({
    baseUrl: "http://localhost:3000/v1",
    fetchImpl: async () =>
      Response.json(
        {
          error: {
            code: "provider_error",
            message: "raw provider payload must not surface"
          }
        },
        { status: 502 }
      )
  })

  await assert.rejects(
    () => client.me("session-local"),
    (err) => {
      assert.ok(err instanceof HostedAiClientError)
      assert.equal(err.message.includes("raw provider payload"), false)
      assert.equal(err.normalized.code, "provider_error")
      assert.equal(err.normalized.status, 502)
      return true
    }
  )
})

test("hosted AI fallback messages stay safe through global error handling", () => {
  for (const status of [401, 402, 403, 429, 502, 503]) {
    const error = new HostedAiClientError(
      normalizeHostedAiError(undefined, status, status === 402)
    )
    const normalized = normalizeError(error)
    assert.equal(normalized, error.normalized.userMessage)
    assert.doesNotMatch(
      normalized,
      /checkout|billing|subscription|upgrade|付费上线|升级|订阅|购买/i
    )
    assert.doesNotMatch(normalized, /raw backend detail|private draft/i)
  }
})

test("hosted chat routing builds local chat payloads only when explicitly selected", async () => {
  const {
    buildHostedChatRequest,
    HOSTED_CHAT_DEFAULT_MODEL,
    shouldUseHostedChatRoute
  } = await import("../src/background/hosted-chat-routing.ts")

  assert.equal(HOSTED_CHAT_DEFAULT_MODEL, "free-small")
  assert.equal(shouldUseHostedChatRoute({ operation: "translate" }), false)
  assert.equal(
    shouldUseHostedChatRoute({
      aiRoute: "byok",
      operation: "translate"
    }),
    false
  )
  assert.equal(
    shouldUseHostedChatRoute({
      aiRoute: "hosted",
      operation: "translate"
    }),
    true
  )

  assert.deepEqual(
    buildHostedChatRequest(
      {
        aiRoute: "hosted",
        operation: "translate",
        context: "selection",
        selectionText: " Hello ",
        systemPrompt: "Translate naturally."
      },
      { targetLanguage: "zh-CN" }
    ),
    {
      operation: "translate",
      input: "Hello",
      context: "selection",
      target_lang: "zh-CN",
      model: "free-small",
      messages: [{ role: "system", content: "Translate naturally." }]
    }
  )

  assert.deepEqual(
    buildHostedChatRequest({
      aiRoute: "hosted",
      trigger: "follow-up",
      operation: "custom",
      userMessage: "What does this mean?",
      priorContext: "Previous safe local context."
    }),
    {
      operation: "custom",
      input: "What does this mean?",
      context: undefined,
      target_lang: undefined,
      model: "free-small",
      messages: [
        { role: "system", content: "Previous safe local context." },
        { role: "user", content: "What does this mean?" }
      ]
    }
  )

  assert.throws(
    () =>
      buildHostedChatRequest({
        aiRoute: "hosted",
        operation: "image_explain",
        imageSource: "screenshot-region",
        selectionText: "describe"
      }),
    HostedAiClientError
  )
})

test("Aviso AI service selection stays separate from BYOK provider configs", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )

  assert.equal(HOSTED_AI_PROVIDER_CONFIG_ID, "aviso-hosted-ai")
  assert.equal(HOSTED_AI_DEFAULT_MODEL, "free-small")
  assert.equal(isHostedAiProviderConfigId(HOSTED_AI_PROVIDER_CONFIG_ID), true)
  assert.equal(isHostedAiProviderConfigId("cfg-openai-personal"), false)
  assert.match(
    providerConfigSource,
    /isHostedAiProviderConfigId\(settings\.defaultProviderConfigId\)/
  )
  assert.match(
    providerConfigSource,
    /return HOSTED_AI_PROVIDER_CONFIG_ID/
  )
})

test("popup exposes Aviso AI in default and fast service selectors", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /setDefaultHostedAiService/)
  assert.match(popupSource, /isHostedDefaultSelected/)
  assert.match(popupSource, /HOSTED_AI_PROVIDER_CONFIG_ID/)
  assert.match(popupSource, /popup\.hosted\.optionHelper/)
  assert.match(popupSource, /fastServiceDropdownOpen/)
  assert.match(popupSource, /fastServiceDropdownOption/)
  assert.match(popupSource, /isHostedFastSelected/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.match(
    aiClientSource,
    /isHostedAiProviderConfigId\(settings\.defaultProviderConfigId\)/
  )
  assert.match(aiClientSource, /fastByokConfigSelected/)
  assert.match(aiClientSource, /payload\.aiRoute !== "byok"/)
})

test("hosted session storage uses a separate local key from API keys", async () => {
  const previousChrome = (globalThis as any).chrome
  const localStore: Record<string, unknown> = {}
  const setCalls: Array<Record<string, unknown>> = []

  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: localStore[key] }),
        set: async (value: Record<string, unknown>) => {
          setCalls.push(value)
          Object.assign(localStore, value)
        },
        remove: async (key: string) => {
          delete localStore[key]
        }
      }
    }
  }

  try {
    assert.equal(HOSTED_SESSION_STORAGE_KEY, "aviso_hosted_session")
    assert.notEqual(HOSTED_SESSION_STORAGE_KEY, "contextai_api_keys")

    await saveHostedSession(
      {
        session_token: "session-local",
        expires_at: "2026-06-18T00:00:00.000Z",
        user: {
          id: "u1",
          email: "u@example.com",
          tier: "free",
          region: "global"
        }
      },
      { baseUrl: HOSTED_AI_DEFAULT_BASE_URL }
    )

    assert.deepEqual(Object.keys(setCalls[0]), [HOSTED_SESSION_STORAGE_KEY])
    assert.equal(Object.hasOwn(localStore, "contextai_api_keys"), false)
    assert.equal(
      (await readHostedSession())?.session.session_token,
      "session-local"
    )

    await clearHostedSession()
    assert.equal(Object.hasOwn(localStore, HOSTED_SESSION_STORAGE_KEY), false)
  } finally {
    ;(globalThis as any).chrome = previousChrome
  }
})

test("hosted account quota display formats me data and missing states", () => {
  const labels = {
    unknown: "Unknown",
    unavailable: "Unavailable",
    tokens: "tokens",
    tierFree: "Free",
    tierPaid: "Paid"
  }
  const session = {
    session: {
      session_token: "session-local",
      expires_at: "2026-06-18T00:00:00.000Z",
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free" as const,
        region: "global" as const
      }
    },
    me: {
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free" as const,
        region: "global" as const
      },
      quota: {
        unit: "tokens",
        monthly: {
          limit: 1000000,
          used: 2500,
          resets_at: "2026-07-01T00:00:00"
        },
        daily: {
          limit: 50000,
          used: 1200,
          resets_at: "2026-06-19T00:00:00"
        }
      },
      rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
      models: { available: ["free-small"], default: "free-small" }
    },
    baseUrl: HOSTED_AI_LOCAL_BASE_URL,
    updatedAt: 1
  }

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session,
      status: "signed_in",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "2,500 / 1,000,000 tokens",
      dailyQuotaLabel: "1,200 / 50,000 tokens",
      resetLabel: "2026-07-01 00:00"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session: { ...session, me: undefined },
      status: "signed_in",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "Unknown",
      dailyQuotaLabel: "Unknown",
      resetLabel: "Unknown"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session,
      status: "local_backend_unavailable",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "Unavailable",
      dailyQuotaLabel: "Unavailable",
      resetLabel: "Unavailable"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session: null,
      status: "local_backend_unavailable",
      labels
    }),
    {
      tierLabel: "Unavailable",
      monthlyQuotaLabel: "Unavailable",
      dailyQuotaLabel: "Unavailable",
      resetLabel: "Unavailable"
    }
  )
})

test("hosted account state is just-in-time and does not block BYOK", () => {
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: null }),
    true
  )
  assert.equal(
    requiresHostedSignInForRoute({ route: "byok", session: null }),
    false
  )
  assert.equal(isByokBlockedByHostedSignIn(), false)
  assert.equal(deriveHostedAccountStatus({ session: null }), "signed_out")
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "unauthorized" }),
    "expired"
  )
  assert.equal(
    deriveHostedAccountStatus({
      session: null,
      errorCode: "service_unavailable"
    }),
    "local_backend_unavailable"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "quota_exceeded" }),
    "quota_exhausted"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "rate_limited" }),
    "rate_limited"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "provider_error" }),
    "hosted_route_unavailable"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "bad_request" }),
    "request_invalid"
  )
})

test("floating window exposes hosted sign-in required only as a request state", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )

  assert.match(messageSource, /hostedAi\?:/)
  assert.match(messageSource, /state: "sign_in_required"/)
  assert.match(floatingSource, /hostedAi\?\.state === "sign_in_required"/)
  assert.match(floatingSource, /floating\.hostedSignInRequired\.title/)
  assert.match(floatingSource, /loading: hostedAiNotice \? false : true/)
  assert.match(floatingSource, /if \(!hostedAiNotice && !deferAiRequest\)/)
  assert.doesNotMatch(floatingSource, /chrome\.identity/)
})

test("popup hosted quota display stays internal and keeps public copy clean", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const websiteSources = [
    "../website/src/pages/index.tsx",
    "../website/docs/core-features.md",
    "../website/docs/known-limitations.md",
    "../website/i18n/en/docusaurus-plugin-content-docs/current/core-features.md",
    "../website/i18n/en/docusaurus-plugin-content-docs/current/known-limitations.md"
  ]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n")

  assert.match(popupSource, /popup\.hosted\.monthlyQuota/)
  assert.match(popupSource, /popup\.hosted\.dailyQuota/)
  assert.match(popupSource, /popup\.hosted\.resetTiming/)
  assert.match(popupSource, /buildHostedAccountQuotaDisplay/)
  assert.match(popupSource, /refreshHostedAccount/)
  assert.match(popupSource, /popup\.addAiService/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.equal(getI18nMessage("popup.hosted.quota.unknown", "en"), "Unknown")
  assert.equal(
    getI18nMessage("popup.hosted.quota.unavailable", "zh-CN"),
    "不可用"
  )
  assert.match(
    getI18nMessage("popup.hosted.status.quota_exhausted", "zh-CN"),
    /自己的 AI 服务配置/
  )
  assert.match(
    getI18nMessage("popup.hosted.status.rate_limited", "en"),
    /own AI service configuration/
  )
  assert.doesNotMatch(websiteSources, /1,000,000|1000000|50,000|50000/)
  assert.doesNotMatch(
    websiteSources,
    /hosted quota|Aviso AI quota|托管额度|本地托管账户/i
  )
})

test("hosted sign-in slice keeps staging backend and permission boundaries", () => {
  const hostedSessionSource = readFileSync(
    new URL("../src/utils/hosted-session.ts", import.meta.url),
    "utf8"
  )
  const hostedClientSource = readFileSync(
    new URL("../src/utils/hosted-ai-client.ts", import.meta.url),
    "utf8"
  )
  const hostedChatRoutingSource = readFileSync(
    new URL("../src/background/hosted-chat-routing.ts", import.meta.url),
    "utf8"
  )
  const hostedOAuthSource = readFileSync(
    new URL("../src/utils/hosted-oauth.ts", import.meta.url),
    "utf8"
  )
  const hostedAuthSource = readFileSync(
    new URL("../src/background/hosted-auth.ts", import.meta.url),
    "utf8"
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const wxtConfigSource = readFileSync(
    new URL("../wxt.config.ts", import.meta.url),
    "utf8"
  )
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.match(
    hostedSessionSource,
    /HOSTED_SESSION_STORAGE_KEY = "aviso_hosted_session"/
  )
  for (const source of [hostedSessionSource, hostedClientSource]) {
    assert.match(
      source,
      /HOSTED_AI_LOCAL_BASE_URL = "http:\/\/127\.0\.0\.1:3000\/v1"/
    )
    assert.match(
      source,
      /HOSTED_AI_STAGING_BASE_URL =\s*"https:\/\/aviso-backend-staging\.vercel\.app\/v1"/
    )
  }
  assert.match(
    hostedSessionSource,
    /HOSTED_AI_DEFAULT_BASE_URL = HOSTED_AI_STAGING_BASE_URL/
  )
  assert.match(messageSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.match(popupSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.doesNotMatch(popupSource, /requestHostedGoogleIdToken/)
  assert.match(hostedAuthSource, /requestHostedGoogleIdToken/)
  assert.match(hostedAuthSource, /HOSTED_AI_DEFAULT_BASE_URL/)
  assert.match(
    hostedAuthSource,
    /createHostedAiClient\(\{\s*baseUrl: HOSTED_AI_DEFAULT_BASE_URL\s*\}\)/
  )
  assert.match(hostedAuthSource, /googleIdToken = null/)
  assert.equal(
    getI18nMessage("popup.hosted.status.authClientUnavailable", "zh-CN"),
    "托管后端配置不可用，请重新加载 Aviso 后重试。"
  )
  assert.match(hostedOAuthSource, /launchWebAuthFlow/)
  assert.match(hostedOAuthSource, /response_type: "id_token"/)
  assert.doesNotMatch(hostedOAuthSource, /getAuthToken/)
  assert.doesNotMatch(hostedOAuthSource, /client_secret/)
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${hostedOAuthSource}\n${hostedAuthSource}\n${popupSource}`,
    /api\.aviso|production/i
  )
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${hostedOAuthSource}\n${hostedAuthSource}\n${popupSource}`,
    /X-Install-Id/
  )
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${popupSource}`,
    /chrome\.identity/
  )
  assert.match(messageSource, /aiRoute\?: "byok" \| "hosted"/)
  assert.match(floatingSource, /aiRoute,/)
  assert.match(aiClientSource, /shouldUseHostedChatRoute\(payload\)/)
  assert.match(aiClientSource, /payload\.aiRoute !== "byok"/)
  assert.match(aiClientSource, /runHostedChatRequest\(\{ \.\.\.payload, aiRoute: "hosted" \}, onChunk/)
  assert.deepEqual(
    [...packageJson.manifest.host_permissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_STAGING_HOST_PERMISSION
    ].sort()
  )
  assert.doesNotMatch(wxtConfigSource, /127\.0\.0\.1|localhost/)
})

test("popup high-fidelity settings panel keeps four tabs and local theme setting", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )
  const typeSource = readFileSync(
    new URL("../src/types/history.ts", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /popup\.tabs\.general/)
  assert.match(popupSource, /popup\.tabs\.api/)
  assert.match(popupSource, /popup\.tabs\.history/)
  assert.match(popupSource, /popup\.tabs\.templates/)
  assert.match(popupSource, /popup\.currentModel/)
  assert.match(popupSource, /popup\.addAiService/)
  assert.match(popupSource, /popup\.localAvailable/)
  assert.match(popupSource, /popup\.language\.title/)
  assert.match(popupSource, /type ProviderCardMode = "view" \| "edit" \| "add"/)
  assert.match(popupSource, /providerConfigs/)
  assert.match(popupSource, /providerConfigKeyInputs/)
  assert.match(popupSource, /addProviderConfigDraft/)
  assert.match(popupSource, /deleteProviderConfigInstance/)
  assert.match(popupSource, /popup\.provider\.status\.adding/)
  assert.match(popupSource, /popup\.provider\.status\.unsaved/)
  assert.match(popupSource, /popup\.service\.editConfig/)
  assert.match(popupSource, /popup\.service\.deleteDraft/)
  assert.match(popupSource, /popup\.history\.title/)
  assert.equal(
    getI18nMessage("popup.history.title", "en"),
    "Recent chats are saved automatically"
  )
  assert.match(popupSource, /popup\.theme\.light/)
  assert.match(popupSource, /popup\.theme\.dark/)
  assert.match(popupSource, /popup\.theme\.system/)
  assert.match(typeSource, /appearanceTheme: "light" \| "dark" \| "system"/)
  assert.match(typeSource, /providerConfigs\?: ProviderConfig\[\]/)
  assert.match(typeSource, /defaultProviderConfigId\?: string/)
  assert.match(storageSource, /appearanceTheme: "system"/)
  assert.match(storageSource, /providerConfigs: \[\]/)
  assert.match(storageSource, /providerConfigKeys/)
  assert.match(storageSource, /saveProviderConfigApiKey/)
  assert.match(storageSource, /contextai_settings/)
  assert.match(storageSource, /delete next\[provider\]/)
  assert.doesNotMatch(storageSource, /appearance_theme/)
})

test("popup common features keep two-line copy and mutually exclusive selection modes", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const toolbarIndex = popupSource.indexOf('"popup.features.selection"')
  const translationIndex = popupSource.indexOf('"popup.features.translation"')
  const commandIndex = popupSource.indexOf('"popup.features.command"')

  assert.ok(toolbarIndex > 0)
  assert.ok(translationIndex > toolbarIndex)
  assert.ok(commandIndex > translationIndex)
  assert.equal(popupSource.includes('"内联翻译"'), false)
  assert.match(popupSource, /name="features"/)
  assert.match(popupSource, /"selection",\s*t\("popup\.features\.selection"\)/)
  assert.match(
    popupSource,
    /"translate",\s*t\("popup\.features\.translation"\)/
  )
  assert.match(popupSource, /"commandPanel",\s*t\("popup\.features\.command"\)/)
  assert.match(popupSource, /"clipboard",\s*t\("popup\.features\.clipboard"\)/)
  assert.match(
    popupSource,
    /"doubleClick",\s*t\("popup\.features\.doubleClick"\)/
  )
  assert.match(popupSource, /name="local"/)
  assert.match(popupSource, /en: "English"/)
  assert.match(popupSource, /ja: "日本語"/)
  assert.match(popupSource, /ko: "한국어"/)
  assert.match(popupSource, /es: "Español"/)
  assert.match(popupSource, /fr: "Français"/)
  assert.match(popupSource, /de: "Deutsch"/)
  assert.match(popupSource, /normalizeCommonFeatureSettings/)
  assert.match(popupSource, /enableToolbar: false/)
  assert.match(popupSource, /data-language-dropdown/)
  assert.match(popupSource, /styles\.miniDropdownTrigger/)
  assert.match(popupSource, /styles\.miniDropdownMenu/)
  assert.match(popupSource, /styles\.miniDropdownOption/)
  assert.doesNotMatch(popupSource, /className="aviso-language-select"/)
  assert.match(popupSource, /disabled=\{!settings\.enableInlineTranslation\}/)
  assert.match(popupSource, /ui\.disabledBg/)
  assert.match(popupSource, /not-allowed/)
  assert.match(
    popupSource,
    /enableToolbar: true,\s*enableInlineTranslation: false/s
  )
  assert.match(
    popupSource,
    /enableInlineTranslation: true,\s*enableToolbar: false/s
  )
  assert.match(popupSource, /styles\.settingTitle/)
  assert.match(popupSource, /styles\.settingHelper/)
})

test("ui language resolves from Chrome language and settings override", () => {
  assert.equal(normalizeUiLanguageSetting("bad"), "auto")
  assert.equal(resolveUiLanguage("auto", "zh-CN"), "zh-CN")
  assert.equal(resolveUiLanguage("auto", "zh-TW"), "zh-CN")
  assert.equal(resolveUiLanguage("auto", "en-US"), "en")
  assert.equal(resolveUiLanguage("zh-CN", "en-US"), "zh-CN")
  assert.equal(resolveUiLanguage("en", "zh-CN"), "en")
})

test("ui language copy lookup keeps Chinese and English surface labels", () => {
  const zh = createI18n("zh-CN")
  const en = createI18n("en")

  assert.equal(zh("popup.tabs.general"), "设置")
  assert.equal(en("popup.tabs.general"), "Settings")
  assert.equal(zh("popup.templates.title"), "常用指令")
  assert.equal(en("popup.templates.title"), "Saved prompts")
  assert.equal(zh("popup.history.title"), "最近对话会自动保存")
  assert.equal(
    en("popup.history.title"),
    "Recent chats are saved automatically"
  )
  assert.equal(zh("popup.footer.privacy"), "隐私说明")
  assert.equal(en("popup.footer.privacy"), "Privacy")
  assert.equal(zh("popup.features.translation"), "划词翻译")
  assert.equal(en("popup.features.translation"), "Selection translation")
  assert.equal(en("action.translateSelection"), "Translate selection")
  assert.equal(en("common.sendToAi"), "Send to AI")
  assert.equal(en("translation.errorPrefix"), "Translation failed: ")
  assert.equal(getI18nMessage("settings.language.auto", "zh-CN"), "自动")
  assert.equal(getI18nMessage("settings.language.auto", "en"), "Auto")
})

test("popup localization keeps user saved labels and provider display names raw", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /\{config\.displayName\}/)
  assert.match(popupSource, /\{template\.name\}/)
  assert.match(popupSource, /settings\.templates\.map\(\(template\) =>/)
  assert.match(popupSource, /getTemplateSummary\(template, t\)/)
  assert.match(popupSource, /template\.prompt/)
  assert.doesNotMatch(popupSource, /t\(config\.displayName\)/)
  assert.doesNotMatch(popupSource, /t\(template\.name\)/)
  assert.doesNotMatch(popupSource, /t\(template\.prompt\)/)
})

test("ui language setting uses existing settings object and rebuilds context menu", () => {
  const typeSource = readFileSync(
    new URL("../src/types/history.ts", import.meta.url),
    "utf8"
  )
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(typeSource, /uiLanguage: UiLanguageSetting/)
  assert.match(storageSource, /uiLanguage: "auto"/)
  assert.match(popupSource, /updateSetting\(\s*"uiLanguage"/)
  assert.match(backgroundSource, /hasUiLanguageChanged\(previous, next\)/)
  assert.equal(
    hasUiLanguageChanged({ uiLanguage: "auto" }, { uiLanguage: "en" }),
    true
  )
  assert.equal(
    hasUiLanguageChanged({ uiLanguage: "en" }, { uiLanguage: "en" }),
    false
  )
})

test("popup language mini dropdown chooses direction instead of fixed upward only", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const menuBlock =
    popupSource.match(/miniDropdownMenu: \{[\s\S]*?\n  \}/)?.[0] ?? ""
  const settingListBlock =
    popupSource.match(/settingList: \{[\s\S]*?\n  \}/)?.[0] ?? ""
  const settingListOpenBlock =
    popupSource.match(/settingListDropdownOpen: \{[\s\S]*?\n  \}/)?.[0] ?? ""

  assert.match(popupSource, /type MiniDropdownDirection = "down" \| "up"/)
  assert.match(popupSource, /resolveMiniDropdownDirection/)
  assert.match(popupSource, /setLanguageDropdownDirection/)
  assert.match(
    popupSource,
    /data-dropdown-direction=\{languageDropdownDirection\}/
  )
  assert.match(popupSource, /styles\.miniDropdownMenuDown/)
  assert.match(popupSource, /styles\.miniDropdownMenuUp/)
  assert.match(popupSource, /top: "calc\(100% \+ 7px\)"/)
  assert.match(popupSource, /bottom: "calc\(100% \+ 7px\)"/)
  assert.doesNotMatch(menuBlock, /bottom: "calc\(100% \+ 7px\)"/)
  assert.match(settingListBlock, /overflow: "hidden"/)
  assert.match(settingListOpenBlock, /overflow: "visible"/)
  assert.match(
    popupSource,
    /\.\.\.\(languageDropdownOpen\s*\?\s*styles\.settingListDropdownOpen\s*:\s*\{\}\)/
  )
  assert.match(popupSource, /styles\.settingRowDropdownOpen/)
})

test("popup AI service card statuses render in meta pills, not the title row", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const serviceConfigTopBlock =
    popupSource.match(
      /<div style=\{styles\.serviceConfigTop\}>[\s\S]*?<span style=\{styles\.serviceIconActions\}>/
    )?.[0] ?? ""
  const servicePillsBlock =
    popupSource.match(
      /const servicePills:[\s\S]*?const configStateLabel/
    )?.[0] ?? ""

  assert.doesNotMatch(popupSource, /styles\.editingBadge/)
  assert.doesNotMatch(serviceConfigTopBlock, /默认/)
  assert.doesNotMatch(serviceConfigTopBlock, /新增中/)
  assert.doesNotMatch(serviceConfigTopBlock, /编辑中/)
  assert.match(
    servicePillsBlock,
    /label: t\("popup\.provider\.status\.default"\)/
  )
  assert.match(
    servicePillsBlock,
    /label: t\("popup\.provider\.status\.adding"\)/
  )
  assert.match(
    servicePillsBlock,
    /label: t\("popup\.provider\.status\.editing"\)/
  )
  assert.match(
    servicePillsBlock,
    /label: t\("popup\.provider\.status\.unsaved"\)/
  )
  assert.equal(getI18nMessage("popup.provider.status.default", "en"), "Default")
  assert.equal(
    getI18nMessage("popup.provider.status.adding", "zh-CN"),
    "新增中"
  )
  assert.match(popupSource, /servicePills\.map\(\(pill\) =>/)
  assert.match(popupSource, /getDropdownStatusStyle\(pill\.tone, ui\)/)
})

test("popup provider config model ID is manually editable", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(popupSource, /readOnly=\{config\.provider !== "doubao"\}/)
  assert.match(
    popupSource,
    /updateProviderConfigDraft\(config\.id, \{\s*model: event\.target\.value/s
  )
  assert.equal(
    getI18nMessage("popup.service.modelHint", "zh-CN"),
    "手动填写模型 ID；Aviso 不会自动读取你的账号模型列表。"
  )
  assert.equal(
    getI18nMessage("popup.service.modelHint", "en"),
    "Enter a model ID manually. Aviso does not fetch your account model list."
  )
  assert.equal(
    getI18nMessage("popup.service.fastTitle", "zh-CN"),
    "快速任务服务"
  )
  assert.match(
    getI18nMessage("popup.service.fastHelper", "en"),
    /translate \/ explain \/ polish/
  )
  assert.equal(
    getI18nMessage("popup.provider.geminiModelPlaceholder", "en"),
    "e.g. gemini-2.5-flash"
  )
  assert.equal(
    getI18nMessage("popup.provider.hunyuanModelPlaceholder", "zh-CN"),
    "如：hunyuan-lite"
  )
})

test("popup provider picker exposes Gemini and Tencent Hunyuan configuration presets", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(
    popupSource,
    /const PROVIDER_ORDER:[\s\S]*"gemini"[\s\S]*"hunyuan"/
  )
  assert.match(popupSource, /titleKey: "popup\.provider\.gemini"/)
  assert.match(popupSource, /titleKey: "popup\.provider\.hunyuan"/)
  assert.equal(getI18nMessage("popup.provider.gemini", "en"), "Gemini")
  assert.equal(getI18nMessage("popup.provider.hunyuan", "zh-CN"), "腾讯混元")
  assert.equal(
    getI18nMessage("popup.provider.hunyuanKeyPlaceholder", "en"),
    "From the Tencent Hunyuan console"
  )
})

test("popup AI service cards use outer field focus and delete confirmation", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const serviceTopBlock =
    popupSource.match(/serviceConfigTop: \{[\s\S]*?\n  \}/)?.[0] ?? ""
  const serviceNameBlock =
    popupSource.match(/serviceConfigName: \{[\s\S]*?\n  \}/)?.[0] ?? ""
  const configInputBlock =
    popupSource.match(/configInput: \{[\s\S]*?\n  \}/)?.[0] ?? ""

  assert.match(popupSource, /focusedProviderConfigField/)
  assert.match(popupSource, /styles\.configFieldFocused/)
  assert.match(popupSource, /className="aviso-config-input"/)
  assert.match(popupSource, /\.aviso-config-input:focus-visible/)
  assert.match(configInputBlock, /border: "none"/)
  assert.match(configInputBlock, /outline: "none"/)
  assert.match(configInputBlock, /boxShadow: "none"/)
  assert.match(configInputBlock, /background: "transparent"/)
  assert.match(configInputBlock, /appearance: "none"/)
  assert.match(configInputBlock, /WebkitAppearance: "none"/)
  assert.match(serviceTopBlock, /alignItems: "center"/)
  assert.match(serviceNameBlock, /minHeight: 32/)
  assert.match(popupSource, /confirmingDeleteProviderConfigId/)
  assert.match(popupSource, /isConfirmingDelete \? \(/)
  assert.match(popupSource, /popup\.service\.confirmDelete/)
  assert.match(popupSource, /common\.cancel/)
  assert.match(
    popupSource,
    /isAdd\s*\?\s*deleteProviderConfigInstance\(config\)\s*:\s*setConfirmingDeleteProviderConfigId\(\s*config\.id\s*\)/
  )
  assert.match(
    popupSource,
    /title=\{t\("popup\.service\.deleteConfig"\)\}[\s\S]{0,500}setConfirmingDeleteProviderConfigId\(config\.id\)/
  )
})

test("popup draft icons and wrapping styles match settings panel reference", () => {
  const iconSource = readFileSync(
    new URL("../src/styles/aviso.tsx", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  for (const icon of [
    "refresh",
    "edit",
    "plus",
    "trash",
    "features",
    "local",
    "selection",
    "commandPanel",
    "clipboard",
    "doubleClick"
  ]) {
    assert.match(iconSource, new RegExp(`\\| "${icon}"`))
    assert.match(iconSource, new RegExp(`${icon}:`))
  }

  assert.match(popupSource, /name="refresh"/)
  assert.match(popupSource, /name="edit"/)
  assert.match(popupSource, /name="plus"/)
  assert.match(popupSource, /name="trash"/)
  assert.doesNotMatch(
    popupSource,
    /title=\{isAdd \? t\("popup\.service\.deleteDraft"\) : t\("popup\.service\.deleteConfig"\)\}[\s\S]{0,500}name="close"/
  )
  assert.doesNotMatch(popupSource, /title="删除配置"[\s\S]{0,500}name="close"/)
  assert.match(popupSource, /--aviso-line: \$\{ui\.line\}/)
  assert.doesNotMatch(popupSource, /aviso\.darkLine/)

  for (const styleName of [
    "historyInput",
    "historyOutput",
    "templateName",
    "templateSummary",
    "dropdownOptionText",
    "dropdownSubText"
  ]) {
    const block =
      popupSource.match(
        new RegExp(`${styleName}: \\{[\\s\\S]*?\\n  \\}`)
      )?.[0] ?? ""
    assert.match(block, /display: "block"/)
    assert.doesNotMatch(block, /whiteSpace: "nowrap"/)
    assert.doesNotMatch(block, /textOverflow: "ellipsis"/)
  }
})

test("inline translation card uses send-to-ai result button copy", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )
  const inlineCardBlock =
    toolbarSource.match(
      /function InlineTranslationCard\([\s\S]*?\nfunction InlineCardButton/
    )?.[0] ?? ""

  assert.match(inlineCardBlock, /label=\{t\("common\.sendToAi"\)\}/)
  assert.doesNotMatch(inlineCardBlock, /label="结果面板"/)
})

test("inline translation error prefix follows English UI language", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(
    toolbarSource,
    /formatTranslationError\(error,\s*languageRef\.current\)/
  )
  assert.match(
    toolbarSource,
    /formatTranslationError\(\s*runtimeError\.message,\s*languageRef\.current\s*\)/
  )
  assert.match(
    toolbarSource,
    /formatTranslationError\(\s*response\.error as string,\s*languageRef\.current\s*\)/
  )
})

test("popup local cards keep draft icons and two-line copy", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /t\("popup\.local\.copy"\)/)
  assert.match(popupSource, /t\("popup\.local\.search"\)/)
  assert.match(popupSource, /t\("popup\.local\.restore"\)/)
  assert.match(popupSource, /styles\.compactLocalIcon/)
  assert.match(popupSource, /styles\.compactLocalCopy/)
  assert.match(popupSource, /styles\.compactLocalTitle/)
  assert.match(popupSource, /styles\.compactLocalHelper/)
})

test("popup theme tabs and scroll match draft structure", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /ThemeModeIcon/)
  assert.match(popupSource, /M12 3\.5v2/)
  assert.match(popupSource, /A7\.2 7\.2/)
  assert.match(popupSource, /M9 20h6/)
  assert.equal(popupSource.includes("shortLabel"), false)
  assert.match(popupSource, /labelKey: "popup\.theme\.light"/)
  assert.match(popupSource, /labelKey: "popup\.theme\.dark"/)
  assert.match(popupSource, /labelKey: "popup\.theme\.system"/)
  assert.match(popupSource, /id="aviso-popup-shell"/)
  assert.match(popupSource, /id="aviso-popup-content"/)
  assert.match(popupSource, /#aviso-popup-shell/)
  assert.match(popupSource, /safeMaxHeight: 580/)
  assert.ok(
    Number(popupSource.match(/safeMaxHeight: (\d+)/)?.[1] ?? "999") <= 600
  )
  assert.doesNotMatch(popupSource, /expandedHeight/)
  assert.doesNotMatch(popupSource, /compactHeight/)
  assert.match(popupSource, /function resolvePopupRuntimeHeight/)
  assert.match(popupSource, /window\.innerHeight/)
  assert.match(popupSource, /window\.screen\?\.availHeight/)
  assert.match(popupSource, /looksAutoShrunkByChrome/)
  assert.match(
    popupSource,
    /Math\.min\(viewportHeight, POPUP_FRAME\.safeMaxHeight\)/
  )
  assert.match(
    popupSource,
    /window\.addEventListener\("resize", updatePopupHeight\)/
  )
  assert.match(popupSource, /const popupHeightCss = `\$\{popupHeight\}px`/)
  assert.match(
    popupSource,
    /#\__plasmo \{[\s\S]*height: \$\{popupHeightCss\} !important;/
  )
  assert.match(
    popupSource,
    /#root,[\s\S]*body > div \{[\s\S]*height: \$\{popupHeightCss\} !important;/
  )
  assert.match(popupSource, /overflow: hidden !important;/)
  assert.doesNotMatch(popupSource, /position: fixed !important/)
  assert.doesNotMatch(popupSource, /100vh/)
  assert.match(
    popupSource,
    /#aviso-popup-content \{[\s\S]*overflow-y: auto !important;/
  )
  assert.match(
    popupSource,
    /#aviso-popup-content \{[\s\S]*height: 0 !important;/
  )
  assert.match(popupSource, /flex: "1 1 0"/)
  assert.match(popupSource, /maxHeight: "100%"/)
  assert.match(popupSource, /height: 0/)
  assert.ok(popupSource.indexOf("<header") < popupSource.indexOf("styles.tabs"))
  assert.ok(
    popupSource.indexOf("styles.tabs") <
      popupSource.indexOf('id="aviso-popup-content"')
  )
  assert.match(
    popupSource,
    /borderBottomColor: tab === tabId \? ui\.accent : "transparent"/
  )
  assert.doesNotMatch(popupSource, /tabBtnActive/)
})

test("appearance theme is shared by popup and content surfaces", () => {
  const themeSource = readFileSync(
    new URL("../src/styles/aviso.tsx", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const contentSources = [
    "../src/contents/command.tsx",
    "../src/contents/floating.tsx",
    "../src/contents/toolbar.tsx",
    "../src/contents/double-click-menu.tsx"
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  const screenshotSource = readFileSync(
    new URL("../src/contents/screenshot.tsx", import.meta.url),
    "utf8"
  )

  assert.match(
    themeSource,
    /export type AvisoThemeMode = "light" \| "dark" \| "system"/
  )
  assert.match(themeSource, /export function resolveAvisoTheme/)
  assert.match(themeSource, /export function getAvisoThemeTokens/)
  assert.match(themeSource, /export function useSyncedAvisoTheme/)
  for (const token of [
    "bg",
    "surface",
    "surface2",
    "text",
    "text2",
    "text3",
    "line",
    "accent",
    "hover",
    "focusRing",
    "warningBg",
    "dangerBg",
    "disabledBg",
    "scrollbarThumb",
    "input",
    "card",
    "button",
    "pill"
  ]) {
    assert.match(themeSource, new RegExp(`${token}: string`))
  }
  assert.match(themeSource, /chrome\.storage\.sync\.get\("contextai_settings"/)
  assert.match(themeSource, /chrome\.storage\.onChanged\.addListener/)
  assert.match(themeSource, /prefers-color-scheme: dark/)

  assert.match(popupSource, /resolveAvisoTheme/)
  assert.match(popupSource, /getAvisoThemeTokens/)
  assert.doesNotMatch(popupSource, /function getPopupUiTokens/)

  for (const source of contentSources) {
    assert.match(source, /useSyncedAvisoTheme/)
    assert.doesNotMatch(source, /aviso\.darkSurface/)
    assert.doesNotMatch(source, /aviso\.darkLine/)
    assert.doesNotMatch(source, /aviso\.darkText/)
  }

  assert.match(screenshotSource, /getScreenshotThemeTokens/)
  assert.match(screenshotSource, /initScreenshotThemeSync/)
  assert.match(screenshotSource, /applyScreenshotTheme/)
  assert.match(screenshotSource, /contextai_settings/)
  assert.match(screenshotSource, /prefers-color-scheme: dark/)
  assert.doesNotMatch(screenshotSource, /aviso\.darkSurface/)
  assert.doesNotMatch(screenshotSource, /aviso\.darkLine/)
  assert.doesNotMatch(screenshotSource, /aviso\.darkText/)
})

test("double-click menu pre-suppresses selection toolbar before dblclick", () => {
  const doubleClickSource = readFileSync(
    new URL("../src/contents/double-click-menu.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(doubleClickSource.includes("event.detail < 2"), true)
  assert.equal(
    doubleClickSource.includes(
      'document.addEventListener("mousedown", onMouseDownCapture, true)'
    ),
    true
  )
})

test("context-menu screenshot entry uses plain user-facing copy", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )

  assert.match(contextMenuSource, /title: t\("action\.askScreenshot"\)/)
  assert.equal(contextMenuSource.includes("截图提问（内部试用）"), false)
})

test("context-menu model radio uses configured AI services", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(contextMenuSource, /getProviderConfigsWithLegacy/)
  assert.match(contextMenuSource, /resolveDefaultProviderConfigId/)
  assert.match(contextMenuSource, /hasProviderConfigKey/)
  assert.match(contextMenuSource, /getProviderConfigMenuTitle/)
  assert.match(contextMenuSource, /defaultProviderConfigId: providerConfigId/)
  assert.match(contextMenuSource, /defaultModel: getModelForProviderConfig/)
  assert.doesNotMatch(contextMenuSource, /const MODELS = \[/)
  assert.doesNotMatch(contextMenuSource, /title: "GPT-4o mini"/)
  assert.match(backgroundSource, /haveProviderConfigMenusChanged/)
  assert.match(backgroundSource, /changes\.contextai_api_keys/)
})

test("context-menu selection titles are static and keep selection payload", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(contextMenuSource, /解释“%s”|翻译“%s”|润色“%s”|总结“%s”/)
  assert.doesNotMatch(contextMenuSource, /SELECTION_PREVIEW_MAX_CHARS/)
  assert.doesNotMatch(contextMenuSource, /SELECTION_TITLE_UPDATES/)
  assert.doesNotMatch(contextMenuSource, /buildSelectionPreview/)
  assert.doesNotMatch(contextMenuSource, /registerSelectionMenuPreviewUpdater/)
  assert.doesNotMatch(backgroundSource, /registerSelectionMenuPreviewUpdater/)

  assert.match(contextMenuSource, /title: t\("action\.explainSelection"\)/)
  assert.match(contextMenuSource, /title: t\("action\.translateSelection"\)/)
  assert.match(contextMenuSource, /title: t\("action\.polishSelection"\)/)
  assert.match(contextMenuSource, /title: t\("action\.summarizeSelection"\)/)
  assert.match(contextMenuSource, /selectionText: info\.selectionText \?\? ""/)
})

test("context-menu image explain marks remote image source", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )

  assert.match(contextMenuSource, /imageSource:/)
  assert.match(contextMenuSource, /MENU_ID_IMAGE_EXPLAIN[\s\S]*"remote-image"/)
})

test("restored conversations only show saved state when pinned", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(popupSource.includes("pinned: entry.pinned"), true)
  assert.equal(
    floatingSource.includes('setSavedId(restore.pinned ? requestId : "")'),
    true
  )
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
})

test("translation target language prompt supports explicit targets", () => {
  assert.equal(normalizeTranslationTargetLanguage("bad-value"), "auto")
  assert.equal(getTranslationTargetLabel("en"), "英文")
  assert.equal(buildTranslationSystemPrompt("auto"), TRANSLATION_SYSTEM_PROMPT)
  assert.match(buildTranslationSystemPrompt("en"), /翻译成自然、准确的英文/)
  assert.match(buildTranslationSystemPrompt("ja"), /翻译成自然、准确的日文/)
  assert.doesNotMatch(
    buildTranslationSystemPrompt("fr"),
    /Google|百度|有道|fallback/i
  )
})

test("inline translation routing keeps short text inline and long text in result panel", () => {
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
      route: "result-panel",
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
      route: "result-panel",
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

test("model registry 覆盖当前批准 provider 与 v0.2 first-batch presets", () => {
  assert.deepEqual(Object.keys(PROVIDER_REGISTRY).sort(), [
    "anthropic",
    "deepseek",
    "doubao",
    "gemini",
    "hunyuan",
    "moonshot",
    "openai",
    "openrouter"
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
  assert.equal(
    PROVIDER_REGISTRY.deepseek.hostPermission,
    "https://api.deepseek.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.moonshot.hostPermission,
    "https://api.moonshot.cn/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.openrouter.hostPermission,
    "https://openrouter.ai/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.gemini.hostPermission,
    "https://generativelanguage.googleapis.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.hunyuan.hostPermission,
    "https://api.hunyuan.cloud.tencent.com/*"
  )
  assert.equal(PROVIDER_REGISTRY.deepseek.baseURL, DEEPSEEK_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.moonshot.baseURL, MOONSHOT_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.openrouter.baseURL, OPENROUTER_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.gemini.baseURL, GEMINI_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.hunyuan.baseURL, HUNYUAN_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.deepseek.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.moonshot.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.openrouter.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.gemini.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.hunyuan.sdk, "openai-compatible")
  assert.equal(PROVIDER_PRIMARY_MODEL.deepseek, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.moonshot, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.openrouter, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.gemini, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.hunyuan, "")
  assert.equal(PROVIDER_REGISTRY.openai.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.anthropic.reasoningControl, "unsupported")
  assert.equal(PROVIDER_REGISTRY.doubao.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.deepseek.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.moonshot.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.openrouter.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.gemini.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.hunyuan.reasoningControl, "model-dependent")
  assert.equal(MODEL_REGISTRY["gpt-4o-mini"].supportsReasoningControl, false)
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

test("provider config route supports multiple configs and default selection", () => {
  const workDoubao = {
    id: "cfg-doubao-work",
    provider: "doubao",
    displayName: "豆包工作 App",
    model: "ep-work",
    createdAt: 100,
    updatedAt: 100
  } as const
  const personalDoubao = {
    id: "cfg-doubao-personal",
    provider: "doubao",
    displayName: "豆包个人 App",
    model: "ep-personal",
    createdAt: 200,
    updatedAt: 200
  } as const

  const route = resolveModelRoute(undefined, {
    defaultProviderConfigId: personalDoubao.id,
    providerConfigs: [workDoubao, personalDoubao],
    defaultModel: "doubao"
  })

  assert.equal(route.providerConfigId, personalDoubao.id)
  assert.equal(route.providerConfigName, "豆包个人 App")
  assert.equal(route.provider.id, "doubao")
  assert.equal(route.requestModel, "ep-personal")
})

test("fast model strategy uses configured fast provider only for short operations", () => {
  const defaultConfig = {
    id: "cfg-openai-default",
    provider: "openai",
    displayName: "OpenAI Default",
    model: "gpt-4o-mini",
    createdAt: 100,
    updatedAt: 100
  } as const
  const fastConfig = {
    id: "cfg-deepseek-fast",
    provider: "deepseek",
    displayName: "DeepSeek Fast",
    model: "deepseek-chat",
    createdAt: 200,
    updatedAt: 200
  } as const
  const settings = {
    defaultModel: "gpt-4o-mini",
    defaultProviderConfigId: defaultConfig.id,
    fastProviderConfigId: fastConfig.id,
    providerConfigs: [defaultConfig, fastConfig],
    doubaoModel: ""
  }

  const defaultRoute = resolveModelRoute(undefined, settings)
  const fastRoute = resolveFastModelRouteForOperation(
    { operation: "translate", context: "selection" },
    settings,
    settings.providerConfigs
  )

  assert.equal(defaultRoute.providerConfigId, defaultConfig.id)
  assert.equal(defaultRoute.provider.id, "openai")
  assert.equal(fastRoute?.providerConfigId, fastConfig.id)
  assert.equal(fastRoute?.provider.id, "deepseek")
  assert.equal(fastRoute?.requestModel, "deepseek-chat")

  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "explain", context: "selection" },
      { ...settings, fastProviderConfigId: "" },
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "translate", context: "page" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "summarize", context: "page", pageContent: "long page" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      {
        operation: "image_explain",
        context: "image",
        imageSource: "remote-image",
        srcUrl: "https://example.com/a.png"
      },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "custom", context: "selection" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
})

test("fast model strategy preserves missing-model guard for configured short tasks", () => {
  const missingFastConfig = {
    id: "cfg-openrouter-fast",
    provider: "openrouter",
    displayName: "OpenRouter Fast",
    model: "",
    createdAt: 100,
    updatedAt: 100
  } as const
  const route = resolveFastModelRouteForOperation(
    { operation: "polish", context: "selection" },
    {
      fastProviderConfigId: missingFastConfig.id,
      providerConfigs: [missingFastConfig]
    },
    [missingFastConfig]
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.equal(route?.provider.id, "openrouter")
  assert.equal(route?.requestModel, "")
  assert.equal(route?.missingConfig, "model")
  assert.match(aiClientSource, /resolveFastModelRouteForOperation/)
  assert.match(
    aiClientSource,
    /resolveRuntimeModelRoute\(payload\.model, settings\)/
  )
  assert.match(
    aiClientSource,
    /if \(route\.missingConfig\) \{[\s\S]*?throw new Error\("模型 ID 或接入点未配置/
  )
})

test("OpenAI-compatible provider configs require manual model before provider call", () => {
  const sampleModels = {
    deepseek: "deepseek-chat",
    moonshot: "moonshot-v1-8k",
    openrouter: "openai/gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    hunyuan: "hunyuan-lite"
  } as const

  for (const provider of [
    "deepseek",
    "moonshot",
    "openrouter",
    "gemini",
    "hunyuan"
  ] as const) {
    const baseConfig = {
      id: `cfg-${provider}`,
      provider,
      displayName: PROVIDER_REGISTRY[provider].displayName,
      model: "",
      createdAt: 100,
      updatedAt: 100
    } as const
    const missing = buildProviderConfigRoute(baseConfig)
    const configured = buildProviderConfigRoute({
      ...baseConfig,
      model: sampleModels[provider]
    })

    assert.equal(missing.provider.id, provider)
    assert.equal(missing.provider.sdk, "openai-compatible")
    assert.equal(missing.requestModel, "")
    assert.equal(missing.missingConfig, "model")
    assert.equal(configured.missingConfig, undefined)
    assert.equal(configured.requestModel, sampleModels[provider])
  }
})

test("reasoning controls stay disabled unless provider and model both declare support", () => {
  assert.match(
    getReasoningControlBlockReason(resolveModelRoute("gpt-4o-mini", {})) ?? "",
    /当前模型未声明支持/
  )

  assert.equal(
    getReasoningControlBlockReason(resolveModelRoute("o3-mini", {})),
    null
  )

  const deepseekRoute = buildProviderConfigRoute({
    id: "cfg-deepseek",
    provider: "deepseek",
    displayName: "DeepSeek",
    model: "deepseek-chat",
    createdAt: 100,
    updatedAt: 100
  })

  assert.equal(deepseekRoute.provider.reasoningControl, "model-dependent")
  assert.equal(deepseekRoute.model.supportsReasoningControl, false)
  assert.match(
    getReasoningControlBlockReason(deepseekRoute) ?? "",
    /不会自动发送思考\/推理控制参数/
  )

  const doubaoThinkingRoute = buildProviderConfigRoute({
    id: "cfg-doubao-thinking",
    provider: "doubao",
    displayName: "豆包 Thinking",
    model: "doubao-seed-1-6-thinking",
    createdAt: 100,
    updatedAt: 100
  })

  assert.equal(doubaoThinkingRoute.provider.reasoningControl, "model-dependent")
  assert.equal(doubaoThinkingRoute.model.supportsReasoningControl, true)
  assert.equal(getReasoningControlBlockReason(doubaoThinkingRoute), null)
})

test("reasoning request params are gated by operation, provider, and model", () => {
  const selectionTranslate = {
    operation: "translate",
    context: "selection",
    selectionText: "Hello"
  } as const

  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "o3-mini",
      payload: selectionTranslate
    }),
    { reasoning_effort: "low" }
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      payload: { ...selectionTranslate, operation: "explain" }
    }),
    { thinking: { type: "enabled" } }
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "gpt-4o-mini",
      payload: selectionTranslate
    }),
    {}
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "o3-mini",
      payload: {
        operation: "summarize",
        context: "page",
        pageContent: "Long page"
      }
    }),
    {}
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "doubao",
      modelOrEndpoint: "ep-20260615-default",
      payload: selectionTranslate
    }),
    {}
  )
  assert.equal(
    shouldUseMaxCompletionTokens({
      providerId: "openai",
      modelOrEndpoint: "o3-mini"
    }),
    true
  )
  assert.equal(
    shouldUseMaxCompletionTokens({
      providerId: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking"
    }),
    false
  )
})

test("reasoning stream deltas parse separately from answer text", () => {
  assert.equal(
    extractReasoningDeltaText({
      choices: [{ delta: { reasoning_content: "先判断语境。" } }]
    }),
    "先判断语境。"
  )
  assert.equal(
    extractReasoningDeltaText({
      delta: { reasoning: { text: "再输出译文。" } }
    }),
    "再输出译文。"
  )
  assert.equal(
    extractReasoningDeltaText({
      choices: [{ delta: { content: "Final answer" } }]
    }),
    ""
  )
})

test("legacy provider keys map to provider configs without changing storage keys", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )

  assert.match(providerConfigSource, /getLegacyProviderConfigs/)
  assert.match(providerConfigSource, /LEGACY_PROVIDER_CONFIG_IDS/)
  assert.match(providerConfigSource, /apiKeys\[provider\]/)
  assert.match(
    providerConfigSource,
    /apiKeys\.providerConfigKeys\[config\.id\]/
  )
  assert.match(storageSource, /providerConfigKeys/)
  assert.match(storageSource, /contextai_api_keys/)
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.openai, "legacy-openai")
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.anthropic, "legacy-anthropic")
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.doubao, "legacy-doubao")
  assert.equal("deepseek" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("moonshot" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("openrouter" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("gemini" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("hunyuan" in LEGACY_PROVIDER_CONFIG_IDS, false)
})

test("popup provider config save allows incomplete drafts and clears stale test state", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const saveBlock =
    popupSource.match(
      /const saveProviderConfigInstance = async \(config: ProviderConfig\) => \{[\s\S]*?\n  \}\n\n  const cancelProviderConfigEdit/
    )?.[0] ?? ""
  const testBlock =
    popupSource.match(
      /const testProviderConfigInstance = async \(config: ProviderConfig\) => \{[\s\S]*?\n  \}\n\n  const clearConnectivityResult/
    )?.[0] ?? ""

  assert.match(saveBlock, /const normalizedKeyInput = keyInput\.trim\(\)/)
  assert.match(
    saveBlock,
    /await saveProviderConfigApiKey\(config\.id, normalizedKeyInput\)/
  )
  assert.doesNotMatch(
    saveBlock,
    /saveProviderConfigApiKey\(config\.id, keyInput\)/
  )
  assert.match(saveBlock, /delete next\[config\.id\]/)
  assert.match(saveBlock, /clearProviderConfigTestResult\(normalizedConfig\)/)
  assert.doesNotMatch(saveBlock, /buildConnectivityPreflightSummary/)
  assert.doesNotMatch(saveBlock, /popup\.provider\.apiKeyMissing/)
  assert.doesNotMatch(saveBlock, /popup\.provider\.endpointMissing/)
  assert.match(testBlock, /buildConnectivityPreflightSummary/)
  assert.match(testBlock, /popup\.provider\.apiKeyMissing/)
  assert.match(testBlock, /popup\.provider\.endpointMissing/)
  assert.match(
    testBlock,
    /await saveProviderConfigApiKey\(config\.id, normalizedKeyInput\)/
  )
  assert.doesNotMatch(
    testBlock,
    /saveProviderConfigApiKey\(config\.id, keyInput\)/
  )
})

test("API key storage normalizes hidden whitespace before saving and reading", () => {
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(storageSource, /function normalizeApiKeyInput/)
  assert.match(storageSource, /return value\.trim\(\)/)
  assert.match(
    storageSource,
    /normalizeApiKeyInput\(decryptApiKey\(raw\.openai\)\)/
  )
  assert.match(
    storageSource,
    /const normalizedKey = normalizeApiKeyInput\(plainKey\)/
  )
  assert.match(storageSource, /encryptApiKey\(normalizedKey\)/)
  assert.doesNotMatch(storageSource, /encryptApiKey\(plainKey\)/)
  assert.match(popupSource, /const normalizedKeyInput = keyInput\.trim\(\)/)
  assert.match(popupSource, /normalizedKeyInput\.slice\(-4\)/)
  assert.doesNotMatch(popupSource, /keyInput\.slice\(-4\)/)
})

test("provider config stores last connectivity result by provider and model", () => {
  const typeSource = readFileSync(
    new URL("../src/types/history.ts", import.meta.url),
    "utf8"
  )
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const connectivitySource = readFileSync(
    new URL("../src/utils/provider-connectivity.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(typeSource, /testProvider\?: ProviderConfigProvider/)
  assert.match(typeSource, /testModel\?: string/)
  assert.match(typeSource, /testCompletionMs\?: number/)
  assert.match(providerConfigSource, /markProviderConfigTestResult/)
  assert.match(providerConfigSource, /testProvider: config\.provider/)
  assert.match(
    providerConfigSource,
    /testModel: getProviderConfigTestModel\(config\)/
  )
  assert.match(connectivitySource, /buildLastConnectivityTestSummaryMap/)
  assert.match(connectivitySource, /completionMs: config\.testCompletionMs/)
  assert.match(connectivitySource, /上次通过/)
  assert.match(connectivitySource, /上次失败/)
  assert.match(popupSource, /buildLastConnectivityTestSummaryMap\(configs\)/)
  assert.match(popupSource, /resolveConnectivitySpeedGrade\(connectivity\)/)
  assert.match(popupSource, /withPopupConnectivityTiming\(summary, testedAt\)/)
  assert.match(popupSource, /popup\.connectivity\.lastPassed/)
  assert.match(popupSource, /popup\.connectivity\.lastFailed/)
  assert.match(popupSource, /popup\.connectivity\.safetyNote/)
  assert.doesNotMatch(
    popupSource.match(/const rows = \[[\s\S]*?\n  \]/)?.[0] ?? "",
    /raw_prompt_logged|raw_response_logged|private_page_data_logged|latency_note/
  )
  assert.match(
    popupSource,
    /const \[expanded, setExpanded\] = useState\(false\)/
  )
  assert.match(popupSource, /aria-expanded=\{expanded\}/)
  assert.match(popupSource, /expanded &&\s*rows\.map/)
  assert.equal(
    getI18nMessage("popup.connectivity.showDetails", "zh-CN"),
    "展开详情"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.hideDetails", "en"),
    "Hide details"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.lastPassed", "en"),
    "Last connection test passed"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.lastFailed", "zh-CN"),
    "上次连接测试未通过"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.speed.untested", "zh-CN"),
    "未测速"
  )
  assert.equal(getI18nMessage("popup.connectivity.speed.fast", "en"), "Fast")
  assert.equal(getI18nMessage("popup.connectivity.noData", "zh-CN"), "暂无数据")
})

test("provider config connectivity result invalidates on key or model changes", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(providerConfigSource, /shouldClearProviderConfigTestResult/)
  assert.match(providerConfigSource, /options\.apiKeyChanged/)
  assert.match(providerConfigSource, /previous\.provider !== next\.provider/)
  assert.match(
    providerConfigSource,
    /getProviderConfigTestModel\(previous\) !== getProviderConfigTestModel\(nextConfig\)/
  )
  assert.match(popupSource, /\{ apiKeyChanged: true \}/)
  assert.match(popupSource, /clearProviderConfigTestResult\(normalizedConfig\)/)
  assert.match(popupSource, /markProviderConfigTestResult\(savedConfig/)
})

test("provider connectivity handler refreshes runtime cache before validation", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const validationBlock =
    backgroundSource.match(
      /case "VALIDATE_PROVIDER_CONNECTIVITY":[\s\S]*?break/
    )?.[0] ?? ""

  assert.match(validationBlock, /clearAIRuntimeCaches\(\)/)
  assert.match(validationBlock, /handleProviderConnectivityTest/)
  assert.ok(
    validationBlock.indexOf("clearAIRuntimeCaches()") <
      validationBlock.indexOf("handleProviderConnectivityTest")
  )
})

test("AI runtime cache keeps BYOK direct-provider boundaries", () => {
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
  const handleAIRequestBlock =
    aiClientSource.match(
      /export async function handleAIRequest[\s\S]*?\nfunction getRouteApiKey/
    )?.[0] ?? ""

  assert.match(runtimeCacheSource, /CONFIG_CACHE_TTL_MS = 30_000/)
  assert.match(runtimeCacheSource, /getRuntimeConfigSnapshot/)
  assert.match(runtimeCacheSource, /getRuntimeOpenAIClient/)
  assert.match(runtimeCacheSource, /getRuntimeAnthropicClient/)
  assert.match(runtimeCacheSource, /clearAIRuntimeCaches/)
  assert.match(backgroundSource, /changes\.contextai_settings/)
  assert.match(backgroundSource, /changes\.contextai_api_keys/)
  assert.match(backgroundSource, /clearAIRuntimeCaches\(\)/)
  assert.doesNotMatch(handleAIRequestBlock, /handleProviderConnectivityTest/)
  assert.doesNotMatch(handleAIRequestBlock, /VALIDATE_PROVIDER_CONNECTIVITY/)
  assert.doesNotMatch(runtimeCacheSource, /chrome\.storage\.(local|sync)\.set/)
  assert.doesNotMatch(runtimeCacheSource, /provider proxy|proxy|backend/i)
})

test("model availability blocks unconfigured provider keys", () => {
  assert.equal(isProviderKeyConfigured(""), false)
  assert.equal(isProviderKeyConfigured("••••••••1234"), true)

  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: {},
    connectivityResults: {}
  })

  assert.deepEqual(availability, {
    disabled: true,
    status: "未配置 Key",
    tone: "danger"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: {},
    connectivityResults: {},
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: true,
    status: "Key missing",
    tone: "danger"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("model availability allows configured but untested models with status", () => {
  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o", {}),
    providerConfigured: { openai: true },
    connectivityResults: {}
  })

  assert.deepEqual(availability, {
    disabled: false,
    status: "未测试",
    tone: "muted"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o", {}),
    providerConfigured: { openai: true },
    connectivityResults: {},
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: false,
    status: "Untested",
    tone: "muted"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("model availability disables known failed connectivity", () => {
  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: { openai: true },
    connectivityResults: {
      openai: buildConnectivityValidationSummary({
        provider: "openai",
        modelOrEndpoint: "gpt-4o-mini",
        hostPermissionPresent: true,
        result: "failure",
        latencyNote: "failed",
        errorCategory: "unauthorized",
        notes: "failed"
      })
    }
  })

  assert.deepEqual(availability, {
    disabled: true,
    status: "Key 无效",
    tone: "danger"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: { openai: true },
    connectivityResults: {
      openai: buildConnectivityValidationSummary({
        provider: "openai",
        modelOrEndpoint: "gpt-4o-mini",
        hostPermissionPresent: true,
        result: "failure",
        latencyNote: "failed",
        errorCategory: "unauthorized",
        notes: "failed"
      })
    },
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: true,
    status: "Invalid key",
    tone: "danger"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("popup passes UI language into legacy model availability status", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /const resolvedUiLanguage = resolveUiLanguage/)
  assert.match(popupSource, /uiLanguage: resolvedUiLanguage/)
})

test("model availability handles doubao endpoint configuration", () => {
  const missing = getModelAvailability({
    route: resolveModelRoute("doubao", {}),
    providerConfigured: { doubao: true },
    connectivityResults: {}
  })

  assert.equal(missing.disabled, true)
  assert.equal(missing.status, "未配置接入点")

  const staleResult = getModelAvailability({
    route: resolveModelRoute("doubao", { doubaoModel: "ep-new" }),
    providerConfigured: { doubao: true },
    connectivityResults: {
      doubao: buildConnectivityValidationSummary({
        provider: "doubao",
        modelOrEndpoint: "ep-old",
        hostPermissionPresent: true,
        result: "success",
        latencyNote: "ok",
        errorCategory: "none",
        notes: "ok"
      })
    }
  })

  assert.deepEqual(staleResult, {
    disabled: false,
    status: "未测试",
    tone: "muted"
  })
})

test("command access local-only action ignores AI provider blockers", () => {
  const missingKey = describeCommandActionAccess({
    actionKind: "local",
    preview: "api_key_missing",
    route: resolveModelRoute("gpt-4o-mini", {})
  })
  const featureUnavailable = describeCommandActionAccess({
    actionKind: "local",
    preview: "feature_unavailable",
    route: resolveModelRoute("gpt-4o-mini", {})
  })

  assert.equal(missingKey.state, "local_only")
  assert.equal(missingKey.blocked, false)
  assert.equal(missingKey.usesProvider, false)
  assert.equal(featureUnavailable.state, "local_only")
  assert.equal(featureUnavailable.blocked, false)
})

test("command access BYOK active derives from current model route", () => {
  const route = resolveModelRoute("doubao", {
    doubaoModel: "doubao-seed-2-0-lite-260428"
  })
  const access = describeCommandActionAccess({
    actionKind: "ai",
    preview: "available",
    route
  })

  assert.equal(access.state, "BYOK_active")
  assert.equal(access.blocked, false)
  assert.equal(access.usesProvider, true)
  assert.match(access.detail, /豆包 \/ 火山方舟/)
  assert.match(access.detail, /doubao-seed-2-0-lite-260428/)
})

test("command access blockers match BYOK basic states", () => {
  for (const preview of [
    "loading",
    "api_key_missing",
    "model_unavailable",
    "feature_unavailable"
  ] as const) {
    const access = describeCommandActionAccess({
      actionKind: "ai",
      preview,
      route: resolveModelRoute("gpt-4o-mini", {})
    })

    assert.equal(access.blocked, true)
    assert.equal(isCommandAccessBlocked(preview), true)
  }
})

test("command access has no hosted quota login subscription mock copy", () => {
  const source = readFileSync(
    new URL("../src/utils/command-access.ts", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(
    source,
    /quota|额度|login|登录|subscription|订阅|hosted|Aviso AI|Mock/i
  )
  assert.match(source, /api_key_missing/)
  assert.match(source, /model_unavailable/)
  assert.match(source, /feature_unavailable/)
})

test("package host_permissions 精确匹配批准 provider 边界", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual(
    [...pkg.manifest.host_permissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_STAGING_HOST_PERMISSION
    ].sort()
  )
})

test("WXT host_permissions 与批准 provider 边界保持一致", () => {
  const wxtConfigSource = readFileSync(
    new URL("../wxt.config.ts", import.meta.url),
    "utf8"
  )
  const hostPermissions = Array.from(
    wxtConfigSource.matchAll(/"https:\/\/[^"]+\*"/g),
    (match) => match[0].slice(1, -1)
  )

  assert.deepEqual(
    [...hostPermissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_STAGING_HOST_PERMISSION
    ].sort()
  )
})

test("package 普通权限保持最小边界且包含 identity / clipboardWrite / history", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual([...pkg.manifest.permissions].sort(), [
    "activeTab",
    "bookmarks",
    "clipboardWrite",
    "contextMenus",
    "history",
    "identity",
    "storage"
  ])
})

test("manifest-facing localization uses Chrome _locales without permission expansion", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  const zhMessages = JSON.parse(
    readFileSync(
      new URL("../locales/zh_CN/messages.json", import.meta.url),
      "utf8"
    )
  )
  const enMessages = JSON.parse(
    readFileSync(
      new URL("../locales/en/messages.json", import.meta.url),
      "utf8"
    )
  )

  assert.equal(pkg.manifest.default_locale, "zh_CN")
  assert.equal(pkg.manifest.description, "__MSG_app_description__")
  assert.equal(
    pkg.manifest.commands["open-command-palette"].description,
    "__MSG_open_command_palette_description__"
  )
  assert.equal(
    zhMessages.app_description.message,
    "智能浏览器助手，感知操作对象，就地调用 AI，浮窗展示结果。"
  )
  assert.equal(
    enMessages.app_description.message,
    "An AI browser assistant for explaining, translating, polishing, and summarizing content in place."
  )
  assert.equal(
    zhMessages.open_command_palette_description.message,
    "打开命令面板"
  )
  assert.equal(
    enMessages.open_command_palette_description.message,
    "Open command palette"
  )
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

test("OpenAI / Anthropic mock-only connectivity gate covers route and sanitized summary", () => {
  for (const provider of ["openai", "anthropic"] as const) {
    const route = resolveModelRoute(getConnectivityModelId(provider), {})
    const summary = buildConnectivityValidationSummary({
      provider,
      modelOrEndpoint: route.requestModel,
      hostPermissionPresent: isProviderHostPermissionPresent(
        PROVIDER_REGISTRY[provider],
        APPROVED_PROVIDER_HOST_PERMISSIONS
      ),
      result: "success",
      latencyNote: "mock-only: provider SDK path returned a simulated stream.",
      errorCategory: "none",
      notes:
        "Mock validation only; no live provider request, raw prompt, raw response, private page data, screenshot, or API Key was recorded."
    })

    assert.equal(route.provider.id, provider)
    assert.equal(route.provider.sdk, provider)
    assert.equal(route.provider.requiresEndpointConfig, false)
    assert.equal(summary.result, "success")
    assert.equal(summary.host_permission_present, true)
    assert.equal(summary.secret_leak_check, "pass")
    assert.equal(summary.raw_prompt_logged, "no")
    assert.equal(summary.raw_response_logged, "no")
    assert.equal(summary.private_page_data_logged, "no")
    assert.match(summary.notes, /Mock validation only/)
    assert.match(summary.notes, /no live provider request/)
  }
})

test("OpenAI-compatible connectivity implementation uses fixed payload and non-streaming request", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const connectivityBlock =
    aiClientSource.match(
      /export async function handleProviderConnectivityTest[\s\S]*?\nexport async function handleAIRequest/
    )?.[0] ?? ""

  assert.match(
    connectivityBlock,
    /const testPayload = buildConnectivityTestPayload\(\)/
  )
  assert.match(connectivityBlock, /hasPrivateContextPayload\(testPayload\)/)
  assert.match(connectivityBlock, /route\.provider\.id === "anthropic"/)
  assert.match(connectivityBlock, /await callAnthropic/)
  assert.match(connectivityBlock, /await callOpenAIConnectivity/)
  assert.match(
    connectivityBlock,
    /requestId: `connectivity-\$\{route\.provider\.id\}`/
  )
  assert.match(
    connectivityBlock,
    /raw prompt、raw response、网页正文、截图或 API Key/
  )

  const connectivityRequestBlock =
    aiClientSource.match(
      /async function callOpenAIConnectivity[\s\S]*?\nasync function callAnthropic/
    )?.[0] ?? ""
  const streamingRequestBlock =
    aiClientSource.match(
      /async function callOpenAI\([\s\S]*?\nasync function callOpenAIConnectivity/
    )?.[0] ?? ""

  assert.match(connectivityRequestBlock, /stream: false/)
  assert.match(connectivityRequestBlock, /max_tokens: 64/)
  assert.doesNotMatch(connectivityRequestBlock, /for await/)
  assert.match(streamingRequestBlock, /stream: true/)
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
  assert.match(backgroundSource, /getRuntimeConfigSnapshot\(\)\.catch/)
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
  assert.match(backgroundSource, /await getRuntimeConfigSnapshot\(\)/)
  assert.match(toolbarSource, /function warmRuntimeConfig\(requestId: string\)/)
  assert.match(toolbarSource, /action: "WARM_RUNTIME_CONFIG"/)
  assert.match(toolbarSource, /warmRuntimeConfig\(requestId\)/)
  assert.match(
    toolbarSource,
    /if \(route\.route === "result-panel"\)[\s\S]*return[\s\S]*warmRuntimeConfig\(requestId\)/
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
  assert.match(showFloatingBlock, /await runtimeWarmup/)
  assert.match(showFloatingBlock, /await runAIRequestToFrame\(/)
  assert.match(
    showFloatingBlock,
    /responseFrameId: result\.frameId \?\? TOP_FRAME_ID/
  )
  assert.match(showFloatingBlock, /sendResponse\(aiResponse\)/)
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
    /pageUrl: request\.payload\.pageUrl \?\? sender\.tab\?\.url \?\? sender\.url/
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
