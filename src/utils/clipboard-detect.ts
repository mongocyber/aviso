export type ClipboardType = "english" | "code" | "url" | "chinese" | "other"

// 敏感页面域名模式（银行、医疗、支付类）
export const SENSITIVE_DOMAINS = [
  /bank\./i, /banking\./i, /\.bank\b/i,
  /hospital\./i, /clinic\./i, /health\./i, /medical\./i,
  /alipay\.com/i, /paypal\.com/i, /stripe\.com/i
]

// 敏感内容正则（手机号、身份证、密码、token）
export const SENSITIVE_PATTERNS = [
  /1[3-9]\d{9}/,                          // 中国手机号
  /\d{17}[\dX]/,                          // 身份证
  /password\s*[:=]\s*\S+/i,               // password: xxx
  /token\s*[:=]\s*[A-Za-z0-9._\-]{20,}/i  // token: xxx
]

export const TYPE_LABELS: Record<ClipboardType, string> = {
  english: "英文文本",
  code: "代码片段",
  url: "网页链接",
  chinese: "中文文本",
  other: "文本"
}

export function detectType(text: string): ClipboardType {
  if (/^https?:\/\/\S+$/.test(text)) return "url"
  // 多行代码：含换行 + 代码常见符号
  if (/[`{}()=;]/.test(text) && /\n/.test(text)) return "code"
  // 含中文字符
  if (/[一-龥]/.test(text)) return "chinese"
  // 含任意拉丁字母即视为英文
  if (/[a-zA-Z]/.test(text)) return "english"
  return "other"
}

export function isSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text))
}

export function isSensitiveDomain(url: string): boolean {
  return SENSITIVE_DOMAINS.some((re) => re.test(url))
}
