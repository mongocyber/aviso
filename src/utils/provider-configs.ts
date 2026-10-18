import type { ProviderConfig, ProviderConfigProvider, Settings } from "~types/history"

import {
  LEGACY_PROVIDER_CONFIG_IDS,
  PROVIDER_PRIMARY_MODEL,
  type ProviderId
} from "./model-registry"
import type { ApiKeys } from "./storage"

const PROVIDER_DISPLAY_NAME: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  doubao: "豆包 / 火山方舟",
  deepseek: "DeepSeek",
  moonshot: "Kimi / Moonshot",
  openrouter: "OpenRouter",
  gemini: "Gemini",
  hunyuan: "Tencent Hunyuan"
}

export function createProviderConfigId(provider: ProviderId): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `cfg-${provider}-${random}`
}

export function buildProviderConfig(input: {
  id?: string
  provider: ProviderId
  displayName?: string
  model?: string
  isDefault?: boolean
  now?: number
}): ProviderConfig {
  const now = input.now ?? Date.now()
  return {
    id: input.id ?? createProviderConfigId(input.provider),
    provider: input.provider,
    displayName:
      input.displayName?.trim() ||
      defaultProviderConfigName(input.provider, 1),
    model: input.model ?? defaultProviderModel(input.provider),
    isDefault: input.isDefault,
    testStatus: "untested",
    createdAt: now,
    updatedAt: now
  }
}

export function defaultProviderConfigName(
  provider: ProviderId,
  index: number
): string {
  return `${PROVIDER_DISPLAY_NAME[provider]} ${index}`
}

export function defaultProviderModel(provider: ProviderId): string {
  return provider === "doubao" ||
    provider === "deepseek" ||
    provider === "moonshot" ||
    provider === "openrouter" ||
    provider === "gemini" ||
    provider === "hunyuan"
    ? ""
    : PROVIDER_PRIMARY_MODEL[provider]
}

export function getProviderConfigsWithLegacy(
  settings: Settings,
  apiKeys: ApiKeys
): ProviderConfig[] {
  const configured = normalizeProviderConfigs(settings.providerConfigs ?? [])
  const legacy = getLegacyProviderConfigs(settings, apiKeys)
  const configuredIds = new Set(configured.map((config) => config.id))
  return [
    ...configured,
    ...legacy.filter((config) => !configuredIds.has(config.id))
  ]
}

export function normalizeProviderConfigs(
  providerConfigs: ProviderConfig[]
): ProviderConfig[] {
  return providerConfigs
    .filter((config) => isProviderId(config.provider) && config.id)
    .map((config) => {
      const normalized = {
        ...config,
        displayName:
          config.displayName?.trim() ||
          defaultProviderConfigName(config.provider, 1),
        model: config.model ?? defaultProviderModel(config.provider),
        createdAt: config.createdAt || Date.now(),
        updatedAt: config.updatedAt || Date.now()
      }
      return isProviderConfigTestCurrent(normalized)
        ? normalized
        : clearProviderConfigTestResult(normalized)
    })
}

export function getLegacyProviderConfigs(
  settings: Settings,
  apiKeys: ApiKeys
): ProviderConfig[] {
  const now = 0
  return (["doubao", "openai", "anthropic"] as ProviderId[])
    .filter((provider) => Boolean(apiKeys[provider]))
    .map((provider, index) => ({
      id: LEGACY_PROVIDER_CONFIG_IDS[provider],
      provider,
      displayName: PROVIDER_DISPLAY_NAME[provider],
      model:
        provider === "doubao"
          ? settings.doubaoModel ?? ""
          : PROVIDER_PRIMARY_MODEL[provider],
      isDefault: index === 0,
      testStatus: "untested" as const,
      createdAt: now,
      updatedAt: now
    }))
}

export function isLegacyProviderConfigId(configId: string): boolean {
  return Object.values(LEGACY_PROVIDER_CONFIG_IDS).includes(configId)
}

export function getLegacyProviderFromConfigId(
  configId: string
): Extract<ProviderId, "openai" | "anthropic" | "doubao"> | undefined {
  return (Object.entries(LEGACY_PROVIDER_CONFIG_IDS) as Array<
    [Extract<ProviderId, "openai" | "anthropic" | "doubao">, string]
  >).find(([, legacyId]) => legacyId === configId)?.[0]
}

