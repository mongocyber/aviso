export type FollowUpContextRole = "user" | "assistant"

export type FollowUpContextMessage = {
  role: FollowUpContextRole
  content: string
}

export type FollowUpContextBudget = {
  maxMessages: number
  maxTotalChars: number
  maxUserChars: number
  maxAssistantChars: number
}

export const DEFAULT_FOLLOW_UP_CONTEXT_BUDGET: FollowUpContextBudget = {
  maxMessages: 4,
  maxTotalChars: 3000,
  maxUserChars: 600,
  maxAssistantChars: 1200
}

const ROLE_LABEL: Record<FollowUpContextRole, string> = {
  user: "用户",
  assistant: "助手"
}

const TRUNCATION_MARKER = "…（已截断）"

export function buildFollowUpPriorContext(
  messages: FollowUpContextMessage[],
  budget: FollowUpContextBudget = DEFAULT_FOLLOW_UP_CONTEXT_BUDGET
): string {
  const cleanMessages = messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }))
    .filter((message) => message.content.length > 0)

  const lines: string[] = []
  let usedChars = 0

  for (
    let i = cleanMessages.length - 1;
    i >= 0 && lines.length < budget.maxMessages;
    i--
  ) {
    const message = cleanMessages[i]
    const roleLimit =
      message.role === "assistant"
        ? budget.maxAssistantChars
        : budget.maxUserChars
    const clippedContent = clipText(message.content, roleLimit)
    const line = `${ROLE_LABEL[message.role]}：${clippedContent}`
    const remaining = budget.maxTotalChars - usedChars - (lines.length ? 1 : 0)

    if (remaining <= 0) break

    lines.unshift(clipText(line, remaining))
    usedChars += Math.min(line.length, remaining) + (lines.length > 1 ? 1 : 0)
  }

  if (lines.length === 0) return ""

  return `以下是最近对话节选（已按长度裁剪）：\n${lines.join("\n")}`
}

function clipText(value: string, maxChars: number): string {
  if (maxChars <= 0) return ""
  if (value.length <= maxChars) return value
  if (maxChars <= TRUNCATION_MARKER.length) return value.slice(0, maxChars)
  return `${value.slice(0, maxChars - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`
}
