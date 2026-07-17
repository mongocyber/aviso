export type ClipboardWriteOptions = {
  allowDomFallback?: boolean
}

export async function writeTextToClipboard(
  text: string,
  { allowDomFallback = false }: ClipboardWriteOptions = {}
): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to the DOM copy fallback only when explicitly allowed.
    }
  }

  if (!allowDomFallback) {
    throw new Error("Clipboard API write was rejected")
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  textarea.style.left = "-1000px"
  textarea.style.opacity = "0"
  const target = document.body ?? document.documentElement
  target.appendChild(textarea)
  textarea.select()

  try {
    const copied = document.execCommand("copy")
    if (!copied) throw new Error("Clipboard write was rejected")
  } finally {
    textarea.remove()
  }
}
