import type { Settings } from "~types/history"
import type { AIRequestPayload } from "~types/messages"
import type { ModelRoute } from "~utils/model-registry"
import {
  getTranslationSourceText,
  normalizeTranslationTargetLanguage
} from "~utils/translation"

const TRANSLATION_CACHE_TTL_MS = 10 * 60 * 1000
const TRANSLATION_CACHE_MAX_ENTRIES = 100
const TRANSLATION_CACHE_MAX_SOURCE_CHARS = 1000
const TRANSLATION_CACHE_MAX_OUTPUT_CHARS = 4000

type TranslationCacheEntry = {
  value: string
  expiresAt: number
  lastAccessedAt: number
}

const translationCache = new Map<string, TranslationCacheEntry>()

export function getTranslationCacheKey(input: {
  payload: AIRequestPayload
  settings: Pick<Settings, "inlineTranslationTargetLanguage">
  pageUrl?: string
  route?: Pick<
    ModelRoute,
    "provider" | "providerConfigId" | "requestModel" | "selectedModel"
  >
}): string | null {
  if (input.payload.operation !== "translate") return null

  const sourceText = normalizeCacheText(getTranslationSourceText(input.payload))
  if (
    !sourceText ||
    sourceText.length > TRANSLATION_CACHE_MAX_SOURCE_CHARS
  ) {
    return null
  }

  const targetLanguage = normalizeTranslationTargetLanguage(
    input.settings.inlineTranslationTargetLanguage
  )
  const pageKey = normalizePageForCache(
    input.pageUrl ?? input.payload.pageUrl ?? ""
  )
  const routeKey = input.route
    ? [
        input.route.provider.id,
        input.route.providerConfigId ?? "no-config",
        input.route.selectedModel,
        input.route.requestModel,
        input.route.provider.baseURL ?? "default"
      ].join("|")
    : "unknown-route"

  return [
    "translation",
    hashCacheValue(routeKey),
    hashCacheValue(pageKey),
    targetLanguage,
    sourceText.length,
    hashCacheValue(sourceText)
  ].join(":")
}

export function getCachedTranslation(
  key: string | null,
  now = Date.now()
): string | null {
  if (!key) return null
  const cached = translationCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= now) {
    translationCache.delete(key)
    return null
  }

  cached.lastAccessedAt = now
  return cached.value
}

export function setCachedTranslation(
  key: string | null,
  value: string,
  now = Date.now()
): void {
  const normalizedValue = value.trim()
  if (
    !key ||
    !normalizedValue ||
    normalizedValue.length > TRANSLATION_CACHE_MAX_OUTPUT_CHARS
  ) {
    return
  }

  translationCache.set(key, {
    value: normalizedValue,
    expiresAt: now + TRANSLATION_CACHE_TTL_MS,
    lastAccessedAt: now
  })
  pruneTranslationCache(now)
}

export function clearTranslationMemoryCache(): void {
  translationCache.clear()
}

export function getTranslationMemoryCacheStatsForTests() {
  return {
    entryCount: translationCache.size
  }
}

function pruneTranslationCache(now: number): void {
  for (const [key, entry] of translationCache.entries()) {
    if (entry.expiresAt <= now) translationCache.delete(key)
  }

  if (translationCache.size <= TRANSLATION_CACHE_MAX_ENTRIES) return

  const entriesByAge = [...translationCache.entries()].sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
  )
  const overflow = translationCache.size - TRANSLATION_CACHE_MAX_ENTRIES
  for (const [key] of entriesByAge.slice(0, overflow)) {
    translationCache.delete(key)
  }
}

function normalizeCacheText(value: string): string {
  return value.trim().replace(/\r\n/g, "\n")
}

function normalizePageForCache(value: string): string {
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
