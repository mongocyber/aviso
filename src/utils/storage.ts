import CryptoJS from "crypto-js"
import type { PromptTemplate, ProviderConfig, Settings } from "~types/history"
import type { MessageResponse } from "~types/messages"

// API key storage is local obfuscation, not a confidentiality boundary.
// The release extension id is public/stable, so code that can read the local
// browser profile or chrome.storage.local can derive the same AES passphrase.
const getEncryptionKey = (): string => {
  // Keep the legacy namespace after the Aviso rename so existing local keys decrypt.
  return `contextai-${chrome.runtime.id}-aes256`
}

export function encryptApiKey(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, getEncryptionKey()).toString()
}

export function decryptApiKey(ciphertext: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, getEncryptionKey())
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return ""
  }
}

function normalizeApiKeyInput(value: string): string {
  return value.trim()
}

// ── Settings ────────────────────────────────────────────────────────────────

export const SETTINGS_STORAGE_KEY = "contextai_settings"
export const CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY =
  "contextai_clipboard_sense_revocation_epoch"
export const CLIPBOARD_SENSE_CONSENT_VERSION = 1

export type SaveSettingsOptions = {
  // Only set this from the direct, explicit user action that grants Clipboard Sense consent.
  allowClipboardSenseConsentGrant?: boolean
}

const SAVE_SETTINGS_MESSAGE_TIMEOUT_MS = 10_000

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  defaultProviderConfigId: "",
  fastProviderConfigId: "",
  providerConfigs: [],
  appearanceTheme: "system",
  uiLanguage: "auto",
  doubaoModel: "",
  enableClipboardSense: false,
  enableToolbar: true,
  enableCommandPalette: true,
  enableDoubleClickMenu: false,
  enableInlineTranslation: false,
  inlineTranslationTargetLanguage: "auto",
  templates: []
}

function normalizeClipboardSenseEpoch(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0
}

function omitClipboardSenseConsent(settings: Settings): Settings {
  const {
    clipboardSenseConsentVersion: _consentVersion,
    clipboardSenseConsentEpoch: _consentEpoch,
    ...next
  } = settings
  return { ...next, enableClipboardSense: false }
}

export function normalizeSettings(
  value: unknown,
  revocationEpoch: unknown = 0
): Settings {
  const raw = value && typeof value === "object" ? value : {}
  const currentRevocationEpoch = normalizeClipboardSenseEpoch(revocationEpoch)
  const merged = { ...DEFAULT_SETTINGS, ...raw } as Settings
  if (merged.enableClipboardSense !== true) {
    return omitClipboardSenseConsent(merged)
  }

  const consentEpoch = normalizeClipboardSenseEpoch(
    merged.clipboardSenseConsentEpoch
  )
  if (
    merged.clipboardSenseConsentVersion !== CLIPBOARD_SENSE_CONSENT_VERSION ||
    consentEpoch !== currentRevocationEpoch
  ) {
    return omitClipboardSenseConsent(merged)
  }
  return { ...merged, clipboardSenseConsentEpoch: consentEpoch }
}

async function getSettingsSnapshot(): Promise<{
  settings: Settings
  revocationEpoch: number
}> {
  // Keep legacy storage keys for upgrade compatibility after the Aviso rename.
  const result = await chrome.storage.sync.get([
    SETTINGS_STORAGE_KEY,
    CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY
  ])
  const revocationEpoch = normalizeClipboardSenseEpoch(
    result[CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY]
  )
  return {
    settings: normalizeSettings(result[SETTINGS_STORAGE_KEY], revocationEpoch),
    revocationEpoch
  }
}

export async function getSettings(): Promise<Settings> {
  return (await getSettingsSnapshot()).settings
}

let settingsWriteQueue: Promise<void> = Promise.resolve()

export async function saveSettings(
  settings: Partial<Settings>,
  options: SaveSettingsOptions = {}
): Promise<void> {
  const response = await sendSaveSettingsMessage(settings, options)
  if (!response.success) {
    throw new Error(
      typeof response.error === "string" && response.error
        ? response.error
        : "settings_save_failed"
    )
  }
}

export async function saveSettingsDirect(
  settings: Partial<Settings>,
  options: SaveSettingsOptions = {}
): Promise<void> {
  const requestedSettings = { ...settings }
  const requestedOptions = { ...options }
  const write = settingsWriteQueue.then(
    () => saveSettingsUnlocked(requestedSettings, requestedOptions),
    () => saveSettingsUnlocked(requestedSettings, requestedOptions)
  )
  settingsWriteQueue = write.catch(() => undefined)
  await write
}

function sendSaveSettingsMessage(
  settings: Partial<Settings>,
  options: SaveSettingsOptions
): Promise<MessageResponse> {
  const requestedSettings = { ...settings }
  const requestedOptions = { ...options }
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error("settings_save_timeout"))
    }, SAVE_SETTINGS_MESSAGE_TIMEOUT_MS)

    chrome.runtime.sendMessage(
      {
        action: "SAVE_SETTINGS",
        payload: {
          settings: requestedSettings,
          options: requestedOptions
        }
      },
      (response?: MessageResponse) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          reject(new Error("runtime_message_failed"))
          return
        }
        resolve(response ?? { success: false, error: "empty_response" })
      }
    )
  })
}

