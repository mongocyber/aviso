export type ParsedIntent = {
  action:
    | "explain"
    | "translate"
    | "polish"
    | "summarize"
    | "search"
    | "navigate"
    | "history_search"
    | "bookmark_search"
    | "conversation_search"
    | "open_bookmarks"
    | "open_history"
    | "translate_page"
    | "summarize_page"
    | "ask_ai"
    | "custom"
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
    action: "translate_page",
    match: [
      /^(翻译|翻译一下|translate)\s*(当前)?(页面|网页|this page|current page)\s*$/i
    ],
    strip: [/[\s\S]*/]
  },
  {
    action: "summarize_page",
    match: [
      /^(总结|摘要|概括|summarize|summarise|summary)\s*(当前)?(页面|网页|this page|current page)\s*$/i
    ],
    strip: [/[\s\S]*/]
  },
  {
    action: "open_bookmarks",
    match: [
      /^(打开|查看|显示)\s*(我的)?\s*(书签|收藏)\s*$/i,
      /^\s*(open|show)\s+(my\s+)?bookmarks\s*$/i
    ],
    strip: [/[\s\S]*/]
  },
  {
    action: "open_history",
    match: [
      /^(打开|查看|显示)?\s*(浏览历史|浏览历史记录|历史|历史记录)\s*$/i,
      /^\s*(open|show)\s+(browser\s+)?history\s*$/i
    ],
    strip: [/[\s\S]*/]
  },
  {
    action: "history_search",
    match: [
      /^(历史|浏览历史|history)\s+/,
      /^\s*search\s+history\s+/i,
      /^(在|从)?\s*(历史|浏览历史|历史记录)\s*(里|中)?\s*(找|查找|搜索|打开)\s+/i,
      /^\s*(find|search|open)\s+.+\s+(from|in)\s+history\s*$/i
    ],
    strip: [
      /^(历史|浏览历史|history)\s+/i,
      /^\s*search\s+history\s+/i,
      /^(在|从)?\s*(历史|浏览历史|历史记录)\s*(里|中)?\s*(找|查找|搜索|打开)\s*/i,
      /^\s*(find|search|open)\s+/i,
      /\s+(from|in)\s+history\s*$/i
    ]
  },
  {
    action: "bookmark_search",
    match: [
      /^(书签|收藏|bookmark|bookmarks)\s+/,
      /^\s*search\s+(bookmark|bookmarks)\s+/i,
      /^(在|从)?\s*(书签|收藏)\s*(里|中)?\s*(找|查找|搜索|打开)\s+/i,
      /^\s*(find|search|open)\s+.+\s+(from|in)\s+(bookmark|bookmarks)\s*$/i
    ],
    strip: [
      /^(书签|收藏|bookmark|bookmarks)\s+/i,
      /^\s*search\s+(bookmark|bookmarks)\s+/i,
      /^(在|从)?\s*(书签|收藏)\s*(里|中)?\s*(找|查找|搜索|打开)\s*/i,
      /^\s*(find|search|open)\s+/i,
      /\s+(from|in)\s+(bookmark|bookmarks)\s*$/i
    ]
  },
  {
    action: "conversation_search",
    match: [
      /^(对话|AI 对话|AI记录|AI 记录|conversation|chat)\s+/i,
      /^\s*search\s+(conversation|chat|ai chat|ai chats)\s+/i
    ],
    strip: [
      /^(对话|AI 对话|AI记录|AI 记录|conversation|chat)\s+/i,
      /^\s*search\s+(conversation|chat|ai chat|ai chats)\s+/i
    ]
  },
  {
    action: "ask_ai",
    match: [/^(问 AI|问AI|问一下 AI|ask ai)\s+/i],
    strip: [/^(问 AI|问AI|问一下 AI|ask ai)\s*[:：]?\s*/i]
  },
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
    match: [/^(请)?(帮我)?(打开|访问|进入)\s*/, /^\s*(open|go to|navigate to)\b/i],
    strip: [/^(请)?(帮我)?(打开|访问|进入)(一下)?\s*/i, /^\s*(open|go to|navigate to)\s+[:：]?\s*/i]
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
