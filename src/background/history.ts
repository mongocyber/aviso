import type { HistoryEntry } from "~types/history"
import {
  MAX_CONVERSATION_HISTORY_ENTRIES,
  sortAndTrimConversations,
  upsertConversationHistoryEntry
} from "~utils/conversation-history"

const STORAGE_KEY = "contextai_history"

export async function addHistoryEntry(
  entry: HistoryEntry
): Promise<HistoryEntry> {
  const newEntry: HistoryEntry = {
    ...entry,
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp || Date.now(),
    updatedAt: entry.updatedAt ?? Date.now()
  }

  const entries = await getHistory()
  const updated = upsertConversationHistoryEntry(entries, newEntry)
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
  return newEntry
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const entries = ((result[STORAGE_KEY] as HistoryEntry[]) ?? []).map(
    normalizeHistoryEntry
  )
  const trimmed = sortAndTrimConversations(entries)

  if (trimmed.length !== entries.length) {
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed })
  }

  return trimmed
}

export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  if (!query.trim()) return getHistory()
  const entries = await getHistory()
  const lower = query.toLowerCase()
  return entries.filter(
    (e) =>
      e.input?.toLowerCase().includes(lower) ||
      e.output?.toLowerCase().includes(lower) ||
      e.messages?.some((message) =>
        message.content.toLowerCase().includes(lower)
      )
  )
}

/** 从浮窗点击"保存"触发：标记当前 conversation；最近 20 条上限只适用于未保存记录。 */
export async function pinHistoryEntry(id: string): Promise<void> {
  const entries = await getHistory()
  const updated = entries.map((e) => (e.id === id ? { ...e, pinned: true } : e))
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const entries = await getHistory()
  const updated = entries.filter((e) => e.id !== id)
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

function normalizeHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const fallbackMessages: HistoryEntry["messages"] = [
    ...(entry.input ? [{ role: "user" as const, content: entry.input }] : []),
    { role: "assistant" as const, content: entry.output }
  ]

  return {
    ...entry,
    updatedAt: entry.updatedAt ?? entry.timestamp,
    messages:
      entry.messages && entry.messages.length
        ? entry.messages
        : fallbackMessages
  }
}

export { MAX_CONVERSATION_HISTORY_ENTRIES }
