import type { RequestTiming } from "~utils/timing"
import type { ClipboardType } from "~utils/clipboard-detect"

export type ContextMenuContext =
  | "selection"
  | "link"
  | "image"
  | "video"
  | "editable"
  | "page"

export type AIRequestPayload = {
  operation?: string
  selectionText?: string
  pageContent?: string
  userMessage?: string
  linkUrl?: string
  srcUrl?: string
  pageUrl?: string
  model?: string
  systemPrompt?: string
  templateId?: string
  timing?: RequestTiming
}

export type MessageRequest =
  | {
      action: "AI_REQUEST"
      payload: AIRequestPayload
      requestId: string
      // tabId intentionally omitted: background resolves from sender.tab.id
    }
  | { action: "SAVE_HISTORY"; payload: import("~types/history").HistoryEntry }
  | { action: "GET_HISTORY" }
  | { action: "SEARCH_HISTORY"; payload: { query: string } }
  | { action: "DELETE_HISTORY"; payload: { id: string } }
  | { action: "PIN_HISTORY"; payload: { id: string } }
  | { action: "CLEAR_HISTORY" }
  | { action: "PING" }
  | {
      action: "SHOW_FLOATING_WINDOW"
      payload: {
        requestId?: string
        trigger: string
        operation: string
        context?: ContextMenuContext
        selectionText?: string
        linkUrl?: string
        srcUrl?: string
        pageUrl?: string
        pageContent?: string
        templateId?: string
        userMessage?: string
        timing?: RequestTiming
        deferAiRequest?: boolean
        statusText?: string
        // 从历史恢复：直接回填已有对话，不再调用 AI
        restore?: { input: string; output: string }
      }
    }
  | {
      action: "START_FLOATING_AI_REQUEST"
      payload: {
        requestId: string
        aiPayload: AIRequestPayload
        timing?: RequestTiming
        statusText?: string
      }
    }
  | { action: "EXTRACT_PAGE_CONTENT" }
  | {
      action: "AI_STREAM_CHUNK"
      payload: { chunk: { text: string; done: boolean }; requestId: string }
    }
  | {
      action: "AI_STREAM_ERROR"
      payload: { error: string; requestId: string }
    }
  | { action: "PARSE_INTENT"; payload: { input: string } }
  | { action: "SEARCH_BOOKMARKS"; payload: { query: string } }
  | { action: "OPEN_COMMAND_PALETTE" }
  | { action: "REQUEST_OPEN_COMMAND_PALETTE" }
  | {
      action: "REQUEST_CLIPBOARD_TOAST"
      payload: { text: string; type: ClipboardType; pageUrl: string }
    }
  | {
      action: "SHOW_CLIPBOARD_TOAST"
      payload: { text: string; type: ClipboardType; pageUrl: string }
    }
  | { action: "UPDATE_TEMPLATES" }

export type MessageResponse = {
  success: boolean
  data?: unknown
  error?: string
  meta?: Record<string, unknown>
}
