export const MAX_PAGE_CONTENT_CHARS = 5000

export function truncatePageContent(
  text: string,
  maxChars = MAX_PAGE_CONTENT_CHARS
): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed

  return `${trimmed.slice(0, maxChars)}\n…（正文过长已截断）`
}
