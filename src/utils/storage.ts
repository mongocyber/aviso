import CryptoJS from "crypto-js"
import type { PromptTemplate, ProviderConfig, Settings } from "~types/history"

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

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  defaultProviderConfigId: "",
  fastProviderConfigId: "",
  providerConfigs: [],
  appearanceTheme: "system",
  uiLanguage: "auto",
  doubaoModel: "",
  enableClipboardSense: true,
  enableToolbar: true,
  enableCommandPalette: true,
  enableDoubleClickMenu: false,
  enableInlineTranslation: false,
  inlineTranslationTargetLanguage: "auto",
  templates: []
}

export async function getSettings(): Promise<Settings> {
  // Keep legacy storage keys for upgrade compatibility after the Aviso rename.
  const result = await chrome.storage.sync.get("contextai_settings")
  return { ...DEFAULT_SETTINGS, ...(result.contextai_settings ?? {}) }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.sync.set({
    contextai_settings: { ...current, ...settings }
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
