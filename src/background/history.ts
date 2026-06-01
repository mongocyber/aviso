import type { HistoryEntry } from "~types/history"

const STORAGE_KEY = "contextai_history"
const MAX_ENTRIES = 50

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, "id">
): Promise<HistoryEntry> {
  const newEntry: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now()
  }

  const entries = await getHistory()
  const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES)
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
  return newEntry
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as HistoryEntry[]) ?? []
}

export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  if (!query.trim()) return getHistory()
  const entries = await getHistory()
  const lower = query.toLowerCase()
  return entries.filter(
    (e) =>
      e.input?.toLowerCase().includes(lower) ||
      e.output?.toLowerCase().includes(lower)
  )
}

/** 永久保存（从浮窗点击"保存"触发，不受 FIFO 限制） */
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
