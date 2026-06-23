export type SafeErrorCategory =
  | "api_key_missing"
  | "unauthorized"
  | "rate_limited"
  | "network_error"
  | "timeout"
  | "unsupported_image_input"
  | "missing_config"
  | "provider_error"
  | "user_cancelled"
  | "unknown_error"

export type SafeErrorLog = {
  category: SafeErrorCategory
  status?: number
}

const USER_MESSAGES: Record<SafeErrorCategory, string> = {
  api_key_missing: "API Key 未配置，请在设置中检查。",
  unauthorized: "API Key 无效或已过期，请在设置中检查。",
  rate_limited: "请求过于频繁或额度不足，请稍后再试。",
  network_error: "网络请求失败，请检查网络连接。",
  timeout: "请求超时，请稍后再试。",
  unsupported_image_input:
    "这张图片的地址格式暂不支持，请换网页中的 JPG/PNG/WebP 图片再试。",
  missing_config: "模型 ID 或接入点未配置，请在设置的 AI 服务页填写",
  provider_error: "AI 服务返回错误，请稍后再试或检查设置。",
  user_cancelled: "已停止等待。",
  unknown_error: "请求失败，请稍后再试。"
}

const HOSTED_AI_SAFE_USER_MESSAGES = new Set([
  "托管请求格式不可用，请检查本地集成配置。",
  "托管登录状态已失效，请在 AI 服务页重新本地登录。",
  "托管额度暂不可用，可切换到自己的 API Key。",
  "当前托管模型不可用，请重试默认模型或切换到自己的 API Key。",
  "托管请求过于频繁，请稍后重试或切换到自己的 API Key。",
  "本地托管服务暂不可用，请确认本地后端已启动，或切换到自己的 API Key。",
  "托管上游服务失败，请稍后重试或切换到自己的 API Key。",
  "托管服务异常，请稍后重试或切换到自己的 API Key。"
])

const REMOTE_IMAGE_DOWNLOAD_ERROR =
  "模型无法读取这张网页图片，可能是图片服务器限制访问或加载超时。请换网页中的 JPG/PNG/WebP 图片再试。"

const TRANSLATION_EMPTY_INPUT_ERROR =
  "没有可翻译的文本：请先选中文字，或在命令面板输入“翻译 + 文本”。"

const IMAGE_UNSUPPORTED_MODEL_ERROR =
  "当前模型不支持图片理解，请切换到支持视觉输入的模型。"

const SCREENSHOT_UNSUPPORTED_MODEL_ERROR =
  "当前模型不支持截图理解，请切换到支持视觉输入的模型。"

const IMAGE_MODEL_DEPENDENT_ERROR =
  "当前模型尚未验证图片理解，请切换到已确认支持视觉输入的模型。"

const SCREENSHOT_MODEL_DEPENDENT_ERROR =
  "当前模型尚未验证截图理解，请切换到已确认支持视觉输入的模型。"

/** 将模型 SDK 抛出的错误归一为可读、安全的中文提示 */
export function normalizeError(err: unknown): string {
  const message = getErrorMessage(err)
  const knownSafeMessage = normalizeKnownSafeUserMessage(message)
  if (knownSafeMessage) return knownSafeMessage

  if (/invalid.*base64.*image_url|image_url.*base64/i.test(message)) {
    return USER_MESSAGES.unsupported_image_input
  }
  if (/timeout while downloading url|while downloading url/i.test(message)) {
    return REMOTE_IMAGE_DOWNLOAD_ERROR
  }
  if (/当前.*模型.*不支持.*图片理解/.test(message)) {
    return IMAGE_UNSUPPORTED_MODEL_ERROR
  }
  if (/当前.*模型.*尚未验证.*图片理解/.test(message)) {
    return IMAGE_MODEL_DEPENDENT_ERROR
  }

  return USER_MESSAGES[getSafeErrorCategory(err)]
}

export function getSafeErrorCategory(err: unknown): SafeErrorCategory {
  if (isAbortLikeError(err)) return "user_cancelled"

  const status = getErrorStatus(err)
  const message = getErrorMessage(err)

  if (/invalid.*base64.*image_url|image_url.*base64/i.test(message)) {
    return "unsupported_image_input"
  }
  if (
    /模型 ID|接入点未配置|model.*not configured|endpoint.*not configured/i.test(
      message
    )
  ) {
    return "missing_config"
  }
  if (/api key.*未配置|key 未配置|missing.*api key/i.test(message)) {
    return "api_key_missing"
  }
  if (status === 401 || status === 403) return "unauthorized"
  if (/api key|unauthorized|invalid.*key/i.test(message)) {
    return "unauthorized"
  }
  if (
    status === 429 ||
    /rate.?limit|too many requests|quota|频繁|额度/i.test(message)
  ) {
    return "rate_limited"
  }
  if (/timeout|timed out|超时/i.test(message)) return "timeout"
  if (/network|fetch failed|failed to fetch|网络/i.test(message)) {
    return "network_error"
  }
  if (typeof status === "number" && status >= 400) return "provider_error"
  if (
    /provider|raw|response|body|invalid_request|bad request|server error/i.test(
      message
    )
  ) {
    return "provider_error"
  }

  return "unknown_error"
}

export function buildSafeErrorLog(err: unknown): SafeErrorLog {
  const status = getErrorStatus(err)
  return {
    category: getSafeErrorCategory(err),
    ...(typeof status === "number" ? { status } : {})
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: unknown }).message
    return typeof message === "string" ? message : ""
  }
  return ""
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const directStatus = (err as { status?: unknown }).status
  if (typeof directStatus === "number") return directStatus

  const statusCode = (err as { statusCode?: unknown }).statusCode
  if (typeof statusCode === "number") return statusCode

  const response = (err as { response?: { status?: unknown } }).response
  return typeof response?.status === "number" ? response.status : undefined
}

function isAbortLikeError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const name = (err as { name?: unknown }).name
    if (name === "AbortError") return true
  }

  return /aborted|aborterror|cancelled|canceled|user_cancelled|已停止等待/i.test(
    getErrorMessage(err)
  )
}

function normalizeKnownSafeUserMessage(message: string): string | null {
  if (!message) return null
  if (message === USER_MESSAGES.api_key_missing) return message
  if (message === USER_MESSAGES.unauthorized) return message
  if (message === USER_MESSAGES.rate_limited) return message
  if (message === USER_MESSAGES.network_error) return message
  if (message === USER_MESSAGES.timeout) return message
  if (message === USER_MESSAGES.unsupported_image_input) return message
  if (message === USER_MESSAGES.missing_config) return message
  if (message === USER_MESSAGES.provider_error) return message
  if (message === USER_MESSAGES.user_cancelled) return message
  if (message === USER_MESSAGES.unknown_error) return message
  if (message === REMOTE_IMAGE_DOWNLOAD_ERROR) return message
  if (message === TRANSLATION_EMPTY_INPUT_ERROR) return message
  if (message === IMAGE_UNSUPPORTED_MODEL_ERROR) return message
  if (message === SCREENSHOT_UNSUPPORTED_MODEL_ERROR) return message
  if (message === IMAGE_MODEL_DEPENDENT_ERROR) return message
  if (message === SCREENSHOT_MODEL_DEPENDENT_ERROR) return message
  if (HOSTED_AI_SAFE_USER_MESSAGES.has(message)) return message
  return null
}
