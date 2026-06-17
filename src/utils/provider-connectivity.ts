import type { AIRequestPayload } from "~types/messages"
import type { ProviderConfig } from "~types/history"

import type { ProviderId, ProviderMetadata } from "./model-registry"

export type ConnectivityResult = "success" | "failure"

export type ConnectivityErrorCategory =
  | "none"
  | "api_key_missing"
  | "endpoint_or_model_missing"
  | "host_permission_missing"
  | "unauthorized"
  | "rate_limited"
  | "network_error"
  | "timeout"
  | "provider_error"
  | "unknown_error"

export type ConnectivityValidationSummary = {
  provider: ProviderId
  model_or_endpoint: string
  action: "provider_connectivity_test"
  trigger: "manual_settings_provider_button"
  host_permission_present: boolean
  result: ConnectivityResult
  latency_note: string
  completion_ms?: number
  first_token_ms?: number
  local_processing_ms?: number
  tested_at?: number
  error_category: ConnectivityErrorCategory
  secret_leak_check: "pass"
  raw_prompt_logged: "no"
  raw_response_logged: "no"
  private_page_data_logged: "no"
  notes: string
}

export type ConnectivitySpeedGrade =
  | "untested"
  | "fast"
  | "moderate"
  | "slow"
  | "failed"

export type ConnectivityTimingSummary = {
  completionMs?: number
  firstTokenMs?: number
  localProcessingMs?: number
  testedAt?: number
}

export const CONNECTIVITY_TEST_PROMPT = "请用一句中文回答：连接测试成功。"

const CONNECTIVITY_ERROR_CATEGORIES: ConnectivityErrorCategory[] = [
  "none",
  "api_key_missing",
  "endpoint_or_model_missing",
  "host_permission_missing",
  "unauthorized",
  "rate_limited",
  "network_error",
  "timeout",
  "provider_error",
  "unknown_error"
]

const CONNECTIVITY_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  doubao: "doubao",
  deepseek: "",
  moonshot: "",
  openrouter: "",
  gemini: "",
  hunyuan: ""
}

export const CONNECTIVITY_SPEED_THRESHOLDS_MS = {
  fastMax: 1_500,
  moderateMax: 3_500
} as const

export function getConnectivityModelId(providerId: ProviderId): string {
  return CONNECTIVITY_MODEL_BY_PROVIDER[providerId]
}

export function buildConnectivityTestPayload(): AIRequestPayload {
  return {
    operation: "custom",
    systemPrompt: "你是 Aviso 的连接测试助手。只回答这次连接测试是否成功。",
    userMessage: CONNECTIVITY_TEST_PROMPT
  }
}

export function hasPrivateContextPayload(payload: AIRequestPayload): boolean {
  return Boolean(
    payload.selectionText ||
      payload.priorContext ||
      payload.pageContent ||
      payload.linkUrl ||
      payload.srcUrl ||
      payload.pageUrl ||
      payload.templateId
  )
}

export function isProviderHostPermissionPresent(
  provider: ProviderMetadata,
  hostPermissions: readonly string[] | undefined
): boolean {
  return Boolean(hostPermissions?.includes(provider.hostPermission))
}

export function buildConnectivityValidationSummary(params: {
  provider: ProviderId
  modelOrEndpoint: string
  hostPermissionPresent: boolean
  result: ConnectivityResult
  latencyNote: string
  completionMs?: number
  firstTokenMs?: number
  localProcessingMs?: number
  testedAt?: number
  errorCategory: ConnectivityErrorCategory
  notes: string
}): ConnectivityValidationSummary {
  return {
    provider: params.provider,
    model_or_endpoint: params.modelOrEndpoint,
    action: "provider_connectivity_test",
    trigger: "manual_settings_provider_button",
    host_permission_present: params.hostPermissionPresent,
    result: params.result,
    latency_note: params.latencyNote,
    ...(isFinitePositiveMs(params.completionMs)
      ? { completion_ms: params.completionMs }
      : {}),
    ...(isFinitePositiveMs(params.firstTokenMs)
      ? { first_token_ms: params.firstTokenMs }
      : {}),
    ...(isFinitePositiveMs(params.localProcessingMs)
      ? { local_processing_ms: params.localProcessingMs }
      : {}),
    ...(isFinitePositiveMs(params.testedAt) ? { tested_at: params.testedAt } : {}),
    error_category: params.errorCategory,
    secret_leak_check: "pass",
    raw_prompt_logged: "no",
    raw_response_logged: "no",
    private_page_data_logged: "no",
    notes: params.notes
  }
}

export function buildLastConnectivityTestSummary(
  config: ProviderConfig
): ConnectivityValidationSummary | null {
  if (!isProviderConfigTestCurrent(config)) return null
  const ok = config.testStatus === "success"
  const testedAt = new Date(config.testedAt ?? 0).toISOString()

  return buildConnectivityValidationSummary({
    provider: config.provider,
    modelOrEndpoint: getProviderConfigTestModel(config),
    hostPermissionPresent: true,
    result: ok ? "success" : "failure",
    latencyNote: ok
      ? `上次通过：${testedAt}`
      : `上次失败：${testedAt}`,
    completionMs: config.testCompletionMs,
    firstTokenMs: config.testFirstTokenMs,
    localProcessingMs: config.testLocalProcessingMs,
    testedAt: config.testedAt,
    errorCategory: ok
      ? "none"
      : normalizeConnectivityErrorCategory(config.testErrorCategory),
    notes: ok
      ? "上次手动连接测试通过；Key、模型、provider 或网络变化后需重新测试。"
      : "上次手动连接测试未通过；Key、模型、provider 或网络变化后需重新测试。"
  })
}

