import { useEffect, useLayoutEffect, useRef, useState } from "react"

import {
  aviso,
  AvisoIcon,
  AvisoMark,
  getAvisoThemeTokens,
  resolveAvisoTheme,
  visuallyStable
} from "~styles/aviso"
import type {
  AvisoIconName,
  AvisoThemeTokens,
  ResolvedAvisoTheme
} from "~styles/aviso"
import type {
  HistoryEntry,
  PromptTemplate,
  ProviderConfig,
  Settings
} from "~types/history"
import type { HostedGoogleSignInData, MessageResponse } from "~types/messages"
import {
  createHostedAiClient,
  HostedAiClientError
} from "~utils/hosted-ai-client"
import {
  buildHostedAccountQuotaDisplay,
  clearHostedSession,
  deriveHostedAccountStatus,
  getHostedMonthlyQuotaWindow,
  HOSTED_AI_DEFAULT_BASE_URL,
  HOSTED_AI_DEFAULT_MODEL,
  HOSTED_AI_PROVIDER_CONFIG_ID,
  HOSTED_SESSION_STORAGE_KEY,
  isHostedAiProviderConfigId,
  isHostedSessionUsable,
  readHostedSession,
  updateHostedSessionMe,
  type HostedAccountStatus,
  type StoredHostedSession
} from "~utils/hosted-session"
import {
  createI18n,
  resolveUiLanguage,
  type I18nKey,
  type UiLanguageSetting
} from "~utils/i18n"
import type { ModelAvailability } from "~utils/model-availability"
import { getModelAvailability } from "~utils/model-availability"
import type { ProviderId } from "~utils/model-registry"
import {
  buildProviderConfigRoute,
  PROVIDER_PRIMARY_MODEL,
  resolveModelRoute
} from "~utils/model-registry"
import {
  buildProviderConfig,
  clearProviderConfigTestResult,
  createProviderConfigId,
  defaultProviderConfigName,
  defaultProviderModel,
  getLegacyProviderFromConfigId,
  getModelForProviderConfig,
  getProviderConfigKey,
  getProviderConfigsWithLegacy,
  isLegacyProviderConfigId,
  markProviderConfigTestResult,
  requiresProviderConfigModel,
  resolvePopupCurrentModelProviderConfigId,
  shouldClearProviderConfigTestResult
} from "~utils/provider-configs"
import {
  buildConnectivityPreflightSummary,
  buildLastConnectivityTestSummaryMap,
  getConnectivityTimingSummary,
  resolveConnectivitySpeedGrade,
  type ConnectivityValidationSummary
} from "~utils/provider-connectivity"
import {
  deleteProviderConfigApiKey,
  getApiKeys,
  getSettings,
  saveApiKey,
  saveProviderConfigApiKey,
  saveSettings
} from "~utils/storage"
import type { ApiKeys } from "~utils/storage"
import { TRANSLATION_TARGET_OPTIONS } from "~utils/translation"

const TEMPLATE_CONTEXTS: { value: string; labelKey: I18nKey }[] = [
  { value: "selection", labelKey: "popup.templates.context.selection" },
  { value: "link", labelKey: "popup.templates.context.link" },
  { value: "image", labelKey: "popup.templates.context.image" },
  { value: "editable", labelKey: "popup.templates.context.editable" },
  { value: "page", labelKey: "popup.templates.context.page" }
]

type PopupRuntimeResponse<TData = unknown> = Omit<MessageResponse, "data"> & {
  data?: TData
}

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  defaultProviderConfigId: "",
  fastProviderConfigId: "",
  providerConfigs: [],
  appearanceTheme: "system",
  uiLanguage: "auto",
  enableClipboardSense: true,
  enableToolbar: true,
  enableCommandPalette: true,
  enableDoubleClickMenu: false,
  enableInlineTranslation: false,
  inlineTranslationTargetLanguage: "auto",
  templates: []
}

const MODEL_OPTIONS: { value: string; labelKey: I18nKey }[] = [
  { value: "gpt-4o-mini", labelKey: "popup.model.gpt4oMini" },
  { value: "gpt-4o", labelKey: "popup.model.gpt4o" },
  { value: "claude-haiku-4-5-20251001", labelKey: "popup.model.claudeHaiku" },
  { value: "claude-sonnet-4-6", labelKey: "popup.model.claudeSonnet" },
  { value: "doubao", labelKey: "popup.model.doubao" }
]

const POPUP_FRAME = {
  width: 356,
  safeMaxHeight: 580
} as const

const CONNECTIVITY_TEST_TIMEOUT_MS = 45_000

const PROVIDER_ORDER: ProviderId[] = [
  "doubao",
  "openai",
  "anthropic",
  "deepseek",
  "moonshot",
  "openrouter",
  "gemini",
  "hunyuan"
]

function resolvePopupRuntimeHeight() {
  if (typeof window === "undefined") return POPUP_FRAME.safeMaxHeight
  const viewportHeight = Math.floor(window.innerHeight || 0)
  const availableScreenHeight = Math.floor(window.screen?.availHeight || 0)

  if (viewportHeight <= 0) return POPUP_FRAME.safeMaxHeight

  const hasRoomForSafeMax =
    availableScreenHeight >= POPUP_FRAME.safeMaxHeight + 120
  const looksAutoShrunkByChrome =
    hasRoomForSafeMax && viewportHeight < POPUP_FRAME.safeMaxHeight

  if (looksAutoShrunkByChrome) return POPUP_FRAME.safeMaxHeight

  return Math.max(360, Math.min(viewportHeight, POPUP_FRAME.safeMaxHeight))
}

type MiniDropdownDirection = "down" | "up"

function resolveMiniDropdownDirection(trigger: HTMLElement | null) {
  if (!trigger || typeof window === "undefined") return "down"

  const rect = trigger.getBoundingClientRect()
  const popupContentRect = document
    .getElementById("aviso-popup-content")
    ?.getBoundingClientRect()
  const viewportBottom = Math.floor(window.innerHeight || 0)
  const boundaryTop = popupContentRect?.top ?? 0
  const boundaryBottom = popupContentRect?.bottom ?? viewportBottom
  const menuHeight = TRANSLATION_TARGET_OPTIONS.length * 34 + 12
  const below = boundaryBottom - rect.bottom
  const above = rect.top - boundaryTop

  if (below >= menuHeight || below >= above) return "down"
  return "up"
}

const settingsSignature = (value: Settings) =>
  JSON.stringify({
    defaultModel: value.defaultModel,
    defaultProviderConfigId: value.defaultProviderConfigId ?? "",
    fastProviderConfigId: value.fastProviderConfigId ?? "",
    doubaoModel: value.doubaoModel ?? "",
    appearanceTheme: value.appearanceTheme,
    uiLanguage: value.uiLanguage,
    enableClipboardSense: value.enableClipboardSense,
    enableToolbar: value.enableToolbar,
    enableCommandPalette: value.enableCommandPalette,
    enableDoubleClickMenu: value.enableDoubleClickMenu,
    enableInlineTranslation: value.enableInlineTranslation,
    inlineTranslationTargetLanguage: value.inlineTranslationTargetLanguage,
    templates: value.templates ?? []
  })

function normalizeProviderConfigDraftUpdate(
  config: ProviderConfig,
  patch: Partial<ProviderConfig>,
  options: { apiKeyChanged?: boolean } = {}
): ProviderConfig {
  const next = {
    ...config,
    ...patch,
    updatedAt: Date.now()
  }

  return shouldClearProviderConfigTestResult(config, next, options)
    ? clearProviderConfigTestResult(next)
    : next
}

type PopupTab = "general" | "api" | "templates" | "history"

function getInitialPopupTab(): PopupTab {
  const hash =
    typeof window === "undefined" ? "" : window.location.hash.replace("#", "")
  return hash === "api" || hash === "history" || hash === "templates"
    ? hash
    : "general"
}

const APPEARANCE_OPTIONS: {
  value: Settings["appearanceTheme"]
  labelKey: I18nKey
  icon: ThemeModeIconName
}[] = [
  { value: "light", labelKey: "popup.theme.light", icon: "sun" },
  { value: "dark", labelKey: "popup.theme.dark", icon: "moon" },
  { value: "system", labelKey: "popup.theme.system", icon: "system" }
]

type ThemeModeIconName = "sun" | "moon" | "system"

const UI_LANGUAGE_OPTIONS: {
  value: UiLanguageSetting
  labelKey: I18nKey
}[] = [
  { value: "auto", labelKey: "settings.language.auto" },
  { value: "zh-CN", labelKey: "settings.language.zh" },
  { value: "en", labelKey: "settings.language.en" }
]

const PROVIDER_COPY: Record<
  ProviderId,
  {
    titleKey: I18nKey
    keyLabelKey: I18nKey
    keyPlaceholderKey: I18nKey
    modelLabelKey: I18nKey
    modelPlaceholderKey: I18nKey
    addLabelKey: I18nKey
  }
> = {
  openai: {
    titleKey: "popup.provider.openai",
    keyLabelKey: "popup.provider.openaiKey",
    keyPlaceholderKey: "popup.provider.openaiKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.openaiModelPlaceholder",
    addLabelKey: "popup.provider.openai"
  },
  anthropic: {
    titleKey: "popup.provider.anthropic",
    keyLabelKey: "popup.provider.anthropicKey",
    keyPlaceholderKey: "popup.provider.anthropicKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.anthropicModelPlaceholder",
    addLabelKey: "popup.provider.anthropic"
  },
  doubao: {
    titleKey: "popup.provider.doubao",
    keyLabelKey: "popup.provider.doubaoKey",
    keyPlaceholderKey: "popup.provider.doubaoKeyPlaceholder",
    modelLabelKey: "popup.provider.doubaoEndpointLabel",
    modelPlaceholderKey: "popup.provider.doubaoEndpointPlaceholder",
    addLabelKey: "popup.provider.doubao"
  },
  deepseek: {
    titleKey: "popup.provider.deepseek",
    keyLabelKey: "popup.provider.deepseekKey",
    keyPlaceholderKey: "popup.provider.deepseekKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.deepseekModelPlaceholder",
    addLabelKey: "popup.provider.deepseek"
  },
  moonshot: {
    titleKey: "popup.provider.moonshot",
    keyLabelKey: "popup.provider.moonshotKey",
    keyPlaceholderKey: "popup.provider.moonshotKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.moonshotModelPlaceholder",
    addLabelKey: "popup.provider.moonshot"
  },
  openrouter: {
    titleKey: "popup.provider.openrouter",
    keyLabelKey: "popup.provider.openrouterKey",
    keyPlaceholderKey: "popup.provider.openrouterKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.openrouterModelPlaceholder",
    addLabelKey: "popup.provider.openrouter"
  },
  gemini: {
    titleKey: "popup.provider.gemini",
    keyLabelKey: "popup.provider.geminiKey",
    keyPlaceholderKey: "popup.provider.geminiKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.geminiModelPlaceholder",
    addLabelKey: "popup.provider.gemini"
  },
  hunyuan: {
    titleKey: "popup.provider.hunyuan",
    keyLabelKey: "popup.provider.hunyuanKey",
    keyPlaceholderKey: "popup.provider.hunyuanKeyPlaceholder",
    modelLabelKey: "popup.provider.modelLabel",
    modelPlaceholderKey: "popup.provider.hunyuanModelPlaceholder",
    addLabelKey: "popup.provider.hunyuan"
  }
}

function getProviderCopy(provider: ProviderId, t: (key: I18nKey) => string) {
  const copy = PROVIDER_COPY[provider]
  return {
    title: t(copy.titleKey),
    keyLabel: t(copy.keyLabelKey),
    keyPlaceholder: t(copy.keyPlaceholderKey),
    modelLabel: t(copy.modelLabelKey),
    modelPlaceholder: t(copy.modelPlaceholderKey),
    addLabel: t(copy.addLabelKey)
  }
}

const POPUP_TRANSLATION_TARGET_LABELS: Record<
  Settings["inlineTranslationTargetLanguage"],
  string
> = {
  auto: "自动",
  "zh-CN": "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch"
}

function getTranslationTargetLabel(
  value: Settings["inlineTranslationTargetLanguage"],
  t: (key: I18nKey) => string
): string {
  if (value === "auto") return t("popup.translationTarget.auto")
  return POPUP_TRANSLATION_TARGET_LABELS[value]
}

type ProviderActionMessage = {
  tone: "ok" | "warning" | "danger" | "muted"
  text: string
}

type ProviderCardMode = "view" | "edit" | "add"
type LegacyProviderId = Extract<ProviderId, "openai" | "anthropic" | "doubao">

const normalizeCommonFeatureSettings = (value: Settings): Settings =>
  value.enableToolbar && value.enableInlineTranslation
    ? { ...value, enableToolbar: false }
    : value

function ThemeModeIcon({ name }: { name: ThemeModeIconName }) {
  const paths: Record<ThemeModeIconName, string> = {
    sun: '<circle cx="12" cy="12" r="4.2"></circle><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"></path>',
    moon: '<path d="M18.8 15.2A7.2 7.2 0 0 1 9 5.2 8.2 8.2 0 1 0 18.8 15.2z"></path>',
    system:
      '<rect x="4" y="5" width="16" height="11" rx="2.2"></rect><path d="M9 20h6M12 16v4"></path>'
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths[name] }}
    />
  )
}

