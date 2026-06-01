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

// 监听来自 background 的提取请求
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "EXTRACT_PAGE_CONTENT") {
    const content = extractPageContent()
    sendResponse({ success: true, data: content })
  }
  return true
})