export function getProviderConfigKey(
  config: ProviderConfig,
  apiKeys: ApiKeys
): string {
  const legacyProvider = getLegacyProviderFromConfigId(config.id)
  if (legacyProvider) return apiKeys[legacyProvider]
  return apiKeys.providerConfigKeys[config.id] ?? ""
}

export function hasProviderConfigKey(
  config: ProviderConfig,
  apiKeys: ApiKeys
): boolean {
  return Boolean(getProviderConfigKey(config, apiKeys))
}

export function resolveDefaultProviderConfigId(
  settings: Settings,
  providerConfigs: ProviderConfig[]
): string {
  if (
    settings.defaultProviderConfigId &&
    providerConfigs.some((config) => config.id === settings.defaultProviderConfigId)
  ) {
    return settings.defaultProviderConfigId
  }

  const explicit = providerConfigs.find((config) => config.isDefault)
  if (explicit) return explicit.id

  const legacyModelProvider = getProviderForModel(settings.defaultModel)
  const providerMatch = providerConfigs.find(
    (config) => config.provider === legacyModelProvider
  )
  return providerMatch?.id ?? providerConfigs[0]?.id ?? ""
}

export function getProviderForModel(modelId: string | undefined): ProviderId {
  if (modelId?.startsWith("claude")) return "anthropic"
  if (modelId === "doubao") return "doubao"
  return "openai"
}

export function getModelForProviderConfig(config: ProviderConfig): string {
  return config.provider === "doubao"
    ? "doubao"
    : config.model || PROVIDER_PRIMARY_MODEL[config.provider]
}

export function getProviderConfigTestModel(config: ProviderConfig): string {
  return requiresProviderConfigModel(config.provider)
    ? config.model.trim()
    : getModelForProviderConfig(config)
}

export function requiresProviderConfigModel(provider: ProviderId): boolean {
  return (
    provider === "doubao" ||
    provider === "deepseek" ||
    provider === "moonshot" ||
    provider === "openrouter" ||
    provider === "gemini" ||
    provider === "hunyuan"
  )
}

export function isProviderConfigTestCurrent(config: ProviderConfig): boolean {
  if (!config.testedAt || config.testStatus === "untested") return false
  return (
    config.testProvider === config.provider &&
    config.testModel === getProviderConfigTestModel(config)
  )
}

export function clearProviderConfigTestResult(
  config: ProviderConfig
): ProviderConfig {
  const {
    testErrorCategory: _testErrorCategory,
    testedAt: _testedAt,
    testProvider: _testProvider,
    testModel: _testModel,
    ...rest
  } = config

  return {
    ...rest,
    testStatus: "untested"
  }
}

export function markProviderConfigTestResult(
  config: ProviderConfig,
  input: {
    status: Exclude<ProviderConfig["testStatus"], "untested" | undefined>
    errorCategory?: string
    testedAt?: number
  }
): ProviderConfig {
  return {
    ...config,
    testStatus: input.status,
    testErrorCategory: input.errorCategory,
    testProvider: config.provider,
    testModel: getProviderConfigTestModel(config),
    testedAt: input.testedAt ?? Date.now(),
    updatedAt: input.testedAt ?? Date.now()
  }
}

export function shouldClearProviderConfigTestResult(
  previous: ProviderConfig,
  next: Pick<ProviderConfig, "provider" | "model">,
  options: { apiKeyChanged?: boolean } = {}
): boolean {
  if (options.apiKeyChanged) return true
  if (previous.provider !== next.provider) return true

  const nextConfig = {
    ...previous,
    provider: next.provider as ProviderConfigProvider,
    model: next.model
  }
  return getProviderConfigTestModel(previous) !== getProviderConfigTestModel(nextConfig)
}

function isProviderId(value: string): value is ProviderId {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "doubao" ||
    value === "deepseek" ||
    value === "moonshot" ||
    value === "openrouter" ||
    value === "gemini" ||
    value === "hunyuan"
  )
}
