import type { ProviderConfig, Settings } from "~types/history"

export type ProviderId = "openai" | "anthropic" | "doubao"

export type ProviderSdk = "openai" | "anthropic" | "openai-compatible"

export type VisionSupport = "supported" | "model-dependent"

export type ProviderMetadata = {
  id: ProviderId
  displayName: string
  sdk: ProviderSdk
  hostPermission: string
  apiKeyStorageKey: ProviderId
  supportsVision: boolean
  visionSupport: VisionSupport
  requiresEndpointConfig: boolean
  endpointSettingKey?: "doubaoModel"
  baseURL?: string
}

export type ModelMetadata = {
  id: string
  displayName: string
  providerId: ProviderId
  supportsVision: boolean
}

export type ModelRoute = {
  requestedModel: string
  selectedModel: string
  provider: ProviderMetadata
  model: ModelMetadata
  requestModel: string
  isFallback: boolean
  providerConfigId?: string
  providerConfigName?: string
  missingConfig?: "doubaoModel"
}

export const DEFAULT_MODEL_ID = "gpt-4o-mini"

export const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

export const LEGACY_PROVIDER_CONFIG_IDS: Record<ProviderId, string> = {
  openai: "legacy-openai",
  anthropic: "legacy-anthropic",
  doubao: "legacy-doubao"
}

export const PROVIDER_PRIMARY_MODEL: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  doubao: "doubao"
}

export const APPROVED_PROVIDER_HOST_PERMISSIONS = [
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://ark.cn-beijing.volces.com/*"
] as const

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderMetadata> = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    sdk: "openai",
    hostPermission: "https://api.openai.com/*",
    apiKeyStorageKey: "openai",
    supportsVision: true,
    visionSupport: "supported",
    requiresEndpointConfig: false
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    sdk: "anthropic",
    hostPermission: "https://api.anthropic.com/*",
    apiKeyStorageKey: "anthropic",
    supportsVision: true,
    visionSupport: "supported",
    requiresEndpointConfig: false
  },
  doubao: {
    id: "doubao",
    displayName: "豆包 / 火山方舟",
    sdk: "openai-compatible",
    hostPermission: "https://ark.cn-beijing.volces.com/*",
    apiKeyStorageKey: "doubao",
    supportsVision: true,
    visionSupport: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "doubaoModel",
    baseURL: DOUBAO_BASE_URL
  }
}

export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    providerId: "openai",
    supportsVision: true
  },
  "gpt-4o": {
    id: "gpt-4o",
    displayName: "GPT-4o",
    providerId: "openai",
    supportsVision: true
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku",
    providerId: "anthropic",
    supportsVision: true
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    displayName: "Claude Sonnet",
    providerId: "anthropic",
    supportsVision: true
  },
  doubao: {
    id: "doubao",
    displayName: "豆包 / 火山方舟",
    providerId: "doubao",
    supportsVision: true
  }
}

export function getProviderMetadata(providerId: ProviderId): ProviderMetadata {
  return PROVIDER_REGISTRY[providerId]
}

export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  return MODEL_REGISTRY[modelId]
}

export function resolveModelRoute(
  modelId: string | undefined,
  settings: Partial<
    Pick<
      Settings,
      "defaultModel" | "doubaoModel" | "providerConfigs" | "defaultProviderConfigId"
    >
  >
): ModelRoute {
  const defaultConfig =
    !modelId && settings.defaultProviderConfigId
      ? getProviderConfigById(settings.providerConfigs, settings.defaultProviderConfigId)
      : undefined

  if (defaultConfig) {
    return buildProviderConfigRoute(defaultConfig, settings)
  }

  const selectedModel = modelId ?? settings.defaultModel ?? DEFAULT_MODEL_ID
  const registeredModel = getModelMetadata(selectedModel)

  if (registeredModel) {
    return buildRegisteredModelRoute(selectedModel, registeredModel, settings)
  }

  if (selectedModel.startsWith("claude")) {
    return buildFallbackRoute(selectedModel, "anthropic")
  }

  return buildFallbackRoute(selectedModel, "openai")
}

export function getProviderConfigById(
  providerConfigs: ProviderConfig[] | undefined,
  configId: string | undefined
): ProviderConfig | undefined {
  if (!configId) return undefined
  return providerConfigs?.find((config) => config.id === configId)
}

export function buildProviderConfigRoute(
  config: ProviderConfig,
  settings: Partial<Pick<Settings, "doubaoModel">> = {}
): ModelRoute {
  const provider = getProviderMetadata(config.provider)
  const selectedModel =
    config.provider === "doubao"
      ? "doubao"
      : config.model || PROVIDER_PRIMARY_MODEL[config.provider]
  const model =
    getModelMetadata(selectedModel) ?? {
      id: selectedModel,
      displayName: selectedModel,
      providerId: config.provider,
      supportsVision: provider.supportsVision
    }
  const requestModel =
    config.provider === "doubao"
      ? config.model.trim() || settings.doubaoModel?.trim() || ""
      : selectedModel

  return {
    requestedModel: selectedModel,
    selectedModel,
    provider,
    model,
    requestModel: requestModel || selectedModel,
    isFallback: !getModelMetadata(selectedModel),
    providerConfigId: config.id,
    providerConfigName: config.displayName,
    missingConfig:
      provider.requiresEndpointConfig && !requestModel
        ? provider.endpointSettingKey
        : undefined
  }
}

function buildRegisteredModelRoute(
  selectedModel: string,
  model: ModelMetadata,
  settings: Partial<Pick<Settings, "doubaoModel">>
): ModelRoute {
  const provider = getProviderMetadata(model.providerId)
  const configuredModel =
    provider.endpointSettingKey === "doubaoModel"
      ? settings.doubaoModel?.trim()
      : undefined

  return {
    requestedModel: selectedModel,
    selectedModel,
    provider,
    model,
    requestModel: configuredModel || selectedModel,
    isFallback: false,
    missingConfig:
      provider.requiresEndpointConfig && !configuredModel
        ? provider.endpointSettingKey
        : undefined
  }
}

function buildFallbackRoute(
  selectedModel: string,
  providerId: ProviderId
): ModelRoute {
  const provider = getProviderMetadata(providerId)
  return {
    requestedModel: selectedModel,
    selectedModel,
    provider,
    model: {
      id: selectedModel,
      displayName: selectedModel,
      providerId,
      supportsVision: provider.supportsVision
    },
    requestModel: selectedModel,
    isFallback: true
  }
}
