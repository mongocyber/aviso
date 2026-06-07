import type { ModelRoute } from "~utils/model-registry"

export type CommandQuickActionId =
  | "copy_context"
  | "page_summary"
  | "template"

export type CommandQuickActionKind = "ai" | "local"

export type CommandAccessPreview =
  | "available"
  | "loading"
  | "empty"
  | "api_key_missing"
  | "model_unavailable"
  | "feature_unavailable"

export type CommandResolvedAccessState =
  | CommandAccessPreview
  | "BYOK_active"
  | "local_only"

export type CommandActionAccess = {
  state: CommandResolvedAccessState
  blocked: boolean
  usesProvider: boolean
  label: string
  detail: string
}

export const COMMAND_ACCESS_PREVIEWS: {
  id: CommandAccessPreview
  label: string
}[] = [
  { id: "available", label: "可用" },
  { id: "loading", label: "加载" },
  { id: "empty", label: "空状态" },
  { id: "api_key_missing", label: "未配置 Key" },
  { id: "model_unavailable", label: "模型不可用" },
  { id: "feature_unavailable", label: "功能未开放" }
]

const BLOCKED_STATES = new Set<CommandAccessPreview>([
  "loading",
  "api_key_missing",
  "model_unavailable",
  "feature_unavailable"
])

export function describeCommandActionAccess(input: {
  actionKind: CommandQuickActionKind
  preview: CommandAccessPreview
  route?: Pick<ModelRoute, "provider" | "requestModel"> | null
}): CommandActionAccess {
  if (input.actionKind === "local") {
    return {
      state: "local_only",
      blocked: false,
      usesProvider: false,
      label: "本地动作",
      detail: "不调用 AI，不需要 API Key。"
    }
  }

  if (input.preview !== "available") {
    return accessForPreview(input.preview)
  }

  if (input.route) {
    return {
      state: "BYOK_active",
      blocked: false,
      usesProvider: true,
      label: "AI 已连接",
      detail: `正在使用你的 ${input.route.provider.displayName} 配置：${input.route.requestModel}。`
    }
  }

  return accessForPreview("available")
}

function accessForPreview(
  preview: CommandAccessPreview
): CommandActionAccess {
  switch (preview) {
    case "available":
      return {
        state: "available",
        blocked: false,
        usesProvider: true,
        label: "AI 可用",
        detail: "当前 AI 配置可处理这个动作。"
      }
    case "loading":
      return {
        state: "loading",
        blocked: true,
        usesProvider: false,
        label: "检查配置中",
        detail: "正在读取本地 AI 配置，暂不发送请求。"
      }
    case "empty":
      return {
        state: "empty",
        blocked: false,
        usesProvider: false,
        label: "空状态",
        detail: "暂无历史或推荐结果，仍可直接输入指令。"
      }
    case "api_key_missing":
      return {
        state: "api_key_missing",
        blocked: true,
        usesProvider: false,
        label: "未配置 API Key",
        detail: "请先在 AI 服务中配置自己的 API Key。"
      }
    case "model_unavailable":
      return {
        state: "model_unavailable",
        blocked: true,
        usesProvider: false,
        label: "模型不可用",
        detail: "当前模型或接入点不可用，请切换或重新配置 AI 服务。"
      }
    case "feature_unavailable":
      return {
        state: "feature_unavailable",
        blocked: true,
        usesProvider: false,
        label: "功能未开放",
        detail: "当前基础版暂不开放这个功能入口。"
      }
  }
}

export function isCommandAccessBlocked(
  preview: CommandAccessPreview
): boolean {
  return BLOCKED_STATES.has(preview)
}
