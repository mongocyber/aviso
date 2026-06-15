import type { ProviderConfig, Settings } from "~types/history"
import type { AIRequestPayload } from "~types/messages"

export type ProviderId =
  | "openai"
  | "anthropic"
  | "doubao"
  | "deepseek"
  | "moonshot"
  | "openrouter"
  | "gemini"
  | "hunyuan"

export type ProviderSdk = "openai" | "anthropic" | "openai-compatible"

export type VisionSupport = "supported" | "model-dependent"
export type ReasoningControlSupport =
  | "unsupported"
  | "model-dependent"
  | "supported"

export type ProviderMetadata = {
  id: ProviderId
  displayName: string
  sdk: ProviderSdk
  hostPermission: string
  apiKeyStorageKey: ProviderId
  supportsVision: boolean
  visionSupport: VisionSupport
  reasoningControl: ReasoningControlSupport
  requiresEndpointConfig: boolean
  endpointSettingKey?: "doubaoModel" | "model"
  baseURL?: string
}

export type ModelMetadata = {
  id: string
  displayName: string
  providerId: ProviderId
  supportsVision: boolean
  supportsReasoningControl: boolean
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
  missingConfig?: "doubaoModel" | "model"
}

export const DEFAULT_MODEL_ID = "gpt-4o-mini"

export const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com"
export const MOONSHOT_BASE_URL = "https://api.moonshot.cn/v1"
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/"
export const HUNYUAN_BASE_URL = "https://api.hunyuan.cloud.tencent.com/v1"

export const LEGACY_PROVIDER_CONFIG_IDS: Record<
  Extract<ProviderId, "openai" | "anthropic" | "doubao">,
  string
> = {
  openai: "legacy-openai",
  anthropic: "legacy-anthropic",
  doubao: "legacy-doubao"
}

export const PROVIDER_PRIMARY_MODEL: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  doubao: "doubao",
  deepseek: "",
  moonshot: "",
  openrouter: "",
  gemini: "",
  hunyuan: ""
}

export const APPROVED_PROVIDER_HOST_PERMISSIONS = [
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://ark.cn-beijing.volces.com/*",
  "https://api.deepseek.com/*",
  "https://api.moonshot.cn/*",
  "https://openrouter.ai/*",
  "https://generativelanguage.googleapis.com/*",
  "https://api.hunyuan.cloud.tencent.com/*"
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
    reasoningControl: "model-dependent",
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
    reasoningControl: "unsupported",
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
    reasoningControl: "unsupported",
    requiresEndpointConfig: true,
    endpointSettingKey: "doubaoModel",
    baseURL: DOUBAO_BASE_URL
  },
  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    sdk: "openai-compatible",
    hostPermission: "https://api.deepseek.com/*",
    apiKeyStorageKey: "deepseek",
    supportsVision: true,
    visionSupport: "model-dependent",
    reasoningControl: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "model",
    baseURL: DEEPSEEK_BASE_URL
  },
  moonshot: {
    id: "moonshot",
    displayName: "Kimi / Moonshot",
    sdk: "openai-compatible",
    hostPermission: "https://api.moonshot.cn/*",
    apiKeyStorageKey: "moonshot",
    supportsVision: true,
    visionSupport: "model-dependent",
    reasoningControl: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "model",
    baseURL: MOONSHOT_BASE_URL
  },
  openrouter: {
    id: "openrouter",
    displayName: "OpenRouter",
    sdk: "openai-compatible",
    hostPermission: "https://openrouter.ai/*",
    apiKeyStorageKey: "openrouter",
    supportsVision: true,
    visionSupport: "model-dependent",
    reasoningControl: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "model",
    baseURL: OPENROUTER_BASE_URL
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    sdk: "openai-compatible",
    hostPermission: "https://generativelanguage.googleapis.com/*",
    apiKeyStorageKey: "gemini",
    supportsVision: true,
    visionSupport: "model-dependent",
    reasoningControl: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "model",
    baseURL: GEMINI_BASE_URL
  },
  hunyuan: {
    id: "hunyuan",
    displayName: "Tencent Hunyuan",
    sdk: "openai-compatible",
    hostPermission: "https://api.hunyuan.cloud.tencent.com/*",
    apiKeyStorageKey: "hunyuan",
    supportsVision: true,
    visionSupport: "model-dependent",
    reasoningControl: "model-dependent",
    requiresEndpointConfig: true,
    endpointSettingKey: "model",
    baseURL: HUNYUAN_BASE_URL
  }
}

