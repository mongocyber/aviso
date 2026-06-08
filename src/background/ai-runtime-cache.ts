import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

import type { ProviderConfig, Settings } from "~types/history"
import {
  buildProviderConfigRoute,
  resolveModelRoute,
  type ModelRoute
} from "~utils/model-registry"
import { getApiKeys, getSettings, type ApiKeys } from "~utils/storage"

import { clearPageContentMemoryCache } from "./page-content-cache"
import { clearTranslationMemoryCache } from "./translation-cache"

type RuntimeConfigSnapshot = {
  settings: Settings
  apiKeys: ApiKeys
}

const CONFIG_CACHE_TTL_MS = 30_000
const ROUTE_CACHE_TTL_MS = 30_000

let configCache:
  | {
      value: RuntimeConfigSnapshot
      expiresAt: number
    }
  | undefined
let configLoadPromise: Promise<RuntimeConfigSnapshot> | null = null

const routeCache = new Map<
  string,
  {
    route: ModelRoute
    expiresAt: number
  }
>()
const openAIClients = new Map<string, OpenAI>()
const anthropicClients = new Map<string, Anthropic>()

export async function getRuntimeConfigSnapshot(
  now = Date.now()
): Promise<RuntimeConfigSnapshot> {
  if (configCache && configCache.expiresAt > now) return configCache.value
  if (configLoadPromise) return configLoadPromise

  configLoadPromise = Promise.all([getSettings(), getApiKeys()])
    .then(([settings, apiKeys]) => {
      const value = { settings, apiKeys }
      configCache = {
        value,
        expiresAt: now + CONFIG_CACHE_TTL_MS
      }
      return value
    })
    .finally(() => {
      configLoadPromise = null
    })

  return configLoadPromise
}

export function resolveRuntimeModelRoute(
  modelId: string | undefined,
  settings: Settings,
  now = Date.now()
): ModelRoute {
  return getCachedRoute(
    `model:${modelId ?? ""}:${settingsRouteSignature(settings)}`,
    now,
    () => resolveModelRoute(modelId, settings)
  )
}

export function resolveRuntimeProviderConfigRoute(
  config: ProviderConfig,
  settings: Settings,
  now = Date.now()
): ModelRoute {
  return getCachedRoute(
    `config:${config.id}:${config.provider}:${config.model}:${settingsRouteSignature(settings)}`,
    now,
    () => buildProviderConfigRoute(config, settings)
  )
}

export function getProviderClientCacheKey(
  route: Pick<ModelRoute, "provider" | "providerConfigId">
): string {
  return [
    route.provider.id,
    route.providerConfigId ?? route.provider.apiKeyStorageKey,
    route.provider.baseURL ?? "default"
  ].join(":")
}

export function getRuntimeOpenAIClient(input: {
  cacheKey: string
  apiKey: string
  baseURL?: string
}): OpenAI {
  const key = [
    "openai",
    input.cacheKey,
    input.baseURL ?? "default",
    hashSecret(input.apiKey)
  ].join(":")
  const cached = openAIClients.get(key)
  if (cached) return cached

  const client = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseURL,
    dangerouslyAllowBrowser: true
  })
  openAIClients.set(key, client)
  return client
}

export function getRuntimeAnthropicClient(input: {
  cacheKey: string
  apiKey: string
}): Anthropic {
  const key = ["anthropic", input.cacheKey, hashSecret(input.apiKey)].join(":")
  const cached = anthropicClients.get(key)
  if (cached) return cached

  const client = new Anthropic({
    apiKey: input.apiKey,
    dangerouslyAllowBrowser: true
  })
  anthropicClients.set(key, client)
  return client
}

export function clearAIRuntimeCaches(): void {
  configCache = undefined
  configLoadPromise = null
  routeCache.clear()
  openAIClients.clear()
  anthropicClients.clear()
  clearPageContentMemoryCache()
  clearTranslationMemoryCache()
}

export function getAIRuntimeCacheStatsForTests() {
  return {
    hasConfigCache: Boolean(configCache),
    routeCount: routeCache.size,
    openAIClientCount: openAIClients.size,
    anthropicClientCount: anthropicClients.size
  }
}

function getCachedRoute(
  key: string,
  now: number,
  resolve: () => ModelRoute
): ModelRoute {
  const cached = routeCache.get(key)
  if (cached && cached.expiresAt > now) return cached.route

  const route = resolve()
  routeCache.set(key, {
    route,
    expiresAt: now + ROUTE_CACHE_TTL_MS
  })
  return route
}

function settingsRouteSignature(settings: Settings): string {
  return JSON.stringify({
    defaultModel: settings.defaultModel,
    defaultProviderConfigId: settings.defaultProviderConfigId ?? "",
    doubaoModel: settings.doubaoModel ?? "",
    providerConfigs: (settings.providerConfigs ?? []).map((config) => ({
      id: config.id,
      provider: config.provider,
      model: config.model,
      isDefault: Boolean(config.isDefault)
    }))
  })
}

function hashSecret(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${value.length}:${(hash >>> 0).toString(36)}`
}
