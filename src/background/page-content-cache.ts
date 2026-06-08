const PAGE_CONTENT_CACHE_TTL_MS = 60_000
const PAGE_CONTENT_CACHE_MAX_ENTRIES = 24

type PageContentCacheKeyInput = {
  tabId: number
  frameId: number
  frameUrl?: string
  pageUrl?: string
}

type PageContentCacheEntry = {
  pageContent: string
  expiresAt: number
  lastAccessedAt: number
}

const pageContentCache = new Map<string, PageContentCacheEntry>()

export function getCachedPageContent(
  input: PageContentCacheKeyInput,
  now = Date.now()
): string | null {
  const key = getPageContentCacheKey(input)
  const cached = pageContentCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= now) {
    pageContentCache.delete(key)
    return null
  }

  cached.lastAccessedAt = now
  return cached.pageContent
}

export function setCachedPageContent(
  input: PageContentCacheKeyInput,
  pageContent: string,
  now = Date.now()
): void {
  const value = pageContent.trim()
  if (!value) return

  pageContentCache.set(getPageContentCacheKey(input), {
    pageContent: value,
    expiresAt: now + PAGE_CONTENT_CACHE_TTL_MS,
    lastAccessedAt: now
  })
  prunePageContentCache(now)
}

export function clearPageContentMemoryCache(): void {
  pageContentCache.clear()
}

export function getPageContentMemoryCacheStatsForTests() {
  return {
    entryCount: pageContentCache.size
  }
}

function prunePageContentCache(now: number): void {
  for (const [key, entry] of pageContentCache.entries()) {
    if (entry.expiresAt <= now) pageContentCache.delete(key)
  }

  if (pageContentCache.size <= PAGE_CONTENT_CACHE_MAX_ENTRIES) return

  const entriesByAge = [...pageContentCache.entries()].sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
  )
  const overflow = pageContentCache.size - PAGE_CONTENT_CACHE_MAX_ENTRIES
  for (const [key] of entriesByAge.slice(0, overflow)) {
    pageContentCache.delete(key)
  }
}

function getPageContentCacheKey(input: PageContentCacheKeyInput): string {
  return [
    "page-content",
    input.tabId,
    input.frameId,
    hashCacheValue(normalizeUrl(input.pageUrl ?? input.frameUrl ?? ""))
  ].join(":")
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "unknown-page"

  try {
    const url = new URL(trimmed)
    url.hash = ""
    return url.toString()
  } catch {
    return trimmed
  }
}

function hashCacheValue(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${value.length}:${(hash >>> 0).toString(36)}`
}
