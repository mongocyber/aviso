import type { ModelRoute, ProviderId } from "./model-registry"
import type {
  ConnectivityErrorCategory,
  ConnectivityValidationSummary
} from "./provider-connectivity"
import type { ResolvedUiLanguage } from "./i18n"

export type ModelAvailabilityTone = "ok" | "warning" | "danger" | "muted"

export type ModelAvailability = {
  disabled: boolean
  status: string
  tone: ModelAvailabilityTone
}

type ProviderConfiguredMap = Partial<Record<ProviderId, boolean>>

const MODEL_AVAILABILITY_COPY = {
  "zh-CN": {
    keyMissing: "未配置 Key",
    endpointMissing: "未配置接入点",
    testing: "测试中",
    connected: "已连接",
    untested: "未测试",
    connectivityErrors: {
      none: "连接未通过",
      api_key_missing: "未配置 Key",
      endpoint_or_model_missing: "接入点缺失",
      host_permission_missing: "权限缺失",
      unauthorized: "Key 无效",
      rate_limited: "额度/限流",
      network_error: "网络异常",
      timeout: "连接超时",
      provider_error: "服务异常",
      unknown_error: "连接未通过"
    }
  },
  en: {
    keyMissing: "Key missing",
    endpointMissing: "Endpoint not configured",
    testing: "Testing",
    connected: "Connected",
    untested: "Untested",
    connectivityErrors: {
      none: "Connection failed",
      api_key_missing: "Key missing",
      endpoint_or_model_missing: "Endpoint missing",
      host_permission_missing: "Permission missing",
      unauthorized: "Invalid key",
      rate_limited: "Rate limited",
      network_error: "Network error",
      timeout: "Connection timed out",
      provider_error: "Provider error",
      unknown_error: "Connection failed"
    }
  }
} satisfies Record<
  ResolvedUiLanguage,
  {
    keyMissing: string
    endpointMissing: string
    testing: string
    connected: string
    untested: string
    connectivityErrors: Record<ConnectivityErrorCategory, string>
  }
>

function getModelAvailabilityCopy(language?: ResolvedUiLanguage) {
  return MODEL_AVAILABILITY_COPY[language ?? "zh-CN"]
}

export function isProviderKeyConfigured(value: string): boolean {
  return value.trim().length > 0
}

export function getModelAvailability(input: {
  route: Pick<
    ModelRoute,
    "provider" | "missingConfig" | "requestModel" | "selectedModel"
  >
  providerConfigured: ProviderConfiguredMap
  connectivityResults?: Partial<
    Record<ProviderId, ConnectivityValidationSummary>
  >
  testingProvider?: ProviderId | null
  uiLanguage?: ResolvedUiLanguage
}): ModelAvailability {
  const route = input.route
  const copy = getModelAvailabilityCopy(input.uiLanguage)

  if (!input.providerConfigured[route.provider.id]) {
    return {
      disabled: true,
      status: copy.keyMissing,
      tone: "danger"
    }
  }

  if (route.missingConfig) {
    return {
      disabled: true,
      status: copy.endpointMissing,
      tone: "danger"
    }
  }

  if (input.testingProvider === route.provider.id) {
    return {
      disabled: true,
      status: copy.testing,
      tone: "warning"
    }
  }

  const connectivity = input.connectivityResults?.[route.provider.id]
  const isCurrentRouteResult =
    connectivity?.model_or_endpoint === route.requestModel

  if (connectivity && isCurrentRouteResult) {
    if (connectivity.result === "success") {
      return {
        disabled: false,
        status: copy.connected,
        tone: "ok"
      }
    }

    return {
      disabled: true,
      status: copy.connectivityErrors[connectivity.error_category],
      tone: "danger"
    }
  }

  return {
    disabled: false,
    status: copy.untested,
    tone: "muted"
  }
}