function Popup() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [openaiKey, setOpenaiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [doubaoKey, setDoubaoKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [saveErrorKey, setSaveErrorKey] = useState<I18nKey | null>(null)
  const [tab, setTab] = useState<PopupTab>(() => getInitialPopupTab())
  const [testingProvider, setTestingProvider] = useState<ProviderId | null>(
    null
  )
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([])
  const [providerConfigKeys, setProviderConfigKeys] = useState<
    Record<string, string>
  >({})
  const [providerConfigKeyInputs, setProviderConfigKeyInputs] = useState<
    Record<string, string>
  >({})
  const [providerConfigModes, setProviderConfigModes] = useState<
    Record<string, ProviderCardMode>
  >({})
  const [activeProviderConfigId, setActiveProviderConfigId] = useState<
    string | null
  >(null)
  const [testingProviderConfigId, setTestingProviderConfigId] = useState<
    string | null
  >(null)
  const [connectivityResults, setConnectivityResults] = useState<
    Partial<Record<ProviderId, ConnectivityValidationSummary>>
  >({})
  const [
    providerConfigConnectivityResults,
    setProviderConfigConnectivityResults
  ] = useState<Partial<Record<string, ConnectivityValidationSummary>>>({})
  const [draft, setDraft] = useState<PromptTemplate | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [openHint, setOpenHint] = useState("")
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [fastServiceDropdownOpen, setFastServiceDropdownOpen] = useState(false)
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false)
  const [uiLangDropdownDirection, setUiLangDropdownDirection] =
    useState<MiniDropdownDirection>("down")
  const [focusedProviderConfigField, setFocusedProviderConfigField] = useState<
    string | null
  >(null)
  const [
    confirmingDeleteProviderConfigId,
    setConfirmingDeleteProviderConfigId
  ] = useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null)
  const [providerCardModes, setProviderCardModes] = useState<
    Record<ProviderId, ProviderCardMode>
  >({
    openai: "view",
    anthropic: "view",
    doubao: "view",
    deepseek: "view",
    moonshot: "view",
    openrouter: "view",
    gemini: "view",
    hunyuan: "view"
  })
  const [savedProviderKeys, setSavedProviderKeys] = useState<
    Record<ProviderId, boolean>
  >({
    openai: false,
    anthropic: false,
    doubao: false,
    deepseek: false,
    moonshot: false,
    openrouter: false,
    gemini: false,
    hunyuan: false
  })
  const [providerModelDrafts, setProviderModelDrafts] = useState<
    Record<ProviderId, string>
  >({
    openai: PROVIDER_PRIMARY_MODEL.openai,
    anthropic: PROVIDER_PRIMARY_MODEL.anthropic,
    doubao: "",
    deepseek: "",
    moonshot: "",
    openrouter: "",
    gemini: "",
    hunyuan: ""
  })
  const [providerMessages, setProviderMessages] = useState<
    Partial<Record<ProviderId, ProviderActionMessage>>
  >({})
  const [hostedSession, setHostedSession] =
    useState<StoredHostedSession | null>(null)
  const [hostedBusy, setHostedBusy] = useState(false)
  const [hostedStatus, setHostedStatus] =
    useState<HostedAccountStatus>("signed_out")
  const [hostedMessageKey, setHostedMessageKey] = useState<I18nKey>(
    "popup.hosted.status.signedOut"
  )
  const [accountPanelOpen, setAccountPanelOpen] = useState(false)
  const [systemPrefersDark, setSystemPrefersDark] = useState(true)
  const [popupRuntimeHeight, setPopupRuntimeHeight] = useState<number>(
    POPUP_FRAME.safeMaxHeight
  )

  // 自动保存：首屏加载完成前不触发保存，避免把默认值写回覆盖已存设置
  const loaded = useRef(false)
  const persistedSettingsSignature = useRef("")
  const explicitDefaultProviderConfigId = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const fastServiceDropdownRef = useRef<HTMLDivElement>(null)
  const providerDropdownRef = useRef<HTMLDivElement>(null)
  const languageDropdownRef = useRef<HTMLSpanElement>(null)
  const uiLangDropdownRef = useRef<HTMLSpanElement>(null)
  const providerCardRefs = useRef<
    Partial<Record<ProviderId, HTMLDivElement | null>>
  >({})
  const providerConfigCardRefs = useRef<Record<string, HTMLDivElement | null>>(
    {}
  )

  // 顶部短暂提示"已保存"
  const flashSaved = () => {
    setSaveErrorKey(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const flashSaveError = () => {
    setSaved(false)
    setSaveErrorKey("popup.footer.saveError")
    setTimeout(() => setSaveErrorKey(null), 2500)
  }

  const loadHistory = () => {
    chrome.runtime.sendMessage({ action: "GET_HISTORY" }, (resp) => {
      if (resp?.success && Array.isArray(resp.data)) {
        setHistory(resp.data as HistoryEntry[])
      }
    })
  }

  useEffect(() => {
    if (tab === "history") loadHistory()
  }, [tab])

  useLayoutEffect(() => {
    const updatePopupHeight = () => {
      setPopupRuntimeHeight(resolvePopupRuntimeHeight())
    }

    updatePopupHeight()
    window.addEventListener("resize", updatePopupHeight)
    return () => window.removeEventListener("resize", updatePopupHeight)
  }, [])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!modelDropdownRef.current?.contains(event.target as Node)) {
        setModelDropdownOpen(false)
      }
      if (!fastServiceDropdownRef.current?.contains(event.target as Node)) {
        setFastServiceDropdownOpen(false)
      }
      if (!providerDropdownRef.current?.contains(event.target as Node)) {
        setProviderDropdownOpen(false)
      }
      if (!languageDropdownRef.current?.contains(event.target as Node)) {
        setLanguageDropdownOpen(false)
      }
      if (!uiLangDropdownRef.current?.contains(event.target as Node)) {
        setUiLangDropdownOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModelDropdownOpen(false)
        setFastServiceDropdownOpen(false)
        setProviderDropdownOpen(false)
        setLanguageDropdownOpen(false)
        setUiLangDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", closeOnOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemPrefersDark(query.matches)
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }
    query.addEventListener?.("change", onChange)
    return () => query.removeEventListener?.("change", onChange)
  }, [])

  const deleteEntry = (entry: HistoryEntry) => {
    chrome.runtime.sendMessage(
      { action: "DELETE_HISTORY", payload: { id: entry.id } },
      () => setHistory((prev) => prev.filter((e) => e.id !== entry.id))
    )
  }
  const clearAll = () => {
    chrome.runtime.sendMessage({ action: "CLEAR_HISTORY" }, () =>
      setHistory([])
    )
  }

  // 点击历史项：在当前标签页右下角浮窗中恢复这次对话
  const openHistory = (entry: HistoryEntry) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      const url = tabs[0]?.url ?? ""
      // chrome:// 等受限页面无法注入内容脚本，提示用户切到普通网页
      if (!tabId || /^(chrome|edge|about|chrome-extension):/.test(url)) {
        setOpenHint(t("popup.hint.historyRestricted"))
        setTimeout(() => setOpenHint(""), 2500)
        return
      }
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "SHOW_FLOATING_WINDOW",
          payload: {
            requestId: entry.id,
            trigger: "history",
            operation: entry.operation || "custom",
            restore: {
              input: entry.input ?? "",
              output: entry.output ?? "",
              messages: entry.messages,
              createdAt: entry.timestamp,
              pinned: entry.pinned
            }
          }
        },
        () => {
          if (chrome.runtime.lastError) {
            setOpenHint(t("popup.hint.pageUnavailable"))
            setTimeout(() => setOpenHint(""), 2500)
          } else {
            window.close()
          }
        }
      )
    })
  }

  const copyCurrentContextFromPopup = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      const pageUrl = activeTab?.url ?? ""
      if (
        !activeTab?.id ||
        /^(chrome|edge|about|chrome-extension):/.test(pageUrl)
      ) {
        setOpenHint(t("popup.hint.copyRestricted"))
        setTimeout(() => setOpenHint(""), 2500)
        return
      }

      chrome.runtime.sendMessage(
        {
          action: "REQUEST_COPY_CURRENT_CONTEXT",
          payload: {
            pageUrl,
            title: activeTab.title
          }
        },
        (resp) => {
          if (resp?.success) {
            setOpenHint(t("popup.hint.copySuccess"))
          } else {
            setOpenHint(t("popup.hint.copyFailure"))
          }
          setTimeout(() => setOpenHint(""), 2500)
        }
      )
    })
  }

  const openCommandPaletteFromPopup = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      const pageUrl = activeTab?.url ?? ""
      if (
        !activeTab?.id ||
        /^(chrome|edge|about|chrome-extension):/.test(pageUrl)
      ) {
        setOpenHint(t("popup.hint.commandRestricted"))
        setTimeout(() => setOpenHint(""), 2500)
        return
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "OPEN_COMMAND_PALETTE" },
        () => {
          if (chrome.runtime.lastError) {
            setOpenHint(t("popup.hint.pageUnavailable"))
            setTimeout(() => setOpenHint(""), 2500)
          } else {
            window.close()
          }
        }
      )
    })
  }

  const setHostedAccountResult = (
    status: HostedAccountStatus,
    messageKey: I18nKey,
    session: StoredHostedSession | null = hostedSession
  ) => {
    setHostedStatus(status)
    setHostedMessageKey(messageKey)
    setHostedSession(session)
  }

  const createLocalHostedClient = (session?: StoredHostedSession | null) =>
    createHostedAiClient({
      baseUrl: session?.baseUrl ?? HOSTED_AI_DEFAULT_BASE_URL,
      sessionToken: session?.session.session_token
    })

  const refreshHostedSessionStateFromStorage = async (
    signedInMessageKey?: I18nKey
  ) => {
    const stored = await readHostedSession()
    const status = deriveHostedAccountStatus({ session: stored })
    setHostedAccountResult(
      status,
      status === "signed_in" && signedInMessageKey
        ? signedInMessageKey
        : getHostedAccountStatusMessageKey(status),
      stored
    )
    return stored
  }

  const signInHosted = async () => {
    setHostedBusy(true)
    setHostedAccountResult("signing_in", "popup.hosted.status.signingIn")
    try {
      const response = await sendRuntimeMessage<HostedGoogleSignInData>({
        action: "HOSTED_GOOGLE_SIGN_IN"
      })
      const stored = await refreshHostedSessionStateFromStorage(
        "popup.hosted.status.signedIn"
      )
      if (stored) return
      if (response.success) {
        setHostedAccountResult("signing_in", "popup.hosted.status.signingIn", null)
        window.setTimeout(() => {
          void refreshHostedSessionStateFromStorage(
            "popup.hosted.status.signedIn"
          )
        }, 100)
        return
      }
      if (!response.success) {
        const result = response.data
        const status = result?.status ?? "local_backend_unavailable"
        setHostedAccountResult(
          status,
          getHostedSignInFailureMessageKey(result, false),
          null
        )
        return
      }
    } catch (error) {
      const status =
        error instanceof HostedAiClientError
          ? deriveHostedAccountStatus({
              session: null,
              errorCode: error.normalized.code
            })
          : "local_backend_unavailable"
      setHostedAccountResult(
        status,
        error instanceof HostedAiClientError
          ? getHostedAccountStatusMessageKey(status)
          : "popup.hosted.status.runtimeUnavailable"
      )
    } finally {
      setHostedBusy(false)
    }
  }

  useEffect(() => {
    const onHostedSessionStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !changes[HOSTED_SESSION_STORAGE_KEY]) return
      void refreshHostedSessionStateFromStorage()
    }

    chrome.storage.onChanged.addListener(onHostedSessionStorageChange)
    return () =>
      chrome.storage.onChanged.removeListener(onHostedSessionStorageChange)
  }, [])

  const refreshHostedAccount = async () => {
    if (!hostedSession) {
      setHostedAccountResult(
        "signed_out",
        "popup.hosted.status.signedOut",
        null
      )
      return
    }

    setHostedBusy(true)
    setHostedAccountResult("signing_in", "popup.hosted.status.refreshing")
    try {
      const client = createLocalHostedClient(hostedSession)
      const me = await client.me(hostedSession.session.session_token)
      const stored = await updateHostedSessionMe(hostedSession, me)
      setHostedAccountResult(
        "signed_in",
        "popup.hosted.status.refreshed",
        stored
      )
    } catch (error) {
      const status =
        error instanceof HostedAiClientError
          ? deriveHostedAccountStatus({
              session: hostedSession,
              errorCode: error.normalized.code
            })
          : "local_backend_unavailable"
      setHostedAccountResult(status, getHostedAccountStatusMessageKey(status))
    } finally {
      setHostedBusy(false)
    }
  }

  const signOutHostedLocal = async () => {
    setHostedBusy(true)
    try {
      if (hostedSession) {
        const client = createLocalHostedClient(hostedSession)
        await client.logout(hostedSession.session.session_token)
      }
    } catch {
      // Local sign-out should not leave a stale token when the backend is down.
    } finally {
      await clearHostedSession()
      setHostedAccountResult(
        "signed_out",
        "popup.hosted.status.signedOut",
        null
      )
      setHostedBusy(false)
    }
  }

  useEffect(() => {
    Promise.all([getSettings(), getApiKeys(), readHostedSession()]).then(
      ([s, keys, session]) => {
        const normalizedSettings = normalizeCommonFeatureSettings(s)
        persistedSettingsSignature.current =
          settingsSignature(normalizedSettings)
        setSettings(normalizedSettings)
        setHostedSession(session)
        setHostedStatus(deriveHostedAccountStatus({ session }))
        setHostedMessageKey(
          session
            ? "popup.hosted.status.signedIn"
            : "popup.hosted.status.signedOut"
        )
        if (settingsSignature(normalizedSettings) !== settingsSignature(s)) {
          void saveSettings(normalizedSettings)
        }
        setProviderModelDrafts({
          openai: PROVIDER_PRIMARY_MODEL.openai,
          anthropic: PROVIDER_PRIMARY_MODEL.anthropic,
          doubao: normalizedSettings.doubaoModel ?? "",
          deepseek: "",
          moonshot: "",
          openrouter: "",
          gemini: "",
          hunyuan: ""
        })
        setSavedProviderKeys({
          openai: Boolean(keys.openai),
          anthropic: Boolean(keys.anthropic),
          doubao: Boolean(keys.doubao),
          deepseek: false,
          moonshot: false,
          openrouter: false,
          gemini: false,
          hunyuan: false
        })
        const configs = getProviderConfigsWithLegacy(normalizedSettings, keys)
        setProviderConfigs(configs)
        setProviderConfigConnectivityResults(
          buildLastConnectivityTestSummaryMap(configs)
        )
        setProviderConfigKeys(keys.providerConfigKeys)
        setProviderConfigKeyInputs(
          Object.fromEntries(
            configs.map((config) => {
              const key = getProviderConfigKey(config, keys)
              return [config.id, key ? `••••••••${key.slice(-4)}` : ""]
            })
          )
        )
        setProviderConfigModes(
          Object.fromEntries(configs.map((config) => [config.id, "view"]))
        )
        // 显示掩码
        if (keys.openai) setOpenaiKey("••••••••" + keys.openai.slice(-4))
        if (keys.anthropic)
          setAnthropicKey("••••••••" + keys.anthropic.slice(-4))
        if (keys.doubao) setDoubaoKey("••••••••" + keys.doubao.slice(-4))
        // 零状态（无 hosted 登录且无任何自有 Key）默认进入 AI 服务页签，
        // 让新用户直接看到「开始使用」；已配置用户仍默认停在设置页。
        const hasByokAtLoad =
          configs.length > 0 ||
          Boolean(
            keys.openai ||
              keys.anthropic ||
              keys.doubao ||
              keys.deepseek ||
              keys.moonshot ||
              keys.openrouter ||
              keys.gemini ||
              keys.hunyuan
          ) ||
          Object.keys(keys.providerConfigKeys ?? {}).length > 0
        if (
          !hasByokAtLoad &&
          deriveHostedAccountStatus({ session }) !== "signed_in"
        ) {
          setTab("api")
        }
        // 加载完成后才允许自动保存
        loaded.current = true
      }
    )
  }, [])

  // 设置（模型 / 开关 / 模板 / 豆包接入点）变更即时保存，防抖 300ms
  useEffect(() => {
    if (!loaded.current) return
    const nextSignature = settingsSignature(settings)
    if (nextSignature === persistedSettingsSignature.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await saveSettings(settings)
        persistedSettingsSignature.current = nextSignature
        // 通知 background 重建右键菜单，使模板/模型变更即时生效
        chrome.runtime.sendMessage({ action: "UPDATE_TEMPLATES" })
        flashSaved()
      } catch {
        flashSaveError()
      }
    }, 300)
    return () => clearTimeout(saveTimer.current)
  }, [settings])

  const saveProviderConfig = async (provider: ProviderId) => {
    const value = getProviderKeyValue(provider, {
      openai: openaiKey,
      anthropic: anthropicKey,
      doubao: doubaoKey,
      deepseek: "",
      moonshot: "",
      openrouter: "",
      gemini: "",
      hunyuan: ""
    })
    const preflight = getProviderConfigPreflight(provider, value)
    if (preflight) {
      setConnectivityResults((prev) => ({ ...prev, [provider]: preflight }))
      setProviderMessage(provider, {
        tone: "danger",
        text: preflight.notes
      })
      setActiveProvider(provider)
      return
    }

    if (value && !value.startsWith("••") && isLegacyProviderId(provider)) {
      await saveApiKey(provider, value)
      setProviderKeyInput(provider, `••••••••${value.slice(-4)}`)
      setSavedProviderKey(provider, true)
    }
    if (provider === "doubao") {
      await commitSettings({ doubaoModel: providerModelDrafts.doubao.trim() })
    }
    clearConnectivityResult(provider)
    setProviderMessage(provider, {
      tone: "ok",
      text: t("popup.provider.saved")
    })
    setActiveProvider(provider)
    setProviderCardMode(provider, "view")
    flashSaved()
  }

  const resetProviderInput = async (provider: ProviderId) => {
    const keys = await getApiKeys()
    const masked = keys[provider] ? `••••••••${keys[provider].slice(-4)}` : ""
    setProviderKeyInput(provider, masked)
    setSavedProviderKey(provider, Boolean(keys[provider]))
    if (provider === "doubao") {
      setProviderModelDraft("doubao", settings.doubaoModel ?? "")
    }
    clearConnectivityResult(provider)
    setProviderMessage(provider, {
      tone: "muted",
      text: masked
        ? t("popup.provider.restored")
        : t("popup.provider.draftClosed")
    })
    setProviderCardMode(provider, "view")
    setActiveProvider(provider)
  }

  const deleteProviderConfig = async (provider: ProviderId) => {
    if (isLegacyProviderId(provider)) {
      await saveApiKey(provider, "")
    }
    setProviderKeyInput(provider, "")
    setSavedProviderKey(provider, false)
    if (provider === "doubao") {
      setProviderModelDraft("doubao", "")
      await commitSettings({ doubaoModel: "" })
    }
    clearConnectivityResult(provider)
    setProviderMessage(provider, {
      tone: "warning",
      text: `${getProviderCopy(provider, t).title}${t("popup.provider.deletedSuffix")}`
    })
    setProviderCardMode(provider, "view")
    setActiveProvider(provider)
    flashSaved()
  }

  const persistProviderConfigs = async (
    nextConfigs: ProviderConfig[],
    preferredDefaultId?: string
  ) => {
    const savedConfigs = nextConfigs.filter(
      (config) => !isLegacyProviderConfigId(config.id)
    )
    let defaultProviderConfigId = ""
    if (isHostedAiProviderConfigId(preferredDefaultId)) {
      defaultProviderConfigId = HOSTED_AI_PROVIDER_CONFIG_ID
    } else if (
      preferredDefaultId &&
      nextConfigs.some((config) => config.id === preferredDefaultId)
    ) {
      defaultProviderConfigId = preferredDefaultId
    } else {
      defaultProviderConfigId =
        nextConfigs.find((config) => config.id !== activeProviderConfigId)
          ?.id ?? ""
    }
    const defaultConfig = isHostedAiProviderConfigId(defaultProviderConfigId)
      ? undefined
      : nextConfigs.find((config) => config.id === defaultProviderConfigId) ??
        nextConfigs[0]
    const nextDefaultModel = isHostedAiProviderConfigId(defaultProviderConfigId)
      ? HOSTED_AI_DEFAULT_MODEL
      : defaultConfig
      ? getModelForProviderConfig(defaultConfig)
      : settings.defaultModel
    let nextFastProviderConfigId = ""
    if (isHostedAiProviderConfigId(settings.fastProviderConfigId)) {
      nextFastProviderConfigId = HOSTED_AI_PROVIDER_CONFIG_ID
    } else if (
      settings.fastProviderConfigId &&
      nextConfigs.some((config) => config.id === settings.fastProviderConfigId)
    ) {
      nextFastProviderConfigId = settings.fastProviderConfigId
    }

    await saveSettings({
      providerConfigs: savedConfigs,
      defaultProviderConfigId,
      fastProviderConfigId: nextFastProviderConfigId,
      defaultModel: nextDefaultModel,
      doubaoModel:
        defaultConfig?.provider === "doubao"
          ? defaultConfig.model
          : settings.doubaoModel
    })
    const nextSettings = {
      ...settings,
      providerConfigs: savedConfigs,
      defaultProviderConfigId,
      fastProviderConfigId: nextFastProviderConfigId,
      defaultModel: nextDefaultModel,
      doubaoModel:
        defaultConfig?.provider === "doubao"
          ? defaultConfig.model
          : settings.doubaoModel
    }
    setSettings(nextSettings)
    persistedSettingsSignature.current = settingsSignature(nextSettings)
    chrome.runtime.sendMessage({ action: "UPDATE_TEMPLATES" })
  }

  const addProviderConfigDraft = (provider: ProviderId) => {
    const existingCount =
      providerConfigs.filter((config) => config.provider === provider).length +
      1
    const draft = buildProviderConfig({
      id: createProviderConfigId(provider),
      provider,
      displayName: defaultProviderConfigName(provider, existingCount),
      model: defaultProviderModel(provider)
    })

    setProviderConfigs((prev) => [...prev, draft])
    setProviderConfigKeyInputs((prev) => ({ ...prev, [draft.id]: "" }))
    setProviderConfigModes((prev) => ({ ...prev, [draft.id]: "add" }))
    setActiveProviderConfigId(draft.id)
    setFocusedProviderConfigField(null)
    setConfirmingDeleteProviderConfigId(null)
    setProviderDropdownOpen(false)
    setOpenHint(
      `${t("popup.hint.addingService")}${getProviderCopy(provider, t).title}`
    )
    window.setTimeout(() => {
      providerConfigCardRefs.current[draft.id]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      })
    }, 50)
  }

  const updateProviderConfigDraft = (
    configId: string,
    patch: Partial<ProviderConfig>,
    options: { apiKeyChanged?: boolean } = {}
  ) => {
    setConfirmingDeleteProviderConfigId(null)
    setProviderConfigs((prev) =>
      prev.map((config) =>
        config.id === configId
          ? normalizeProviderConfigDraftUpdate(config, patch, options)
          : config
      )
    )
    setProviderConfigConnectivityResults((prev) => {
      if (!prev[configId]) return prev
      const next = { ...prev }
      delete next[configId]
      return next
    })
    setActiveProviderConfigId(configId)
    setProviderConfigModes((prev) => ({
      ...prev,
      [configId]: prev[configId] === "add" ? "add" : "edit"
    }))
  }

  const saveProviderConfigInstance = async (config: ProviderConfig) => {
    const keyInput = providerConfigKeyInputs[config.id] ?? ""
    const normalizedKeyInput = keyInput.trim()
    const legacyProvider = getLegacyProviderFromConfigId(config.id)
    const apiKeyChanged = !keyInput.startsWith("••")
    if (apiKeyChanged) {
      if (legacyProvider) {
        await saveApiKey(legacyProvider, normalizedKeyInput)
      } else {
        await saveProviderConfigApiKey(config.id, normalizedKeyInput)
        setProviderConfigKeys((prev) => {
          const next = { ...prev }
          if (normalizedKeyInput) {
            next[config.id] = normalizedKeyInput
          } else {
            delete next[config.id]
          }
          return next
        })
      }
      setProviderConfigKeyInputs((prev) => ({
        ...prev,
        [config.id]: normalizedKeyInput
          ? `••••••••${normalizedKeyInput.slice(-4)}`
          : ""
      }))
    }

    const normalizedConfig = normalizeProviderConfigDraftUpdate(
      config,
      {
        displayName:
          config.displayName.trim() ||
          getProviderCopy(config.provider, t).title,
        model: config.model.trim() || defaultProviderModel(config.provider)
      },
      { apiKeyChanged }
    )
    const savedConfig = clearProviderConfigTestResult(normalizedConfig)
    const nextConfigs = providerConfigs.map((item) =>
      item.id === config.id ? savedConfig : item
    )
    const defaultId = settings.defaultProviderConfigId || config.id
    setProviderConfigs(nextConfigs)
    setProviderConfigModes((prev) => ({ ...prev, [config.id]: "view" }))
    setProviderConfigConnectivityResults((prev) => {
      if (!prev[config.id]) return prev
      const next = { ...prev }
      delete next[config.id]
      return next
    })
    setFocusedProviderConfigField(null)
    setConfirmingDeleteProviderConfigId(null)
    await persistProviderConfigs(nextConfigs, defaultId)
    flashSaved()
  }

  const cancelProviderConfigEdit = async (config: ProviderConfig) => {
    setFocusedProviderConfigField(null)
    setConfirmingDeleteProviderConfigId(null)
    if (providerConfigModes[config.id] === "add") {
      setProviderConfigs((prev) => prev.filter((item) => item.id !== config.id))
      setProviderConfigKeyInputs((prev) => {
        const next = { ...prev }
        delete next[config.id]
        return next
      })
      setActiveProviderConfigId(null)
      return
    }

    const keys = await getApiKeys()
    const saved = getProviderConfigsWithLegacy(settings, keys).find(
      (item) => item.id === config.id
    )
    if (!saved) return
    const key = getProviderConfigKey(saved, keys)
    setProviderConfigs((prev) =>
      prev.map((item) => (item.id === config.id ? saved : item))
    )
    setProviderConfigKeyInputs((prev) => ({
      ...prev,
      [config.id]: key ? `••••••••${key.slice(-4)}` : ""
    }))
    setProviderConfigModes((prev) => ({ ...prev, [config.id]: "view" }))
  }

  const deleteProviderConfigInstance = async (config: ProviderConfig) => {
    setFocusedProviderConfigField(null)
    setConfirmingDeleteProviderConfigId(null)
    const legacyProvider = getLegacyProviderFromConfigId(config.id)
    if (legacyProvider) {
      await saveApiKey(legacyProvider, "")
      if (legacyProvider === "doubao") {
        await commitSettings({ doubaoModel: "" })
      }
    } else {
      await deleteProviderConfigApiKey(config.id)
    }

    const nextConfigs = providerConfigs.filter((item) => item.id !== config.id)
    const nextDefaultId =
      settings.defaultProviderConfigId === config.id
        ? nextConfigs[0]?.id ?? ""
        : settings.defaultProviderConfigId
    setProviderConfigs(nextConfigs)
    setProviderConfigKeyInputs((prev) => {
      const next = { ...prev }
      delete next[config.id]
      return next
    })
    setProviderConfigKeys((prev) => {
      const next = { ...prev }
      delete next[config.id]
      return next
    })
    setProviderConfigConnectivityResults((prev) => {
      const next = { ...prev }
      delete next[config.id]
      return next
    })
    await persistProviderConfigs(nextConfigs, nextDefaultId)
    setActiveProviderConfigId(nextDefaultId || null)
    flashSaved()
  }

  const setDefaultProviderConfig = async (config: ProviderConfig) => {
    setConfirmingDeleteProviderConfigId(null)
    explicitDefaultProviderConfigId.current = config.id
    const nextConfigs = providerConfigs.map((item) => ({
      ...item,
      isDefault: item.id === config.id
    }))
    setProviderConfigs(nextConfigs)
    await persistProviderConfigs(nextConfigs, config.id)
    flashSaved()
  }

  const setDefaultHostedAiService = async () => {
    setConfirmingDeleteProviderConfigId(null)
    explicitDefaultProviderConfigId.current = HOSTED_AI_PROVIDER_CONFIG_ID
    const nextConfigs = providerConfigs.map((item) => ({
      ...item,
      isDefault: false
    }))
    setProviderConfigs(nextConfigs)
    await persistProviderConfigs(nextConfigs, HOSTED_AI_PROVIDER_CONFIG_ID)
    flashSaved()
  }

  const testProviderConfigInstance = async (config: ProviderConfig) => {
    if (testingProviderConfigId) return
    const keyInput = providerConfigKeyInputs[config.id] ?? ""
    const normalizedKeyInput = keyInput.trim()
    if (!keyInput.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint:
            config.model || t("popup.provider.config.unconfigured"),
          errorCategory: "api_key_missing",
          notes: t("popup.provider.apiKeyMissing")
        })
      }))
      setProviderConfigModes((prev) => ({
        ...prev,
        [config.id]: prev[config.id] === "add" ? "add" : "edit"
      }))
      return
    }
    if (requiresProviderConfigModel(config.provider) && !config.model.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint: t("popup.provider.config.unconfigured"),
          errorCategory: "endpoint_or_model_missing",
          notes: t("popup.provider.endpointMissing")
        })
      }))
      setProviderConfigModes((prev) => ({
        ...prev,
        [config.id]: prev[config.id] === "add" ? "add" : "edit"
      }))
      return
    }

    const legacyProvider = getLegacyProviderFromConfigId(config.id)
    const apiKeyChanged = !keyInput.startsWith("••")
    if (apiKeyChanged) {
      if (legacyProvider) {
        await saveApiKey(legacyProvider, normalizedKeyInput)
      } else {
        await saveProviderConfigApiKey(config.id, normalizedKeyInput)
        setProviderConfigKeys((prev) => ({
          ...prev,
          [config.id]: normalizedKeyInput
        }))
      }
      setProviderConfigKeyInputs((prev) => ({
        ...prev,
        [config.id]: `••••••••${normalizedKeyInput.slice(-4)}`
      }))
    }
    const savedConfig = normalizeProviderConfigDraftUpdate(
      config,
      {
        displayName:
          config.displayName.trim() ||
          getProviderCopy(config.provider, t).title,
        model: config.model.trim() || defaultProviderModel(config.provider)
      },
      { apiKeyChanged }
    )
    const nextConfigs = providerConfigs.map((item) =>
      item.id === config.id ? savedConfig : item
    )
    setProviderConfigs(nextConfigs)
    await persistProviderConfigs(
      nextConfigs,
      settings.defaultProviderConfigId || config.id
    )

    setTestingProviderConfigId(config.id)
    setActiveProviderConfigId(config.id)
    setProviderConfigModes((prev) => ({ ...prev, [config.id]: "view" }))
    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      setTestingProviderConfigId(null)
      const summary = buildPopupFallbackSummary(
        savedConfig.provider,
        savedConfig.provider === "doubao"
          ? savedConfig.model
          : getModelForProviderConfig(savedConfig),
        t("popup.provider.testTimeout"),
        t
      )
      const testedAt = Date.now()
      const timedSummary = withPopupConnectivityTiming(summary, testedAt)
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: timedSummary
      }))
      const failedConfig = markProviderConfigTestResult(savedConfig, {
        status: "failure",
        errorCategory: timedSummary.error_category,
        testedAt
      })
      const failedConfigs = nextConfigs.map((item) =>
        item.id === config.id ? failedConfig : item
      )
      setProviderConfigs(failedConfigs)
      void persistProviderConfigs(
        failedConfigs,
        settings.defaultProviderConfigId || config.id
      )
    }, CONNECTIVITY_TEST_TIMEOUT_MS)

    chrome.runtime.sendMessage(
      {
        action: "VALIDATE_PROVIDER_CONNECTIVITY",
        payload: { provider: config.provider, providerConfigId: config.id }
      },
      (resp) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeoutId)
        setTestingProviderConfigId(null)
        const summary =
          resp?.success && resp.data
            ? (resp.data as ConnectivityValidationSummary)
            : buildPopupFallbackSummary(
                savedConfig.provider,
                savedConfig.provider === "doubao"
                  ? savedConfig.model
                  : getModelForProviderConfig(savedConfig),
                resp?.error ?? chrome.runtime.lastError?.message,
                t
              )
        const testedAt = Date.now()
        const timedSummary = withPopupConnectivityTiming(summary, testedAt)
        setProviderConfigConnectivityResults((prev) => ({
          ...prev,
          [config.id]: timedSummary
        }))
        const nextStatus =
          timedSummary.result === "success" ? "success" : "failure"
        const updatedConfig = markProviderConfigTestResult(savedConfig, {
          status: nextStatus,
          errorCategory: timedSummary.error_category,
          testedAt
        })
        const timing = getConnectivityTimingSummary(timedSummary)
        const updatedConfigWithTiming = {
          ...updatedConfig,
          testCompletionMs: timing.completionMs,
          testFirstTokenMs: timing.firstTokenMs,
          testLocalProcessingMs: timing.localProcessingMs
        }
        const testedConfigs = nextConfigs.map((item) =>
          item.id === config.id ? updatedConfigWithTiming : item
        )
        setProviderConfigs(testedConfigs)
        void persistProviderConfigs(
          testedConfigs,
          settings.defaultProviderConfigId || config.id
        )
      }
    )
  }

  const clearConnectivityResult = (provider: ProviderId) => {
    setConnectivityResults((prev) => {
      if (!prev[provider]) return prev
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  const updateProviderKeyInput = (
    provider: ProviderId,
    value: string,
    setter: (nextValue: string) => void
  ) => {
    setter(value)
    clearConnectivityResult(provider)
    setActiveProvider(provider)
    if (providerCardModes[provider] === "view") {
      setProviderCardMode(
        provider,
        savedProviderKeys[provider] ? "edit" : "add"
      )
    }
    setProviderMessage(provider, {
      tone: "muted",
      text: t("popup.provider.editing")
    })
  }

  const setProviderKeyInput = (provider: ProviderId, value: string) => {
    if (provider === "openai") setOpenaiKey(value)
    if (provider === "anthropic") setAnthropicKey(value)
    if (provider === "doubao") setDoubaoKey(value)
  }

  const updateDoubaoModel = (value: string) => {
    setProviderModelDraft("doubao", value)
    clearConnectivityResult("doubao")
    setActiveProvider("doubao")
    if (providerCardModes.doubao === "view") {
      setProviderCardMode("doubao", savedProviderKeys.doubao ? "edit" : "add")
    }
    setProviderMessage("doubao", {
      tone: "muted",
      text: t("popup.provider.editingEndpoint")
    })
  }

  const setProviderModelDraft = (provider: ProviderId, value: string) => {
    setProviderModelDrafts((prev) => ({ ...prev, [provider]: value }))
  }

  const setProviderMessage = (
    provider: ProviderId,
    message: ProviderActionMessage
  ) => {
    setProviderMessages((prev) => ({ ...prev, [provider]: message }))
  }

  const setProviderCardMode = (
    provider: ProviderId,
    mode: ProviderCardMode
  ) => {
    setProviderCardModes((prev) => ({ ...prev, [provider]: mode }))
  }

  const setSavedProviderKey = (provider: ProviderId, savedKey: boolean) => {
    setSavedProviderKeys((prev) => ({ ...prev, [provider]: savedKey }))
  }

  const commitSettings = async (patch: Partial<Settings>) => {
    const nextSettings = { ...settings, ...patch }
    await saveSettings(nextSettings)
    setSettings(nextSettings)
    persistedSettingsSignature.current = settingsSignature(nextSettings)
    chrome.runtime.sendMessage({ action: "UPDATE_TEMPLATES" })
  }

  const selectProviderForEditing = (provider: ProviderId) => {
    setTab("api")
    setActiveProvider(provider)
    setProviderCardMode(provider, savedProviderKeys[provider] ? "edit" : "add")
    setProviderDropdownOpen(false)
    setOpenHint(
      savedProviderKeys[provider]
        ? `${t("popup.hint.editingService")}${getProviderCopy(provider, t).title}`
        : `${t("popup.hint.addingService")}${getProviderCopy(provider, t).title}`
    )
    setProviderMessage(provider, {
      tone: "muted",
      text: savedProviderKeys[provider]
        ? t("popup.provider.editingSavedDraft")
        : t("popup.provider.newDraft")
    })
    window.setTimeout(() => {
      providerCardRefs.current[provider]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      })
    }, 50)
  }

  const getProviderConfigPreflight = (
    provider: ProviderId,
    currentKeyValue: string
  ): ConnectivityValidationSummary | null => {
    if (!currentKeyValue.trim()) {
      return buildConnectivityPreflightSummary({
        provider,
        modelOrEndpoint: getProviderModelInputValue(
          provider,
          providerModelDrafts,
          t
        ),
        errorCategory: "api_key_missing",
        notes: t("popup.provider.apiKeyMissing")
      })
    }

    if (
      requiresProviderConfigModel(provider) &&
      !providerModelDrafts[provider].trim()
    ) {
      return buildConnectivityPreflightSummary({
        provider,
        modelOrEndpoint: t("popup.provider.config.unconfigured"),
        errorCategory: "endpoint_or_model_missing",
        notes: t("popup.provider.endpointMissing")
      })
    }

    return null
  }

  const testProviderConnectivity = async (
    provider: ProviderId,
    currentKeyValue: string
  ) => {
    if (testingProvider) return
    const preflight = getProviderConfigPreflight(provider, currentKeyValue)
    if (preflight) {
      setConnectivityResults((prev) => ({ ...prev, [provider]: preflight }))
      setProviderMessage(provider, {
        tone: "danger",
        text: preflight.notes
      })
      setActiveProvider(provider)
      if (providerCardModes[provider] === "view") {
        setProviderCardMode(
          provider,
          savedProviderKeys[provider] ? "edit" : "add"
        )
      }
      return
    }

    if (
      currentKeyValue &&
      !currentKeyValue.startsWith("••") &&
      isLegacyProviderId(provider)
    ) {
      await saveApiKey(provider, currentKeyValue)
      setProviderKeyInput(provider, `••••••••${currentKeyValue.slice(-4)}`)
      setSavedProviderKey(provider, true)
      flashSaved()
    }
    if (
      provider === "doubao" &&
      providerModelDrafts.doubao.trim() !== (settings.doubaoModel ?? "")
    ) {
      await commitSettings({ doubaoModel: providerModelDrafts.doubao.trim() })
      flashSaved()
    }

    setTestingProvider(provider)
    setActiveProvider(provider)
    setProviderCardMode(provider, "view")
    setProviderMessage(provider, {
      tone: "warning",
      text: t("popup.provider.testing")
    })
    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      setTestingProvider(null)
      setConnectivityResults((prev) => ({
        ...prev,
        [provider]: buildPopupFallbackSummary(
          provider,
          getProviderModelInputValue(provider, providerModelDrafts, t),
          t("popup.provider.testTimeout"),
          t
        )
      }))
      setProviderMessage(provider, {
        tone: "danger",
        text: t("popup.provider.testTimeout")
      })
    }, CONNECTIVITY_TEST_TIMEOUT_MS)

    chrome.runtime.sendMessage(
      {
        action: "VALIDATE_PROVIDER_CONNECTIVITY",
        payload: { provider }
      },
      (resp) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeoutId)
        setTestingProvider(null)
        if (resp?.success && resp.data) {
          const summary = resp.data as ConnectivityValidationSummary
          setConnectivityResults((prev) => ({
            ...prev,
            [provider]: summary
          }))
          setProviderMessage(provider, {
            tone: summary.result === "success" ? "ok" : "danger",
            text:
              summary.result === "success"
                ? t("popup.provider.testPassed")
                : summary.notes || t("popup.provider.testFailed")
          })
        } else {
          const summary = buildPopupFallbackSummary(
            provider,
            getProviderModelInputValue(provider, providerModelDrafts, t),
            resp?.error ?? chrome.runtime.lastError?.message,
            t
          )
          setConnectivityResults((prev) => ({
            ...prev,
            [provider]: summary
          }))
          setProviderMessage(provider, {
            tone: "danger",
            text: summary.notes
          })
        }
      }
    )
  }

  const commitDraft = () => {
    if (!draft || !draft.name.trim() || !draft.prompt.trim()) return
    const exists = settings.templates.some((t) => t.id === draft.id)
    const templates = exists
      ? settings.templates.map((t) => (t.id === draft.id ? draft : t))
      : [...settings.templates, draft]
    updateSetting("templates", templates)
    setDraft(null)
  }

  const toggleDraftContext = (ctx: string) => {
    if (!draft) return
    const has = draft.contexts.includes(ctx)
    const contexts = has
      ? draft.contexts.filter((c) => c !== ctx)
      : [...draft.contexts, ctx]
    setDraft({ ...draft, contexts: contexts.length ? contexts : ["selection"] })
  }

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateCommonFeatureSetting = (
    key:
      | "enableToolbar"
      | "enableInlineTranslation"
      | "enableCommandPalette"
      | "enableClipboardSense"
      | "enableDoubleClickMenu",
    value: boolean
  ) => {
    setSettings((prev) => {
      if (key === "enableToolbar" && value) {
        return { ...prev, enableToolbar: true, enableInlineTranslation: false }
      }
      if (key === "enableInlineTranslation" && value) {
        return { ...prev, enableInlineTranslation: true, enableToolbar: false }
      }
      return { ...prev, [key]: value }
    })
  }

  const popupApiKeyPresence: ApiKeys = {
    openai: savedProviderKeys.openai ? "configured" : "",
    anthropic: savedProviderKeys.anthropic ? "configured" : "",
    doubao: savedProviderKeys.doubao ? "configured" : "",
    deepseek: savedProviderKeys.deepseek ? "configured" : "",
    moonshot: savedProviderKeys.moonshot ? "configured" : "",
    openrouter: savedProviderKeys.openrouter ? "configured" : "",
    gemini: savedProviderKeys.gemini ? "configured" : "",
    hunyuan: savedProviderKeys.hunyuan ? "configured" : "",
    providerConfigKeys: Object.fromEntries(
      providerConfigs.map((config) => {
        const keyValue =
          providerConfigKeyInputs[config.id] ??
          providerConfigKeys[config.id] ??
          ""
        return [config.id, keyValue.trim() ? "configured" : ""]
      })
    )
  }
  const defaultProviderConfigId = resolvePopupCurrentModelProviderConfigId({
    settings,
    providerConfigs,
    apiKeys: popupApiKeyPresence,
    hostedUsable: isHostedSessionUsable(hostedSession),
    explicitByokDefaultId: explicitDefaultProviderConfigId.current
  })
  const isHostedDefaultSelected = isHostedAiProviderConfigId(
    defaultProviderConfigId
  )
  const selectedProviderConfig = isHostedDefaultSelected
    ? undefined
    : providerConfigs.find((config) => config.id === defaultProviderConfigId)
  const selectedModel =
    MODEL_OPTIONS.find(
      (m) =>
        m.value ===
        (selectedProviderConfig
          ? getModelForProviderConfig(selectedProviderConfig)
          : settings.defaultModel)
    ) ?? MODEL_OPTIONS[0]
  const providerConfigured = {
    openai: savedProviderKeys.openai,
    anthropic: savedProviderKeys.anthropic,
    doubao: savedProviderKeys.doubao,
    deepseek: savedProviderKeys.deepseek,
    moonshot: savedProviderKeys.moonshot,
    openrouter: savedProviderKeys.openrouter,
    gemini: savedProviderKeys.gemini,
    hunyuan: savedProviderKeys.hunyuan
  }
  const firstProviderNeedingConfig =
    PROVIDER_ORDER.find(
      (provider) =>
        !providerConfigured[provider] ||
        (provider === "doubao" && !settings.doubaoModel?.trim())
    ) ?? "doubao"
  const resolvedUiLanguage = resolveUiLanguage(settings.uiLanguage)
  const t = createI18n(resolvedUiLanguage)
  const modelAvailability = MODEL_OPTIONS.reduce<
    Record<string, ModelAvailability>
  >((acc, model) => {
    acc[model.value] = getModelAvailability({
      route: resolveModelRoute(model.value, settings),
      providerConfigured,
      connectivityResults,
      testingProvider,
      uiLanguage: resolvedUiLanguage
    })
    return acc
  }, {})
  const selectedProviderConfigKeyValue = selectedProviderConfig
    ? providerConfigKeyInputs[selectedProviderConfig.id] ??
      providerConfigKeys[selectedProviderConfig.id] ??
      ""
    : ""
  const selectedProviderConfigConnectivity = selectedProviderConfig
    ? providerConfigConnectivityResults[selectedProviderConfig.id]
    : undefined
  const hostedStatusTone = getHostedAccountStatusTone(hostedStatus)
  const hostedSelectedModelAvailability: ModelAvailability = {
    disabled: hostedStatus !== "signed_in",
    status: t(`popup.hosted.statusLabel.${hostedStatus}` as I18nKey),
    tone: hostedStatusTone
  }
  const selectedModelAvailability = isHostedDefaultSelected
    ? hostedSelectedModelAvailability
    : selectedProviderConfig
    ? (() => {
        if (!selectedProviderConfigKeyValue.trim()) {
          return {
            disabled: true,
            status: t("popup.provider.status.keyMissing"),
            tone: "danger"
          } as const
        }
        if (
          requiresProviderConfigModel(selectedProviderConfig.provider) &&
          !selectedProviderConfig.model.trim()
        ) {
          return {
            disabled: true,
            status: t("popup.provider.status.endpointMissing"),
            tone: "danger"
          } as const
        }
        if (testingProviderConfigId === selectedProviderConfig.id) {
          return {
            disabled: true,
            status: t("popup.provider.status.testing"),
            tone: "warning"
          } as const
        }
        if (selectedProviderConfigConnectivity?.result === "success") {
          return {
            disabled: false,
            status: t("popup.provider.status.lastPassed"),
            tone: "ok"
          } as const
        }
        if (selectedProviderConfigConnectivity) {
          return {
            disabled: true,
            status: t("popup.provider.status.lastFailed"),
            tone: "danger"
          } as const
        }
        return {
          disabled: false,
          status: t("popup.provider.status.untested"),
          tone: "muted"
        } as const
      })()
    : modelAvailability[selectedModel.value] ??
      getModelAvailability({
        route: resolveModelRoute(selectedModel.value, settings),
        providerConfigured,
        connectivityResults,
        testingProvider,
        uiLanguage: resolvedUiLanguage
      })
  const configuredProviderConfigOptions = providerConfigs.filter(
    (config) => providerConfigModes[config.id] !== "add"
  )
  const selectedFastProviderConfigId = settings.fastProviderConfigId ?? ""
  const isHostedFastSelected = isHostedAiProviderConfigId(
    selectedFastProviderConfigId
  )
  const selectedFastProviderConfig = configuredProviderConfigOptions.find(
    (config) => config.id === selectedFastProviderConfigId
  )
  const selectedRoute = selectedProviderConfig
    ? buildProviderConfigRoute(selectedProviderConfig, settings)
    : resolveModelRoute(settings.defaultModel, settings)
  const serviceReady = !selectedModelAvailability.disabled
  const serviceFailed = selectedModelAvailability.tone === "danger"
  const serviceStatusTitle = serviceReady
    ? t("popup.service.ready")
    : serviceFailed
      ? t("popup.service.failed")
      : t("popup.service.disconnected")
  const serviceStatusDetail = isHostedDefaultSelected
    ? serviceReady
      ? `${t("popup.service.currentUsing")}${t("popup.hosted.title")}`
      : t(hostedMessageKey)
    : serviceReady
      ? `${t("popup.service.currentUsing")}${selectedRoute.providerConfigName ?? selectedRoute.provider.displayName}`
      : serviceFailed
        ? t("popup.service.checkKeyNetwork")
        : t("popup.service.connectFirst")
  const routeLabel = `${t("popup.service.routePrefix")}${
    isHostedDefaultSelected
      ? t("popup.hosted.title")
      : selectedRoute.providerConfigName ?? selectedRoute.provider.displayName
  }`
  const routeModelLabel = isHostedDefaultSelected
    ? HOSTED_AI_DEFAULT_MODEL
    : requiresProviderConfigModel(selectedRoute.provider.id)
      ? selectedRoute.requestModel || t("popup.provider.status.endpointMissing")
      : selectedRoute.model.displayName
  const hostedAccountLabel =
    hostedSession?.session.user.email ??
    hostedSession?.session.user.id ??
    t("popup.hosted.account.none")
  const hostedQuotaDisplay = buildHostedAccountQuotaDisplay({
    session: hostedSession,
    status: hostedStatus,
    labels: {
      unknown: t("popup.hosted.quota.unknown"),
      unavailable: t("popup.hosted.quota.unavailable"),
      tokens: t("popup.hosted.quota.tokens"),
      tierFree: t("popup.hosted.tier.free"),
      tierPaid: t("popup.hosted.tier.paid")
    }
  })
  const selectedProviderKeyValue = getProviderKeyValue(
    selectedRoute.provider.id,
    {
      openai: openaiKey,
      anthropic: anthropicKey,
      doubao: doubaoKey,
      deepseek: "",
      moonshot: "",
      openrouter: "",
      gemini: "",
      hunyuan: ""
    }
  )
  const resolvedAppearance = resolveAvisoTheme(
    settings.appearanceTheme,
    systemPrefersDark
  )
  const ui = getAvisoThemeTokens(resolvedAppearance)
  const hostedMonthlyWindow = getHostedMonthlyQuotaWindow(hostedSession)
  const hostedQuotaPercent =
    hostedMonthlyWindow && hostedMonthlyWindow.limit > 0
      ? Math.min(
          100,
          Math.round(
            (hostedMonthlyWindow.used / hostedMonthlyWindow.limit) * 100
          )
        )
      : null
  const hostedQuotaBarColor =
    hostedQuotaPercent === null
      ? ui.text3
      : hostedQuotaPercent >= 100
        ? ui.danger
        : hostedQuotaPercent >= 80
          ? ui.warningBorder
          : ui.accent
  const accountInitial = (
    hostedSession?.session.user.email ??
    hostedSession?.session.user.id ??
    "A"
  )
    .trim()
    .charAt(0)
    .toUpperCase()
  const hasAnyByok =
    configuredProviderConfigOptions.length > 0 ||
    Object.values(providerConfigured).some(Boolean)
  const showZeroState = !hasAnyByok && hostedStatus !== "signed_in"
  const hasOpenAddDraft = Object.values(providerConfigModes).some(
    (mode) => mode === "add"
  )
  const popupHeight = popupRuntimeHeight
  const popupHeightCss = `${popupHeight}px`
  const panelSectionStyle =
    tab === "api" || tab === "templates"
      ? { ...styles.section, ...styles.expandedSection }
      : styles.section
  const renderTemplateForm = (formDraft: PromptTemplate, key?: string) => (
    <div
      key={key}
      style={{
        ...styles.templateForm,
        marginTop: 0,
        marginBottom: 8,
        background: ui.bg,
        borderColor: ui.line
      }}>
      <input
        value={formDraft.name}
        onChange={(e) => setDraft({ ...formDraft, name: e.target.value })}
        placeholder={t("popup.templates.namePlaceholder")}
        style={{
          ...styles.input,
          background: ui.surface,
          borderColor: ui.line,
          color: ui.text
        }}
      />
      <textarea
        value={formDraft.prompt}
        onChange={(e) => setDraft({ ...formDraft, prompt: e.target.value })}
        placeholder={t("popup.templates.promptPlaceholder")}
        rows={4}
        style={{
          ...styles.input,
          background: ui.surface,
          borderColor: ui.line,
          color: ui.text,
          resize: "vertical",
          fontFamily: "inherit"
        }}
      />
      <div style={styles.contextChips}>
        {TEMPLATE_CONTEXTS.map((c) => (
          <button
            key={c.value}
            className="aviso-popup-button"
            onClick={() => toggleDraftContext(c.value)}
            style={{
              ...styles.chip,
              borderColor: ui.line,
              color: ui.text2,
              ...(formDraft.contexts.includes(c.value) ? styles.chipActive : {})
            }}>
            {t(c.labelKey)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="aviso-popup-button"
          onClick={commitDraft}
          style={styles.primaryBtn}>
          {t("popup.templates.done")}
        </button>
        <button
          className="aviso-popup-button"
          onClick={() => setDraft(null)}
          style={{
            ...styles.deleteBtn,
            borderColor: ui.line,
            color: ui.text2
          }}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  )

  return (
    <div
      id="aviso-popup-shell"
      style={{
        ...styles.container,
        height: popupHeight,
        maxHeight: popupHeight,
        background: ui.surface,
        color: ui.text
      }}>
      <style>{`
        :root {
          width: ${POPUP_FRAME.width}px !important;
          height: ${popupHeightCss} !important;
          max-height: ${popupHeightCss} !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        html,
        body {
          width: ${POPUP_FRAME.width}px !important;
          height: ${popupHeightCss} !important;
          min-width: ${POPUP_FRAME.width}px !important;
          max-width: ${POPUP_FRAME.width}px !important;
          min-height: 0 !important;
          max-height: ${popupHeightCss} !important;
          margin: 0 !important;
          padding: 0 !important;
          background: ${ui.surface};
          overflow: hidden !important;
          overscroll-behavior: none;
          box-sizing: border-box !important;
        }
        #__plasmo {
          width: 100% !important;
          height: ${popupHeightCss} !important;
          min-height: 0 !important;
          max-height: ${popupHeightCss} !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        #root,
        body > div {
          width: 100% !important;
          height: ${popupHeightCss} !important;
          min-height: 0 !important;
          max-height: ${popupHeightCss} !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        #aviso-popup-shell {
          --aviso-line: ${ui.line};
          --aviso-input-border: ${ui.inputBorder};
          --aviso-accent-border: ${ui.accentBorder};
          width: ${POPUP_FRAME.width}px !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        #aviso-popup-content {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          height: 0 !important;
          max-height: 100% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain;
          box-sizing: border-box !important;
          scrollbar-width: thin;
          scrollbar-color: ${ui.scrollbarThumb} transparent;
        }
        #aviso-popup-content::-webkit-scrollbar {
          width: 8px;
        }
        #aviso-popup-content::-webkit-scrollbar-track {
          background: transparent;
        }
        #aviso-popup-content::-webkit-scrollbar-thumb {
          background: ${ui.scrollbarThumb};
          border: 2px solid ${ui.surface};
          border-radius: 999px;
        }
        select,
        input,
        textarea,
        button {
          font: inherit;
        }
        button {
          -webkit-tap-highlight-color: transparent;
        }
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        .aviso-dropdown-trigger:focus-visible,
        .aviso-dropdown-option:focus-visible {
          outline: 2px solid ${aviso.sage400};
          outline-offset: 2px;
          box-shadow: ${aviso.focusRing};
        }
        .aviso-popup-button {
          transition:
            background .15s ${aviso.ease},
            border-color .15s ${aviso.ease},
            color .15s ${aviso.ease},
            transform .15s ${aviso.ease};
        }
        .aviso-popup-button:hover:not(:disabled) {
          background: ${ui.hover} !important;
          border-color: ${ui.accentBorder} !important;
        }
        .aviso-accent-btn:hover:not(:disabled) {
          background: color-mix(in oklab, ${ui.accent} 88%, black) !important;
          border-color: transparent !important;
        }
        .aviso-config-input:focus,
        .aviso-config-input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border-color: transparent !important;
          background: transparent !important;
        }
        .aviso-popup-button:active:not(:disabled),
        .aviso-tab-button:active {
          transform: translateY(1px);
        }
        .aviso-tab-button:hover {
          color: ${ui.text2} !important;
        }
        .aviso-dropdown-trigger:hover {
          border-color: ${ui.accentBorder};
        }
        .aviso-mini-dropdown-trigger:hover:not(:disabled) {
          color: ${ui.accent} !important;
          border-color: ${ui.accentBorder} !important;
        }
        .aviso-dropdown-option:hover:not(:disabled) {
          background: ${ui.hover};
        }
        .aviso-mini-dropdown-option:hover:not(:disabled) {
          color: ${ui.text} !important;
          background: ${ui.hover} !important;
        }
        .aviso-dropdown-option:disabled {
          cursor: not-allowed;
        }
      `}</style>
      <header style={styles.header}>
        <span style={{ ...styles.logo, color: ui.text }}>
          <AvisoMark size={20} />
          Aviso
        </span>
        <span style={styles.headerActions}>
          <span style={styles.accountWrap}>
            {hostedSession ? (
              <button
                type="button"
                className="aviso-popup-button"
                aria-haspopup="dialog"
                aria-expanded={accountPanelOpen}
                aria-label={t("popup.hosted.account")}
                onClick={() => setAccountPanelOpen((open) => !open)}
                style={{
                  ...styles.accountChip,
                  borderColor: ui.line,
                  color: ui.text2
                }}>
                <span
                  style={{
                    ...styles.accountAvatar,
                    background: ui.accentSoft,
                    color: ui.accent
                  }}>
                  {accountInitial}
                </span>
                <span style={{ ...styles.accountChipTier, color: ui.text3 }}>
                  {hostedQuotaDisplay.tierLabel}
                </span>
                <AvisoIcon name="chevdown" size={12} />
              </button>
            ) : (
              <button
                type="button"
                className="aviso-popup-button"
                onClick={() => void signInHosted()}
                disabled={hostedBusy}
                style={{
                  ...styles.accountSignInBtn,
                  borderColor: ui.accentBorder,
                  background: ui.accentSoft,
                  color: ui.accent,
                  ...(hostedBusy ? styles.disabledBtn : {})
                }}>
                <AvisoIcon name="shield" size={13} />
                {hostedBusy
                  ? t("popup.hosted.statusLabel.signing_in")
                  : t("popup.hosted.signIn")}
              </button>
            )}
            {accountPanelOpen && hostedSession && (
              <>
                <div
                  style={styles.accountBackdrop}
                  onClick={() => setAccountPanelOpen(false)}
                />
                <div
                  role="dialog"
                  aria-label={t("popup.hosted.account")}
                  style={{
                    ...styles.accountPanel,
                    background: ui.card,
                    borderColor: ui.line,
                    boxShadow: ui.popShadow
                  }}>
                  <div style={styles.accountPanelHead}>
                    <span
                      style={{
                        ...styles.accountAvatarLg,
                        background: ui.accentSoft,
                        color: ui.accent
                      }}>
                      {accountInitial}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...styles.accountPanelName, color: ui.text }}>
                        {hostedAccountLabel}
                      </div>
                      <div
                        style={{ ...styles.accountPanelTier, color: ui.text3 }}>
                        {hostedQuotaDisplay.tierLabel}
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...getDropdownStatusStyle(hostedStatusTone, ui),
                        marginLeft: "auto"
                      }}>
                      {t(`popup.hosted.statusLabel.${hostedStatus}` as I18nKey)}
                    </span>
                  </div>
                  <div style={styles.accountQuotaBlock}>
                    <div style={{ ...styles.accountQuotaRow, color: ui.text3 }}>
                      <span>{t("popup.hosted.monthlyQuota")}</span>
                      <span>{hostedQuotaDisplay.monthlyQuotaLabel}</span>
                    </div>
                    {hostedQuotaPercent !== null && (
                      <div style={{ ...styles.quotaBarTrack, background: ui.bg }}>
                        <div
                          style={{
                            ...styles.quotaBarFill,
                            width: `${hostedQuotaPercent}%`,
                            background: hostedQuotaBarColor
                          }}
                        />
                      </div>
                    )}
                    <div style={{ ...styles.accountQuotaReset, color: ui.text3 }}>
                      {t("popup.hosted.resetTiming")}:{" "}
                      {hostedQuotaDisplay.resetLabel}
                    </div>
                  </div>
                  <div style={styles.accountPanelActions}>
                    <button
                      type="button"
                      className="aviso-popup-button"
                      onClick={() => void refreshHostedAccount()}
                      disabled={hostedBusy}
                      style={{
                        ...styles.accountActionBtn,
                        borderColor: ui.line,
                        color: ui.text2,
                        ...(hostedBusy ? styles.disabledBtn : {})
                      }}>
                      <AvisoIcon name="refresh" size={13} />
                      {t("popup.hosted.refresh")}
                    </button>
                    <button
                      type="button"
                      className="aviso-popup-button"
                      onClick={() => {
                        setTab("api")
                        setAccountPanelOpen(false)
                      }}
                      style={{
                        ...styles.accountActionBtn,
                        borderColor: ui.line,
                        color: ui.text2
                      }}>
                      {t("popup.account.manage")}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="aviso-popup-button"
                    onClick={() => void signOutHostedLocal()}
                    disabled={hostedBusy}
                    style={{
                      ...styles.accountSignOutBtn,
                      color: ui.danger,
                      ...(hostedBusy ? styles.disabledBtn : {})
                    }}>
                    <AvisoIcon name="close" size={13} />
                    {t("popup.hosted.signOut")}
                  </button>
                </div>
              </>
            )}
          </span>
          <span
            role="group"
            aria-label={t("popup.theme.aria")}
            style={{
              ...styles.themeToggle,
              borderColor: ui.line,
              background: ui.bg
            }}>
            {APPEARANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={t(option.labelKey)}
                aria-label={t(option.labelKey)}
                className="aviso-popup-button"
                onClick={() => updateSetting("appearanceTheme", option.value)}
                style={{
                  ...styles.themeOption,
                  ...(settings.appearanceTheme === option.value
                    ? {
                        color: ui.text,
                        background: ui.accentSoft,
                        borderColor: ui.accentBorder
                      }
                    : {
                        color: ui.text3,
                        borderColor: "transparent"
                      })
                }}>
                <ThemeModeIcon name={option.icon} />
              </button>
            ))}
          </span>
        </span>
      </header>

      {/* 标签页 */}
      <div style={styles.tabs}>
        {(["general", "api", "history", "templates"] as const).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className="aviso-tab-button"
            style={{
              ...styles.tabBtn,
              color: tab === tabId ? ui.accent : ui.text3,
              borderBottomColor: tab === tabId ? ui.accent : "transparent"
            }}>
            {
              {
                general: t("popup.tabs.general"),
                api: t("popup.tabs.api"),
                history: t("popup.tabs.history"),
                templates: t("popup.tabs.templates")
              }[tabId]
            }
          </button>
        ))}
      </div>

      <div id="aviso-popup-content" style={styles.content}>
        {/* 常规设置 */}
        {tab === "general" && (
          <>
            {showZeroState && (
              <button
                type="button"
                className="aviso-popup-button"
                onClick={() => setTab("api")}
                style={{
                  ...styles.enableCard,
                  background: ui.accentSoft,
                  borderColor: ui.accentBorder
                }}>
                <span style={styles.enableText}>
                  <span style={styles.enableHead}>
                    <span style={{ ...styles.enableTitle, color: ui.text }}>
                      {t("popup.zero.notice.title")}
                    </span>
                    <span
                      style={{
                        ...styles.enableBadge,
                        color: "oklch(0.58 0.12 75)",
                        background:
                          "color-mix(in oklab, oklch(0.74 0.11 75) 18%, transparent)"
                      }}>
                      {t("popup.zero.notice.badge")}
                    </span>
                  </span>
                  <span style={{ ...styles.enableSub, color: ui.text2 }}>
                    {t("popup.zero.notice.hint")}
                  </span>
                </span>
                <span
                  style={{
                    ...styles.enableGo,
                    background: ui.surface,
                    borderColor: ui.accentBorder,
                    color: ui.accent
                  }}>
                  {t("popup.zero.jump")} ›
                </span>
              </button>
            )}
            <div style={styles.homePane}>
              {!showZeroState && (
              <div
                style={{
                  ...styles.controlCard,
                  borderBottom: "none"
                }}>
                <div style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                  <AvisoIcon
                    name="model"
                    size={13}
                    style={{ color: ui.text3 }}
                  />
                  {t("popup.currentModel")}
                  <span
                    style={{ ...styles.sectionLine, background: ui.line }}
                  />
                </div>

                <div ref={modelDropdownRef} style={styles.dropdown}>
                  <button
                    type="button"
                    className="aviso-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={modelDropdownOpen}
                    onClick={() => setModelDropdownOpen((open) => !open)}
                    style={{
                      ...styles.dropdownTrigger,
                      background: ui.bg,
                      borderColor: modelDropdownOpen
                        ? ui.accentBorder
                        : ui.line,
                      color: ui.text
                    }}>
                    <AvisoIcon
                      name="model"
                      size={16}
                      style={{ color: ui.accent }}
                    />
                    <span style={styles.modelDropdownCopy}>
                      <strong style={{ color: ui.text }}>
                        {isHostedDefaultSelected
                          ? t("popup.hosted.title")
                          : selectedProviderConfig?.displayName ??
                            t(selectedModel.labelKey)}
                      </strong>
                      <small style={{ color: ui.text3 }}>
                        {serviceStatusDetail}
                      </small>
                    </span>
                    <span
                      style={getDropdownStatusStyle(
                        selectedModelAvailability.tone,
                        ui
                      )}>
                      {selectedModelAvailability.status}
                    </span>
                    <AvisoIcon
                      name="chevdown"
                      size={16}
                      style={{
                        ...styles.dropdownChevron,
                        color: ui.text3,
                        transform: modelDropdownOpen ? "rotate(180deg)" : "none"
                      }}
                    />
                  </button>
                  {modelDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label={t("popup.defaultModelAria")}
                      style={{
                        ...styles.dropdownMenu,
                        background: ui.surface2,
                        borderColor: ui.line
                      }}>
                      <button
                        type="button"
                        className="aviso-dropdown-option"
                        role="option"
                        aria-selected={isHostedDefaultSelected}
                        onClick={async () => {
                          await setDefaultHostedAiService()
                          setModelDropdownOpen(false)
                        }}
                        style={{
                          ...styles.dropdownOption,
                          color: isHostedDefaultSelected
                            ? ui.accent
                            : ui.text2,
                          ...(isHostedDefaultSelected
                            ? {
                                background: ui.accentSoft,
                                fontWeight: 650
                              }
                            : {})
                        }}>
                        <AvisoIcon
                          name="shield"
                          size={16}
                          style={{
                            color: isHostedDefaultSelected
                              ? ui.accent
                              : ui.text3
                          }}
                        />
                        <span style={styles.dropdownOptionBody}>
                          <span style={styles.dropdownOptionText}>
                            {t("popup.hosted.title")}
                          </span>
                          <span style={styles.dropdownSubText}>
                            {t("popup.hosted.optionHelper")}
                          </span>
                        </span>
                        <span
                          style={getDropdownStatusStyle(hostedStatusTone, ui)}>
                          {t(`popup.hosted.statusLabel.${hostedStatus}` as I18nKey)}
                        </span>
                        <AvisoIcon
                          name="check"
                          size={15}
                          style={{
                            ...styles.dropdownCheck,
                            opacity: isHostedDefaultSelected ? 1 : 0
                          }}
                        />
                      </button>
                      {configuredProviderConfigOptions.map((config) => {
                        const route = buildProviderConfigRoute(config, settings)
                        const selected = config.id === defaultProviderConfigId
                        const result =
                          providerConfigConnectivityResults[config.id]
                        const keyValue =
                          providerConfigKeyInputs[config.id] ??
                          providerConfigKeys[config.id] ??
                          ""
                        const disabled =
                          !keyValue.trim() ||
                          (requiresProviderConfigModel(config.provider) &&
                            !config.model.trim())
                        const availability = result
                          ? {
                              tone:
                                result.result === "success"
                                  ? ("ok" as const)
                                  : ("danger" as const),
                              status:
                                result.result === "success"
                                  ? t("popup.provider.status.lastPassed")
                                  : t("popup.provider.status.lastFailed")
                            }
                          : {
                              tone: disabled
                                ? ("danger" as const)
                                : ("muted" as const),
                              status: disabled
                                ? requiresProviderConfigModel(
                                    config.provider
                                  ) && !config.model.trim()
                                  ? t("popup.provider.status.endpointRequired")
                                  : t("popup.provider.status.keyMissing")
                                : t("popup.provider.status.untested")
                            }
                        return (
                          <button
                            key={config.id}
                            type="button"
                            className="aviso-dropdown-option"
                            role="option"
                            aria-selected={selected}
                            aria-disabled={disabled}
                            disabled={disabled}
                            onClick={async () => {
                              if (disabled) return
                              await setDefaultProviderConfig(config)
                              setModelDropdownOpen(false)
                            }}
                            style={{
                              ...styles.dropdownOption,
                              color: selected ? ui.accent : ui.text2,
                              ...(disabled
                                ? styles.dropdownOptionDisabled
                                : {}),
                              ...(selected
                                ? {
                                    background: ui.accentSoft,
                                    fontWeight: 650
                                  }
                                : {})
                            }}>
                            <AvisoIcon
                              name="model"
                              size={16}
                              style={{ color: selected ? ui.accent : ui.text3 }}
                            />
                            <span style={styles.dropdownOptionBody}>
                              <span style={styles.dropdownOptionText}>
                                {config.displayName}
                              </span>
                              <span style={styles.dropdownSubText}>
                                {route.provider.displayName} ·{" "}
                                {requiresProviderConfigModel(config.provider)
                                  ? config.model ||
                                    t("popup.provider.status.endpointMissing")
                                  : route.model.displayName}
                              </span>
                            </span>
                            <span
                              style={getDropdownStatusStyle(
                                availability.tone,
                                ui
                              )}>
                              {availability.status}
                            </span>
                            <AvisoIcon
                              name="check"
                              size={15}
                              style={{
                                ...styles.dropdownCheck,
                                opacity: selected ? 1 : 0
                              }}
                            />
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        className="aviso-dropdown-option"
                        onClick={() => {
                          setModelDropdownOpen(false)
                          setTab("api")
                          setProviderDropdownOpen(true)
                        }}
                        style={{
                          ...styles.dropdownOption,
                          color: ui.text2,
                          borderTop: `1px solid ${ui.line}`,
                          borderRadius: 0,
                          marginTop: 4
                        }}>
                        <AvisoIcon
                          name="key"
                          size={16}
                          style={{ color: ui.accent }}
                        />
                        <span style={styles.dropdownOptionBody}>
                          <span style={styles.dropdownOptionText}>
                            {t("popup.addAiService")}
                          </span>
                          <span style={styles.dropdownSubText}>
                            {t("popup.providerList")}
                          </span>
                        </span>
                        <span style={getDropdownStatusStyle("muted", ui)}>
                          {t("popup.configure")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              <div
                style={{
                  ...styles.controlSection,
                  borderBottomColor: ui.line
                }}>
                <div style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                  <AvisoIcon
                    name="features"
                    size={13}
                    style={{ color: ui.text3 }}
                  />
                  {t("popup.commonFeatures")}
                  <span
                    style={{ ...styles.sectionLine, background: ui.line }}
                  />
                </div>
                <div
                  style={{
                    ...styles.settingList,
                    ...(languageDropdownOpen
                      ? styles.settingListDropdownOpen
                      : {}),
                    background: ui.bg,
                    borderColor: ui.line
                  }}>
                  {(
                    [
                      [
                        "enableToolbar",
                        "selection",
                        t("popup.features.selection"),
                        t("popup.features.selectionHelper")
                      ],
                      [
                        "enableInlineTranslation",
                        "translate",
                        t("popup.features.translation"),
                        `${t("popup.translationTargetPrefix")}${getTranslationTargetLabel(
                          settings.inlineTranslationTargetLanguage,
                          t
                        )}`
                      ],
                      [
                        "enableCommandPalette",
                        "commandPanel",
                        t("popup.features.command"),
                        t("popup.features.commandHelper")
                      ],
                      [
                        "enableClipboardSense",
                        "clipboard",
                        t("popup.features.clipboard"),
                        t("popup.features.clipboardHelper")
                      ],
                      [
                        "enableDoubleClickMenu",
                        "doubleClick",
                        t("popup.features.doubleClick"),
                        t("popup.features.doubleClickHelper")
                      ]
                    ] as [
                      (
                        | "enableToolbar"
                        | "enableInlineTranslation"
                        | "enableCommandPalette"
                        | "enableClipboardSense"
                        | "enableDoubleClickMenu"
                      ),
                      AvisoIconName,
                      string,
                      string
                    ][]
                  ).map(([key, icon, label, helper]) => (
                    <div
                      key={key}
                      style={{
                        ...styles.settingRow,
                        ...(key === "enableInlineTranslation" &&
                        languageDropdownOpen
                          ? styles.settingRowDropdownOpen
                          : {}),
                        borderTopColor: ui.line
                      }}>
                      <AvisoIcon
                        name={icon}
                        size={16}
                        style={{ color: ui.accent }}
                      />
                      <div style={styles.settingCopy}>
                        <strong
                          style={{ ...styles.settingTitle, color: ui.text }}>
                          {label}
                        </strong>
                        <small
                          style={{ ...styles.settingHelper, color: ui.text3 }}>
                          {helper}
                        </small>
                      </div>
                      <span style={styles.rowActions}>
                        {key === "enableInlineTranslation" && (
                          <span
                            ref={languageDropdownRef}
                            data-language-dropdown
                            data-dropdown-direction="down"
                            style={{
                              ...styles.miniDropdown,
                              ...(languageDropdownOpen
                                ? styles.miniDropdownOpen
                                : {})
                            }}>
                            <button
                              type="button"
                              className="aviso-mini-dropdown-trigger"
                              aria-haspopup="listbox"
                              aria-expanded={languageDropdownOpen}
                              disabled={!settings.enableInlineTranslation}
                              onClick={() => {
                                if (!settings.enableInlineTranslation) return
                                setLanguageDropdownOpen((open) => !open)
                              }}
                              style={{
                                ...styles.miniDropdownTrigger,
                                background: settings.enableInlineTranslation
                                  ? ui.bg
                                  : ui.disabledBg,
                                borderColor: ui.line,
                                color: settings.enableInlineTranslation
                                  ? ui.text2
                                  : ui.disabledText,
                                cursor: settings.enableInlineTranslation
                                  ? "pointer"
                                  : "not-allowed",
                                opacity: settings.enableInlineTranslation
                                  ? 1
                                  : 0.72
                              }}>
                              <span>
                                {getTranslationTargetLabel(
                                  settings.inlineTranslationTargetLanguage,
                                  t
                                )}
                              </span>
                              <AvisoIcon name="chevdown" size={13} />
                            </button>
                            {languageDropdownOpen &&
                              settings.enableInlineTranslation && (
                                <div
                                  role="listbox"
                                  aria-label={t("popup.translationTargetAria")}
                                  style={{
                                    ...styles.miniDropdownMenu,
                                    ...styles.miniDropdownMenuDown,
                                    background: ui.surface2,
                                    borderColor: ui.line
                                  }}>
                                  {TRANSLATION_TARGET_OPTIONS.map((option) => {
                                    const selected =
                                      settings.inlineTranslationTargetLanguage ===
                                      option.value
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        className="aviso-mini-dropdown-option"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => {
                                          updateSetting(
                                            "inlineTranslationTargetLanguage",
                                            option.value
                                          )
                                          setLanguageDropdownOpen(false)
                                        }}
                                        style={{
                                          ...styles.miniDropdownOption,
                                          color: selected ? ui.text : ui.text2,
                                          background: selected
                                            ? ui.accentSoft
                                            : "transparent"
                                        }}>
                                        {getTranslationTargetLabel(
                                          option.value,
                                          t
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                          </span>
                        )}
                        <button
                          className="aviso-popup-button"
                          onClick={() =>
                            updateCommonFeatureSetting(key, !settings[key])
                          }
                          style={{
                            ...styles.toggle,
                            background: settings[key]
                              ? aviso.sage500
                              : ui.surface2
                          }}>
                          <span
                            style={{
                              ...styles.toggleThumb,
                              transform: settings[key]
                                ? "translateX(19px)"
                                : "translateX(3px)"
                            }}
                          />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.controlSection}>
                <div style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                  <AvisoIcon
                    name="local"
                    size={13}
                    style={{ color: ui.text3 }}
                  />
                  {t("popup.localAvailable")}
                  <span
                    style={{ ...styles.sectionLine, background: ui.line }}
                  />
                </div>
                <div style={styles.compactLocalRow}>
                  {[
                    [
                      "copy",
                      t("popup.local.copy"),
                      t("popup.local.copyHelper"),
                      copyCurrentContextFromPopup
                    ],
                    [
                      "search",
                      t("popup.local.search"),
                      t("popup.local.searchHelper"),
                      openCommandPaletteFromPopup
                    ],
                    [
                      "history",
                      t("popup.local.restore"),
                      t("popup.local.restoreHelper"),
                      () => {
                        setTab("history")
                        setOpenHint(t("popup.restoreHint"))
                        setTimeout(() => setOpenHint(""), 2500)
                      }
                    ]
                  ].map(([icon, title, helper, onClick]) => (
                    <button
                      key={String(title)}
                      type="button"
                      className="aviso-popup-button"
                      onClick={onClick as () => void}
                      style={{
                        ...styles.compactLocal,
                        background: ui.bg,
                        borderColor: ui.line,
                        color: ui.text2
                      }}>
                      <AvisoIcon
                        name={icon as AvisoIconName}
                        size={16}
                        style={{
                          ...styles.compactLocalIcon,
                          color: ui.accent
                        }}
                      />
                      <span style={styles.compactLocalCopy}>
                        <strong
                          style={{
                            ...styles.compactLocalTitle,
                            ...(resolvedUiLanguage === "zh-CN"
                              ? {}
                              : { minHeight: 30 }),
                            color: ui.text
                          }}>
                          {String(title)}
                        </strong>
                        <small
                          style={{
                            ...styles.compactLocalHelper,
                            ...(resolvedUiLanguage === "zh-CN"
                              ? {}
                              : { minHeight: 27 }),
                            color: ui.text3
                          }}>
                          {String(helper)}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                {openHint && (
                  <p style={{ ...styles.warningText, color: ui.warningText }}>
                    {openHint}
                  </p>
                )}
              </div>

              <div
                style={{
                  ...styles.controlSection,
                  borderBottom: "none",
                  marginBottom: 0
                }}>
                <div style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                  <AvisoIcon
                    name="features"
                    size={13}
                    style={{ color: ui.text3 }}
                  />
                  {t("popup.preferences")}
                  <span
                    style={{ ...styles.sectionLine, background: ui.line }}
                  />
                </div>
                <div
                  style={{
                    ...styles.settingList,
                    ...(uiLangDropdownOpen
                      ? styles.settingListDropdownOpen
                      : {}),
                    background: ui.bg,
                    borderColor: ui.line
                  }}>
                  <div
                    style={{
                      ...styles.settingRow,
                      ...(uiLangDropdownOpen
                        ? styles.settingRowDropdownOpen
                        : {}),
                      borderTopColor: ui.line
                    }}>
                    <AvisoIcon
                      name="features"
                      size={16}
                      style={{ color: ui.text3 }}
                    />
                    <div style={styles.settingCopy}>
                      <strong
                        style={{ ...styles.settingTitle, color: ui.text }}>
                        {t("popup.language.title")}
                      </strong>
                      <small
                        style={{ ...styles.settingHelper, color: ui.text3 }}>
                        {t("popup.language.helper")}
                      </small>
                    </div>
                    <span
                      ref={uiLangDropdownRef}
                      style={{
                        ...styles.miniDropdown,
                        ...(uiLangDropdownOpen ? styles.miniDropdownOpen : {})
                      }}>
                      <button
                        type="button"
                        className="aviso-mini-dropdown-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={uiLangDropdownOpen}
                        aria-label={t("popup.language.title")}
                        onClick={() => {
                          setUiLangDropdownOpen((open) => {
                            const nextOpen = !open
                            if (nextOpen) {
                              setUiLangDropdownDirection(
                                resolveMiniDropdownDirection(
                                  uiLangDropdownRef.current
                                )
                              )
                            }
                            return nextOpen
                          })
                        }}
                        style={{
                          ...styles.miniDropdownTrigger,
                          background: ui.bg,
                          borderColor: ui.line,
                          color: ui.text2
                        }}>
                        <span>
                          {t(
                            (
                              UI_LANGUAGE_OPTIONS.find(
                                (option) =>
                                  option.value === settings.uiLanguage
                              ) ?? UI_LANGUAGE_OPTIONS[0]
                            ).labelKey
                          )}
                        </span>
                        <AvisoIcon name="chevdown" size={13} />
                      </button>
                      {uiLangDropdownOpen && (
                        <div
                          role="listbox"
                          aria-label={t("popup.language.title")}
                          style={{
                            ...styles.miniDropdownMenu,
                            ...(uiLangDropdownDirection === "down"
                              ? styles.miniDropdownMenuDown
                              : styles.miniDropdownMenuUp),
                            background: ui.surface2,
                            borderColor: ui.line
                          }}>
                          {UI_LANGUAGE_OPTIONS.map((option) => {
                            const selected =
                              settings.uiLanguage === option.value
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className="aviso-mini-dropdown-option"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  updateSetting(
                                    "uiLanguage",
                                    option.value as UiLanguageSetting
                                  )
                                  setUiLangDropdownOpen(false)
                                }}
                                style={{
                                  ...styles.miniDropdownOption,
                                  color: selected ? ui.text : ui.text2,
                                  background: selected
                                    ? ui.accentSoft
                                    : "transparent"
                                }}>
                                {t(option.labelKey)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* AI */}
        {tab === "api" && (
          <div style={{ ...panelSectionStyle, paddingTop: 14 }}>
            {showZeroState && (
              <>
                <h3 style={{ ...styles.onbH, color: ui.text }}>
                  {t("popup.zero.title")}
                </h3>
                <p style={{ ...styles.onbSub, color: ui.text2 }}>
                  {t("popup.zero.subtitle")}
                </p>
                <div
                  style={{
                    ...styles.recCard,
                    background: ui.accentSoft,
                    borderColor: ui.accentBorder,
                    boxShadow: `0 0 0 3px ${ui.accentSoft}`
                  }}>
                  <div style={styles.recTop}>
                    <span
                      style={{
                        color: ui.accent,
                        display: "inline-flex",
                        flex: "0 0 auto"
                      }}>
                      <AvisoMark size={20} />
                    </span>
                    <span style={{ ...styles.recName, color: ui.text }}>
                      {t("popup.hosted.title")}
                    </span>
                    <span
                      style={{
                        ...styles.recBadge,
                        background: ui.accent,
                        color: ui.accentText
                      }}>
                      {t("popup.zero.recommended")}
                    </span>
                  </div>
                  <p style={{ ...styles.recDesc, color: ui.text2 }}>
                    {t("popup.zero.hosted.desc")}
                  </p>
                  <button
                    type="button"
                    className="aviso-popup-button aviso-accent-btn"
                    onClick={() => void signInHosted()}
                    disabled={hostedBusy}
                    style={{
                      ...styles.recPrimaryBtn,
                      background: ui.accent,
                      color: ui.accentText,
                      ...(hostedBusy ? styles.disabledBtn : {})
                    }}>
                    {hostedBusy
                      ? t("popup.hosted.statusLabel.signing_in")
                      : t("popup.zero.hosted.cta")}
                  </button>
                </div>
                <div style={styles.orRow}>
                  <span style={{ ...styles.orLine, background: ui.line }} />
                  <span style={{ ...styles.orText, color: ui.text3 }}>
                    {t("popup.zero.or")}
                  </span>
                  <span style={{ ...styles.orLine, background: ui.line }} />
                </div>
                <h3 style={{ ...styles.byokH, color: ui.text }}>
                  {t("popup.zero.byok.heading")}
                </h3>
                <p style={{ ...styles.byokP, color: ui.text2 }}>
                  {t("popup.zero.byok.desc")}
                </p>
                <div ref={providerDropdownRef} style={styles.providerDropdown}>
                  <button
                    type="button"
                    className="aviso-popup-button"
                    aria-haspopup="listbox"
                    aria-expanded={providerDropdownOpen}
                    onClick={() => setProviderDropdownOpen((open) => !open)}
                    style={{
                      ...styles.ghostBtn,
                      borderColor: providerDropdownOpen
                        ? ui.accentBorder
                        : ui.line,
                      color: ui.text
                    }}>
                    <AvisoIcon
                      name="key"
                      size={15}
                      style={{ color: ui.text3 }}
                    />
                    {t("popup.zero.byok.cta")}
                    <AvisoIcon
                      name="chevdown"
                      size={15}
                      style={{
                        color: ui.text3,
                        transform: providerDropdownOpen
                          ? "rotate(180deg)"
                          : "none"
                      }}
                    />
                  </button>
                  {providerDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label={t("popup.service.addAria")}
                      style={{
                        ...styles.providerMenu,
                        left: 0,
                        right: 0,
                        width: "auto",
                        top: "auto",
                        bottom: "calc(100% + 6px)",
                        maxHeight: 320,
                        overflowY: "auto",
                        background: ui.surface2,
                        borderColor: ui.line
                      }}>
                      {PROVIDER_ORDER.map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          className="aviso-dropdown-option"
                          onClick={() => addProviderConfigDraft(provider)}
                          style={{
                            ...styles.dropdownOption,
                            minHeight: 34,
                            color: ui.text2
                          }}>
                          {getProviderCopy(provider, t).addLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {(!showZeroState || hasOpenAddDraft) && (
            <>
            {!showZeroState &&
              (hostedSession ? (
                <>
                  <div
                    style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                    {t("popup.account.section")}
                    <span
                      style={{ ...styles.sectionLine, background: ui.line }}
                    />
                  </div>
                  <div
                    style={{
                      ...styles.acard,
                      background: ui.accentSoft,
                      borderColor: ui.accentBorder
                    }}>
                    <div style={styles.acardTop}>
                      <span style={{ color: ui.accent, display: "inline-flex" }}>
                        <AvisoMark size={20} />
                      </span>
                      <span
                        style={{
                          ...styles.recName,
                          color: ui.text,
                          fontSize: 14
                        }}>
                        {t("popup.hosted.title")}
                      </span>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...getDropdownStatusStyle(hostedStatusTone, ui),
                          marginLeft: "auto"
                        }}>
                        {t(
                          `popup.hosted.statusLabel.${hostedStatus}` as I18nKey
                        )}
                      </span>
                    </div>
                    <div style={{ ...styles.acardQuotaRow, color: ui.text2 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: 12
                        }}>
                        {t("popup.hosted.monthlyQuota")}
                        <span
                          style={{
                            ...styles.tagMono,
                            background: ui.pill,
                            color: ui.text2
                          }}>
                          {hostedQuotaDisplay.tierLabel}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: aviso.mono,
                          fontSize: 12,
                          color: ui.text
                        }}>
                        {hostedQuotaDisplay.monthlyQuotaLabel}
                      </span>
                    </div>
                    {hostedQuotaPercent !== null && (
                      <div style={{ ...styles.quotaBarTrack, background: ui.bg }}>
                        <div
                          style={{
                            ...styles.quotaBarFill,
                            width: `${hostedQuotaPercent}%`,
                            background: hostedQuotaBarColor
                          }}
                        />
                      </div>
                    )}
                    <div style={{ ...styles.acardMeta, color: ui.text3 }}>
                      {t("popup.hosted.dailyQuota")}:{" "}
                      {hostedQuotaDisplay.dailyQuotaLabel}
                      {" · "}
                      {t("popup.hosted.resetTiming")}:{" "}
                      {hostedQuotaDisplay.resetLabel}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    ...styles.recCard,
                    background: ui.accentSoft,
                    borderColor: ui.accentBorder,
                    boxShadow: `0 0 0 3px ${ui.accentSoft}`,
                    marginBottom: 14
                  }}>
                  <div style={styles.recTop}>
                    <span
                      style={{
                        color: ui.accent,
                        display: "inline-flex",
                        flex: "0 0 auto"
                      }}>
                      <AvisoMark size={20} />
                    </span>
                    <span style={{ ...styles.recName, color: ui.text }}>
                      {t("popup.hosted.title")}
                    </span>
                    <span
                      style={{
                        ...styles.recBadge,
                        background: ui.accent,
                        color: ui.accentText
                      }}>
                      {t("popup.zero.recommended")}
                    </span>
                  </div>
                  <p style={{ ...styles.recDesc, color: ui.text2 }}>
                    {t("popup.zero.hosted.desc")}
                  </p>
                  <button
                    type="button"
                    className="aviso-popup-button aviso-accent-btn"
                    onClick={() => void signInHosted()}
                    disabled={hostedBusy}
                    style={{
                      ...styles.recPrimaryBtn,
                      background: ui.accent,
                      color: ui.accentText,
                      ...(hostedBusy ? styles.disabledBtn : {})
                    }}>
                    {hostedBusy
                      ? t("popup.hosted.statusLabel.signing_in")
                      : t("popup.zero.hosted.cta")}
                  </button>
                </div>
              ))}
            {!showZeroState && (
            <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...styles.controlSectionTitle, color: ui.text3 }}>
                {t("popup.service.fastTitle")}
                <span
                  style={{ ...styles.sectionLine, background: ui.line }}
                />
              </div>
                <div
                  ref={fastServiceDropdownRef}
                  style={styles.fastServiceDropdown}>
                  <button
                    type="button"
                    className="aviso-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={fastServiceDropdownOpen}
                    aria-label={t("popup.service.fastAria")}
                    onClick={() =>
                      setFastServiceDropdownOpen((open) => !open)
                    }
                    style={{
                      ...styles.fastServiceDropdownTrigger,
                      background: ui.surface,
                      borderColor: fastServiceDropdownOpen
                        ? ui.accentBorder
                        : ui.line,
                      color: ui.text
                    }}>
                    <span style={styles.fastServiceDropdownText}>
                      {isHostedFastSelected
                        ? t("popup.hosted.title")
                        : selectedFastProviderConfig?.displayName ??
                          t("popup.service.fastDisabled")}
                    </span>
                    <AvisoIcon
                      name="chevdown"
                      size={16}
                      style={{
                        ...styles.dropdownChevron,
                        color: ui.text3,
                        transform: fastServiceDropdownOpen
                          ? "rotate(180deg)"
                          : "none"
                      }}
                    />
                  </button>
                  {fastServiceDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label={t("popup.service.fastAria")}
                      style={{
                        ...styles.fastServiceDropdownMenu,
                        background: ui.surface2,
                        borderColor: ui.line
                      }}>
                      {[
                        {
                          id: "",
                          label: t("popup.service.fastDisabled")
                        },
                        {
                          id: HOSTED_AI_PROVIDER_CONFIG_ID,
                          label: t("popup.hosted.title")
                        },
                        ...configuredProviderConfigOptions.map((config) => ({
                          id: config.id,
                          label: config.displayName
                        }))
                      ].map((option) => {
                        const selected =
                          option.id === selectedFastProviderConfigId ||
                          (!option.id && !selectedFastProviderConfigId)
                        return (
                          <button
                            key={option.id || "disabled"}
                            type="button"
                            className="aviso-dropdown-option"
                            role="option"
                            aria-selected={selected}
                            onClick={async () => {
                              await commitSettings({
                                fastProviderConfigId: option.id
                              })
                              setFastServiceDropdownOpen(false)
                            }}
                            style={{
                              ...styles.fastServiceDropdownOption,
                              color: selected ? ui.accent : ui.text2,
                              ...(selected
                                ? {
                                    background: ui.accentSoft,
                                    fontWeight: 700
                                  }
                                : {})
                            }}>
                            <span style={styles.fastServiceDropdownText}>
                              {option.label}
                            </span>
                            <AvisoIcon
                              name="check"
                              size={15}
                              style={{
                                ...styles.dropdownCheck,
                                opacity: selected ? 1 : 0
                              }}
                            />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              <p
                style={{
                  ...styles.helper,
                  ...styles.fastServiceHelper,
                  color: ui.text3
                }}>
                {t("popup.service.fastHelper")}
              </p>
            </div>

            <div style={styles.serviceToolbar}>
              <span style={{ ...styles.serviceToolbarTitle, color: ui.text3 }}>
                {t("popup.service.configs")}
              </span>
              <div ref={providerDropdownRef} style={styles.providerDropdown}>
                <button
                  type="button"
                  className="aviso-popup-button"
                  aria-haspopup="listbox"
                  aria-expanded={providerDropdownOpen}
                  onClick={() => setProviderDropdownOpen((open) => !open)}
                  style={{
                    ...styles.secondaryBtn,
                    borderColor: ui.line,
                    color: ui.text2
                  }}>
                  <span style={styles.providerTriggerLabel}>
                    <AvisoIcon name="plus" size={14} />
                    {t("popup.service.add")}
                  </span>
                  <AvisoIcon name="chevdown" size={14} />
                </button>
                {providerDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label={t("popup.service.addAria")}
                    style={{
                      ...styles.providerMenu,
                      background: ui.surface2,
                      borderColor: ui.line
                    }}>
                    {PROVIDER_ORDER.map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        className="aviso-dropdown-option"
                        onClick={() => addProviderConfigDraft(provider)}
                        style={{
                          ...styles.dropdownOption,
                          minHeight: 34,
                          color: ui.text2
                        }}>
                        {getProviderCopy(provider, t).addLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="aviso-popup-button"
              onClick={() =>
                hostedStatus === "signed_in"
                  ? void setDefaultHostedAiService()
                  : void signInHosted()
              }
              disabled={hostedBusy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                marginBottom: 9,
                border: `1px solid ${
                  isHostedDefaultSelected ? ui.accentBorder : ui.line
                }`,
                borderRadius: 14,
                background: ui.bg,
                boxShadow: isHostedDefaultSelected ? ui.activeShadow : "none",
                fontFamily: "inherit",
                cursor: hostedBusy ? "default" : "pointer",
                ...(hostedBusy ? styles.disabledBtn : {})
              }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: ui.accentSoft,
                  color: ui.accent
                }}>
                <AvisoMark size={18} />
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2
                }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <strong
                    style={{ fontSize: 13, fontWeight: 700, color: ui.text }}>
                    {t("popup.hosted.title")}
                  </strong>
                  {isHostedDefaultSelected && (
                    <span
                      style={{
                        ...styles.statusPill,
                        ...getDropdownStatusStyle("muted", ui)
                      }}>
                      {t("popup.provider.status.default")}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 11.5, color: ui.text3 }}>
                  {t("popup.hosted.compactSub")}
                </span>
              </span>
              <span
                style={{
                  ...styles.statusPill,
                  ...getDropdownStatusStyle(hostedStatusTone, ui)
                }}>
                {t(`popup.hosted.statusLabel.${hostedStatus}` as I18nKey)}
              </span>
            </button>
            </>
            )}


            {providerConfigs.map((config) => {
              const copy = getProviderCopy(config.provider, t)
              const route = buildProviderConfigRoute(config, settings)
              const mode = providerConfigModes[config.id] ?? "view"
              const isEditing = mode !== "view"
              const isAdd = mode === "add"
              const isDefault = config.id === defaultProviderConfigId
              const isActive = activeProviderConfigId === config.id
              const isConfirmingDelete =
                confirmingDeleteProviderConfigId === config.id
              const keyValue = providerConfigKeyInputs[config.id] ?? ""
              const connectivity = providerConfigConnectivityResults[config.id]
              const keyConfigured = Boolean(keyValue.trim())
              const missingEndpoint =
                requiresProviderConfigModel(config.provider) &&
                !config.model.trim()
              const connectionTone: ModelAvailability["tone"] =
                connectivity?.result === "success"
                  ? "ok"
                  : connectivity
                    ? "danger"
                    : keyConfigured && !missingEndpoint
                      ? "muted"
                      : "danger"
              const connectionLabel =
                testingProviderConfigId === config.id
                  ? t("popup.provider.status.testing")
                  : connectivity?.result === "success"
                    ? t("popup.provider.status.lastPassed")
                    : connectivity
                      ? t("popup.provider.status.lastFailed")
                      : keyConfigured && !missingEndpoint
                        ? isEditing
                          ? t("popup.provider.status.untested")
                          : t("popup.provider.status.recommendedTest")
                        : t("popup.provider.config.unconfigured")
              const speedGrade = resolveConnectivitySpeedGrade(connectivity)
              const speedPill = {
                label: getConnectivitySpeedLabel(speedGrade, t),
                tone: getConnectivitySpeedTone(speedGrade)
              }
              const servicePills: {
                label: string
                tone: ModelAvailability["tone"]
              }[] = [
                ...(isDefault
                  ? [
                      {
                        label: t("popup.provider.status.default"),
                        tone: "muted" as ModelAvailability["tone"]
                      }
                    ]
                  : []),
                ...(isAdd
                  ? [
                      {
                        label: t("popup.provider.status.adding"),
                        tone: "warning" as ModelAvailability["tone"]
                      },
                      {
                        label: t("popup.provider.status.unsaved"),
                        tone: "muted" as ModelAvailability["tone"]
                      }
                    ]
                  : isEditing
                    ? [
                        {
                          label: t("popup.provider.status.editing"),
                          tone: "warning" as ModelAvailability["tone"]
                        },
                        { label: connectionLabel, tone: connectionTone }
                      ]
                    : [{ label: connectionLabel, tone: connectionTone }]),
                speedPill
              ]
              const configStateLabel = isAdd
                ? t("popup.provider.config.waitingSave")
                : keyConfigured && !missingEndpoint
                  ? t("popup.provider.config.savedReady")
                  : keyConfigured && missingEndpoint
                    ? t("popup.provider.config.savedEndpointMissing")
                    : t("popup.provider.config.unconfigured")
              const testStateLabel =
                testingProviderConfigId === config.id
                  ? t("popup.provider.config.testingEllipsis")
                  : connectivity?.result === "success"
                    ? t("popup.provider.status.lastPassed")
                    : connectivity
                      ? t("popup.provider.status.lastFailed")
                      : t("popup.provider.status.untested")

              return (
                <div
                  key={config.id}
                  ref={(node) => {
                    providerConfigCardRefs.current[config.id] = node
                  }}
                  style={{
                    ...styles.serviceConfigCard,
                    ...(showZeroState ? { marginTop: 24 } : {}),
                    background: ui.bg,
                    borderColor:
                      isActive || isDefault ? ui.accentBorder : ui.line,
                    borderStyle: isAdd ? "dashed" : "solid",
                    boxShadow: isActive ? ui.activeShadow : "none"
                  }}>
                  <div style={styles.serviceConfigTop}>
                    <span
                      style={{ ...styles.serviceConfigName, color: ui.text }}>
                      <AvisoIcon
                        name={isAdd ? "plus" : "model"}
                        size={16}
                        style={{ color: ui.accent }}
                      />
                      {config.displayName}
                    </span>
                    <span style={styles.serviceIconActions}>
                      {isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            className="aviso-popup-button"
                            onClick={() => deleteProviderConfigInstance(config)}
                            style={{
                              ...styles.confirmDeleteBtn,
                              borderColor: ui.dangerBorder,
                              color: ui.danger,
                              background: ui.dangerBg
                            }}>
                            {t("popup.service.confirmDelete")}
                          </button>
                          <button
                            type="button"
                            className="aviso-popup-button"
                            onClick={() =>
                              setConfirmingDeleteProviderConfigId(null)
                            }
                            style={{
                              ...styles.cancelDeleteBtn,
                              borderColor: ui.line,
                              color: ui.text2
                            }}>
                            {t("common.cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            title={t("popup.service.testConnection")}
                            aria-label={`${t("popup.service.testConnection")} ${config.displayName}`}
                            className="aviso-popup-button"
                            onClick={() => testProviderConfigInstance(config)}
                            disabled={testingProviderConfigId !== null}
                            style={{
                              ...styles.iconBtn,
                              borderColor: ui.line,
                              color: ui.text2,
                              ...(testingProviderConfigId !== null
                                ? styles.disabledBtn
                                : {})
                            }}>
                            <AvisoIcon name="refresh" size={14} />
                          </button>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                title={t("popup.service.saveConfig")}
                                aria-label={`${t("popup.service.saveConfig")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() =>
                                  saveProviderConfigInstance(config)
                                }
                                style={{
                                  ...styles.iconBtn,
                                  borderColor: ui.line,
                                  color: ui.text2
                                }}>
                                <AvisoIcon name="check" size={14} />
                              </button>
                              <button
                                type="button"
                                title={
                                  isAdd
                                    ? t("popup.service.cancelAdd")
                                    : t("popup.service.cancelEdit")
                                }
                                aria-label={`${isAdd ? t("popup.service.cancelAdd") : t("popup.service.cancelEdit")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() => cancelProviderConfigEdit(config)}
                                style={{
                                  ...styles.iconBtn,
                                  borderColor: ui.line,
                                  color: ui.text2
                                }}>
                                <AvisoIcon name="close" size={14} />
                              </button>
                              <button
                                type="button"
                                title={
                                  isAdd
                                    ? t("popup.service.deleteDraft")
                                    : t("popup.service.deleteConfig")
                                }
                                aria-label={`${isAdd ? t("popup.service.deleteDraft") : t("popup.service.delete")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() =>
                                  isAdd
                                    ? deleteProviderConfigInstance(config)
                                    : setConfirmingDeleteProviderConfigId(
                                        config.id
                                      )
                                }
                                style={{
                                  ...styles.iconBtn,
                                  ...styles.iconBtnDanger,
                                  borderColor: ui.line
                                }}>
                                <AvisoIcon name="trash" size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                title={t("popup.service.setDefault")}
                                aria-label={`${t("popup.service.setDefault")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() => setDefaultProviderConfig(config)}
                                disabled={isDefault}
                                style={{
                                  ...styles.iconBtn,
                                  borderColor: ui.line,
                                  color: ui.text2,
                                  ...(isDefault ? styles.disabledBtn : {})
                                }}>
                                <AvisoIcon name="check" size={14} />
                              </button>
                              <button
                                type="button"
                                title={t("popup.service.editConfig")}
                                aria-label={`${t("popup.service.editConfig")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() => {
                                  setConfirmingDeleteProviderConfigId(null)
                                  setActiveProviderConfigId(config.id)
                                  setProviderConfigModes((prev) => ({
                                    ...prev,
                                    [config.id]: "edit"
                                  }))
                                }}
                                style={{
                                  ...styles.iconBtn,
                                  borderColor: ui.line,
                                  color: ui.text2
                                }}>
                                <AvisoIcon name="edit" size={14} />
                              </button>
                              <button
                                type="button"
                                title={t("popup.service.deleteConfig")}
                                aria-label={`${t("popup.service.deleteConfig")} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() =>
                                  setConfirmingDeleteProviderConfigId(config.id)
                                }
                                style={{
                                  ...styles.iconBtn,
                                  ...styles.iconBtnDanger,
                                  borderColor: ui.line
                                }}>
                                <AvisoIcon name="trash" size={14} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  <div style={{ ...styles.serviceConfigMeta, color: ui.text3 }}>
                    {servicePills.map((pill) => (
                      <span
                        key={pill.label}
                        style={{
                          ...styles.statusPill,
                          ...getDropdownStatusStyle(pill.tone, ui)
                        }}>
                        {pill.label}
                      </span>
                    ))}
                    {route.provider.displayName} ·{" "}
                    {requiresProviderConfigModel(config.provider)
                      ? config.model ||
                        t("popup.provider.status.endpointMissing")
                      : route.model.displayName}
                  </div>
                  {isEditing && (
                    <>
                      <label
                        style={{
                          ...styles.configField,
                          ...(focusedProviderConfigField ===
                          `${config.id}:displayName`
                            ? styles.configFieldFocused
                            : {}),
                          borderColor:
                            focusedProviderConfigField ===
                            `${config.id}:displayName`
                              ? ui.accentBorder
                              : ui.line,
                          background: ui.surface,
                          boxShadow:
                            focusedProviderConfigField ===
                            `${config.id}:displayName`
                              ? ui.focusRing
                              : "none"
                        }}>
                        <AvisoIcon
                          name="edit"
                          size={15}
                          style={{ color: ui.accent }}
                        />
                        <input
                          className="aviso-config-input"
                          type="text"
                          value={config.displayName}
                          onFocus={() =>
                            setFocusedProviderConfigField(
                              `${config.id}:displayName`
                            )
                          }
                          onBlur={() => setFocusedProviderConfigField(null)}
                          onChange={(event) =>
                            updateProviderConfigDraft(config.id, {
                              displayName: event.target.value
                            })
                          }
                          placeholder={t("popup.service.namePlaceholder")}
                          aria-label={`${copy.title}${t("popup.service.nameAriaSuffix")}`}
                          style={styles.configInput}
                        />
                      </label>
                      <label
                        style={{
                          ...styles.configField,
                          ...(focusedProviderConfigField === `${config.id}:key`
                            ? styles.configFieldFocused
                            : {}),
                          borderColor:
                            focusedProviderConfigField === `${config.id}:key`
                              ? ui.accentBorder
                              : ui.line,
                          background: ui.surface,
                          boxShadow:
                            focusedProviderConfigField === `${config.id}:key`
                              ? ui.focusRing
                              : "none"
                        }}>
                        <AvisoIcon
                          name="key"
                          size={15}
                          style={{ color: ui.accent }}
                        />
                        <input
                          className="aviso-config-input"
                          type="password"
                          value={keyValue}
                          onFocus={() => {
                            setFocusedProviderConfigField(`${config.id}:key`)
                            if (keyValue.startsWith("••")) {
                              setProviderConfigKeyInputs((prev) => ({
                                ...prev,
                                [config.id]: ""
                              }))
                            }
                          }}
                          onBlur={() => setFocusedProviderConfigField(null)}
                          onChange={(event) => {
                            setProviderConfigKeyInputs((prev) => ({
                              ...prev,
                              [config.id]: event.target.value
                            }))
                            updateProviderConfigDraft(
                              config.id,
                              {},
                              { apiKeyChanged: true }
                            )
                          }}
                          placeholder={copy.keyPlaceholder}
                          aria-label={copy.keyLabel}
                          style={styles.configInput}
                        />
                      </label>
                      <label
                        style={{
                          ...styles.configField,
                          ...(focusedProviderConfigField ===
                          `${config.id}:model`
                            ? styles.configFieldFocused
                            : {}),
                          borderColor:
                            focusedProviderConfigField === `${config.id}:model`
                              ? ui.accentBorder
                              : ui.line,
                          background: ui.surface,
                          boxShadow:
                            focusedProviderConfigField === `${config.id}:model`
                              ? ui.focusRing
                              : "none"
                        }}>
                        <AvisoIcon
                          name="model"
                          size={15}
                          style={{ color: ui.accent }}
                        />
                        <input
                          className="aviso-config-input"
                          type="text"
                          value={config.model}
                          onFocus={() =>
                            setFocusedProviderConfigField(`${config.id}:model`)
                          }
                          onBlur={() => setFocusedProviderConfigField(null)}
                          onChange={(event) =>
                            updateProviderConfigDraft(config.id, {
                              model: event.target.value
                            })
                          }
                          placeholder={copy.modelPlaceholder}
                          aria-label={copy.modelLabel}
                          style={styles.configInput}
                        />
                      </label>
                      <p style={{ ...styles.configHint, color: ui.text3 }}>
                        {t("popup.service.modelHint")}
                      </p>
                    </>
                  )}
                  <div
                    style={{
                      ...styles.configStateList,
                      borderColor: ui.line,
                      color: ui.text3
                    }}>
                    <div style={{ ...styles.configStateRow, color: ui.text3 }}>
                      <span>{t("popup.service.configStatus")}</span>
                      <strong>{configStateLabel}</strong>
                    </div>
                    <div style={{ ...styles.configStateRow, color: ui.text3 }}>
                      <span>{t("popup.service.testStatus")}</span>
                      <strong>{testStateLabel}</strong>
                    </div>
                  </div>
                  {connectivity && (
                    <ConnectivitySummaryView
                      summary={connectivity}
                      theme={resolvedAppearance}
                      t={t}
                    />
                  )}
                </div>
              )
            })}

            {!showZeroState && (
            <div
              style={{
                ...styles.panelCard,
                background: ui.bg,
                borderColor: ui.line
              }}>
              <h3 style={{ ...styles.panelTitle, color: ui.text }}>
                <AvisoIcon
                  name="shield"
                  size={16}
                  style={{ color: ui.accent }}
                />
                {t("popup.privacyBoundary.title")}
              </h3>
              <div style={styles.privMode}>
                <span style={{ ...styles.privModeDot, background: ui.accent }} />
                <div>
                  <div style={{ ...styles.privModeTitle, color: ui.text }}>
                    {t("popup.privacy.hostedTitle")}
                  </div>
                  <p style={{ ...styles.privModeDesc, color: ui.text2 }}>
                    {t("popup.privacy.hostedDesc")}
                  </p>
                </div>
              </div>
              <div
                style={{
                  ...styles.privMode,
                  borderTop: `1px solid ${ui.line}`
                }}>
                <span
                  style={{
                    ...styles.privModeDot,
                    background: "oklch(0.64 0.07 215)"
                  }}
                />
                <div>
                  <div style={{ ...styles.privModeTitle, color: ui.text }}>
                    {t("popup.privacy.byokTitle")}
                  </div>
                  <p style={{ ...styles.privModeDesc, color: ui.text2 }}>
                    {t("popup.privacy.byokDesc")}
                  </p>
                </div>
              </div>
            </div>
            )}
            </>
            )}
            {showZeroState && (
            <div
              style={{
                ...styles.privLine,
                borderTopColor: ui.line,
                color: ui.text3
              }}>
              <AvisoIcon
                name="shield"
                size={14}
                style={{ color: ui.accent, flex: "0 0 auto", marginTop: 1 }}
              />
              <span>
                {t("popup.zero.privacy")}{" "}
                <button
                  type="button"
                  className="aviso-popup-button"
                  onClick={() => setShowPrivacy((v) => !v)}
                  style={{ ...styles.privLink, color: ui.accent }}>
                  {t("popup.footer.privacy")} ›
                </button>
              </span>
            </div>
            )}
          </div>
        )}

        {/* 模板管理 */}
        {tab === "templates" && (
          <div style={{ ...panelSectionStyle, paddingTop: 14 }}>
            <div
              style={{
                ...styles.panelCard,
                background: ui.bg,
                borderColor: ui.line
              }}>
              <h3 style={{ ...styles.panelTitle, color: ui.text }}>
                <AvisoIcon name="send" size={16} style={{ color: ui.accent }} />
                {t("popup.templates.title")}
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                {t("popup.templates.helper")}
              </p>
            </div>

            {settings.templates.length === 0 && !draft && (
              <p style={{ ...styles.emptyText, marginTop: 12 }}>
                {t("popup.templates.empty")}
              </p>
            )}

            {settings.templates.map((template) =>
              draft?.id === template.id ? (
                renderTemplateForm(draft, template.id)
              ) : (
                <div
                  key={template.id}
                  style={{
                    ...styles.templateCard,
                    background: ui.bg,
                    borderColor: ui.line
                  }}>
                  <AvisoIcon
                    name={getTemplateIcon(template)}
                    size={16}
                    style={{ color: ui.accent }}
                  />
                  <div style={styles.templateCardBody}>
                    <strong style={{ ...styles.templateName, color: ui.text }}>
                      {template.name}
                    </strong>
                    <small
                      style={{ ...styles.templateSummary, color: ui.text3 }}>
                      {getTemplateSummary(template, t)}
                    </small>
                  </div>
                  <div style={styles.templateActions}>
                    <button
                      className="aviso-popup-button"
                      onClick={() =>
                        setDraft({
                          ...template,
                          contexts: [...template.contexts]
                        })
                      }
                      style={{
                        ...styles.editBtn,
                        borderColor: ui.line
                      }}>
                      {t("popup.templates.edit")}
                    </button>
                    <button
                      className="aviso-popup-button"
                      onClick={() =>
                        updateSetting(
                          "templates",
                          settings.templates.filter((x) => x.id !== template.id)
                        )
                      }
                      style={{
                        ...styles.deleteBtn,
                        borderColor: ui.line,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                      <AvisoIcon name="trash" size={13} />
                      {t("popup.templates.delete")}
                    </button>
                  </div>
                </div>
              )
            )}

            {draft && !settings.templates.some((t) => t.id === draft.id) ? (
              renderTemplateForm(draft)
            ) : !draft && settings.templates.length < 20 ? (
              <button
                className="aviso-popup-button"
                onClick={() =>
                  setDraft({
                    id: `tpl-${Date.now()}`,
                    name: "",
                    prompt: "",
                    contexts: ["selection"]
                  })
                }
                style={{
                  ...styles.addBtn,
                  borderColor: ui.accentBorder,
                  color: ui.accent
                }}>
                {t("popup.templates.add")}
              </button>
            ) : null}
          </div>
        )}

        {/* 历史记录 */}
        {tab === "history" && (
          <div style={{ ...panelSectionStyle, paddingTop: 14 }}>
            <div
              style={{
                ...styles.panelCard,
                background: ui.bg,
                borderColor: ui.line
              }}>
              <h3 style={{ ...styles.panelTitle, color: ui.text }}>
                <AvisoIcon
                  name="history"
                  size={16}
                  style={{ color: ui.accent }}
                />
                {t("popup.history.title")}
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                {t("popup.history.helper")}
              </p>
            </div>
            {history.length === 0 ? (
              <p style={{ ...styles.emptyText, marginTop: 12 }}>
                {t("popup.history.empty")}
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 8
                  }}>
                  <button
                    className="aviso-popup-button"
                    onClick={clearAll}
                    style={{
                      ...styles.deleteBtn,
                      borderColor: ui.line,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                    <AvisoIcon name="trash" size={13} />
                    {t("popup.history.clearAll")}
                  </button>
                </div>
                {openHint && (
                  <p style={{ ...styles.warningText, color: ui.warningText }}>
                    {openHint}
                  </p>
                )}
                {history.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      ...styles.historyItem,
                      background: ui.bg,
                      borderColor: ui.line
                    }}>
                    <div
                      onClick={() => openHistory(e)}
                      title={t("popup.history.restoreTitle")}
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <div style={{ ...styles.historyInput, color: ui.text }}>
                        {e.pinned && (
                          <AvisoMark
                            size={13}
                            style={{ color: aviso.sage400, marginRight: 4 }}
                          />
                        )}
                        {getHistoryTitle(e, t)}
                      </div>
                      <div style={{ ...styles.historyOutput, color: ui.text3 }}>
                        {getHistorySummary(e, t)}
                      </div>
                    </div>
                    <div style={styles.historyActions}>
                      <span style={{ ...styles.historyMeta, color: ui.text3 }}>
                        {formatRelativeTime(e.updatedAt ?? e.timestamp, t)}
                      </span>
                      <button
                        onClick={() => deleteEntry(e)}
                        className="aviso-popup-button"
                        style={{
                          ...styles.deleteBtn,
                          borderColor: ui.line,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                        <AvisoIcon name="trash" size={13} />
                        {t("popup.history.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {showPrivacy && (
        <div
          style={{
            ...styles.privacyBox,
            background: ui.bg,
            borderTopColor: ui.line,
            color: ui.text2
          }}>
          {t("popup.privacy.full")}
        </div>
      )}
      <footer
        style={{
          ...styles.footer,
          borderTopColor: ui.line,
          background: ui.surface
        }}>
        <span
          style={{
            ...styles.autoSaveHint,
            color: saveErrorKey ? ui.danger : ui.accent
          }}>
          {saveErrorKey
            ? t(saveErrorKey)
            : saved
              ? t("popup.footer.saved")
              : t("popup.footer.autoSave")}
        </span>
        <span style={styles.footerRight}>
          <button
            className="aviso-popup-button"
            onClick={() => setShowPrivacy((v) => !v)}
            style={{ ...styles.link, color: ui.text3 }}>
            {t("popup.footer.privacy")}
          </button>
          <span style={{ ...styles.version, color: ui.text3 }}>v0.1.0</span>
        </span>
      </footer>
    </div>
  )
}

function getProviderKeyValue(
  provider: ProviderId,
  keys: Record<ProviderId, string>
) {
  return keys[provider] ?? ""
}

function isLegacyProviderId(
  provider: ProviderId
): provider is LegacyProviderId {
  return (
    provider === "openai" || provider === "anthropic" || provider === "doubao"
  )
}

function getProviderModelValue(provider: ProviderId, settings: Settings) {
  if (provider === "doubao") return settings.doubaoModel ?? ""
  return PROVIDER_PRIMARY_MODEL[provider]
}

function getProviderModelInputValue(
  provider: ProviderId,
  drafts: Record<ProviderId, string>,
  t: (key: I18nKey) => string
) {
  const value = drafts[provider]?.trim()
  if (requiresProviderConfigModel(provider)) {
    return value || t("popup.provider.config.unconfigured")
  }
  return value || PROVIDER_PRIMARY_MODEL[provider]
}

function formatRelativeTime(timestamp: number, t: (key: I18nKey) => string) {
  const diffMs = Date.now() - timestamp
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return t("popup.history.justNow")
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function getHistoryTitle(entry: HistoryEntry, t: (key: I18nKey) => string) {
  const operationLabel =
    entry.operation === "translate"
      ? t("popup.history.translateTitle")
      : entry.operation === "summarize"
        ? t("popup.history.summarizeTitle")
        : entry.operation === "explain"
          ? t("popup.history.explainTitle")
          : t("popup.history.chatTitle")
  return entry.input?.trim() ? entry.input.trim().slice(0, 28) : operationLabel
}

function getHistorySummary(entry: HistoryEntry, t: (key: I18nKey) => string) {
  return entry.output?.trim()
    ? entry.output.trim().slice(0, 58)
    : t("popup.history.restoreSummary")
}

function getTemplateSummary(
  template: PromptTemplate,
  t: (key: I18nKey) => string
) {
  return template.prompt.trim()
    ? template.prompt.trim().replace(/\s+/g, " ").slice(0, 42)
    : t("popup.templates.emptySummary")
}

function getTemplateIcon(template: PromptTemplate): AvisoIconName {
  return /翻译|译/.test(`${template.name} ${template.prompt}`)
    ? "translate"
    : "save"
}

function ConnectivitySummaryView({
  summary,
  theme,
  t
}: {
  summary?: ConnectivityValidationSummary
  theme: ResolvedAvisoTheme
  t: (key: I18nKey) => string
}) {
  const [expanded, setExpanded] = useState(false)
  if (!summary) return null
  const ui = getAvisoThemeTokens(theme)
  const ok = summary.result === "success"
  const isLastResult = /^上次|^Last/i.test(summary.latency_note)
  const titleLabel = isLastResult
    ? ok
      ? t("popup.connectivity.lastPassed")
      : t("popup.connectivity.lastFailed")
    : ok
      ? t("popup.connectivity.passed")
      : t("popup.connectivity.failed")
  const timing = getConnectivityTimingSummary(summary)
  const speedGrade = resolveConnectivitySpeedGrade(summary)
  const rows = [
    [
      t("popup.connectivity.speedGrade"),
      getConnectivitySpeedLabel(speedGrade, t)
    ],
    [t("popup.connectivity.firstToken"), formatMs(timing.firstTokenMs, t)],
    [t("popup.connectivity.completion"), formatMs(timing.completionMs, t)],
    [
      t("popup.connectivity.localProcessing"),
      formatMs(timing.localProcessingMs, t)
    ],
    [t("popup.connectivity.testedAt"), formatDateTime(timing.testedAt, t)],
    [t("popup.connectivity.testModel"), summary.model_or_endpoint],
    [t("popup.connectivity.provider"), summary.provider],
    [t("popup.connectivity.safety"), t("popup.connectivity.safetyNote")]
  ]

  return (
    <div
      style={{
        ...styles.connectivityResult,
        background: ui.surface,
        borderColor: ok ? ui.accentBorder : ui.dangerBorder
      }}>
      <button
        type="button"
        className="aviso-popup-button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        style={{
          ...styles.connectivityResultToggle,
          borderRadius: expanded ? "9px 9px 0 0" : 9,
          color: ui.text
        }}>
        <span style={{ ...styles.connectivityResultTitle, color: ui.text }}>
          <span
            style={{
              ...styles.connectivityStatusDot,
              background: ok ? ui.accent : ui.danger
            }}
          />
          {titleLabel}
        </span>
        <span style={{ ...styles.connectivityToggleText, color: ui.text3 }}>
          {expanded
            ? t("popup.connectivity.hideDetails")
            : t("popup.connectivity.showDetails")}
          <AvisoIcon
            name="chevdown"
            size={13}
            style={{ transform: expanded ? "rotate(180deg)" : "none" }}
          />
        </span>
      </button>
      {expanded &&
        rows.map(([key, value]) => (
          <div key={key} style={styles.summaryRow}>
            <span style={{ ...styles.summaryKey, color: ui.text3 }}>{key}</span>
            <span style={{ ...styles.summaryValue, color: ui.text2 }}>
              {value}
            </span>
          </div>
        ))}
    </div>
  )
}

function buildPopupFallbackSummary(
  provider: ProviderId,
  modelOrEndpoint: string,
  error: string | undefined,
  t: (key: I18nKey) => string
): ConnectivityValidationSummary {
  const hasError = Boolean(error)

  return {
    provider,
    model_or_endpoint: modelOrEndpoint,
    action: "provider_connectivity_test",
    trigger: "manual_settings_provider_button",
    host_permission_present: true,
    result: "failure",
    latency_note: t("popup.connectivity.fallbackLatency"),
    error_category: "unknown_error",
    secret_leak_check: "pass",
    raw_prompt_logged: "no",
    raw_response_logged: "no",
    private_page_data_logged: "no",
    notes: hasError
      ? t("popup.connectivity.fallbackWithError")
      : t("popup.connectivity.fallback")
  }
}

function withPopupConnectivityTiming(
  summary: ConnectivityValidationSummary,
  testedAt: number
): ConnectivityValidationSummary {
  const timing = getConnectivityTimingSummary(summary)
  return {
    ...summary,
    ...(timing.completionMs ? { completion_ms: timing.completionMs } : {}),
    ...(timing.firstTokenMs ? { first_token_ms: timing.firstTokenMs } : {}),
    ...(timing.localProcessingMs
      ? { local_processing_ms: timing.localProcessingMs }
      : {}),
    tested_at: testedAt
  }
}

function getConnectivitySpeedLabel(
  grade: ReturnType<typeof resolveConnectivitySpeedGrade>,
  t: (key: I18nKey) => string
): string {
  return t(`popup.connectivity.speed.${grade}` as I18nKey)
}

function getConnectivitySpeedTone(
  grade: ReturnType<typeof resolveConnectivitySpeedGrade>
): ModelAvailability["tone"] {
  if (grade === "fast") return "ok"
  if (grade === "moderate") return "warning"
  if (grade === "slow" || grade === "failed") return "danger"
  return "muted"
}

function getHostedAccountStatusTone(
  status: HostedAccountStatus
): ModelAvailability["tone"] {
  if (status === "signed_in") return "ok"
  if (status === "signing_in" || status === "rate_limited") return "warning"
  if (
    status === "expired" ||
    status === "local_backend_unavailable" ||
    status === "quota_exhausted" ||
    status === "hosted_route_unavailable" ||
    status === "request_invalid"
  ) {
    return "danger"
  }
  return "muted"
}

function getHostedAccountStatusMessageKey(
  status: HostedAccountStatus
): I18nKey {
  return `popup.hosted.status.${status}` as I18nKey
}

function getHostedSignInFailureMessageKey(
  result: HostedGoogleSignInData | undefined,
  hasStoredSession: boolean
): I18nKey {
  if (!result) return "popup.hosted.status.runtimeUnavailable"
  if (hasStoredSession) return "popup.hosted.status.refreshed"

  if (result.error?.source === "oauth") {
    if (result.error.code === "user_cancelled") {
      return "popup.hosted.status.oauthCanceled"
    }
    if (result.error.code === "config_missing") {
      return "popup.hosted.status.oauthConfigMissing"
    }
    if (result.error.code === "state_mismatch") {
      return "popup.hosted.status.oauthStateMismatch"
    }
    return "popup.hosted.status.oauthUnavailable"
  }

  if (result.error?.source === "backend") {
    if (result.stage === "client") {
      return "popup.hosted.status.authClientUnavailable"
    }
    if (result.stage === "auth_google" && result.error.httpStatusClass === "4xx") {
      return "popup.hosted.status.authRejected"
    }
    if (result.stage === "me") return "popup.hosted.status.accountReadFailed"
    return "popup.hosted.status.authBackendUnavailable"
  }

  if (result.stage === "storage") return "popup.hosted.status.sessionSaveFailed"
  return getHostedAccountStatusMessageKey(result.status)
}

function sendRuntimeMessage<TData = unknown>(
  message: unknown
): Promise<PopupRuntimeResponse<TData>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response?: PopupRuntimeResponse<TData>) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        reject(new Error("runtime_message_failed"))
        return
      }
      resolve(response ?? { success: false, error: "empty_response" })
    })
  })
}

function formatMs(value: number | undefined, t: (key: I18nKey) => string) {
  if (!value) return t("popup.connectivity.noData")
  if (value < 1_000) return `${Math.round(value)} ms`
  return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}s`
}

function formatDateTime(
  value: number | undefined,
  t: (key: I18nKey) => string
) {
  if (!value) return t("popup.connectivity.noData")
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t("popup.connectivity.noData")
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}`
}

type PopupUiTokens = AvisoThemeTokens

function getDropdownStatusStyle(
  tone: ModelAvailability["tone"],
  ui: PopupUiTokens
) {
  return {
    ...styles.dropdownStatus,
    borderColor: ui.line,
    background: "transparent",
    color: ui.text3,
    ...(tone === "ok"
      ? {
          color: ui.accent,
          borderColor: ui.accentBorder,
          background: ui.accentSoft
        }
      : tone === "warning"
        ? {
            color: ui.warningText,
            borderColor: ui.warningBorder,
            background: ui.warningBg
          }
        : tone === "danger"
          ? {
              color: ui.danger,
              borderColor: ui.dangerBorder,
              background: ui.dangerBg
            }
          : {})
  }
}

function getProviderMessageStyle(
  tone: ProviderActionMessage["tone"],
  ui: PopupUiTokens
) {
  if (tone === "ok") {
    return {
      color: ui.accent,
      borderColor: ui.accentBorder,
      background: ui.accentSoft
    }
  }
  if (tone === "warning") {
    return {
      color: ui.warningText,
      borderColor: ui.warningBorder,
      background: ui.warningBg
    }
  }
  if (tone === "danger") {
    return {
      color: ui.danger,
      borderColor: ui.dangerBorder,
      background: ui.dangerBg
    }
  }
  return {
    color: ui.text3,
    borderColor: ui.line,
    background: ui.surface
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: POPUP_FRAME.width,
    height: POPUP_FRAME.safeMaxHeight,
    maxHeight: POPUP_FRAME.safeMaxHeight,
    margin: 0,
    background: aviso.darkSurface,
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    boxSizing: "border-box",
    color: aviso.darkText,
    fontFamily: aviso.font,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...visuallyStable
  },
  header: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "15px 17px 11px"
  },
  headerLeft: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0
  },
  logo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: aviso.darkText
  },
  version: {
    flex: "0 0 auto",
    fontFamily: aviso.mono,
    fontSize: 11,
    color: aviso.darkText3
  },
  headerActions: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto"
  },
  accountWrap: {
    position: "static",
    display: "inline-flex"
  },
  accountChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 26,
    padding: "0 7px 0 3px",
    border: `1px solid var(--aviso-line)`,
    borderRadius: 999,
    background: "transparent",
    cursor: "pointer"
  },
  accountAvatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    fontFamily: aviso.font,
    fontSize: 11,
    fontWeight: 700
  },
  accountChipTier: {
    fontFamily: aviso.font,
    fontSize: 11,
    fontWeight: 600
  },
  accountSignInBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 26,
    padding: "0 11px",
    border: `1px solid transparent`,
    borderRadius: 999,
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  },
  accountBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 40
  },
  accountPanel: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    width: 270,
    zIndex: 50,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 14,
    padding: 13,
    display: "flex",
    flexDirection: "column",
    gap: 11,
    textAlign: "left"
  },
  accountPanelHead: {
    display: "flex",
    alignItems: "center",
    gap: 9
  },
  accountAvatarLg: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 999,
    flex: "0 0 auto",
    fontFamily: aviso.font,
    fontSize: 14,
    fontWeight: 700
  },
  accountPanelName: {
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  accountPanelTier: {
    fontFamily: aviso.font,
    fontSize: 11,
    fontWeight: 600
  },
  accountQuotaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  accountQuotaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: aviso.font,
    fontSize: 12
  },
  quotaBarTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden"
  },
  quotaBarFill: {
    height: "100%",
    borderRadius: 999
  },
  accountQuotaReset: {
    fontFamily: aviso.font,
    fontSize: 11
  },
  accountPanelActions: {
    display: "flex",
    gap: 7
  },
  accountActionBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 30,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 9,
    background: "transparent",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
  },
  accountSignOutBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 30,
    border: `1px solid transparent`,
    borderRadius: 9,
    background: "transparent",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
  },
  zeroCard: {
    padding: 14,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 12,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 9
  },
  enableCard: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    margin: "13px 15px 0",
    padding: "11px 12px",
    border: `1px solid transparent`,
    borderRadius: 9,
    textAlign: "left",
    cursor: "pointer"
  },
  enableIco: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    flex: "0 0 auto",
    borderRadius: 6,
    border: `1px solid var(--aviso-line)`
  },
  enableText: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  enableHead: {
    display: "flex",
    alignItems: "center",
    gap: 7
  },
  enableTitle: {
    fontFamily: aviso.font,
    fontSize: 13.5,
    fontWeight: 700
  },
  enableBadge: {
    fontFamily: aviso.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.03em",
    padding: "2px 7px",
    borderRadius: 6
  },
  enableSub: {
    fontFamily: aviso.font,
    fontSize: 11,
    lineHeight: 1.4
  },
  enableGo: {
    flex: "0 0 auto",
    fontFamily: aviso.font,
    fontSize: 12.5,
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 9,
    border: `1px solid var(--aviso-line)`,
    whiteSpace: "nowrap"
  },
  zeroTitle: {
    fontFamily: aviso.font,
    fontSize: 15,
    fontWeight: 800
  },
  zeroSubtitle: {
    fontFamily: aviso.font,
    fontSize: 12,
    marginTop: -4
  },
  zeroOption: {
    border: `1px solid var(--aviso-line)`,
    borderRadius: 12,
    padding: "11px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  zeroOptionHead: {
    display: "flex",
    alignItems: "center",
    gap: 7
  },
  zeroOptionName: {
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 700
  },
  zeroBadge: {
    fontFamily: aviso.font,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    marginLeft: "auto"
  },
  zeroBadgeMuted: {
    fontFamily: aviso.font,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    marginLeft: "auto"
  },
  zeroOptionDesc: {
    fontFamily: aviso.font,
    fontSize: 12,
    lineHeight: 1.5
  },
  zeroPrimaryBtn: {
    height: 32,
    border: "none",
    borderRadius: 9,
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer"
  },
  zeroSecondaryBtn: {
    height: 32,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 9,
    background: "transparent",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  onbH: {
    fontFamily: aviso.font,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    margin: "2px 0 3px"
  },
  onbSub: {
    fontFamily: aviso.font,
    fontSize: 12.5,
    lineHeight: 1.5,
    margin: "0 0 15px"
  },
  recCard: {
    border: `1px solid transparent`,
    borderRadius: 14,
    padding: "14px 15px 15px"
  },
  recTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 9
  },
  recName: {
    fontFamily: aviso.font,
    fontSize: 15.5,
    fontWeight: 800,
    letterSpacing: "-0.01em"
  },
  recBadge: {
    marginLeft: "auto",
    fontFamily: aviso.mono,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    borderRadius: 6,
    padding: "3px 8px"
  },
  recDesc: {
    fontFamily: aviso.font,
    fontSize: 12.5,
    lineHeight: 1.5,
    margin: "0 0 13px"
  },
  recPrimaryBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    border: "none",
    borderRadius: 9,
    fontFamily: aviso.font,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer"
  },
  orRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "15px 2px"
  },
  orLine: {
    flex: 1,
    height: 1
  },
  orText: {
    fontFamily: aviso.font,
    fontSize: 11.5
  },
  byokH: {
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 700,
    margin: "0 0 3px"
  },
  byokP: {
    fontFamily: aviso.font,
    fontSize: 12,
    lineHeight: 1.5,
    margin: "0 0 11px"
  },
  ghostBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 38,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 9,
    background: "transparent",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  privLine: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 16,
    paddingTop: 14,
    borderTop: `1px solid var(--aviso-line)`,
    fontFamily: aviso.font,
    fontSize: 12,
    lineHeight: 1.55
  },
  privLink: {
    border: "none",
    background: "transparent",
    padding: 0,
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
  },
  acard: {
    border: `1px solid var(--aviso-line)`,
    borderRadius: 12,
    padding: "12px 13px",
    marginBottom: 14
  },
  acardTop: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 9
  },
  acardQuotaRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 7
  },
  acardMeta: {
    fontFamily: aviso.font,
    fontSize: 11,
    marginTop: 9
  },
  tagMono: {
    fontFamily: aviso.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.04em",
    borderRadius: 6,
    padding: "2px 7px"
  },
  privMode: {
    display: "flex",
    gap: 9,
    padding: "8px 0"
  },
  privModeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flex: "0 0 auto",
    marginTop: 5
  },
  privModeTitle: {
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 700
  },
  privModeDesc: {
    fontFamily: aviso.font,
    fontSize: 11,
    lineHeight: 1.55,
    margin: "2px 0 0"
  },
  themeToggle: {
    display: "inline-grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 2,
    padding: 2,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 999
  },
  themeOption: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 22,
    border: "1px solid transparent",
    borderRadius: 999,
    background: "transparent",
    fontFamily: aviso.font,
    fontSize: 11,
    fontWeight: 750,
    cursor: "pointer",
    padding: 0
  },
  tabs: {
    flex: "0 0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 2,
    padding: "0 10px",
    borderBottom: "none"
  },
  tabBtn: {
    minWidth: 0,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: aviso.darkText3,
    padding: "10px 3px 11px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: `.15s ${aviso.ease}`
  },
  content: {
    flex: "1 1 0",
    height: 0,
    minHeight: 0,
    maxHeight: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    padding: "2px 0"
  },
  homePane: {
    padding: 15
  },
  controlCard: {
    padding: "0 0 11px",
    marginBottom: 12,
    borderBottom: `1px solid var(--aviso-line)`
  },
  fastServiceDropdown: {
    position: "relative",
    width: "100%",
    minWidth: 0
  },
  fastServiceDropdownTrigger: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    minHeight: 38,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusSm,
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 650,
    padding: "0 9px 0 12px",
    cursor: "pointer",
    outline: "none",
    textAlign: "left",
    transition: `.15s ${aviso.ease}`
  },
  fastServiceDropdownText: {
    display: "block",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  fastServiceDropdownMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: 45,
    display: "grid",
    gap: 3,
    padding: 6,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd,
    boxShadow: "0 16px 38px -14px oklch(0.12 0.02 155 / .6)",
    boxSizing: "border-box"
  },
  fastServiceDropdownOption: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    minHeight: 34,
    padding: "7px 9px 7px 11px",
    border: 0,
    borderRadius: aviso.radiusSm,
    background: "transparent",
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 13,
    lineHeight: 1.25,
    textAlign: "left"
  },
  fastServiceHelper: {
    marginTop: 8
  },
  hostedAccountCard: {
    padding: "12px",
    marginBottom: 12,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd
  },
  hostedAccountHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  hostedAccountActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusSm,
    background: "transparent",
    cursor: "pointer",
    padding: 0
  },
  iconBtnDanger: {
    color: aviso.danger
  },
  controlSection: {
    padding: "0 0 11px",
    marginBottom: 12,
    borderBottom: `1px solid var(--aviso-line)`
  },
  controlSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: "0.02em"
  },
  sectionLine: {
    flex: 1,
    height: 1
  },
  modelDropdownCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
    flex: 1
  },
  dropdownSubText: {
    display: "block",
    minWidth: 0,
    color: aviso.darkText3,
    fontSize: 11,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  dropdownEmpty: {
    padding: "10px",
    color: aviso.darkText3,
    fontSize: 12,
    lineHeight: 1.4
  },
  section: { padding: "20px 18px" },
  expandedSection: { padding: "16px 18px" },
  label: {
    display: "block",
    fontSize: 12,
    color: aviso.darkText3,
    marginBottom: 8,
    letterSpacing: "0.02em"
  },
  dropdown: {
    position: "relative",
    width: "100%"
  },
  dropdownTrigger: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    background: aviso.darkBg,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    color: aviso.darkText,
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 14,
    padding: "10px 11px",
    outline: "none",
    textAlign: "left",
    transition: `.15s ${aviso.ease}`
  },
  dropdownTriggerOpen: {
    borderColor: aviso.sage500,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${aviso.sage400} 22%, transparent)`
  },
  dropdownValue: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
    flex: 1
  },
  dropdownValueIcon: {
    color: aviso.sage300
  },
  dropdownValueText: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    flex: 1
  },
  dropdownText: {
    display: "block",
    minWidth: 0,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  dropdownChevron: {
    color: aviso.darkText3,
    transition: `.18s ${aviso.ease}`
  },
  dropdownMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: 40,
    padding: 6,
    borderRadius: 11,
    background: aviso.darkSurface2,
    border: `1px solid var(--aviso-line)`,
    boxShadow: "0 16px 38px -14px oklch(0.12 0.02 155 / .6)",
    boxSizing: "border-box"
  },
  dropdownOption: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 9,
    minHeight: 46,
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: aviso.darkText2,
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 13.5,
    lineHeight: 1.25,
    padding: "9px 10px",
    textAlign: "left",
    transition: `.15s ${aviso.ease}`
  },
  dropdownOptionDisabled: {
    opacity: 0.5,
    cursor: "not-allowed"
  },
  dropdownOptionSelected: {
    color: aviso.sage300,
    fontWeight: 500,
    background: `color-mix(in oklab, ${aviso.sage400} 16%, transparent)`
  },
  dropdownOptionIcon: {
    color: aviso.darkText3
  },
  dropdownOptionIconSelected: {
    color: aviso.sage300
  },
  dropdownOptionBody: {
    display: "block",
    minWidth: 0
  },
  dropdownOptionText: {
    display: "block",
    minWidth: 0,
    lineHeight: 1.3,
    overflowWrap: "anywhere"
  },
  dropdownCheck: {
    color: aviso.sage300,
    marginLeft: "auto"
  },
  dropdownStatus: {
    flex: "0 0 auto",
    borderRadius: 999,
    border: `1px solid var(--aviso-line)`,
    padding: "3px 6px",
    fontSize: 10.5,
    lineHeight: 1,
    fontWeight: 650,
    whiteSpace: "nowrap"
  },
  dropdownStatusOk: {
    color: aviso.sage300,
    borderColor: aviso.sage600,
    background: `color-mix(in oklab, ${aviso.sage400} 14%, transparent)`
  },
  dropdownStatusWarning: {
    color: aviso.darkText2,
    borderColor: "var(--aviso-line)",
    background: aviso.darkBg
  },
  dropdownStatusDanger: {
    color: aviso.danger,
    borderColor: aviso.danger,
    background: "transparent"
  },
  dropdownStatusMuted: {
    color: aviso.darkText3,
    borderColor: "var(--aviso-line)",
    background: "transparent"
  },
  toggleItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "11px 0",
    minWidth: 0
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    minWidth: 0
  },
  toggleLabel: {
    minWidth: 0,
    fontSize: 14,
    color: aviso.darkText,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  toggleHelper: {
    minWidth: 0,
    fontSize: 11.5,
    color: aviso.darkText3,
    lineHeight: 1.35,
    paddingRight: 56,
    overflowWrap: "anywhere"
  },
  toggle: {
    position: "relative",
    width: 38,
    height: 22,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    transition: `.2s ${aviso.ease}`,
    padding: 0,
    flex: "0 0 auto"
  },
  toggleThumb: {
    position: "absolute",
    top: 3,
    left: 0,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px oklch(0 0 0 / .25)",
    transition: `.2s ${aviso.ease}`
  },
  languageSetting: {
    paddingTop: 12,
    borderTop: `1px solid var(--aviso-line)`,
    marginTop: 4
  },
  languageSettingHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 9,
    minWidth: 0
  },
  languageSettingHint: {
    color: aviso.darkText3,
    fontSize: 11,
    lineHeight: 1.35,
    textAlign: "right"
  },
  languageSelectWrap: {
    position: "relative",
    width: "100%"
  },
  languageSelect: {
    width: "100%",
    background: aviso.darkBg,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    color: aviso.darkText,
    padding: "9px 12px",
    fontFamily: aviso.font,
    fontSize: 13,
    lineHeight: 1.35,
    boxSizing: "border-box",
    outline: "none"
  },
  languageOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },
  languageOption: {
    background: "transparent",
    border: `1px solid var(--aviso-line)`,
    color: aviso.darkText2,
    borderRadius: 999,
    padding: "6px 10px",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 550,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: `.15s ${aviso.ease}`
  },
  languageOptionActive: {
    background: aviso.sage500,
    borderColor: aviso.sage500,
    color: aviso.paper
  },
  hint: {
    fontSize: 12,
    color: aviso.darkText3,
    marginBottom: 14,
    lineHeight: 1.55
  },
  privacyNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: "11px 12px",
    borderRadius: 10,
    margin: "0 0 18px",
    background: `color-mix(in oklab, ${aviso.sage400} 12%, transparent)`,
    color: aviso.darkText2,
    fontSize: 12,
    lineHeight: 1.5
  },
  plannedAiBox: {
    padding: "12px 13px",
    borderRadius: 12,
    border: `1px solid var(--aviso-line)`,
    background: aviso.darkBg,
    marginBottom: 14
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0
  },
  sectionTitle: {
    minWidth: 0,
    color: aviso.darkText,
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  statusPill: {
    flex: "0 0 auto",
    border: `1px solid var(--aviso-line)`,
    borderRadius: 999,
    color: aviso.darkText3,
    fontSize: 11,
    lineHeight: 1,
    padding: "5px 8px",
    whiteSpace: "nowrap"
  },
  statusPillOk: {
    color: aviso.sage300,
    borderColor: aviso.sage600,
    background: `color-mix(in oklab, ${aviso.sage400} 12%, transparent)`
  },
  statusPillWarning: {
    color: aviso.darkText2,
    borderColor: "var(--aviso-line)",
    background: aviso.darkBg
  },
  statusPillDanger: {
    color: aviso.danger,
    borderColor: aviso.danger,
    background: aviso.dangerSurface
  },
  serviceStatusCard: {
    padding: "12px 13px",
    borderRadius: 12,
    border: `1px solid var(--aviso-line)`,
    background: aviso.darkBg
  },
  serviceStatusCardOk: {
    borderColor: aviso.sage600,
    background: `color-mix(in oklab, ${aviso.sage400} 10%, transparent)`
  },
  serviceStatusCardDanger: {
    borderColor: aviso.danger,
    background: aviso.dangerSurface
  },
  serviceStatusTitle: {
    minWidth: 0,
    color: aviso.darkText,
    fontSize: 14,
    fontWeight: 780,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  sectionBodyText: {
    color: aviso.darkText3,
    fontSize: 12,
    lineHeight: 1.55,
    margin: "8px 0 0",
    overflowWrap: "anywhere"
  },
  advancedHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginBottom: 12,
    minWidth: 0
  },
  routeLabel: {
    color: aviso.sage300,
    fontSize: 12,
    fontWeight: 650,
    lineHeight: 1.45,
    overflowWrap: "anywhere"
  },
  routeDetail: {
    color: aviso.darkText3,
    fontSize: 11.5,
    lineHeight: 1.45,
    overflowWrap: "anywhere"
  },
  fieldGroup: { marginBottom: 14 },
  panelCard: {
    padding: "13px 14px",
    marginBottom: 12,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radius,
    background: aviso.darkBg
  },
  panelTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 7px",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.25
  },
  helper: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.55
  },
  settingList: {
    display: "grid",
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd,
    overflow: "hidden"
  },
  settingListDropdownOpen: {
    position: "relative",
    overflow: "visible",
    zIndex: 30
  },
  settingRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 11,
    alignItems: "center",
    padding: "9px 12px",
    borderTop: `1px solid var(--aviso-line)`
  },
  settingRowDropdownOpen: {
    position: "relative",
    zIndex: 40
  },
  settingCopy: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    lineHeight: 1.25,
    overflow: "hidden"
  },
  settingTitle: {
    display: "block",
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: 600,
    lineHeight: 1.25,
    overflowWrap: "anywhere"
  },
  settingHelper: {
    display: "block",
    minWidth: 0,
    fontSize: 11.5,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  rowActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    flex: "0 0 auto"
  },
  miniDropdown: {
    position: "relative",
    display: "inline-flex",
    flex: "0 0 auto"
  },
  miniDropdownOpen: {
    zIndex: 50
  },
  miniDropdownTrigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    minHeight: 30,
    padding: "0 8px 0 10px",
    border: `1px solid var(--aviso-line)`,
    borderRadius: 999,
    background: aviso.darkBg,
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 800
  },
  miniDropdownMenu: {
    position: "absolute",
    right: 0,
    zIndex: 45,
    display: "grid",
    gap: 4,
    width: 118,
    maxHeight: 248,
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: 6,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd,
    boxShadow: "0 18px 34px -20px oklch(0 0 0 / 0.72)"
  },
  miniDropdownMenuDown: {
    top: "calc(100% + 7px)"
  },
  miniDropdownMenuUp: {
    bottom: "calc(100% + 7px)"
  },
  miniDropdownOption: {
    minHeight: 30,
    padding: "0 8px",
    textAlign: "left",
    border: 0,
    borderRadius: aviso.radiusSm,
    background: "transparent",
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 750
  },
  inlineLanguageSelect: {
    width: 96,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 999,
    padding: "5px 8px",
    fontFamily: aviso.font,
    fontSize: 11.5,
    outline: "none"
  },
  compactLocalRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8
  },
  compactLocal: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 6,
    padding: "11px 10px",
    textAlign: "left",
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd,
    cursor: "pointer",
    fontFamily: aviso.font,
    lineHeight: 1.2
  },
  compactLocalIcon: {
    display: "inline-flex",
    flex: "0 0 auto",
    width: 16,
    height: 16
  },
  compactLocalCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
    width: "100%"
  },
  compactLocalTitle: {
    display: "block",
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: "normal",
    overflowWrap: "anywhere"
  },
  compactLocalHelper: {
    display: "block",
    minWidth: 0,
    fontSize: 10.5,
    lineHeight: 1.3,
    whiteSpace: "normal",
    overflowWrap: "anywhere"
  },
  serviceToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    margin: "2px 0 10px"
  },
  serviceToolbarTitle: {
    fontSize: 12,
    fontWeight: 800
  },
  secondaryBtn: {
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "0 10px",
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusSm,
    background: "transparent",
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 750
  },
  providerTriggerLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5
  },
  providerDropdown: {
    position: "relative"
  },
  providerMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: 45,
    width: 174,
    padding: 6,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 11,
    boxShadow: "0 16px 38px -14px oklch(0.12 0.02 155 / .6)"
  },
  serviceConfigCard: {
    padding: 12,
    marginBottom: 9,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radius
  },
  serviceConfigTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 9
  },
  serviceConfigName: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    minHeight: 32,
    fontSize: 13.5,
    fontWeight: 800,
    lineHeight: 1.25
  },
  serviceIconActions: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
    flex: "0 0 auto"
  },
  serviceConfigMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    marginTop: 7,
    fontSize: 11.5,
    lineHeight: 1.4
  },
  configField: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: "8px 10px",
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusMd,
    transition: `border-color .15s ${aviso.ease}, box-shadow .15s ${aviso.ease}, background .15s ${aviso.ease}`
  },
  configFieldFocused: {
    borderColor: "var(--aviso-accent-border)"
  },
  configInput: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    boxShadow: "none",
    color: "inherit",
    fontFamily: aviso.font,
    fontSize: 12.5,
    padding: 0,
    appearance: "none",
    WebkitAppearance: "none"
  },
  confirmDeleteBtn: {
    minHeight: 32,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusSm,
    padding: "0 10px",
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap"
  },
  cancelDeleteBtn: {
    minHeight: 32,
    border: `1px solid var(--aviso-line)`,
    borderRadius: aviso.radiusSm,
    background: "transparent",
    padding: "0 10px",
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 750,
    whiteSpace: "nowrap"
  },
  configHint: {
    margin: "6px 2px 0",
    fontSize: 11,
    lineHeight: 1.4
  },
  configStateList: {
    marginTop: 10,
    borderTop: `1px solid var(--aviso-line)`,
    paddingTop: 8
  },
  configStateRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "3px 0",
    color: aviso.darkText3,
    fontSize: 11.5,
    lineHeight: 1.35
  },
  providerMessage: {
    margin: "9px 0 0",
    border: `1px solid var(--aviso-line)`,
    borderRadius: 9,
    padding: "7px 9px",
    fontSize: 11.5,
    lineHeight: 1.45
  },
  input: {
    width: "100%",
    background: aviso.darkBg,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    color: aviso.darkText,
    padding: "10px 12px",
    fontFamily: aviso.font,
    fontSize: 13,
    lineHeight: 1.45,
    boxSizing: "border-box",
    outline: "none"
  },
  templateRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 12px",
    marginBottom: 8,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    background: aviso.darkBg
  },
  templateCard: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    marginBottom: 8,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10
  },
  templateCardBody: {
    minWidth: 0
  },
  templateActions: {
    display: "flex",
    gap: 6,
    alignItems: "center"
  },
  templateName: {
    display: "block",
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: 600,
    color: aviso.darkText,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  templateSummary: {
    display: "block",
    marginTop: 3,
    fontSize: 11,
    lineHeight: 1.4,
    overflowWrap: "anywhere"
  },
  deleteBtn: {
    background: "transparent",
    border: `1px solid var(--aviso-line)`,
    color: aviso.darkText2,
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  editBtn: {
    background: "transparent",
    border: `1px solid var(--aviso-line)`,
    color: aviso.sage300,
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  disabledBtn: {
    opacity: 0.55,
    cursor: "not-allowed"
  },
  connectivityRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    minWidth: 0
  },
  connectivityHint: {
    minWidth: 0,
    color: aviso.darkText3,
    fontSize: 11.5,
    lineHeight: 1.45,
    overflowWrap: "anywhere"
  },
  connectivityResult: {
    marginTop: 10,
    padding: 0,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    background: aviso.darkBg,
    overflow: "hidden"
  },
  connectivityResultToggle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 11px",
    border: 0,
    background: "transparent",
    fontFamily: aviso.font,
    cursor: "pointer",
    textAlign: "left"
  },
  connectivityResultTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flex: "1 1 auto",
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: 700
  },
  connectivityToggleText: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flex: "0 0 auto",
    fontSize: 11.5,
    fontWeight: 600
  },
  connectivityStatusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flex: "0 0 auto"
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "112px minmax(0, 1fr)",
    gap: 8,
    padding: "3px 11px",
    fontSize: 11,
    lineHeight: 1.45,
    minWidth: 0
  },
  summaryKey: {
    color: aviso.darkText3,
    fontFamily: aviso.mono,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  summaryValue: {
    color: aviso.darkText2,
    overflowWrap: "anywhere"
  },
  templateForm: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 12,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 12,
    background: aviso.darkBg
  },
  contextChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    background: "transparent",
    border: `1px solid var(--aviso-line)`,
    color: aviso.darkText2,
    borderRadius: 999,
    padding: "6px 11px",
    fontFamily: aviso.font,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  chipActive: {
    background: aviso.sage500,
    color: aviso.paper,
    borderColor: aviso.sage500
  },
  historyItem: {
    display: "flex",
    gap: 10,
    padding: "11px 12px",
    marginBottom: 8,
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10
  },
  historyInput: {
    fontSize: 13,
    color: aviso.darkText,
    fontWeight: 600,
    display: "block",
    minWidth: 0,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  historyOutput: {
    fontSize: 12,
    color: aviso.darkText3,
    marginTop: 4,
    display: "block",
    lineHeight: 1.45,
    overflowWrap: "anywhere"
  },
  historyActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 5,
    flex: "0 0 auto"
  },
  historyMeta: {
    fontFamily: aviso.mono,
    fontSize: 10.5,
    lineHeight: 1
  },
  addBtn: {
    marginTop: 12,
    background: "transparent",
    border: `1px dashed var(--aviso-line)`,
    color: aviso.sage300,
    borderRadius: 10,
    padding: "11px 14px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%"
  },
  primaryBtn: {
    flex: 1,
    background: aviso.sage500,
    border: "none",
    color: aviso.paper,
    borderRadius: 10,
    padding: "8px 14px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    borderTop: `1px solid var(--aviso-line)`
  },
  footerRight: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10
  },
  autoSaveHint: {
    fontSize: 12,
    color: aviso.sage300
  },
  link: {
    fontSize: 12,
    color: aviso.darkText3,
    textDecoration: "none",
    background: "transparent",
    border: "none",
    fontFamily: aviso.font,
    cursor: "pointer"
  },
  privacyBox: {
    fontSize: 11,
    lineHeight: 1.6,
    color: aviso.darkText2,
    background: `color-mix(in oklab, ${aviso.sage400} 10%, transparent)`,
    borderTop: `1px solid var(--aviso-line)`,
    padding: "11px 18px"
  },
  emptyText: {
    color: aviso.darkText3,
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0
  },
  warningText: {
    color: aviso.danger,
    fontSize: 12,
    margin: "0 0 8px",
    lineHeight: 1.5
  }
}

export default Popup
