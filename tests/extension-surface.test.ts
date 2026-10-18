import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
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
import "./helpers/register-aliases.ts"

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

test("command palette shows explicit unsafe URL blocking", () => {
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const i18nSource = readFileSync(
    new URL("../src/utils/i18n-core.ts", import.meta.url),
    "utf8"
  )

  assert.match(commandSource, /isBlockedBrowserOpenUrlInput\(searchTarget\)/)
  assert.match(commandSource, /command\.unsafeUrlBlocked/)
  assert.match(i18nSource, /已拦截不安全链接/)
  assert.match(i18nSource, /javascript、data、file、chrome-extension/)
  assert.match(i18nSource, /Only confirmed http\(s\) link candidates can open/)
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
  assert.match(handleSelectBlock, /payload: \{ actionId: item\.actionId \}/)
  assert.match(handleSendToAiBlock, /!aiConnection\.connected/)
  assert.match(handleSendToAiBlock, /command\.aiDisconnected/)
  assert.match(commandSource, /providerLabel: route\.provider\.displayName/)
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
    /formatTranslationError\(displayError, languageRef\.current\)/
  )
  assert.match(toolbarSource, /getAiUnavailableDetailKey\(guidance\)/)
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
