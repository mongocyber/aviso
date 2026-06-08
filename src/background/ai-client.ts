import type { PromptTemplate } from "~types/history"
import type {
  AIRequestPayload,
  ProviderConnectivityPayload
} from "~types/messages"
import { normalizeError } from "~utils/errors"
import { assertSupportedImageSrc } from "~utils/image-src"
import { parseIntentLocally } from "~utils/intent"
import {
  getProviderConfigById,
  type ModelRoute,
  type ProviderId
} from "~utils/model-registry"
import { getLegacyProviderFromConfigId } from "~utils/provider-configs"
import {
  buildConnectivityTestPayload,
  buildConnectivityValidationSummary,
  categorizeConnectivityError,
  getConnectivityModelId,
  hasPrivateContextPayload,
  isProviderHostPermissionPresent,
  type ConnectivityValidationSummary
} from "~utils/provider-connectivity"
import { getScreenshotVisionBlockReason } from "~utils/screenshot"
import { getTemplates } from "~utils/storage"
import { expandTemplate } from "~utils/template"
import {
  categorizePerfError,
  logPerfSummary,
  logTiming,
  markTiming,
  type PerfContextType,
  type PerfErrorCategory,
  type RequestTiming
} from "~utils/timing"
import {
  buildTranslationUserContent,
  buildTranslationSystemPrompt,
  getTranslationMaxOutputTokens,
  getTranslationSourceText,
  sanitizeTranslationPayload,
  TRANSLATION_EMPTY_INPUT_ERROR,
  TRANSLATION_SYSTEM_PROMPT
} from "~utils/translation"

import {
  getProviderClientCacheKey,
  getRuntimeAnthropicClient,
  getRuntimeConfigSnapshot,
  getRuntimeOpenAIClient,
  resolveRuntimeModelRoute,
  resolveRuntimeProviderConfigRoute
} from "./ai-runtime-cache"
import {
  getCachedTranslation,
  getTranslationCacheKey,
  setCachedTranslation
} from "./translation-cache"

export type StreamChunk = {
  text: string
  done: boolean
}

export async function handleProviderConnectivityTest(
  payload: ProviderConnectivityPayload
): Promise<ConnectivityValidationSummary> {
  const { settings, apiKeys } = await getRuntimeConfigSnapshot()
  const providerConfig = getProviderConfigById(
    settings.providerConfigs,
    payload.providerConfigId
  )
  const route = providerConfig
    ? resolveRuntimeProviderConfigRoute(providerConfig, settings)
    : resolveRuntimeModelRoute(getConnectivityModelId(payload.provider), settings)
  const hostPermissionPresent = isProviderHostPermissionPresent(
    route.provider,
    chrome.runtime.getManifest().host_permissions
  )
  const modelOrEndpoint = route.requestModel
  const base = {
    provider: payload.provider,
    modelOrEndpoint,
    hostPermissionPresent
  }

  if (!hostPermissionPresent) {
    return buildConnectivityValidationSummary({
      ...base,
      result: "failure",
      latencyNote: "未发起：缺少 provider host permission。",
      errorCategory: "host_permission_missing",
      notes: "Manifest 中没有当前 provider 的已批准 host permission。"
    })
  }

  const apiKey = getRouteApiKey(route, apiKeys)
  if (!apiKey) {
    return buildConnectivityValidationSummary({
      ...base,
      result: "failure",
      latencyNote: "未发起：API Key 未配置。",
      errorCategory: "api_key_missing",
      notes: "请先保存当前 provider 的 API Key，再手动测试连接。"
    })
  }

  if (route.missingConfig === "doubaoModel") {
    return buildConnectivityValidationSummary({
      ...base,
      result: "failure",
      latencyNote: "未发起：豆包接入点 ID / 模型名未配置。",
      errorCategory: "endpoint_or_model_missing",
      notes: "豆包测试需要火山方舟接入点 ID / 模型名。"
    })
  }

  const testPayload = buildConnectivityTestPayload()
  if (hasPrivateContextPayload(testPayload)) {
    return buildConnectivityValidationSummary({
      ...base,
      result: "failure",
      latencyNote: "未发起：测试 payload 含私有上下文字段。",
      errorCategory: "unknown_error",
      notes: "连接测试必须只使用固定公开短句。"
    })
  }

  const startedAt = Date.now()
  try {
    if (route.provider.id === "anthropic") {
      await callAnthropic(route.requestModel, testPayload, apiKey, () => {}, {
        requestId: `connectivity-${route.provider.id}`,
        clientCacheKey: getProviderClientCacheKey(route)
      })
    } else {
      await callOpenAI(route.requestModel, testPayload, apiKey, () => {}, {
        baseURL: route.provider.baseURL,
        keyLabel: route.provider.displayName,
        requestId: `connectivity-${route.provider.id}`,
        clientCacheKey: getProviderClientCacheKey(route)
      })
    }

    return buildConnectivityValidationSummary({
      ...base,
      result: "success",
      latencyNote: `已发起并收到 provider 响应，耗时约 ${Date.now() - startedAt} ms。`,
      errorCategory: "none",
      notes:
        "仅发送固定公开短句；未记录 raw prompt、raw response、网页正文、截图或 API Key。"
    })
  } catch (err) {
    return buildConnectivityValidationSummary({
      ...base,
      result: "failure",
      latencyNote: `已发起但 provider 未通过，耗时约 ${Date.now() - startedAt} ms。`,
      errorCategory: categorizeConnectivityError(err),
      notes: "provider 返回失败；界面仅展示脱敏分类，不展示底层原始响应。"
    })
  }
}