async function saveSettingsUnlocked(
  settings: Partial<Settings>,
  options: SaveSettingsOptions
): Promise<void> {
  const { settings: current, revocationEpoch } = await getSettingsSnapshot()
  let nextRevocationEpoch = revocationEpoch
  const incoming = { ...settings }

  if (incoming.enableClipboardSense === false) {
    incoming.enableClipboardSense = false
    delete incoming.clipboardSenseConsentVersion
    delete incoming.clipboardSenseConsentEpoch
    if (current.enableClipboardSense === true) {
      nextRevocationEpoch += 1
      await chrome.storage.sync.set({
        [CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY]: nextRevocationEpoch
      })
    }
  }

  if (
    incoming.enableClipboardSense === true &&
    options.allowClipboardSenseConsentGrant === true
  ) {
    incoming.clipboardSenseConsentVersion = CLIPBOARD_SENSE_CONSENT_VERSION
    incoming.clipboardSenseConsentEpoch = nextRevocationEpoch
  }

  if (
    current.enableClipboardSense !== true &&
    incoming.enableClipboardSense === true &&
    incoming.clipboardSenseConsentVersion ===
      CLIPBOARD_SENSE_CONSENT_VERSION &&
    options.allowClipboardSenseConsentGrant !== true
  ) {
    incoming.enableClipboardSense = false
    delete incoming.clipboardSenseConsentVersion
    delete incoming.clipboardSenseConsentEpoch
  }
  const next = normalizeSettings(
    { ...current, ...incoming },
    nextRevocationEpoch
  )
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: next
  })
}

// ── API Keys（本地混淆后存 local）────────────────────────────────────────────

export type ApiKeys = {
  openai: string
  anthropic: string
  doubao: string
  deepseek: string
  moonshot: string
  openrouter: string
  gemini: string
  hunyuan: string
  providerConfigKeys: Record<string, string>
}

export async function getApiKeys(): Promise<ApiKeys> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const raw = result.contextai_api_keys ?? {}
  const providerConfigKeys = raw.providerConfigKeys ?? {}
  return {
    openai: raw.openai ? normalizeApiKeyInput(decryptApiKey(raw.openai)) : "",
    anthropic: raw.anthropic
      ? normalizeApiKeyInput(decryptApiKey(raw.anthropic))
      : "",
    doubao: raw.doubao ? normalizeApiKeyInput(decryptApiKey(raw.doubao)) : "",
    deepseek: "",
    moonshot: "",
    openrouter: "",
    gemini: "",
    hunyuan: "",
    providerConfigKeys: Object.fromEntries(
      Object.entries(providerConfigKeys).map(([configId, encrypted]) => [
        configId,
        typeof encrypted === "string"
          ? normalizeApiKeyInput(decryptApiKey(encrypted))
          : ""
      ])
    )
  }
}

export async function saveApiKey(
  provider: "openai" | "anthropic" | "doubao",
  plainKey: string
): Promise<void> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const current = result.contextai_api_keys ?? {}
  const normalizedKey = normalizeApiKeyInput(plainKey)
  if (!normalizedKey) {
    const next = { ...current }
    delete next[provider]
    await chrome.storage.local.set({ contextai_api_keys: next })
    return
  }

  await chrome.storage.local.set({
    contextai_api_keys: {
      ...current,
      [provider]: encryptApiKey(normalizedKey)
    }
  })
}

export async function saveProviderConfigApiKey(
  configId: string,
  plainKey: string
): Promise<void> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const current = result.contextai_api_keys ?? {}
  const providerConfigKeys = { ...(current.providerConfigKeys ?? {}) }
  const normalizedKey = normalizeApiKeyInput(plainKey)

  if (!normalizedKey) {
    delete providerConfigKeys[configId]
  } else {
    providerConfigKeys[configId] = encryptApiKey(normalizedKey)
  }

  await chrome.storage.local.set({
    contextai_api_keys: {
      ...current,
      providerConfigKeys
    }
  })
}

export async function deleteProviderConfigApiKey(
  configId: string
): Promise<void> {
  await saveProviderConfigApiKey(configId, "")
}

export async function saveProviderConfigs(
  providerConfigs: ProviderConfig[],
  defaultProviderConfigId?: string
): Promise<void> {
  await saveSettings({
    providerConfigs,
    defaultProviderConfigId: defaultProviderConfigId ?? ""
  })
}

// ── Templates ────────────────────────────────────────────────────────────────

const MAX_TEMPLATES = 20

export async function getTemplates(): Promise<PromptTemplate[]> {
  const settings = await getSettings()
  return settings.templates
}

export async function saveTemplate(template: PromptTemplate): Promise<void> {
  const settings = await getSettings()
  const existing = settings.templates.find((t) => t.id === template.id)
  let templates: PromptTemplate[]

  if (existing) {
    templates = settings.templates.map((t) => (t.id === template.id ? template : t))
  } else {
    if (settings.templates.length >= MAX_TEMPLATES) {
      throw new Error(`最多支持 ${MAX_TEMPLATES} 个模板`)
    }
    templates = [...settings.templates, template]
  }

  await saveSettings({ templates })
}

export async function deleteTemplate(id: string): Promise<void> {
  const settings = await getSettings()
  await saveSettings({
    templates: settings.templates.filter((t) => t.id !== id)
  })
}
