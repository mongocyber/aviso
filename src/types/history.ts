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
  pinned?: boolean
}

export type Settings = {
  defaultModel: string
  openaiApiKey?: string
  anthropicApiKey?: string
  // 豆包/火山方舟的接入点 ID 或模型名（账号专属，非密钥，故存 settings）
  doubaoModel?: string
  enableClipboardSense: boolean
  enableToolbar: boolean
  enableCommandPalette: boolean
  templates: PromptTemplate[]
}

export type PromptTemplate = {
  id: string
  name: string
  prompt: string
  contexts: string[]
}