export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    providerId: "openai",
    supportsVision: true,
    supportsReasoningControl: false
  },
  "gpt-4o": {
    id: "gpt-4o",
    displayName: "GPT-4o",
    providerId: "openai",
    supportsVision: true,
    supportsReasoningControl: false
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku",
    providerId: "anthropic",
    supportsVision: true,
    supportsReasoningControl: false
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    displayName: "Claude Sonnet",
    providerId: "anthropic",
    supportsVision: true,
    supportsReasoningControl: false
  },
  doubao: {
    id: "doubao",
    displayName: "豆包 / 火山方舟",
    providerId: "doubao",
    supportsVision: true,
    supportsReasoningControl: false
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
  const configModel = config.model.trim()
  const selectedModel =
    config.provider === "doubao"
      ? "doubao"
      : configModel || PROVIDER_PRIMARY_MODEL[config.provider]
  const model =
    getModelMetadata(selectedModel) ?? {
      id: selectedModel || config.provider,
      displayName: selectedModel || provider.displayName,
      providerId: config.provider,
      supportsVision: provider.supportsVision,
      supportsReasoningControl: false
    }
  const requestModel =
    config.provider === "doubao"
      ? configModel || settings.doubaoModel?.trim() || ""
      : provider.requiresEndpointConfig
        ? configModel
      : selectedModel

  return {
    requestedModel: selectedModel,
    selectedModel,
    provider,
    model,
    requestModel,
    isFallback: !getModelMetadata(selectedModel),
    providerConfigId: config.id,
    providerConfigName: config.displayName,
    missingConfig:
      provider.requiresEndpointConfig && !requestModel
        ? provider.endpointSettingKey
        : undefined
  }
}

export function isFastModelEligibleOperation(
  payload: Pick<
    AIRequestPayload,
    "operation" | "context" | "pageContent" | "imageSource" | "srcUrl"
  >
): boolean {
  if (
    payload.operation !== "translate" &&
    payload.operation !== "explain" &&
    payload.operation !== "polish"
  ) {
    return false
  }

  if (payload.context === "page") return false
  if (payload.pageContent) return false
  if (payload.imageSource || payload.srcUrl) return false

  return true
}

export function resolveFastModelRouteForOperation(
  payload: Pick<
    AIRequestPayload,
    "operation" | "context" | "pageContent" | "imageSource" | "srcUrl"
  >,
  settings: Partial<Pick<Settings, "doubaoModel" | "fastProviderConfigId">>,
  providerConfigs: ProviderConfig[] | undefined
): ModelRoute | undefined {
  if (!settings.fastProviderConfigId) return undefined
  if (!isFastModelEligibleOperation(payload)) return undefined

  const fastConfig = getProviderConfigById(
    providerConfigs,
    settings.fastProviderConfigId
  )
  return fastConfig ? buildProviderConfigRoute(fastConfig, settings) : undefined
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
      supportsVision: provider.supportsVision,
      supportsReasoningControl: false
    },
    requestModel: selectedModel,
    isFallback: true
  }
}

export function getReasoningControlBlockReason(
  route: Pick<ModelRoute, "provider" | "model">
): string | null {
  if (
    route.provider.reasoningControl === "supported" &&
    route.model.supportsReasoningControl
  ) {
    return null
  }

  if (route.provider.reasoningControl === "model-dependent") {
    return "当前模型未声明支持 reasoning control；Aviso 不会自动发送思考/推理控制参数。"
  }

  return "当前 provider 未声明支持 reasoning control；Aviso 不会自动发送思考/推理控制参数。"
}
