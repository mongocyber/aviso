const LOCALHOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?(?:[/?#].*)?$/i
const DOMAIN_LIKE_PATTERN =
  /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#].*)?$/i

export function normalizeSafeBrowserOpenUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate =
    /^https?:\/\//i.test(trimmed)
      ? trimmed
      : LOCALHOST_PATTERN.test(trimmed)
        ? `http://${trimmed}`
        : DOMAIN_LIKE_PATTERN.test(trimmed)
          ? `https://${trimmed}`
          : trimmed

  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.href
  } catch {
    return null
  }
}

export function isSafeBrowserOpenUrl(value: string): boolean {
  return normalizeSafeBrowserOpenUrl(value) !== null
}
