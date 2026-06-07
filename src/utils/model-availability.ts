import type { ModelRoute, ProviderId } from "./model-registry"
import type {
  ConnectivityErrorCategory,
  ConnectivityValidationSummary
} from "./provider-connectivity"

export type ModelAvailabilityTone = "ok" | "warning" | "danger" | "muted"

export type ModelAvailability = {
  disabled: boolean
  status: string
  tone: ModelAvailabilityTone
}

type ProviderConfiguredMap = Partial<Record<ProviderId, boolean>>

const CONNECTIVITY_ERROR_STATUS: Record<ConnectivityErrorCategory, string> = {
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
}): ModelAvailability {
  const route = input.route

  if (!input.providerConfigured[route.provider.id]) {
    return {
      disabled: true,
      status: "未配置 Key",
      tone: "danger"
    }
  }

  if (route.missingConfig === "doubaoModel") {
    return {
      disabled: true,
      status: "未配置接入点",
      tone: "danger"
    }
  }

  if (input.testingProvider === route.provider.id) {
    return {
      disabled: true,
      status: "测试中",
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
        status: "已连接",
        tone: "ok"
      }
    }

    return {
      disabled: true,
      status: CONNECTIVITY_ERROR_STATUS[connectivity.error_category],
      tone: "danger"
    }
  }

  return {
    disabled: false,
    status: "未测试",
    tone: "muted"
  }
}
