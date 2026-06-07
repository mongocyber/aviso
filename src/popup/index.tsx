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
import type { ModelAvailability } from "~utils/model-availability"
import { getModelAvailability } from "~utils/model-availability"
import type { ProviderId } from "~utils/model-registry"
import { buildProviderConfigRoute, resolveModelRoute } from "~utils/model-registry"
import {
  buildProviderConfig,
  createProviderConfigId,
  defaultProviderConfigName,
  defaultProviderModel,
  getLegacyProviderFromConfigId,
  getModelForProviderConfig,
  getProviderConfigKey,
  getProviderConfigsWithLegacy,
  isLegacyProviderConfigId,
  resolveDefaultProviderConfigId
} from "~utils/provider-configs"
import {
  buildConnectivityPreflightSummary,
  type ConnectivityValidationSummary
} from "~utils/provider-connectivity"
import {
  getApiKeys,
  getSettings,
  deleteProviderConfigApiKey,
  saveApiKey,
  saveProviderConfigApiKey,
  saveSettings
} from "~utils/storage"
import {
  TRANSLATION_TARGET_OPTIONS
} from "~utils/translation"

const TEMPLATE_CONTEXTS: { value: string; label: string }[] = [
  { value: "selection", label: "选中文字" },
  { value: "link", label: "链接" },
  { value: "image", label: "图片" },
  { value: "editable", label: "可编辑区" },
  { value: "page", label: "页面" }
]

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  appearanceTheme: "system",
  enableClipboardSense: true,
  enableToolbar: true,
  enableCommandPalette: true,
  enableDoubleClickMenu: false,
  enableInlineTranslation: false,
  inlineTranslationTargetLanguage: "auto",
  templates: []
}

const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "gpt-4o-mini", label: "GPT-4o mini（推荐，速度快）" },
  { value: "gpt-4o", label: "GPT-4o（更强）" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku（轻量）" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet（更强）" },
  { value: "doubao", label: "豆包（火山方舟）" }
]

const POPUP_FRAME = {
  width: 356,
  safeMaxHeight: 580
} as const

const CONNECTIVITY_TEST_TIMEOUT_MS = 45_000

const PROVIDER_ORDER: ProviderId[] = ["doubao", "openai", "anthropic"]

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
    doubaoModel: value.doubaoModel ?? "",
    appearanceTheme: value.appearanceTheme,
    enableClipboardSense: value.enableClipboardSense,
    enableToolbar: value.enableToolbar,
    enableCommandPalette: value.enableCommandPalette,
    enableDoubleClickMenu: value.enableDoubleClickMenu,
    enableInlineTranslation: value.enableInlineTranslation,
    inlineTranslationTargetLanguage: value.inlineTranslationTargetLanguage,
    templates: value.templates ?? []
  })

type PopupTab = "general" | "api" | "templates" | "history"

const APPEARANCE_OPTIONS: {
  value: Settings["appearanceTheme"]
  label: string
  icon: ThemeModeIconName
}[] = [
  { value: "light", label: "浅色模式", icon: "sun" },
  { value: "dark", label: "深色模式", icon: "moon" },
  { value: "system", label: "跟随系统", icon: "system" }
]

type ThemeModeIconName = "sun" | "moon" | "system"

const PROVIDER_PRIMARY_MODEL: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  doubao: "doubao"
}

const PROVIDER_COPY: Record<
  ProviderId,
  {
    title: string
    keyLabel: string
    keyPlaceholder: string
    modelLabel: string
    modelPlaceholder: string
    addLabel: string
  }
