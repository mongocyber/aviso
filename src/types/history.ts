import type { TranslationTargetLanguage } from "~utils/translation"
import type { UiLanguageSetting } from "~utils/i18n"

export type ProviderConfigProvider =
  | "openai"
  | "anthropic"
  | "doubao"
  | "deepseek"
  | "moonshot"
  | "openrouter"
  | "gemini"
  | "hunyuan"

export type HistoryTrigger =
  | "context-menu"
  | "toolbar"
  | "command-palette"
  | "clipboard"
  | "screenshot"
  | "manual"

export type HistoryEntry = {
  id: string
  trigger: HistoryTrigger
  operation?: string
  input: string
  output: string
  url?: string
  timestamp: number
  updatedAt?: number
  pinned?: boolean
  messages?: ConversationMessage[]
}

export type ConversationMessage = {
  role: "user" | "assistant"
  content: string
  reqId?: string
  operation?: string
  trigger?: string
}

export type Settings = {
  defaultModel: string
  defaultProviderConfigId?: string
  fastProviderConfigId?: string
  providerConfigs?: ProviderConfig[]
  appearanceTheme: "light" | "dark" | "system"
  uiLanguage: UiLanguageSetting
  openaiApiKey?: string
  anthropicApiKey?: string
  // 豆包/火山方舟的接入点 ID 或模型名（账号专属，非密钥，故存 settings）
  doubaoModel?: string
  enableClipboardSense: boolean
  enableToolbar: boolean
  enableCommandPalette: boolean
  enableDoubleClickMenu: boolean
  enableInlineTranslation: boolean
  inlineTranslationTargetLanguage: TranslationTargetLanguage
  templates: PromptTemplate[]
}

export type ProviderConfig = {
  id: string
  provider: ProviderConfigProvider
  displayName: string
  model: string
  isDefault?: boolean
  testStatus?: "untested" | "success" | "failure"
  testErrorCategory?: string
  testProvider?: ProviderConfigProvider
  testModel?: string
  testCompletionMs?: number
  testFirstTokenMs?: number
  testLocalProcessingMs?: number
  testedAt?: number
  createdAt: number
  updatedAt: number
}

export type PromptTemplate = {
  id: string
  name: string
  prompt: string
  contexts: string[]
}
