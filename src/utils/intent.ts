export type ParsedIntent = {
  action: "explain" | "translate" | "polish" | "summarize" | "search" | "navigate" | "custom"
  target: string
  params: Record<string, unknown>
}

type IntentRule = {
  action: ParsedIntent["action"]
  match: RegExp[]
  strip: RegExp[]
}

const INTENT_RULES: IntentRule[] = [
  {
    action: "translate",
    match: [/^(请)?(帮我)?翻译/, /译成|翻成/, /^\s*translate\b/i],
    strip: [/^(请)?(帮我)?翻译(一下)?[:：\s]*/i, /^\s*translate\s+[:：]?\s*/i]
  },
  {
    action: "summarize",
    match: [/^(请)?(帮我)?(总结|摘要|概括)/, /^\s*(summarize|summarise|summary|tldr)\b/i],
    strip: [/^(请)?(帮我)?(总结|摘要|概括)(一下)?[:：\s]*/i, /^\s*(summarize|summarise|summary|tldr)\s+[:：]?\s*/i]
  },
  {
    action: "polish",
    match: [/^(请)?(帮我)?(润色|改写|优化表达)/, /^\s*(polish|rewrite)\b/i],
    strip: [/^(请)?(帮我)?(润色|改写|优化表达)(一下)?[:：\s]*/i, /^\s*(polish|rewrite)\s+[:：]?\s*/i]
  },
  {
    action: "explain",
    match: [/^(请)?(帮我)?(解释|说明|解读)/, /^\s*(explain|describe)\b/i],
    strip: [/^(请)?(帮我)?(解释|说明|解读)(一下)?[:：\s]*/i, /^\s*(explain|describe)\s+[:：]?\s*/i]
  },
  {
    action: "navigate",
    match: [/^(打开|访问|进入)\s+/, /^\s*(open|go to|navigate to)\b/i],
    strip: [/^(打开|访问|进入)\s+/i, /^\s*(open|go to|navigate to)\s+[:：]?\s*/i]
  },
  {
    action: "search",
    match: [/^(搜索|查找|查一下|搜一下)\s*/, /^\s*(search|find)\b/i],
    strip: [/^(搜索|查找|查一下|搜一下)\s*/i, /^\s*(search|find)\s+[:：]?\s*/i]
  }
]

export function parseIntentLocally(input: string): ParsedIntent {
  const trimmed = input.trim()
  if (!trimmed) return { action: "custom", target: "", params: {} }

  for (const rule of INTENT_RULES) {
    if (!rule.match.some((pattern) => pattern.test(trimmed))) continue

    const target = rule.strip.reduce(
      (value, pattern) => value.replace(pattern, "").trim(),
      trimmed
    )
    return { action: rule.action, target: target || trimmed, params: {} }
  }

  return { action: "search", target: trimmed, params: {} }
}

/** 本地轻量解析，避免命令面板在真正发问前多等一次模型调用。 */
export async function parseUserIntent(input: string): Promise<ParsedIntent> {
  return parseIntentLocally(input)
}