> = {
  openai: {
    title: "OpenAI",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
    modelLabel: "模型名称",
    modelPlaceholder: "gpt-4o-mini",
    addLabel: "OpenAI"
  },
  anthropic: {
    title: "Anthropic",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
    modelLabel: "模型名称",
    modelPlaceholder: "claude-haiku-4-5-20251001",
    addLabel: "Anthropic"
  },
  doubao: {
    title: "豆包 / 火山引擎",
    keyLabel: "豆包 / 火山引擎 API Key",
    keyPlaceholder: "火山方舟控制台获取",
    modelLabel: "方舟接入点 ID",
    modelPlaceholder: "ep-... 或 doubao-seed-2-0-lite",
    addLabel: "豆包 / 火山引擎"
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

type ProviderActionMessage = {
  tone: "ok" | "warning" | "danger" | "muted"
  text: string
}

type ProviderCardMode = "view" | "edit" | "add"

const normalizeCommonFeatureSettings = (value: Settings): Settings =>
  value.enableToolbar && value.enableInlineTranslation
    ? { ...value, enableToolbar: false }
    : value

function ThemeModeIcon({ name }: { name: ThemeModeIconName }) {
  const paths: Record<ThemeModeIconName, string> = {
    sun:
      '<circle cx="12" cy="12" r="4.2"></circle><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"></path>',
    moon:
      '<path d="M18.8 15.2A7.2 7.2 0 0 1 9 5.2 8.2 8.2 0 1 0 18.8 15.2z"></path>',
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
  const [tab, setTab] = useState<PopupTab>("general")
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
  const [providerConfigConnectivityResults, setProviderConfigConnectivityResults] =
    useState<Partial<Record<string, ConnectivityValidationSummary>>>({})
  const [draft, setDraft] = useState<PromptTemplate | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [openHint, setOpenHint] = useState("")
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [languageDropdownDirection, setLanguageDropdownDirection] =
    useState<MiniDropdownDirection>("down")
  const [focusedProviderConfigField, setFocusedProviderConfigField] = useState<
    string | null
  >(null)
  const [confirmingDeleteProviderConfigId, setConfirmingDeleteProviderConfigId] =
    useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null)
  const [providerCardModes, setProviderCardModes] = useState<
    Record<ProviderId, ProviderCardMode>
  >({
    openai: "view",
    anthropic: "view",
    doubao: "view"
  })
  const [savedProviderKeys, setSavedProviderKeys] = useState<
    Record<ProviderId, boolean>
  >({
    openai: false,
    anthropic: false,
    doubao: false
  })
  const [providerModelDrafts, setProviderModelDrafts] = useState<
    Record<ProviderId, string>
  >({
    openai: PROVIDER_PRIMARY_MODEL.openai,
    anthropic: PROVIDER_PRIMARY_MODEL.anthropic,
    doubao: ""
  })
  const [providerMessages, setProviderMessages] = useState<
    Partial<Record<ProviderId, ProviderActionMessage>>
  >({})
  const [systemPrefersDark, setSystemPrefersDark] = useState(true)
  const [popupRuntimeHeight, setPopupRuntimeHeight] = useState<number>(
    POPUP_FRAME.safeMaxHeight
  )

  // 自动保存：首屏加载完成前不触发保存，避免把默认值写回覆盖已存设置
  const loaded = useRef(false)
  const persistedSettingsSignature = useRef("")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const providerDropdownRef = useRef<HTMLDivElement>(null)
  const languageDropdownRef = useRef<HTMLSpanElement>(null)
  const providerCardRefs = useRef<
    Partial<Record<ProviderId, HTMLDivElement | null>>
  >({})
  const providerConfigCardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // 顶部短暂提示"已保存"
  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
      if (!providerDropdownRef.current?.contains(event.target as Node)) {
        setProviderDropdownOpen(false)
      }
      if (!languageDropdownRef.current?.contains(event.target as Node)) {
        setLanguageDropdownOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModelDropdownOpen(false)
        setProviderDropdownOpen(false)
        setLanguageDropdownOpen(false)
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
        setOpenHint("请切换到普通网页后再打开历史")
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
            setOpenHint("当前页面无法打开，请刷新后再试")
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
        setOpenHint("请切换到普通网页后再复制上下文")
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
            setOpenHint("已复制当前网页上下文")
          } else {
            setOpenHint("当前页面无法复制，请刷新页面后再试")
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
        setOpenHint("请切换到普通网页后再打开命令面板")
        setTimeout(() => setOpenHint(""), 2500)
        return
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "OPEN_COMMAND_PALETTE" },
        () => {
          if (chrome.runtime.lastError) {
            setOpenHint("当前页面无法打开，请刷新后再试")
            setTimeout(() => setOpenHint(""), 2500)
          } else {
            window.close()
          }
        }
      )
    })
  }

  useEffect(() => {
    Promise.all([getSettings(), getApiKeys()]).then(([s, keys]) => {
      const normalizedSettings = normalizeCommonFeatureSettings(s)
      persistedSettingsSignature.current = settingsSignature(normalizedSettings)
      setSettings(normalizedSettings)
      if (settingsSignature(normalizedSettings) !== settingsSignature(s)) {
        void saveSettings(normalizedSettings)
      }
      setProviderModelDrafts({
        openai: PROVIDER_PRIMARY_MODEL.openai,
        anthropic: PROVIDER_PRIMARY_MODEL.anthropic,
        doubao: normalizedSettings.doubaoModel ?? ""
      })
      setSavedProviderKeys({
        openai: Boolean(keys.openai),
        anthropic: Boolean(keys.anthropic),
        doubao: Boolean(keys.doubao)
      })
      const configs = getProviderConfigsWithLegacy(normalizedSettings, keys)
      const nextDefaultProviderConfigId = resolveDefaultProviderConfigId(
        normalizedSettings,
        configs
      )
      setProviderConfigs(configs)
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
      if (
        nextDefaultProviderConfigId &&
        nextDefaultProviderConfigId !== normalizedSettings.defaultProviderConfigId
      ) {
        setSettings((prev) => ({
          ...prev,
          defaultProviderConfigId: nextDefaultProviderConfigId
        }))
      }
      // 显示掩码
      if (keys.openai) setOpenaiKey("••••••••" + keys.openai.slice(-4))
      if (keys.anthropic) setAnthropicKey("••••••••" + keys.anthropic.slice(-4))
      if (keys.doubao) setDoubaoKey("••••••••" + keys.doubao.slice(-4))
      // 加载完成后才允许自动保存
      loaded.current = true
    })
  }, [])

  // 设置（模型 / 开关 / 模板 / 豆包接入点）变更即时保存，防抖 300ms
  useEffect(() => {
    if (!loaded.current) return
    const nextSignature = settingsSignature(settings)
    if (nextSignature === persistedSettingsSignature.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveSettings(settings)
      persistedSettingsSignature.current = nextSignature
      // 通知 background 重建右键菜单，使模板/模型变更即时生效
      chrome.runtime.sendMessage({ action: "UPDATE_TEMPLATES" })
      flashSaved()
    }, 300)
    return () => clearTimeout(saveTimer.current)
  }, [settings])

  const saveProviderConfig = async (provider: ProviderId) => {
    const value = getProviderKeyValue(provider, {
      openai: openaiKey,
      anthropic: anthropicKey,
      doubao: doubaoKey
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

    if (value && !value.startsWith("••")) {
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
      text:
        provider === "doubao"
          ? "配置已保存，可测试连接。"
          : "配置已保存，可测试连接。"
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
      text: masked ? "已恢复到保存状态。" : "已关闭新增草稿。"
    })
    setProviderCardMode(provider, "view")
    setActiveProvider(provider)
  }

  const deleteProviderConfig = async (provider: ProviderId) => {
    await saveApiKey(provider, "")
    setProviderKeyInput(provider, "")
    setSavedProviderKey(provider, false)
    if (provider === "doubao") {
      setProviderModelDraft("doubao", "")
      await commitSettings({ doubaoModel: "" })
    }
    clearConnectivityResult(provider)
    setProviderMessage(provider, {
      tone: "warning",
      text: `${PROVIDER_COPY[provider].title} 配置已删除。`
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
    const defaultProviderConfigId =
      preferredDefaultId && nextConfigs.some((config) => config.id === preferredDefaultId)
        ? preferredDefaultId
        : (nextConfigs.find((config) => config.id !== activeProviderConfigId)?.id ?? "")
    const defaultConfig =
      nextConfigs.find((config) => config.id === defaultProviderConfigId) ??
      nextConfigs[0]
    const nextDefaultModel = defaultConfig
      ? getModelForProviderConfig(defaultConfig)
      : settings.defaultModel

    await saveSettings({
      providerConfigs: savedConfigs,
      defaultProviderConfigId,
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
      providerConfigs.filter((config) => config.provider === provider).length + 1
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
    setOpenHint(`正在新增 ${PROVIDER_COPY[provider].title}`)
    window.setTimeout(() => {
      providerConfigCardRefs.current[draft.id]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      })
    }, 50)
  }

  const updateProviderConfigDraft = (
    configId: string,
    patch: Partial<ProviderConfig>
  ) => {
    setConfirmingDeleteProviderConfigId(null)
    setProviderConfigs((prev) =>
      prev.map((config) =>
        config.id === configId
          ? { ...config, ...patch, updatedAt: Date.now() }
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
    if (!keyInput.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint:
            config.provider === "doubao" ? config.model || "未配置" : config.model,
          errorCategory: "api_key_missing",
          notes: "请先填写并保存当前 AI 服务的 API Key。"
        })
      }))
      return
    }
    if (config.provider === "doubao" && !config.model.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint: "未配置",
          errorCategory: "endpoint_or_model_missing",
          notes: "请填写豆包 / 火山方舟接入点 ID 后再保存或测试。"
        })
      }))
      return
    }

    const legacyProvider = getLegacyProviderFromConfigId(config.id)
    if (!keyInput.startsWith("••")) {
      if (legacyProvider) {
        await saveApiKey(legacyProvider, keyInput)
      } else {
        await saveProviderConfigApiKey(config.id, keyInput)
        setProviderConfigKeys((prev) => ({ ...prev, [config.id]: keyInput }))
      }
      setProviderConfigKeyInputs((prev) => ({
        ...prev,
        [config.id]: `••••••••${keyInput.slice(-4)}`
      }))
    }

    const normalizedConfig = {
      ...config,
      displayName: config.displayName.trim() || PROVIDER_COPY[config.provider].title,
      model: config.model.trim() || defaultProviderModel(config.provider),
      updatedAt: Date.now()
    }
    const nextConfigs = providerConfigs.map((item) =>
      item.id === config.id ? normalizedConfig : item
    )
    const defaultId = settings.defaultProviderConfigId || config.id
    setProviderConfigs(nextConfigs)
    setProviderConfigModes((prev) => ({ ...prev, [config.id]: "view" }))
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
        ? (nextConfigs[0]?.id ?? "")
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
    const nextConfigs = providerConfigs.map((item) => ({
      ...item,
      isDefault: item.id === config.id
    }))
    setProviderConfigs(nextConfigs)
    await persistProviderConfigs(nextConfigs, config.id)
    flashSaved()
  }

  const testProviderConfigInstance = async (config: ProviderConfig) => {
    if (testingProviderConfigId) return
    const keyInput = providerConfigKeyInputs[config.id] ?? ""
    if (!keyInput.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint:
            config.provider === "doubao" ? config.model || "未配置" : config.model,
          errorCategory: "api_key_missing",
          notes: "请先填写并保存当前 AI 服务的 API Key。"
        })
      }))
      setProviderConfigModes((prev) => ({
        ...prev,
        [config.id]: prev[config.id] === "add" ? "add" : "edit"
      }))
      return
    }
    if (config.provider === "doubao" && !config.model.trim()) {
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildConnectivityPreflightSummary({
          provider: config.provider,
          modelOrEndpoint: "未配置",
          errorCategory: "endpoint_or_model_missing",
          notes: "请填写豆包 / 火山方舟接入点 ID 后再保存或测试。"
        })
      }))
      setProviderConfigModes((prev) => ({
        ...prev,
        [config.id]: prev[config.id] === "add" ? "add" : "edit"
      }))
      return
    }

    const legacyProvider = getLegacyProviderFromConfigId(config.id)
    if (!keyInput.startsWith("••")) {
      if (legacyProvider) {
        await saveApiKey(legacyProvider, keyInput)
      } else {
        await saveProviderConfigApiKey(config.id, keyInput)
        setProviderConfigKeys((prev) => ({ ...prev, [config.id]: keyInput }))
      }
      setProviderConfigKeyInputs((prev) => ({
        ...prev,
        [config.id]: `••••••••${keyInput.slice(-4)}`
      }))
    }
    const savedConfig = { ...config, updatedAt: Date.now() }
    const nextConfigs = providerConfigs.map((item) =>
      item.id === config.id ? savedConfig : item
    )
    setProviderConfigs(nextConfigs)
    await persistProviderConfigs(nextConfigs, settings.defaultProviderConfigId || config.id)

    setTestingProviderConfigId(config.id)
    setActiveProviderConfigId(config.id)
    setProviderConfigModes((prev) => ({ ...prev, [config.id]: "view" }))
    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      setTestingProviderConfigId(null)
      setProviderConfigConnectivityResults((prev) => ({
        ...prev,
        [config.id]: buildPopupFallbackSummary(
          config.provider,
          config.provider === "doubao" ? config.model : getModelForProviderConfig(config),
          "连接测试超时，请稍后重试。"
        )
      }))
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
                config.provider,
                config.provider === "doubao"
                  ? config.model
                  : getModelForProviderConfig(config),
                resp?.error ?? chrome.runtime.lastError?.message
              )
        setProviderConfigConnectivityResults((prev) => ({
          ...prev,
          [config.id]: summary
        }))
        const nextStatus = summary.result === "success" ? "success" : "failure"
        const updatedConfig = {
          ...savedConfig,
          testStatus: nextStatus as ProviderConfig["testStatus"],
          testErrorCategory: summary.error_category,
          testedAt: Date.now(),
          updatedAt: Date.now()
        }
        const testedConfigs = nextConfigs.map((item) =>
          item.id === config.id ? updatedConfig : item
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
      setProviderCardMode(provider, savedProviderKeys[provider] ? "edit" : "add")
    }
    setProviderMessage(provider, {
      tone: "muted",
      text: "正在编辑，保存后生效。"
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
      text: "正在编辑接入点，保存后生效。"
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
        ? `正在编辑 ${PROVIDER_COPY[provider].title}`
        : `正在新增 ${PROVIDER_COPY[provider].title}`
    )
    setProviderMessage(provider, {
      tone: "muted",
      text: savedProviderKeys[provider]
        ? "已配置，正在编辑保存前的草稿。"
        : "新增配置未保存，填写后点击保存配置。"
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
          providerModelDrafts
        ),
        errorCategory: "api_key_missing",
        notes: "请先填写并保存当前 AI 服务的 API Key。"
      })
    }

    if (provider === "doubao" && !providerModelDrafts.doubao.trim()) {
      return buildConnectivityPreflightSummary({
        provider,
        modelOrEndpoint: "未配置",
        errorCategory: "endpoint_or_model_missing",
        notes: "请填写豆包 / 火山方舟接入点 ID 后再保存或测试。"
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
        setProviderCardMode(provider, savedProviderKeys[provider] ? "edit" : "add")
      }
      return
    }

    if (currentKeyValue && !currentKeyValue.startsWith("••")) {
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
      text: "正在测试连接..."
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
          getProviderModelInputValue(provider, providerModelDrafts),
          "连接测试超时，请稍后重试。"
        )
      }))
      setProviderMessage(provider, {
        tone: "danger",
        text: "连接测试超时，请稍后重试。"
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
                ? "连接测试通过。"
                : summary.notes || "连接测试未通过。"
          })
        } else {
          const summary = buildPopupFallbackSummary(
            provider,
            getProviderModelInputValue(provider, providerModelDrafts),
            resp?.error ?? chrome.runtime.lastError?.message
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

  const defaultProviderConfigId = resolveDefaultProviderConfigId(
    settings,
    providerConfigs
  )
  const selectedProviderConfig = providerConfigs.find(
    (config) => config.id === defaultProviderConfigId
  )
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
    doubao: savedProviderKeys.doubao
  }
  const firstProviderNeedingConfig =
    PROVIDER_ORDER.find(
      (provider) =>
        !providerConfigured[provider] ||
        (provider === "doubao" && !settings.doubaoModel?.trim())
    ) ?? "doubao"
  const modelAvailability = MODEL_OPTIONS.reduce<
    Record<string, ModelAvailability>
  >((acc, model) => {
    acc[model.value] = getModelAvailability({
      route: resolveModelRoute(model.value, settings),
      providerConfigured,
      connectivityResults,
      testingProvider
    })
    return acc
  }, {})
  const selectedProviderConfigKeyValue = selectedProviderConfig
    ? (providerConfigKeyInputs[selectedProviderConfig.id] ??
      providerConfigKeys[selectedProviderConfig.id] ??
      "")
    : ""
  const selectedProviderConfigConnectivity = selectedProviderConfig
    ? providerConfigConnectivityResults[selectedProviderConfig.id]
    : undefined
  const selectedModelAvailability = selectedProviderConfig
    ? !selectedProviderConfigKeyValue.trim()
      ? ({ disabled: true, status: "未配置 Key", tone: "danger" } as const)
      : selectedProviderConfig.provider === "doubao" &&
          !selectedProviderConfig.model.trim()
        ? ({ disabled: true, status: "未配置接入点", tone: "danger" } as const)
        : testingProviderConfigId === selectedProviderConfig.id
          ? ({ disabled: true, status: "测试中", tone: "warning" } as const)
          : selectedProviderConfigConnectivity?.result === "success"
            ? ({ disabled: false, status: "已连接", tone: "ok" } as const)
            : selectedProviderConfigConnectivity
              ? ({
                  disabled: true,
                  status: "连接未通过",
                  tone: "danger"
                } as const)
              : ({ disabled: false, status: "未测试", tone: "muted" } as const)
    : (modelAvailability[selectedModel.value] ??
      getModelAvailability({
        route: resolveModelRoute(selectedModel.value, settings),
        providerConfigured,
        connectivityResults,
        testingProvider
      }))
  const configuredProviderConfigOptions = providerConfigs.filter(
    (config) => providerConfigModes[config.id] !== "add"
  )
  const selectedRoute = selectedProviderConfig
    ? buildProviderConfigRoute(selectedProviderConfig, settings)
    : resolveModelRoute(settings.defaultModel, settings)
  const serviceReady = !selectedModelAvailability.disabled
  const serviceFailed = selectedModelAvailability.tone === "danger"
  const serviceStatusTitle = serviceReady
    ? "AI 服务可以使用"
    : serviceFailed
      ? "AI 服务连接失败"
      : "未连接 AI 服务"
  const serviceStatusDetail = serviceReady
    ? `当前使用 ${selectedRoute.providerConfigName ?? selectedRoute.provider.displayName}`
    : serviceFailed
      ? "Key、接入点或网络需要检查。"
      : "先连接一个自己的 AI 服务，再选择默认模型。"
  const routeLabel = `当前 AI 请求会使用你的 ${selectedRoute.providerConfigName ?? selectedRoute.provider.displayName}`
  const routeModelLabel =
    selectedRoute.provider.id === "doubao"
      ? selectedRoute.requestModel || "未配置接入点"
      : selectedRoute.model.displayName
  const selectedProviderKeyValue = getProviderKeyValue(selectedRoute.provider.id, {
    openai: openaiKey,
    anthropic: anthropicKey,
    doubao: doubaoKey
  })
  const resolvedAppearance = resolveAvisoTheme(
    settings.appearanceTheme,
    systemPrefersDark
  )
  const ui = getAvisoThemeTokens(resolvedAppearance)
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
        placeholder="指令名称"
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
        placeholder="指令内容，用 {{selection}} 引用选中文字"
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
              ...(formDraft.contexts.includes(c.value)
                ? styles.chipActive
                : {})
            }}>
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="aviso-popup-button"
          onClick={commitDraft}
          style={styles.primaryBtn}>
          完成
        </button>
        <button
          className="aviso-popup-button"
          onClick={() => setDraft(null)}
          style={{
            ...styles.deleteBtn,
            borderColor: ui.line,
            color: ui.text2
          }}>
          取消
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
          <span
            role="group"
            aria-label="Popup 主题"
            style={{
              ...styles.themeToggle,
              borderColor: ui.line,
              background: ui.bg
            }}>
            {APPEARANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-label={option.label}
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
          <span style={{ ...styles.version, color: ui.text3 }}>v0.1.0</span>
        </span>
      </header>

      {/* 标签页 */}
      <div style={styles.tabs}>
        {(["general", "api", "history", "templates"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="aviso-tab-button"
            style={{
              ...styles.tabBtn,
              color: tab === t ? ui.accent : ui.text3,
              borderBottomColor: tab === t ? ui.accent : "transparent"
            }}>
            {
              {
                general: "设置",
                api: "AI 服务",
                history: "记录",
                templates: "指令"
              }[t]
            }
          </button>
        ))}
      </div>

      <div id="aviso-popup-content" style={styles.content}>
        {/* 常规设置 */}
        {tab === "general" && (
          <>
            <div style={styles.homePane}>
              <div
                style={{
                  ...styles.controlCard,
                  borderBottomColor: ui.line
                }}>
                <div style={styles.controlHead}>
                  <span style={{ ...styles.controlTitle, color: ui.text }}>
                    <AvisoIcon
                      name="model"
                      size={16}
                      style={{ color: ui.accent }}
                    />
                    当前模型
                  </span>
                  <span style={styles.controlHeadActions}>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...getDropdownStatusStyle(
                          serviceReady
                            ? "ok"
                            : serviceFailed
                              ? "danger"
                              : "warning",
                          ui
                        )
                      }}>
                      {serviceReady
                        ? "可用"
                        : serviceFailed
                          ? "检查"
                          : "未配置"}
                    </span>
                    <button
                      type="button"
                      className="aviso-popup-button"
                      title="测试当前模型"
                      aria-label="测试当前模型"
                      onClick={() =>
                        selectedProviderConfig
                          ? testProviderConfigInstance(selectedProviderConfig)
                          : testProviderConnectivity(
                              selectedRoute.provider.id,
                              selectedProviderKeyValue
                            )
                      }
                      disabled={testingProvider !== null || testingProviderConfigId !== null}
                      style={{
                        ...styles.iconBtn,
                        borderColor: ui.line,
                        color: ui.text2,
                        ...(testingProvider !== null || testingProviderConfigId !== null
                          ? styles.disabledBtn
                          : {})
                      }}>
                      <AvisoIcon name="refresh" size={15} />
                    </button>
                  </span>
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
                      borderColor: modelDropdownOpen ? ui.accentBorder : ui.line,
                      color: ui.text
                    }}>
                    <AvisoIcon
                      name="model"
                      size={16}
                      style={{ color: ui.accent }}
                    />
                    <span style={styles.modelDropdownCopy}>
                      <strong style={{ color: ui.text }}>
                        {selectedProviderConfig?.displayName ?? selectedModel.label}
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
                      aria-label="默认 AI 模型选择"
                      style={{
                        ...styles.dropdownMenu,
                        background: ui.surface2,
                        borderColor: ui.line
                      }}>
                      {configuredProviderConfigOptions.length === 0 && (
                        <div style={styles.dropdownEmpty}>
                          尚未配置 AI 服务
                        </div>
                      )}
                      {configuredProviderConfigOptions.map((config) => {
                        const route = buildProviderConfigRoute(config, settings)
                        const selected = config.id === defaultProviderConfigId
                        const result = providerConfigConnectivityResults[config.id]
                        const keyValue =
                          providerConfigKeyInputs[config.id] ??
                          providerConfigKeys[config.id] ??
                          ""
                        const disabled =
                          !keyValue.trim() ||
                          (config.provider === "doubao" && !config.model.trim())
                        const availability = result
                          ? {
                              tone:
                                result.result === "success"
                                  ? ("ok" as const)
                                  : ("danger" as const),
                              status:
                                result.result === "success"
                                  ? "已连接"
                                  : "连接未通过"
                            }
                          : {
                              tone: disabled ? ("danger" as const) : ("muted" as const),
                              status: disabled
                                ? config.provider === "doubao" && !config.model.trim()
                                  ? "接入点缺失"
                                  : "未配置 Key"
                                : "未测试"
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
                              ...(disabled ? styles.dropdownOptionDisabled : {}),
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
                                {config.provider === "doubao"
                                  ? config.model || "未配置接入点"
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
                        <AvisoIcon name="key" size={16} style={{ color: ui.accent }} />
                        <span style={styles.dropdownOptionBody}>
                          <span style={styles.dropdownOptionText}>
                            添加 AI 服务
                          </span>
                          <span style={styles.dropdownSubText}>
                            OpenAI、Anthropic、豆包
                          </span>
                        </span>
                        <span
                          style={getDropdownStatusStyle("muted", ui)}>
                          配置
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ ...styles.controlHelp, color: ui.text3 }}>
                  AI 动作用当前模型；复制上下文、搜索记录、恢复对话等本地动作不受影响。
                </p>
              </div>

              <div
                style={{
                  ...styles.controlSection,
                  borderBottomColor: ui.line
                }}>
                <div style={{ ...styles.controlSectionTitle, color: ui.text }}>
                  <AvisoIcon
                    name="features"
                    size={15}
                    style={{ color: ui.accent }}
                  />
                  常用功能
                </div>
                <div
                  style={{
                    ...styles.settingList,
                    ...(languageDropdownOpen ? styles.settingListDropdownOpen : {}),
                    background: ui.bg,
                    borderColor: ui.line
                  }}>
                  {(
                    [
                      [
                        "enableToolbar",
                        "selection",
                        "划词工具栏",
                        "选中后显示解释、翻译、润色"
                      ],
                      [
                        "enableInlineTranslation",
                        "translate",
                        "内联翻译",
                        `选中文字译为 ${
                          POPUP_TRANSLATION_TARGET_LABELS[
                            settings.inlineTranslationTargetLanguage
                          ]
                        }`
                      ],
                      [
                        "enableCommandPalette",
                        "commandPanel",
                        "命令面板",
                        "搜索记录、复制上下文、直接发问"
                      ],
                      [
                        "enableClipboardSense",
                        "clipboard",
                        "剪贴板提示",
                        "复制内容后提醒可用操作"
                      ],
                      [
                        "enableDoubleClickMenu",
                        "doubleClick",
                        "双击入口",
                        "在安全网页区域打开控制面板"
                      ],
                    ] as [
                      | "enableToolbar"
                      | "enableInlineTranslation"
                      | "enableCommandPalette"
                      | "enableClipboardSense"
                      | "enableDoubleClickMenu",
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
                        <strong style={{ ...styles.settingTitle, color: ui.text }}>
                          {label}
                        </strong>
                        <small style={{ ...styles.settingHelper, color: ui.text3 }}>
                          {helper}
                        </small>
                      </div>
                      <span style={styles.rowActions}>
                        {key === "enableInlineTranslation" && (
                          <span
                            ref={languageDropdownRef}
                            data-language-dropdown
                            data-dropdown-direction={languageDropdownDirection}
                            style={{
                              ...styles.miniDropdown,
                              ...(languageDropdownOpen ? styles.miniDropdownOpen : {})
                            }}>
                            <button
                              type="button"
                              className="aviso-mini-dropdown-trigger"
                              aria-haspopup="listbox"
                              aria-expanded={languageDropdownOpen}
                              disabled={!settings.enableInlineTranslation}
                              onClick={() => {
                                if (!settings.enableInlineTranslation) return
                                setLanguageDropdownOpen((open) => {
                                  const nextOpen = !open
                                  if (nextOpen) {
                                    setLanguageDropdownDirection(
                                      resolveMiniDropdownDirection(
                                        languageDropdownRef.current
                                      )
                                    )
                                  }
                                  return nextOpen
                                })
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
                                opacity: settings.enableInlineTranslation ? 1 : 0.72
                              }}>
                              <span>
                                {
                                  POPUP_TRANSLATION_TARGET_LABELS[
                                    settings.inlineTranslationTargetLanguage
                                  ]
                                }
                              </span>
                              <AvisoIcon name="chevdown" size={13} />
                            </button>
                            {languageDropdownOpen && settings.enableInlineTranslation && (
                              <div
                                role="listbox"
                                aria-label="选中文字翻译目标语言"
                                style={{
                                  ...styles.miniDropdownMenu,
                                  ...(languageDropdownDirection === "down"
                                    ? styles.miniDropdownMenuDown
                                    : styles.miniDropdownMenuUp),
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
                                      {POPUP_TRANSLATION_TARGET_LABELS[option.value]}
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
                            background: settings[key] ? aviso.sage500 : ui.surface2
                          }}>
                          <span
                            style={{
                              ...styles.toggleThumb,
                              transform: settings[key]
                                ? "translateX(21px)"
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
                <div style={{ ...styles.controlSectionTitle, color: ui.text }}>
                  <AvisoIcon
                    name="local"
                    size={15}
                    style={{ color: ui.accent }}
                  />
                  本地可用
                </div>
                <div style={styles.compactLocalRow}>
                  {[
                    ["copy", "复制上下文", "复制当前页", copyCurrentContextFromPopup],
                    ["search", "搜索记录", "打开命令面板", openCommandPaletteFromPopup],
                    [
                      "history",
                      "恢复对话",
                      "打开记录",
                      () => {
                        setTab("history")
                        setOpenHint("点击任一记录可恢复到当前网页。")
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
                        size={18}
                        style={{
                          ...styles.compactLocalIcon,
                          color: ui.accent
                        }}
                      />
                      <span style={styles.compactLocalCopy}>
                        <strong
                          style={{
                            ...styles.compactLocalTitle,
                            color: ui.text
                          }}>
                          {String(title)}
                        </strong>
                        <small
                          style={{
                            ...styles.compactLocalHelper,
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
            </div>
          </>
        )}

        {/* AI */}
        {tab === "api" && (
          <div style={{ ...panelSectionStyle, paddingTop: 14 }}>
            <div
              style={{
                ...styles.panelCard,
                background: ui.bg,
                borderColor: ui.line
              }}>
              <h3 style={{ ...styles.panelTitle, color: ui.text }}>
                <AvisoIcon name="key" size={16} style={{ color: ui.accent }} />
                配置和连通测试
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                在这里连接自己的 AI 服务。配置并通过测试的服务会进入“设置”页模型下拉。API Key
                只保存在本地浏览器，非密钥设置保存在同步设置中。
              </p>
            </div>

            <div style={styles.serviceToolbar}>
              <span style={{ ...styles.serviceToolbarTitle, color: ui.text3 }}>
                服务配置
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
                    添加
                  </span>
                  <AvisoIcon name="chevdown" size={14} />
                </button>
                {providerDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label="选择要添加的 AI 服务"
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
                          color: ui.text2
                        }}>
                        {PROVIDER_COPY[provider].addLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {providerConfigs.length === 0 && (
              <p style={{ ...styles.emptyText, marginTop: 12 }}>
                暂无 AI 服务配置。点击“添加”后创建 OpenAI、Anthropic 或豆包配置。
              </p>
            )}

            {providerConfigs.map((config) => {
              const copy = PROVIDER_COPY[config.provider]
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
                config.provider === "doubao" && !config.model.trim()
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
                  ? "未测试"
                  : connectivity?.result === "success"
                    ? "可用"
                    : connectivity
                      ? "连接失败"
                      : keyConfigured && !missingEndpoint
                        ? isEditing
                          ? "未测试"
                          : "建议测试"
                        : "未配置"
              const servicePills: {
                label: string
                tone: ModelAvailability["tone"]
              }[] = [
                ...(isDefault
                  ? [{ label: "默认", tone: "muted" as ModelAvailability["tone"] }]
                  : []),
                ...(isAdd
                  ? [
                      {
                        label: "新增中",
                        tone: "warning" as ModelAvailability["tone"]
                      },
                      { label: "未保存", tone: "muted" as ModelAvailability["tone"] }
                    ]
                  : isEditing
                    ? [
                        {
                          label: "编辑中",
                          tone: "warning" as ModelAvailability["tone"]
                        },
                        { label: connectionLabel, tone: connectionTone }
                      ]
                    : [{ label: connectionLabel, tone: connectionTone }])
              ]
              const configStateLabel = isAdd
                ? "等待保存"
                : keyConfigured && !missingEndpoint
                  ? "Key 已保存 · 模型已填写"
                  : keyConfigured && missingEndpoint
                    ? "Key 已保存 · 接入点未填写"
                    : "尚未配置"
              const testStateLabel =
                testingProviderConfigId === config.id
                  ? "测试中..."
                  : connectivity?.result === "success"
                    ? "可以使用"
                    : connectivity
                      ? "测试未通过"
                      : "未测试"

              return (
                <div
                  key={config.id}
                  ref={(node) => {
                    providerConfigCardRefs.current[config.id] = node
                  }}
                  style={{
                    ...styles.serviceConfigCard,
                    background: ui.bg,
                    borderColor: isActive || isDefault ? ui.accentBorder : ui.line,
                    borderStyle: isAdd ? "dashed" : "solid",
                    boxShadow: isActive ? ui.activeShadow : "none"
                  }}>
                  <div style={styles.serviceConfigTop}>
                    <span style={{ ...styles.serviceConfigName, color: ui.text }}>
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
                            确定删除
                          </button>
                          <button
                            type="button"
                            className="aviso-popup-button"
                            onClick={() => setConfirmingDeleteProviderConfigId(null)}
                            style={{
                              ...styles.cancelDeleteBtn,
                              borderColor: ui.line,
                              color: ui.text2
                            }}>
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="测试连接"
                            aria-label={`测试 ${config.displayName} 连接`}
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
                                title="保存配置"
                                aria-label={`保存 ${config.displayName} 配置`}
                                className="aviso-popup-button"
                                onClick={() => saveProviderConfigInstance(config)}
                                style={{
                                  ...styles.iconBtn,
                                  borderColor: ui.line,
                                  color: ui.text2
                                }}>
                                <AvisoIcon name="check" size={14} />
                              </button>
                              <button
                                type="button"
                                title={isAdd ? "取消添加" : "取消编辑"}
                                aria-label={`${isAdd ? "取消添加" : "取消编辑"} ${config.displayName}`}
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
                                title={isAdd ? "删除草稿" : "删除配置"}
                                aria-label={`${isAdd ? "删除草稿" : "删除"} ${config.displayName}`}
                                className="aviso-popup-button"
                                onClick={() =>
                                  isAdd
                                    ? deleteProviderConfigInstance(config)
                                    : setConfirmingDeleteProviderConfigId(config.id)
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
                                title="设为默认"
                                aria-label={`设 ${config.displayName} 为默认`}
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
                                title="编辑配置"
                                aria-label={`编辑 ${config.displayName}`}
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
                                title="删除配置"
                                aria-label={`删除 ${config.displayName} 配置`}
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
                    {config.provider === "doubao"
                      ? config.model || "未配置接入点"
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
                          placeholder="配置名称"
                          aria-label={`${copy.title} 配置名称`}
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
                            updateProviderConfigDraft(config.id, {})
                          }}
                          placeholder={copy.keyPlaceholder}
                          aria-label={copy.keyLabel}
                          style={styles.configInput}
                        />
                      </label>
                      <label
                        style={{
                          ...styles.configField,
                          ...(focusedProviderConfigField === `${config.id}:model`
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
                          readOnly={config.provider !== "doubao"}
                          placeholder={copy.modelPlaceholder}
                          aria-label={copy.modelLabel}
                          style={styles.configInput}
                        />
                      </label>
                      {config.provider !== "doubao" && (
                        <p style={{ ...styles.configHint, color: ui.text3 }}>
                          当前基础版使用内置模型列表；同一 provider 可保存多个 Key 配置。
                        </p>
                      )}
                    </>
                  )}
                  <div
                    style={{
                      ...styles.configStateList,
                      borderColor: ui.line,
                      color: ui.text3
                    }}>
                    <div style={{ ...styles.configStateRow, color: ui.text3 }}>
                      <span>配置状态</span>
                      <strong>{configStateLabel}</strong>
                    </div>
                    <div style={{ ...styles.configStateRow, color: ui.text3 }}>
                      <span>测试状态</span>
                      <strong>{testStateLabel}</strong>
                    </div>
                  </div>
                  {connectivity && (
                    <ConnectivitySummaryView
                      summary={connectivity}
                      theme={resolvedAppearance}
                    />
                  )}
                </div>
              )
            })}

            <div
              style={{
                ...styles.panelCard,
                background: ui.bg,
                borderColor: ui.line
              }}>
              <h3 style={{ ...styles.panelTitle, color: ui.text }}>
                <AvisoIcon name="shield" size={16} style={{ color: ui.accent }} />
                隐私边界
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                Aviso 没有项目方服务器。你主动发起 AI 请求时，内容会由浏览器直接发送到你选择的模型厂商。
              </p>
            </div>
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
                常用指令
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                把常用的翻译、总结、润色要求保存起来，之后可以从命令面板或右键菜单直接使用。
              </p>
            </div>

            {settings.templates.length === 0 && !draft && (
              <p style={{ ...styles.emptyText, marginTop: 12 }}>
                暂无常用指令，请点击下方添加。
              </p>
            )}

            {settings.templates.map((t) =>
              draft?.id === t.id ? (
                renderTemplateForm(draft, t.id)
              ) : (
                <div
                  key={t.id}
                  style={{
                    ...styles.templateCard,
                    background: ui.bg,
                    borderColor: ui.line
                  }}>
                  <AvisoIcon
                    name={getTemplateIcon(t)}
                    size={16}
                    style={{ color: ui.accent }}
                  />
                  <div style={styles.templateCardBody}>
                    <strong style={{ ...styles.templateName, color: ui.text }}>
                      {t.name}
                    </strong>
                    <small style={{ ...styles.templateSummary, color: ui.text3 }}>
                      {getTemplateSummary(t)}
                    </small>
                  </div>
                  <div style={styles.templateActions}>
                    <button
                      className="aviso-popup-button"
                      onClick={() =>
                        setDraft({ ...t, contexts: [...t.contexts] })
                      }
                      style={{
                        ...styles.editBtn,
                        borderColor: ui.line
                      }}>
                      编辑
                    </button>
                    <button
                      className="aviso-popup-button"
                      onClick={() =>
                        updateSetting(
                          "templates",
                          settings.templates.filter((x) => x.id !== t.id)
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
                      删除
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
                添加常用指令
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
                <AvisoIcon name="history" size={16} style={{ color: ui.accent }} />
                最近对话会自动保存
              </h3>
              <p style={{ ...styles.helper, color: ui.text3 }}>
                不需要每次手动保存。点击记录可以恢复到结果面板；不需要的记录可以单条删除。
              </p>
            </div>
            {history.length === 0 ? (
              <p style={{ ...styles.emptyText, marginTop: 12 }}>暂无记录。</p>
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
                    清空全部
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
                      title="点击在页面右下角恢复这次对话"
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <div style={{ ...styles.historyInput, color: ui.text }}>
                        {e.pinned && (
                          <AvisoMark
                            size={13}
                            style={{ color: aviso.sage400, marginRight: 4 }}
                          />
                        )}
                        {getHistoryTitle(e)}
                      </div>
                      <div style={{ ...styles.historyOutput, color: ui.text3 }}>
                        {getHistorySummary(e)}
                      </div>
                    </div>
                    <div style={styles.historyActions}>
                      <span style={{ ...styles.historyMeta, color: ui.text3 }}>
                        {formatRelativeTime(e.updatedAt ?? e.timestamp)}
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
                        删除
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
          Aviso 不设项目方服务器，不收集或保存你的数据。API Key 经 AES-256
          加密后仅存于本机；当你主动发起 AI 请求时，内容会由浏览器直连所选模型厂商（OpenAI
          / Anthropic / 豆包·火山方舟），不经过 Aviso 中间服务器。历史记录与设置保存在浏览器本地存储中。
        </div>
      )}
      <footer
        style={{
          ...styles.footer,
          borderTopColor: ui.line,
          background: ui.surface
        }}>
        <span style={{ ...styles.autoSaveHint, color: ui.accent }}>
          {saved ? "✓ 已保存" : "改动自动保存"}
        </span>
        <button
          className="aviso-popup-button"
          onClick={() => setShowPrivacy((v) => !v)}
          style={{ ...styles.link, color: ui.text3 }}>
          隐私说明
        </button>
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

function getProviderModelValue(provider: ProviderId, settings: Settings) {
  if (provider === "doubao") return settings.doubaoModel ?? ""
  return PROVIDER_PRIMARY_MODEL[provider]
}

function getProviderModelInputValue(
  provider: ProviderId,
  drafts: Record<ProviderId, string>
) {
  const value = drafts[provider]?.trim()
  if (provider === "doubao") return value || "未配置"
  return value || PROVIDER_PRIMARY_MODEL[provider]
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function getHistoryTitle(entry: HistoryEntry) {
  const operationLabel =
    entry.operation === "translate"
      ? "翻译网页选中文本"
      : entry.operation === "summarize"
        ? "总结当前页面"
        : entry.operation === "explain"
          ? "解释选中内容"
          : "AI 对话"
  return entry.input?.trim() ? entry.input.trim().slice(0, 28) : operationLabel
}

function getHistorySummary(entry: HistoryEntry) {
  return entry.output?.trim()
    ? entry.output.trim().slice(0, 58)
    : "点击恢复到结果面板"
}

function getTemplateSummary(template: PromptTemplate) {
  return template.prompt.trim()
    ? template.prompt.trim().replace(/\s+/g, " ").slice(0, 42)
    : "未填写内容"
}

function getTemplateIcon(template: PromptTemplate): AvisoIconName {
  return /翻译|译/.test(`${template.name} ${template.prompt}`)
    ? "translate"
    : "save"
}

function ConnectivitySummaryView({
  summary,
  theme
}: {
  summary?: ConnectivityValidationSummary
  theme: ResolvedAvisoTheme
}) {
  if (!summary) return null
  const ui = getAvisoThemeTokens(theme)
  const ok = summary.result === "success"
  const rows = [
    ["provider", summary.provider],
    ["model_or_endpoint", summary.model_or_endpoint],
    ["action", summary.action],
    ["trigger", summary.trigger],
    ["host_permission_present", String(summary.host_permission_present)],
    ["result", summary.result],
    ["latency_note", summary.latency_note],
    ["error_category", summary.error_category],
    ["secret_leak_check", summary.secret_leak_check],
    ["raw_prompt_logged", summary.raw_prompt_logged],
    ["raw_response_logged", summary.raw_response_logged],
    ["private_page_data_logged", summary.private_page_data_logged],
    ["notes", summary.notes]
  ]

  return (
    <div
      style={{
        ...styles.connectivityResult,
        background: ui.surface,
        borderColor: ok ? ui.accentBorder : ui.dangerBorder
      }}>
      <div style={{ ...styles.connectivityResultTitle, color: ui.text }}>
        <span
          style={{
            ...styles.connectivityStatusDot,
            background: ok ? ui.accent : ui.danger
          }}
        />
        {ok ? "连接测试通过" : "连接测试未通过"}
      </div>
      {rows.map(([key, value]) => (
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
  error?: string
): ConnectivityValidationSummary {
  const hasError = Boolean(error)

  return {
    provider,
    model_or_endpoint: modelOrEndpoint,
    action: "provider_connectivity_test",
    trigger: "manual_settings_provider_button",
    host_permission_present: true,
    result: "failure",
    latency_note: "未发起或未收到 background 摘要。",
    error_category: "unknown_error",
    secret_leak_check: "pass",
    raw_prompt_logged: "no",
    raw_response_logged: "no",
    private_page_data_logged: "no",
    notes: hasError
      ? "Popup 未收到可用的脱敏摘要；底层错误原文未展示。"
      : "Popup 未收到可用的脱敏摘要。"
  }
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
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto"
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
  controlHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
    marginBottom: 9
  },
  controlHeadActions: {
    display: "flex",
    alignItems: "center",
    gap: 7
  },
  controlTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.35
  },
  controlHelp: {
    margin: "8px 0 0",
    fontSize: 11.5,
    lineHeight: 1.45
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
    marginBottom: 10,
    fontSize: 13.5,
    fontWeight: 800
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
    width: 42,
    height: 24,
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
    width: 18,
    height: 18,
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
    gap: 10,
    alignItems: "center",
    minHeight: 56,
    padding: "9px 10px",
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
    fontSize: 13,
    fontWeight: 800,
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
    gap: 7,
    minHeight: 76,
    padding: "10px 10px 9px",
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
    width: 18,
    height: 18
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
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "normal",
    overflowWrap: "anywhere"
  },
  compactLocalHelper: {
    display: "block",
    minWidth: 0,
    fontSize: 11,
    lineHeight: 1.25,
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
    padding: "10px 11px",
    border: `1px solid var(--aviso-line)`,
    borderRadius: 10,
    background: aviso.darkBg
  },
  connectivityResultTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
    color: aviso.darkText,
    fontSize: 12.5,
    fontWeight: 700
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
    padding: "3px 0",
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
