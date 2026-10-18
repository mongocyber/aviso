import type { I18nKey } from "./i18n-core"

export type AiUnavailableGuidanceReason =
  | "byok_api_key_missing"
  | "byok_model_missing"
  | "ai_service_unavailable"

export type AiUnavailableGuidance = {
  reason: AiUnavailableGuidanceReason
}

export function deriveAiUnavailableGuidance(
  error: string
): AiUnavailableGuidance | undefined {
  if (/api key.*未配置|key 未配置|missing.*api key/i.test(error)) {
    return {
      reason: "byok_api_key_missing"
    }
  }

  if (
    /模型 ID|接入点未配置|model.*not configured|endpoint.*not configured/i.test(
      error
    )
  ) {
    return {
      reason: "byok_model_missing"
    }
  }

  if (/AI 服务返回错误|network|网络|timeout|超时|unavailable/i.test(error)) {
    return {
      reason: "ai_service_unavailable"
    }
  }

  return undefined
}

export function getAiUnavailableTitleKey(
  guidance: AiUnavailableGuidance
): I18nKey {
  switch (guidance.reason) {
    case "byok_api_key_missing":
      return "aiUnavailable.apiKeyMissing.title"
    case "byok_model_missing":
      return "aiUnavailable.modelMissing.title"
    case "ai_service_unavailable":
      return "aiUnavailable.serviceUnavailable.title"
  }
}

export function getAiUnavailableDetailKey(
  guidance: AiUnavailableGuidance
): I18nKey {
  switch (guidance.reason) {
    case "byok_api_key_missing":
      return "aiUnavailable.apiKeyMissing.detail"
    case "byok_model_missing":
      return "aiUnavailable.modelMissing.detail"
    case "ai_service_unavailable":
      return "aiUnavailable.serviceUnavailable.detail"
  }
}