export async function handleAIRequest(
  payload: AIRequestPayload,
  onChunk: (chunk: StreamChunk) => void,
  options: { requestId?: string; signal?: AbortSignal; pageUrl?: string } = {}
): Promise<void> {
  const { settings, apiKeys } = await getRuntimeConfigSnapshot()

  // 自定义模板：展开占位符后作为 systemPrompt，避免选中文本被重复拼接
  if (payload.operation === "template" && payload.templateId) {
    const expanded = resolveTemplatePromptFromTemplates(
      settings.templates ?? [],
      payload.templateId,
      payload
    )
    if (expanded) {
      payload = {
        ...payload,
        operation: "custom",
        systemPrompt: expanded,
        selectionText: undefined
      }
    }
  }
  payload = sanitizeTranslationPayload(payload)
  if (payload.operation === "translate" && !payload.systemPrompt) {
    payload = {
      ...payload,
      systemPrompt: buildTranslationSystemPrompt(
        settings.inlineTranslationTargetLanguage
      )
    }
  }

  if (payload.operation === "translate" && !getTranslationSourceText(payload)) {
    logPreProviderPerf(payload, "openai", "translation-cache")
    throw new Error(TRANSLATION_EMPTY_INPUT_ERROR)
  }

  const translationCacheKey = getTranslationCacheKey({
    payload,
    settings,
    pageUrl: options.pageUrl
  })
  const cachedTranslation = getCachedTranslation(translationCacheKey)
  if (cachedTranslation) {
    let timing = markTiming(payload.timing, "firstChunkAt")
    logTiming("translation_cache_hit", options.requestId ?? "unknown", timing, {
      trigger: payload.trigger,
      inputChars: getTranslationSourceText(payload).length
    })
    onChunk({ text: cachedTranslation, done: false })
    timing = markTiming(timing, "doneAt")
    logTiming("translation_cache_done", options.requestId ?? "unknown", timing)
    onChunk({ text: "", done: true })
    return
  }

  const route = resolveRuntimeModelRoute(payload.model, settings)
  const imageInputBlockReason = getImageInputBlockReason(payload, route)
  let translationOutput = ""
  const forwardChunk = (chunk: StreamChunk) => {
    if (translationCacheKey && chunk.text) translationOutput += chunk.text
    onChunk(chunk)
  }

  try {
    if (imageInputBlockReason) {
      logPreProviderPerf(
        payload,
        route.provider.id,
        route.requestModel,
        "unsupported_image_input"
      )
      throw new Error(imageInputBlockReason)
    }
    if (route.provider.id === "anthropic") {
      await callAnthropic(
        route.requestModel,
        payload,
        getRouteApiKey(route, apiKeys),
        forwardChunk,
        {
          requestId: options.requestId,
          signal: options.signal,
          clientCacheKey: getProviderClientCacheKey(route),
          logPerf: true
        }
      )
    } else if (route.provider.id === "doubao") {
      if (route.missingConfig === "doubaoModel") {
        logPreProviderPerf(payload, route.provider.id, route.requestModel)
        throw new Error("豆包接入点 ID 未配置，请在设置的 AI 页填写")
      }
      await callOpenAI(
        route.requestModel,
        payload,
        getRouteApiKey(route, apiKeys),
        forwardChunk,
        {
          baseURL: route.provider.baseURL,
          keyLabel: "豆包",
          requestId: options.requestId,
          signal: options.signal,
          clientCacheKey: getProviderClientCacheKey(route),
          providerId: route.provider.id,
          logPerf: true
        }
      )
    } else {
      await callOpenAI(
        route.requestModel,
        payload,
        getRouteApiKey(route, apiKeys),
        forwardChunk,
        {
          keyLabel: route.provider.displayName,
          requestId: options.requestId,
          signal: options.signal,
          clientCacheKey: getProviderClientCacheKey(route),
          providerId: route.provider.id,
          logPerf: true
        }
      )
    }
    setCachedTranslation(translationCacheKey, translationOutput)
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

function getRouteApiKey(
  route: Pick<ModelRoute, "provider" | "providerConfigId">,
  apiKeys: Awaited<ReturnType<typeof getRuntimeConfigSnapshot>>["apiKeys"]
): string {
  if (route.providerConfigId) {
    const legacyProvider = getLegacyProviderFromConfigId(route.providerConfigId)
    if (legacyProvider) return apiKeys[legacyProvider]
    return apiKeys.providerConfigKeys[route.providerConfigId] ?? ""
  }

  return apiKeys[route.provider.apiKeyStorageKey]
}

async function callOpenAI(
  model: string,
  payload: AIRequestPayload,
  apiKey: string,
  onChunk: (chunk: StreamChunk) => void,
  opts?: {
    baseURL?: string
    keyLabel?: string
    requestId?: string
    signal?: AbortSignal
    clientCacheKey?: string
    providerId?: ProviderId
    logPerf?: boolean
  }
): Promise<void> {
  const requestId = opts?.requestId ?? "unknown"
  let timing: RequestTiming | undefined = payload.timing
  let sawFirstChunk = false
  let sawDone = false
  let errorCategory: PerfErrorCategory = "none"

  try {
    if (!apiKey) throw new Error(`${opts?.keyLabel ?? "OpenAI"} API Key 未配置`)
    throwIfAborted(opts?.signal)

    const client = getRuntimeOpenAIClient({
      apiKey,
      baseURL: opts?.baseURL,
      cacheKey: opts?.clientCacheKey ?? `${opts?.providerId ?? "openai"}:default`
    })

    const messages =
      payload.operation === "image_explain" && payload.srcUrl
        ? buildImageMessages(payload, "openai")
        : buildMessages(payload)
    const maxTokens = getMaxOutputTokens(payload)
    timing = markTiming(timing, "providerRequestStartedAt")

    logTiming("provider_request_start", requestId, timing, {
      provider: opts?.keyLabel ?? "OpenAI",
      model,
      maxTokens,
      inputChars: estimatePayloadChars(payload)
    })

    const stream = await client.chat.completions.create(
      {
        model,
        messages: messages as Parameters<
          typeof client.chat.completions.create
        >[0]["messages"],
        stream: true,
        max_tokens: maxTokens
      },
      opts?.signal ? { signal: opts.signal } : undefined
    )

    for await (const chunk of stream) {
      throwIfAborted(opts?.signal)
      const text = chunk.choices[0]?.delta?.content ?? ""
      const done = chunk.choices[0]?.finish_reason != null
      if (text && !sawFirstChunk) {
        sawFirstChunk = true
        timing = markTiming(timing, "firstChunkAt")
        logTiming("provider_first_chunk", requestId, timing, {
          provider: opts?.keyLabel ?? "OpenAI",
          model
        })
      }
      if (text || done) onChunk({ text, done })
      if (done) {
        sawDone = true
        timing = markTiming(timing, "doneAt")
        logTiming("provider_done", requestId, timing, {
          provider: opts?.keyLabel ?? "OpenAI",
          model
        })
      }
    }

    if (!sawDone) {
      errorCategory = "missing_done"
      timing = markTiming(timing, "doneAt")
      logTiming("provider_done", requestId, timing, {
        provider: opts?.keyLabel ?? "OpenAI",
        model,
        reason: "stream-ended"
      })
      onChunk({ text: "", done: true })
    }

    if (!sawFirstChunk && errorCategory === "none") {
      errorCategory = "missing_first_chunk"
    }
  } catch (err) {
    errorCategory = categorizePerfError(err)
    throw err
  } finally {
    if (opts?.logPerf) {
      logPerfSummary({
        trigger: payload.trigger,
        provider: opts.providerId ?? "openai",
        modelOrEndpoint: model,
        inputChars: estimatePayloadChars(payload),
        contextType: inferPerfContextType(payload),
        timing,
        errorCategory
      })
    }
  }
}

async function callAnthropic(
  model: string,
  payload: AIRequestPayload,
  apiKey: string,
  onChunk: (chunk: StreamChunk) => void,
  opts: {
    requestId?: string
    signal?: AbortSignal
    clientCacheKey?: string
    logPerf?: boolean
  } = {}
): Promise<void> {
  const requestId = opts.requestId ?? "unknown"
  let timing: RequestTiming | undefined = payload.timing
  let sawFirstChunk = false
  let sawDone = false
  let errorCategory: PerfErrorCategory = "none"

  try {
    if (!apiKey) throw new Error("Anthropic API Key 未配置")
    throwIfAborted(opts.signal)

    const client = getRuntimeAnthropicClient({
      apiKey,
      cacheKey: opts.clientCacheKey ?? "anthropic:default"
    })

    const messages =
      payload.operation === "image_explain" && payload.srcUrl
        ? buildImageMessages(payload, "anthropic")
        : buildMessages(payload)
    const maxTokens = getMaxOutputTokens(payload)
    timing = markTiming(timing, "providerRequestStartedAt")

    logTiming("provider_request_start", requestId, timing, {
      provider: "Anthropic",
      model,
      maxTokens,
      inputChars: estimatePayloadChars(payload)
    })

    const stream = client.messages.stream(
      {
        model,
        messages: messages as Parameters<
          typeof client.messages.stream
        >[0]["messages"],
        max_tokens: maxTokens
      },
      opts.signal ? { signal: opts.signal } : undefined
    )

    for await (const event of stream) {
      throwIfAborted(opts.signal)
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        if (!sawFirstChunk) {
          sawFirstChunk = true
          timing = markTiming(timing, "firstChunkAt")
          logTiming("provider_first_chunk", requestId, timing, {
            provider: "Anthropic",
            model
          })
        }
        onChunk({ text: event.delta.text, done: false })
      } else if (event.type === "message_stop") {
        sawDone = true
        timing = markTiming(timing, "doneAt")
        logTiming("provider_done", requestId, timing, {
          provider: "Anthropic",
          model
        })
        onChunk({ text: "", done: true })
      }
    }

    if (!sawDone) {
      errorCategory = "missing_done"
      timing = markTiming(timing, "doneAt")
      logTiming("provider_done", requestId, timing, {
        provider: "Anthropic",
        model,
        reason: "stream-ended"
      })
      onChunk({ text: "", done: true })
    }

    if (!sawFirstChunk && errorCategory === "none") {
      errorCategory = "missing_first_chunk"
    }
  } catch (err) {
    errorCategory = categorizePerfError(err)
    throw err
  } finally {
    if (opts.logPerf) {
      logPerfSummary({
        trigger: payload.trigger,
        provider: "anthropic",
        modelOrEndpoint: model,
        inputChars: estimatePayloadChars(payload),
        contextType: inferPerfContextType(payload),
        timing,
        errorCategory
      })
    }
  }
}

/** 取出模板并将 {{selection}} / {{url}} / {{page}} 替换为实际上下文 */
export async function resolveTemplatePrompt(
  templateId: string,
  payload: AIRequestPayload
): Promise<string | null> {
  const templates = await getTemplates()
  return resolveTemplatePromptFromTemplates(templates, templateId, payload)
}

function resolveTemplatePromptFromTemplates(
  templates: PromptTemplate[],
  templateId: string,
  payload: AIRequestPayload
): string | null {
  const tpl = templates.find((t) => t.id === templateId)
  if (!tpl) return null

  return expandTemplate(tpl.prompt, {
    selection: payload.selectionText,
    url: payload.pageUrl ?? payload.linkUrl,
    page: payload.pageContent
  })
}

export function getMaxOutputTokens(payload: AIRequestPayload): number {
  const operation = payload.operation
  if (operation === "translate") return getTranslationMaxOutputTokens(payload)
  if (operation === "polish") return 768
  return 1024
}

function estimatePayloadChars(payload: AIRequestPayload): number {
  return [
    payload.selectionText,
    payload.pageContent,
    payload.userMessage,
    payload.priorContext,
    payload.linkUrl,
    payload.srcUrl,
    payload.pageUrl,
    payload.systemPrompt
  ].reduce((sum, value) => sum + (value?.length ?? 0), 0)
}

function inferPerfContextType(payload: AIRequestPayload): PerfContextType {
  if (payload.trigger === "follow-up") return "follow_up"
  if (payload.operation === "image_explain") return "image_explain"
  if (payload.operation === "summarize" && payload.pageContent) {
    return "page_summary"
  }
  if (payload.trigger === "command-palette" || payload.userMessage) {
    return "command"
  }
  if (payload.context === "selection" || payload.selectionText)
    return "selection"
  return "unknown"
}

function logPreProviderPerf(
  payload: AIRequestPayload,
  provider: ProviderId,
  modelOrEndpoint: string,
  errorCategory: PerfErrorCategory = "unknown_error"
): void {
  logPerfSummary({
    trigger: payload.trigger,
    provider,
    modelOrEndpoint,
    inputChars: estimatePayloadChars(payload),
    contextType: inferPerfContextType(payload),
    timing: payload.timing,
    errorCategory
  })
}

function getImageInputBlockReason(
  payload: AIRequestPayload,
  route: ModelRoute
): string | null {
  if (
    payload.operation !== "image_explain" ||
    payload.imageSource !== "screenshot-region"
  ) {
    return null
  }

  return getScreenshotVisionBlockReason(route)
}

function buildImageMessages(
  payload: AIRequestPayload,
  provider: "openai" | "anthropic"
): Array<{ role: "user" | "assistant"; content: unknown }> {
  const imageSource = assertSupportedImageSrc(payload.srcUrl)
  const systemPrompt =
    payload.systemPrompt ?? getDefaultSystemPrompt("image_explain")
  const extra = payload.pageUrl ? `\n\n页面地址：${payload.pageUrl}` : ""
  const text = systemPrompt + extra

  if (provider === "openai") {
    return [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageSource.url } },
          { type: "text", text }
        ]
      }
    ]
  }

  const anthropicSource =
    imageSource.kind === "remote"
      ? { type: "url", url: imageSource.url }
      : {
          type: "base64",
          media_type: imageSource.mediaType,
          data: imageSource.data
        }

  return [
    {
      role: "user",
      content: [
        { type: "image", source: anthropicSource },
        { type: "text", text }
      ]
    }
  ]
}

