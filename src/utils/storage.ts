import CryptoJS from "crypto-js"
import type { Settings, PromptTemplate } from "~types/history"

// AES 加密的固定盐（结合扩展 ID 增强隔离性）
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

// ── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  doubaoModel: "",
  enableClipboardSense: true,
  enableToolbar: true,
  enableCommandPalette: true,
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

// ── API Keys（加密存 local）────────────────────────────────────────────────

type ApiKeys = { openai: string; anthropic: string; doubao: string }

export async function getApiKeys(): Promise<ApiKeys> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const raw = result.contextai_api_keys ?? {}
  return {
    openai: raw.openai ? decryptApiKey(raw.openai) : "",
    anthropic: raw.anthropic ? decryptApiKey(raw.anthropic) : "",
    doubao: raw.doubao ? decryptApiKey(raw.doubao) : ""
  }
}

export async function saveApiKey(
  provider: "openai" | "anthropic" | "doubao",
  plainKey: string
): Promise<void> {
  const result = await chrome.storage.local.get("contextai_api_keys")
  const current = result.contextai_api_keys ?? {}
  await chrome.storage.local.set({
    contextai_api_keys: {
      ...current,
      [provider]: encryptApiKey(plainKey)
    }
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
