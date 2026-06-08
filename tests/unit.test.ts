import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

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
import { normalizeError } from "../src/utils/errors.ts"
import {
  buildFollowUpPriorContext,
  DEFAULT_FOLLOW_UP_CONTEXT_BUDGET
} from "../src/utils/follow-up-context.ts"
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
  DEFAULT_MODEL_ID,
  DOUBAO_BASE_URL,
  LEGACY_PROVIDER_CONFIG_IDS,
  MODEL_REGISTRY,
  PROVIDER_PRIMARY_MODEL,
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
  buildConnectivityPreflightSummary,
  buildConnectivityValidationSummary,
  categorizeConnectivityError,
  CONNECTIVITY_TEST_PROMPT,
  getConnectivityModelId,
  hasPrivateContextPayload,
  isProviderHostPermissionPresent
} from "../src/utils/provider-connectivity.ts"
import {
  shouldShowSlowResponseHint,
  SLOW_FIRST_CHUNK_MS,
  SLOW_MODEL_RESPONSE_TEXT
} from "../src/utils/response-guard.ts"
import {
  bucketScreenshotDataUrl,
  clampScreenshotToolbarPosition,
  getScreenshotVisionBlockReason,
  isSupportedScreenshotDataUrl,
  normalizeScreenshotCaptureError,
  normalizeScreenshotRegion
} from "../src/utils/screenshot.ts"
import {
  hasDefaultModelChanged,
  haveTemplatesChanged
} from "../src/utils/settings-change.ts"
import { expandTemplate } from "../src/utils/template.ts"
import {
  bucketInputSize,
  buildPerfSummary,
  categorizePerfError,
  sanitizeTimingDetails
} from "../src/utils/timing.ts"
import {
  buildTranslationUserContent,
  buildTranslationSystemPrompt,
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

test("detectType 识别 URL", () => {
  assert.equal(detectType("https://example.com/path?q=1"), "url")
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
  assert.match(backgroundSource, /console\.info\("\[Aviso\] Bookmark search:", meta\)/)
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
  assert.match(commandSource, /搜索历史、书签、AI 对话/)
  assert.match(commandSource, /AI 可用/)
  assert.match(commandSource, /AI 未连接/)
  assert.match(commandSource, /Tab 填入/)

  const inputArea =
    commandSource.match(/\{\/\* 输入框 \*\/\}[\s\S]*?<\/div>\n\n        \{\(canFillSelection \|\| aiNotice\)/)?.[0] ??
    ""
  assert.match(inputArea, /aria-label="AI 状态"/)
  assert.match(inputArea, /name="shield"[\s\S]*\{statusLabel\}/)
  assert.match(inputArea, /maxWidth: "38%"/)
  assert.match(inputArea, /textOverflow: "ellipsis"/)
  assert.doesNotMatch(commandSource, /连接后可把无结果输入发给 AI/)
  assert.match(commandSource, /\{\(canFillSelection \|\| aiNotice\) && \(/)
})

test("popup avoids BYOK and hosted account entry copy", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(popupSource.includes("BYOK"), false)
  assert.equal(popupSource.includes("Aviso AI"), false)
  assert.equal(popupSource.includes("匿名额度"), false)
  assert.equal(popupSource.includes("订阅"), false)
  assert.equal(popupSource.includes("登录"), false)
  assert.match(popupSource, /AI 服务/)
  assert.match(popupSource, /连接自己的 AI 服务/)
  assert.match(popupSource, /常用指令/)
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

  assert.match(popupSource, /设置/)
  assert.match(popupSource, /AI 服务/)
  assert.match(popupSource, /记录/)
  assert.match(popupSource, /指令/)
  assert.match(popupSource, /当前模型/)
  assert.match(popupSource, /添加 AI 服务/)
  assert.match(popupSource, /本地可用/)
  assert.match(popupSource, /配置和连通测试/)
  assert.match(popupSource, /type ProviderCardMode = "view" \| "edit" \| "add"/)
  assert.match(popupSource, /providerConfigs/)
  assert.match(popupSource, /providerConfigKeyInputs/)
  assert.match(popupSource, /addProviderConfigDraft/)
  assert.match(popupSource, /deleteProviderConfigInstance/)
  assert.match(popupSource, /新增中/)
  assert.match(popupSource, /未保存/)
  assert.match(popupSource, /编辑配置/)
  assert.match(popupSource, /删除草稿/)
  assert.match(popupSource, /最近对话会自动保存/)
  assert.match(popupSource, /浅色/)
  assert.match(popupSource, /深色/)
  assert.match(popupSource, /跟随系统/)
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
  const toolbarIndex = popupSource.indexOf('"划词工具栏"')
  const translationIndex = popupSource.indexOf('"内联翻译"')
  const commandIndex = popupSource.indexOf('"命令面板"')

  assert.ok(toolbarIndex > 0)
  assert.ok(translationIndex > toolbarIndex)
  assert.ok(commandIndex > translationIndex)
  assert.equal(popupSource.includes('"划词翻译"'), false)
  assert.match(popupSource, /name="features"/)
  assert.match(popupSource, /"selection",\s*"划词工具栏"/)
  assert.match(popupSource, /"translate",\s*"内联翻译"/)
  assert.match(popupSource, /"commandPanel",\s*"命令面板"/)
  assert.match(popupSource, /"clipboard",\s*"剪贴板提示"/)
  assert.match(popupSource, /"doubleClick",\s*"双击入口"/)
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
  assert.match(popupSource, /data-dropdown-direction=\{languageDropdownDirection\}/)
  assert.match(popupSource, /styles\.miniDropdownMenuDown/)
  assert.match(popupSource, /styles\.miniDropdownMenuUp/)
  assert.match(popupSource, /top: "calc\(100% \+ 7px\)"/)
  assert.match(popupSource, /bottom: "calc\(100% \+ 7px\)"/)
  assert.doesNotMatch(menuBlock, /bottom: "calc\(100% \+ 7px\)"/)
  assert.match(settingListBlock, /overflow: "hidden"/)
  assert.match(settingListOpenBlock, /overflow: "visible"/)
  assert.match(popupSource, /\.\.\.\(languageDropdownOpen \? styles\.settingListDropdownOpen : \{\}\)/)
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
    popupSource.match(/const servicePills:[\s\S]*?const configStateLabel/)?.[0] ??
    ""

  assert.doesNotMatch(popupSource, /styles\.editingBadge/)
  assert.doesNotMatch(serviceConfigTopBlock, /默认/)
  assert.doesNotMatch(serviceConfigTopBlock, /新增中/)
  assert.doesNotMatch(serviceConfigTopBlock, /编辑中/)
  assert.match(servicePillsBlock, /label: "默认"/)
  assert.match(servicePillsBlock, /label: "新增中"/)
  assert.match(servicePillsBlock, /label: "编辑中"/)
  assert.match(servicePillsBlock, /label: "未保存"/)
  assert.match(popupSource, /servicePills\.map\(\(pill\) =>/)
  assert.match(popupSource, /getDropdownStatusStyle\(pill\.tone, ui\)/)
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
  assert.match(popupSource, /确定删除/)
  assert.match(popupSource, /取消/)
  assert.match(
    popupSource,
    /isAdd\s*\?\s*deleteProviderConfigInstance\(config\)\s*:\s*setConfirmingDeleteProviderConfigId\(config\.id\)/
  )
  assert.match(
    popupSource,
    /title="删除配置"[\s\S]{0,500}setConfirmingDeleteProviderConfigId\(config\.id\)/
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
    /title=\{isAdd \? "删除草稿" : "删除配置"\}[\s\S]{0,500}name="close"/
  )
  assert.doesNotMatch(
    popupSource,
    /title="删除配置"[\s\S]{0,500}name="close"/
  )
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
      popupSource.match(new RegExp(`${styleName}: \\{[\\s\\S]*?\\n  \\}`))?.[0] ??
      ""
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
    toolbarSource.match(/function InlineTranslationCard\([\s\S]*?\nfunction InlineCardButton/)?.[0] ??
    ""

  assert.match(inlineCardBlock, /label="发给 AI"/)
  assert.doesNotMatch(inlineCardBlock, /label="结果面板"/)
})

test("popup local cards keep draft icons and two-line copy", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /\["copy", "复制上下文", "复制当前页"/)
  assert.match(popupSource, /\["search", "搜索记录", "打开命令面板"/)
  assert.match(popupSource, /"history",\s*"恢复对话",\s*"打开记录"/)
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
  assert.match(popupSource, /label: "浅色模式"/)
  assert.match(popupSource, /label: "深色模式"/)
  assert.match(popupSource, /label: "跟随系统"/)
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
  assert.match(popupSource, /Math\.min\(viewportHeight, POPUP_FRAME\.safeMaxHeight\)/)
  assert.match(popupSource, /window\.addEventListener\("resize", updatePopupHeight\)/)
  assert.match(popupSource, /const popupHeightCss = `\$\{popupHeight\}px`/)
  assert.match(popupSource, /#\__plasmo \{[\s\S]*height: \$\{popupHeightCss\} !important;/)
  assert.match(popupSource, /#root,[\s\S]*body > div \{[\s\S]*height: \$\{popupHeightCss\} !important;/)
  assert.match(popupSource, /overflow: hidden !important;/)
  assert.doesNotMatch(popupSource, /position: fixed !important/)
  assert.doesNotMatch(popupSource, /100vh/)
  assert.match(popupSource, /#aviso-popup-content \{[\s\S]*overflow-y: auto !important;/)
  assert.match(popupSource, /#aviso-popup-content \{[\s\S]*height: 0 !important;/)
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
    /borderBottomColor: tab === t \? ui\.accent : "transparent"/
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

  assert.match(themeSource, /export type AvisoThemeMode = "light" \| "dark" \| "system"/)
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

test("context-menu screenshot entry is explicitly internal-only", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )

  assert.equal(
    contextMenuSource.includes('title: "截图提问（内部试用）"'),
    true
  )
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

  assert.match(contextMenuSource, /title: "解释选中文本"/)
  assert.match(contextMenuSource, /title: "翻译选中文本"/)
  assert.match(contextMenuSource, /title: "润色选中文本"/)
  assert.match(contextMenuSource, /title: "总结选中文本"/)
  assert.match(contextMenuSource, /selectionText: info\.selectionText \?\? ""/)
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
    /settings\.templates\.map\(\(t\) =>\s+draft\?\.id === t\.id \? \(\s+renderTemplateForm\(draft, t\.id\)/s
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
      Array(INLINE_TRANSLATION_MAX_LINES + 2).fill("x").join("\n")
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
  assert.match(providerConfigSource, /apiKeys\.providerConfigKeys\[config\.id\]/)
  assert.match(storageSource, /providerConfigKeys/)
  assert.match(storageSource, /contextai_api_keys/)
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
  assert.match(providerConfigSource, /markProviderConfigTestResult/)
  assert.match(providerConfigSource, /testProvider: config\.provider/)
  assert.match(providerConfigSource, /testModel: getProviderConfigTestModel\(config\)/)
  assert.match(connectivitySource, /buildLastConnectivityTestSummaryMap/)
  assert.match(connectivitySource, /上次通过/)
  assert.match(connectivitySource, /上次失败/)
  assert.match(popupSource, /buildLastConnectivityTestSummaryMap\(configs\)/)
  assert.match(popupSource, /上次连接测试通过/)
  assert.match(popupSource, /上次连接测试未通过/)
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
  assert.equal(trimmed.some((entry) => entry.id === "pinned-old"), true)
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

test("inline translation uses shared two-second slow hint without fake output", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )

  assert.match(toolbarSource, /const INLINE_TRANSLATION_DEBOUNCE_MS = 100/)
  assert.match(toolbarSource, /startInlineSlowHintTimer/)
  assert.match(toolbarSource, /shouldShowSlowResponseHint/)
  assert.match(toolbarSource, /statusText: SLOW_MODEL_RESPONSE_TEXT/)
  assert.match(toolbarSource, /card\.output \|\| card\.statusText \|\| "正在翻译\.\.\."/)
  assert.doesNotMatch(toolbarSource, /output: SLOW_MODEL_RESPONSE_TEXT/)
})

test("translation triggers avoid avoidable local waits", () => {
  const toolbarSource = readFileSync(
    new URL("../src/contents/toolbar.tsx", import.meta.url),
    "utf8"
  )
  const commandSource = readFileSync(
    new URL("../src/contents/command.tsx", import.meta.url),
    "utf8"
  )
  const retryBlock =
    toolbarSource.match(/const retryInlineTranslation = \(\) => \{[\s\S]*?\n  \}/)
      ?.[0] ?? ""
  const toolbarOperationBlock =
    toolbarSource.match(/const handleOperation = \(op: Operation\) => \{[\s\S]*?\n  \}/)
      ?.[0] ?? ""
  const commandEnterBlock =
    commandSource.match(/} else if \(e\.key === "Enter"\) \{[\s\S]*?\n    \}/)
      ?.[0] ?? ""

  assert.doesNotMatch(retryBlock, /setTimeout/)
  assert.doesNotMatch(toolbarOperationBlock, /setTimeout/)
  assert.match(commandSource, /parseIntentLocally/)
  assert.match(commandSource, /isDirectTranslateIntent/)
  assert.match(commandEnterBlock, /handleSendToAI\(directTranslateIntent\)/)
  assert.doesNotMatch(commandSource, /await parseUserIntent/)
})

test("AI output token budgets stay small for common short operations", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const tokenBudgetBlock =
    aiClientSource.match(/export function getMaxOutputTokens[\s\S]*?\n\}/)?.[0] ??
    ""

  assert.match(tokenBudgetBlock, /getTranslationMaxOutputTokens\(payload\)/)
  assert.match(tokenBudgetBlock, /operation === "polish"\) return 768/)
  assert.match(tokenBudgetBlock, /return 1024/)
  assert.equal(
    getTranslationMaxOutputTokens({ operation: "translate", selectionText: "hello" }),
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
  assert.doesNotMatch(translationCacheSource, /chrome\.storage/)
  assert.match(runtimeCacheSource, /clearTranslationMemoryCache/)
  assert.match(aiClientSource, /getCachedTranslation\(translationCacheKey\)/)
  assert.match(aiClientSource, /setCachedTranslation\(translationCacheKey, translationOutput\)/)
  assert.match(
    backgroundSource,
    /pageUrl: request\.payload\.pageUrl \?\? sender\.tab\?\.url \?\? sender\.url/
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
  assert.equal(
    missingEndpoint.latency_note,
    "未发起：模型或接入点未配置。"
  )
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
  assert.equal(JSON.stringify(sanitized).includes("selected private text"), false)
  assert.equal(JSON.stringify(sanitized).includes("private page body"), false)
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