function buildMessages(
  payload: AIRequestPayload
): Array<{ role: "user" | "assistant"; content: string }> {
  const systemPrompt =
    payload.systemPrompt ?? getDefaultSystemPrompt(payload.operation)
  const userContent = buildUserContent(payload)

  return [{ role: "user", content: `${systemPrompt}\n\n${userContent}` }]
}

function getDefaultSystemPrompt(operation?: string): string {
  const prompts: Record<string, string> = {
    explain:
      "你是一个专业的内容解释助手。请用清晰、简洁的中文解释用户提供的内容，必要时给出示例。",
    translate: TRANSLATION_SYSTEM_PROMPT,
    polish:
      "你是一个专业文字润色助手。请改善用户提供文字的表达，使其更流畅、专业，保持原意不变。",
    summarize:
      "你是一个内容摘要助手。请用简洁的要点总结用户提供的内容，突出核心信息。",
    intent:
      "你是一个意图解析助手。将用户输入解析为结构化指令，输出 JSON 格式：{action, target, params}。",
    image_explain:
      "你是一个图像分析助手。请用简洁、清晰的中文描述并解释图片内容，包括主要元素、场景、文字等关键信息。",
    search: "你是一个知识助手。请就用户的问题提供准确、相关的信息和解答。",
    navigate:
      "你是一个查询助手。请帮用户找到并说明其想要查找的信息，必要时给出可访问的途径或关键词。",
    custom: "你是一个智能助手，请根据上下文帮助用户处理其问题。"
  }
  return (
    prompts[operation ?? ""] ?? "你是一个智能助手，请帮助用户处理以下内容。"
  )
}

