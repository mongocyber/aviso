export const MAX_PAGE_CONTENT_CHARS = 5000

export type CopyContextInput = {
  title?: string | null
  url?: string | null
  selectionText?: string | null
  pageContent?: string | null
  maxPageContentChars?: number
}

export function truncatePageContent(
  text: string,
  maxChars = MAX_PAGE_CONTENT_CHARS
): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed

  return `${trimmed.slice(0, maxChars)}\n…（正文过长已截断）`
}

export function formatCurrentContext(input: CopyContextInput): string {
  const maxChars = input.maxPageContentChars ?? MAX_PAGE_CONTENT_CHARS
  const title = normalizeField(input.title, "未命名页面")
  const url = normalizeField(input.url, "未知 URL")
  const selectionText = input.selectionText?.trim() ?? ""
  const rawPageContent = input.pageContent?.trim() ?? ""
  const pageContent = rawPageContent
    ? truncatePageContent(rawPageContent, maxChars)
    : "未能读取页面正文。"
  const pageHeading =
    rawPageContent.length > maxChars
      ? `## 页面正文（已截断到 ${maxChars} 字符）`
      : "## 页面正文"

  const sections = ["# 当前页面上下文", "", `标题：${title}`, `URL：${url}`]

  if (selectionText) {
    sections.push("", "## 选中文本", selectionText)
  }

  sections.push("", pageHeading, pageContent)

  return sections.join("\n")
}

function normalizeField(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized || fallback
}
