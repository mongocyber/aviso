import type { ConversationMessage, HistoryEntry } from "~types/history"

export const MAX_CONVERSATION_HISTORY_ENTRIES = 20

const IMAGE_DATA_URL_PATTERN =
  /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi

export function sanitizeConversationMessages(
  messages: ConversationMessage[]
): ConversationMessage[] {
  return messages.map((message) => ({
    ...message,
    content: message.content.replace(IMAGE_DATA_URL_PATTERN, "[图片内容已省略]")
  }))
}

export function appendConversationTurn(
  messages: ConversationMessage[],
  input: {
    userContent: string
    requestId: string
    operation: string
    trigger: string
  }
): ConversationMessage[] {
  const turn: ConversationMessage[] = []
  const trimmedUserContent = input.userContent.trim()

  if (trimmedUserContent) {
    turn.push({
      role: "user",
      content: trimmedUserContent,
      operation: input.operation,
      trigger: input.trigger
    })
  }

  turn.push({
    role: "assistant",
    content: "",
    reqId: input.requestId,
    operation: input.operation,
    trigger: input.trigger
  })

  return [...messages, ...turn]
}

export function historyEntryFromConversation(input: {
  id: string
  trigger: HistoryEntry["trigger"]
  operation?: string
  url?: string
  messages: ConversationMessage[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
}): HistoryEntry {
  const messages = sanitizeConversationMessages(input.messages)
  const lastUser = lastMessageByRole(messages, "user")
  const lastAssistant = lastMessageByRole(messages, "assistant")

  return {
    id: input.id,
    trigger: input.trigger,
    operation: input.operation,
    input: lastUser || "对话记录",
    output: lastAssistant || "等待模型响应…",
    url: input.url,
    timestamp: input.createdAt,
    updatedAt: input.updatedAt,
    pinned: input.pinned,
    messages
  }
}

export function upsertConversationHistoryEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  maxEntries = MAX_CONVERSATION_HISTORY_ENTRIES
): HistoryEntry[] {
  const sanitizedEntry = {
    ...entry,
    messages: entry.messages
      ? sanitizeConversationMessages(entry.messages)
      : undefined
  }
  const existing = entries.find((item) => item.id === sanitizedEntry.id)
  const merged: HistoryEntry = {
    ...existing,
    ...sanitizedEntry,
    pinned: Boolean(existing?.pinned || sanitizedEntry.pinned),
    timestamp: existing?.timestamp ?? sanitizedEntry.timestamp
  }
  const next = [
    merged,
    ...entries.filter((item) => item.id !== sanitizedEntry.id)
  ]

  return sortAndTrimConversations(next, maxEntries)
}

export function sortAndTrimConversations(
  entries: HistoryEntry[],
  maxEntries = MAX_CONVERSATION_HISTORY_ENTRIES
): HistoryEntry[] {
  const sorted = [...entries].sort((a, b) => historySortTime(b) - historySortTime(a))
  const pinned = sorted.filter((entry) => entry.pinned)
  const recentUnpinned = sorted
    .filter((entry) => !entry.pinned)
    .slice(0, maxEntries)

  return [...pinned, ...recentUnpinned].sort(
    (a, b) => historySortTime(b) - historySortTime(a)
  )
}

function historySortTime(entry: HistoryEntry): number {
  return entry.updatedAt ?? entry.timestamp
}

function lastMessageByRole(
  messages: ConversationMessage[],
  role: ConversationMessage["role"]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === role) return messages[i].content
  }
  return ""
}