function buildUserContent(payload: AIRequestPayload): string {
  if (payload.operation === "translate") {
    return buildTranslationUserContent(payload)
  }

  const parts: string[] = []

  // 用户选中的文字（工具栏、右键 selection、剪贴板）
  if (payload.selectionText) {
    parts.push(`选中内容：\n${payload.selectionText}`)
  }
  // 追问携带的近期对话节选，已在浮窗侧做长度预算
  if (payload.priorContext) {
    parts.push(`对话上文：\n${payload.priorContext}`)
  }
  // 用户在命令面板直接输入的文本
  if (payload.userMessage) {
    parts.push(payload.userMessage)
  }
  // 右键链接触发时的目标 URL
  if (payload.linkUrl) {
    parts.push(`链接地址：${payload.linkUrl}`)
  }
  // 右键图片/视频触发时的资源 URL
  if (payload.srcUrl) {
    parts.push(`资源地址：${payload.srcUrl}`)
  }
  // 当前页面 URL（所有触发源均可附带，提供上下文）
  if (payload.pageUrl) {
    parts.push(`页面地址：${payload.pageUrl}`)
  }
  // Readability 提取的正文（命令面板摘要场景）
  if (payload.pageContent) {
    parts.push(`页面内容：\n${payload.pageContent}`)
  }
  // templateId：V1 阶段模板内容由 background 在后续版本展开；
  // 此处仅透传 ID，避免模型收到无意义字符串
  // （当模板展开逻辑实现后在此替换为实际 prompt）

  return parts.join("\n\n")
}

/** 轻量意图解析：保持本地解析，避免额外模型调用。 */
export async function parseIntent(input: string): Promise<{
  action: string
  target: string
  params: Record<string, unknown>
}> {
  return parseIntentLocally(input)
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const err = new Error("user_cancelled")
  err.name = "AbortError"
  throw err
}
