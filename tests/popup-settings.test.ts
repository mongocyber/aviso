import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  createI18n,
  getI18nMessage,
  normalizeUiLanguageSetting,
  resolveUiLanguage
} from "../src/utils/i18n.ts"
import {
  hasDefaultModelChanged,
  hasUiLanguageChanged,
  haveProviderConfigMenusChanged,
  haveTemplatesChanged
} from "../src/utils/settings-change.ts"
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

test("popup translation target dropdown opens downward without clipping", () => {
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
  assert.match(popupSource, /setUiLangDropdownDirection/)
  assert.doesNotMatch(popupSource, /setLanguageDropdownDirection/)
  assert.match(popupSource, /data-language-dropdown/)
  assert.match(popupSource, /data-dropdown-direction="down"/)
  assert.match(popupSource, /setLanguageDropdownOpen\(\(open\) => !open\)/)
  assert.match(popupSource, /top: "calc\(100% \+ 7px\)"/)
  assert.match(popupSource, /styles\.miniDropdownMenuUp/)
  assert.doesNotMatch(menuBlock, /bottom: "calc\(100% \+ 7px\)"/)
  assert.match(menuBlock, /maxHeight: 248/)
  assert.match(menuBlock, /overflowY: "auto"/)
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
    /formatTranslationError\(displayError,\s*languageRef\.current\)/
  )
  assert.match(
    toolbarSource,
    /formatTranslationError\(\s*runtimeError\.message,\s*languageRef\.current\s*\)/
  )
  assert.match(
    toolbarSource,
    /const displayError = guidance[\s\S]*?formatTranslationError\(\s*displayError,\s*languageRef\.current\s*\)/
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

test("context-menu editable polish extracts active editable text", () => {
  const contextMenuSource = readFileSync(
    new URL("../src/background/context-menus.ts", import.meta.url),
    "utf8"
  )
  const readabilitySource = readFileSync(
    new URL("../src/contents/readability.ts", import.meta.url),
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

  assert.match(contextMenuSource, /MENU_ID_POLISH_EDITABLE/)
  assert.match(contextMenuSource, /requestEditableText/)
  assert.match(contextMenuSource, /EXTRACT_EDITABLE_TEXT/)
  assert.match(readabilitySource, /extractEditableText/)
  assert.match(readabilitySource, /getTextControlSelectionOrValue/)
  assert.match(readabilitySource, /TEXT_INPUT_TYPES/)
  assert.match(messageSource, /action: "EXTRACT_EDITABLE_TEXT"/)
  assert.match(floatingSource, /context === "editable"/)
  assert.match(floatingSource, /selectionText \|\| userMessage \|\| ""/)
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
