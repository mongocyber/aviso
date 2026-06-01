import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import { getSettings, getApiKeys, getTemplates } from "~utils/storage"
import { expandTemplate } from "~utils/template"
import { normalizeError } from "~utils/errors"
import { assertSupportedImageSrc } from "~utils/image-src"
import { parseIntentLocally } from "~utils/intent"
import { logTiming, markTiming } from "~utils/timing"
import type { AIRequestPayload } from "~types/messages"
import type { PromptTemplate } from "~types/history"

export type StreamChunk = {
  text: string
  done: boolean
}

export async function handleAIRequest(
  payload: AIRequestPayload,
  onChunk: (chunk: StreamChunk) => void,
  options: { requestId?: string } = {}
): Promise<void> {
  const [settings, apiKeys] = await Promise.all([getSettings(), getApiKeys()])

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

  const model = payload.model ?? settings.defaultModel ?? "gpt-4o-mini"

  try {
    if (model.startsWith("claude")) {
      await callAnthropic(model, payload, apiKeys.anthropic, onChunk, {
        requestId: options.requestId
      })
    } else if (model === "doubao") {
      // 豆包/火山方舟：OpenAI 兼容协议，换 baseURL + 用户配置的接入点 ID
      const endpoint = settings.doubaoModel?.trim()
      if (!endpoint) {
        throw new Error("豆包接入点 ID 未配置，请在设置的 API Key 页填写")
      }
      await callOpenAI(endpoint, payload, apiKeys.doubao, onChunk, {
        baseURL: DOUBAO_BASE_URL,
        keyLabel: "豆包",
        requestId: options.requestId
      })
    } else {
      await callOpenAI(model, payload, apiKeys.openai, onChunk, {
        keyLabel: "OpenAI",
        requestId: options.requestId
      })
    }
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

// 火山方舟（豆包）OpenAI 兼容网关
const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

async function callOpenAI(
  model: string,
  payload: AIRequestPayload,
  apiKey: string,
  onChunk: (chunk: StreamChunk) => void,
  opts?: { baseURL?: string; keyLabel?: string; requestId?: string }
): Promise<void> {
  if (!apiKey) throw new Error(`${opts?.keyLabel ?? "OpenAI"} API Key 未配置`)

  const client = new OpenAI({
    apiKey,
    baseURL: opts?.baseURL,
    dangerouslyAllowBrowser: true
  })

  const messages =
    payload.operation === "image_explain" && payload.srcUrl
      ? buildImageMessages(payload, "openai")
      : buildMessages(payload)
  const maxTokens = getMaxOutputTokens(payload.operation)
  const requestId = opts?.requestId ?? "unknown"
  let timing = markTiming(payload.timing, "providerRequestStartedAt")

  logTiming("provider_request_start", requestId, timing, {
    provider: opts?.keyLabel ?? "OpenAI",
    model,
    maxTokens,
    inputChars: estimatePayloadChars(payload)
  })

  const stream = await client.chat.completions.create({
    model,
    messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
    stream: true,
    max_tokens: maxTokens
  })

  let sawFirstChunk = false
  let sawDone = false
  for await (const chunk of stream) {
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
    timing = markTiming(timing, "doneAt")
    logTiming("provider_done", requestId, timing, {
      provider: opts?.keyLabel ?? "OpenAI",
      model,
      reason: "stream-ended"
    })
    onChunk({ text: "", done: true })
  }
}

async function callAnthropic(
  model: string,
  payload: AIRequestPayload,
  apiKey: string,
  onChunk: (chunk: StreamChunk) => void,
  opts: { requestId?: string } = {}
): Promise<void> {
  if (!apiKey) throw new Error("Anthropic API Key 未配置")

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const messages =
    payload.operation === "image_explain" && payload.srcUrl
      ? buildImageMessages(payload, "anthropic")
      : buildMessages(payload)
  const maxTokens = getMaxOutputTokens(payload.operation)
  const requestId = opts.requestId ?? "unknown"
  let timing = markTiming(payload.timing, "providerRequestStartedAt")

  logTiming("provider_request_start", requestId, timing, {
    provider: "Anthropic",
    model,
    maxTokens,
    inputChars: estimatePayloadChars(payload)
  })

  const stream = client.messages.stream({
    model,
    messages: messages as Parameters<typeof client.messages.stream>[0]["messages"],
    max_tokens: maxTokens
  })

  let sawFirstChunk = false
  let sawDone = false
  for await (const event of stream) {
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
    timing = markTiming(timing, "doneAt")
    logTiming("provider_done", requestId, timing, {
      provider: "Anthropic",
      model,
      reason: "stream-ended"
    })
    onChunk({ text: "", done: true })
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

export function getMaxOutputTokens(operation?: string): number {
  if (operation === "translate" || operation === "polish") return 1536
  return 1024
}

function estimatePayloadChars(payload: AIRequestPayload): number {
  return [
    payload.selectionText,
    payload.pageContent,
    payload.userMessage,
    payload.linkUrl,
    payload.srcUrl,
    payload.pageUrl,
    payload.systemPrompt
  ].reduce((sum, value) => sum + (value?.length ?? 0), 0)
}

function buildImageMessages(
  payload: AIRequestPayload,
  provider: "openai" | "anthropic"
): Array<{ role: "user" | "assistant"; content: unknown }> {
  const imageSource = assertSupportedImageSrc(payload.srcUrl)
  const systemPrompt = payload.systemPrompt ?? getDefaultSystemPrompt("image_explain")
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
  const systemPrompt = payload.systemPrompt ?? getDefaultSystemPrompt(payload.operation)
  const userContent = buildUserContent(payload)

  return [
    { role: "user", content: `${systemPrompt}\n\n${userContent}` }
  ]
}

function getDefaultSystemPrompt(operation?: string): string {
  const prompts: Record<string, string> = {
    explain: "你是一个专业的内容解释助手。请用清晰、简洁的中文解释用户提供的内容，必要时给出示例。",
    translate: "你是一个专业翻译助手。请将用户提供的内容翻译成中文（如果是中文则翻译成英文），保持原文风格和语气。",
    polish: "你是一个专业文字润色助手。请改善用户提供文字的表达，使其更流畅、专业，保持原意不变。",
    summarize: "你是一个内容摘要助手。请用简洁的要点总结用户提供的内容，突出核心信息。",
    intent: "你是一个意图解析助手。将用户输入解析为结构化指令，输出 JSON 格式：{action, target, params}。",
    image_explain: "你是一个图像分析助手。请用简洁、清晰的中文描述并解释图片内容，包括主要元素、场景、文字等关键信息。",
    search: "你是一个知识助手。请就用户的问题提供准确、相关的信息和解答。",
    navigate: "你是一个查询助手。请帮用户找到并说明其想要查找的信息，必要时给出可访问的途径或关键词。",
    custom: "你是一个智能助手，请根据上下文帮助用户处理其问题。"
  }
  return prompts[operation ?? ""] ?? "你是一个智能助手，请帮助用户处理以下内容。"
}

function buildUserContent(payload: AIRequestPayload): string {
  const parts: string[] = []

  // 用户选中的文字（工具栏、右键 selection、剪贴板）
  if (payload.selectionText) {
    parts.push(`选中内容：\n${payload.selectionText}`)
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
export async function parseIntent(
  input: string
): Promise<{ action: string; target: string; params: Record<string, unknown> }> {
  return parseIntentLocally(input)
}
