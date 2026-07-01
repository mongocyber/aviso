import { Readability } from "@mozilla/readability"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle"
}

export type ExtractedContent = {
  title: string
  content: string
  textContent: string
  length: number
  excerpt: string
  byline: string | null
  siteName: string | null
}

type EditableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | (HTMLElement & { isContentEditable: boolean })

const TEXT_INPUT_TYPES = new Set([
  "",
  "email",
  "search",
  "tel",
  "text",
  "url"
])

/** 提取当前页面正文（克隆 document 避免修改原始 DOM）*/
export function extractPageContent(): ExtractedContent | null {
  try {
    const docClone = document.cloneNode(true) as Document
    const reader = new Readability(docClone)
    const article = reader.parse()

    if (!article) return null

    return {
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName
    }
  } catch (err) {
    console.warn("[Aviso] Readability extraction failed:", err)
    return null
  }
}

export function extractEditableText(): string {
  const active = document.activeElement
  if (!active) return ""

  const target = getEditableTarget(active)
  if (!target) return ""

  if (target instanceof HTMLTextAreaElement) {
    return getTextControlSelectionOrValue(target)
  }

  if (target instanceof HTMLInputElement) {
    if (!TEXT_INPUT_TYPES.has(target.type.toLowerCase())) return ""
    return getTextControlSelectionOrValue(target)
  }

  const selectedText = window.getSelection()?.toString().trim()
  if (selectedText) return selectedText

  return (target.innerText || target.textContent || "").trim()
}

function getEditableTarget(element: Element): EditableElement | null {
  if (element instanceof HTMLTextAreaElement) return element
  if (element instanceof HTMLInputElement) return element

  const editable = element.closest<HTMLElement>(
    "[contenteditable='true'], [contenteditable=''], [role='textbox']"
  )
  return editable?.isContentEditable || editable?.getAttribute("role") === "textbox"
    ? (editable as EditableElement)
    : null
}

function getTextControlSelectionOrValue(
  element: HTMLInputElement | HTMLTextAreaElement
): string {
  const value = element.value.trim()
  const start = element.selectionStart
  const end = element.selectionEnd

  if (
    typeof start === "number" &&
    typeof end === "number" &&
    end > start
  ) {
    return element.value.slice(start, end).trim()
  }

  return value
}

// 监听来自 background 的提取请求
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "EXTRACT_EDITABLE_TEXT") {
    sendResponse({ success: true, data: { text: extractEditableText() } })
    return false
  }

  if (message.action !== "EXTRACT_PAGE_CONTENT") {
    return false
  }

  const content = extractPageContent()
  sendResponse({ success: true, data: content })
  return false
})