export function getConnectivityTimingSummary(
  summary?: ConnectivityValidationSummary | null
): ConnectivityTimingSummary {
  if (!summary) return {}
  return {
    completionMs: isFinitePositiveMs(summary.completion_ms)
      ? summary.completion_ms
      : parseConnectivityLatencyMs(summary.latency_note),
    firstTokenMs: isFinitePositiveMs(summary.first_token_ms)
      ? summary.first_token_ms
      : undefined,
    localProcessingMs: isFinitePositiveMs(summary.local_processing_ms)
      ? summary.local_processing_ms
      : undefined,
    testedAt: isFinitePositiveMs(summary.tested_at) ? summary.tested_at : undefined
  }
}

export function resolveConnectivitySpeedGrade(
  summary?: ConnectivityValidationSummary | null
): ConnectivitySpeedGrade {
  if (!summary) return "untested"
  if (summary.result === "failure") return "failed"
  const completionMs = getConnectivityTimingSummary(summary).completionMs
  if (!isFinitePositiveMs(completionMs)) return "untested"
  if (completionMs <= CONNECTIVITY_SPEED_THRESHOLDS_MS.fastMax) return "fast"
  if (completionMs <= CONNECTIVITY_SPEED_THRESHOLDS_MS.moderateMax) {
    return "moderate"
  }
  return "slow"
}

export function parseConnectivityLatencyMs(
  latencyNote: string | undefined
): number | undefined {
  if (!latencyNote) return undefined

  const msMatch = latencyNote.match(/(?:耗时约|took about|took|约)?\s*(\d+(?:\.\d+)?)\s*ms\b/i)
  if (msMatch) return Math.round(Number(msMatch[1]))

  const secondsMatch = latencyNote.match(
    /(?:耗时约|took about|took|约)?\s*(\d+(?:\.\d+)?)\s*(?:秒|s\b|sec\b|secs\b|second\b|seconds\b)/i
  )
  if (secondsMatch) return Math.round(Number(secondsMatch[1]) * 1_000)

  return undefined
}

export function buildLastConnectivityTestSummaryMap(
  configs: ProviderConfig[]
): Record<string, ConnectivityValidationSummary> {
  return Object.fromEntries(
    configs
      .map((config) => [config.id, buildLastConnectivityTestSummary(config)] as const)
      .filter((entry): entry is [string, ConnectivityValidationSummary] =>
        Boolean(entry[1])
      )
  )
}

export function buildConnectivityPreflightSummary(params: {
  provider: ProviderId
  modelOrEndpoint: string
  errorCategory: Extract<
    ConnectivityErrorCategory,
    "api_key_missing" | "endpoint_or_model_missing"
  >
  notes: string
}): ConnectivityValidationSummary {
  const latencyNote =
    params.errorCategory === "api_key_missing"
      ? "未发起：API Key 未配置。"
      : "未发起：模型或接入点未配置。"

  return buildConnectivityValidationSummary({
    provider: params.provider,
    modelOrEndpoint: params.modelOrEndpoint,
    hostPermissionPresent: true,
    result: "failure",
    latencyNote,
    errorCategory: params.errorCategory,
    notes: params.notes
  })
}

export function categorizeConnectivityError(
  error: unknown
): ConnectivityErrorCategory {
  const status = getErrorStatus(error)
  const message = getErrorMessage(error)

  if (
    status === 401 ||
    status === 403 ||
    /api key|unauthori[sz]ed|invalid key/i.test(message)
  ) {
    return "unauthorized"
  }
  if (
    status === 429 ||
    /rate limit|too many requests|quota|额度|频繁/.test(message)
  ) {
    return "rate_limited"
  }
  if (/timeout|timed out|超时/i.test(message)) {
    return "timeout"
  }
  if (
    /network|fetch failed|failed to fetch|connection|dns|网络/i.test(message)
  ) {
    return "network_error"
  }
  if (status && status >= 400) {
    return "provider_error"
  }
  return "unknown_error"
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error && "status" in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === "number" ? status : undefined
  }
  return undefined
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return ""
}

function normalizeConnectivityErrorCategory(
  value: string | undefined
): ConnectivityErrorCategory {
  return CONNECTIVITY_ERROR_CATEGORIES.includes(
    value as ConnectivityErrorCategory
  )
    ? (value as ConnectivityErrorCategory)
    : "unknown_error"
}

function isProviderConfigTestCurrent(config: ProviderConfig): boolean {
  if (!config.testedAt || config.testStatus === "untested") return false
  return (
    config.testProvider === config.provider &&
    config.testModel === getProviderConfigTestModel(config)
  )
}

function getProviderConfigTestModel(config: ProviderConfig): string {
  if (
    config.provider === "doubao" ||
    config.provider === "deepseek" ||
    config.provider === "moonshot" ||
    config.provider === "openrouter" ||
    config.provider === "gemini" ||
    config.provider === "hunyuan"
  ) {
    return config.model.trim()
  }
  if (config.model) return config.model
  return config.provider === "anthropic"
    ? "claude-haiku-4-5-20251001"
    : config.provider === "openai"
      ? "gpt-4o-mini"
      : ""
}

function isFinitePositiveMs(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}
