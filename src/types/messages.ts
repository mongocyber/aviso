import type { ConversationMessage } from "~types/history"
import type { ClipboardType } from "~utils/clipboard-detect"
import type { CommandQuickActionId } from "~utils/command-access"
import type {
  HostedAccountStatus,
  HostedSignInStage
} from "~utils/hosted-session"
import type { AiUnavailableGuidance } from "~utils/ai-unavailable-guidance"
import type { ProviderId } from "~utils/model-registry"
import type { SaveSettingsOptions } from "~utils/storage"
import type { PerfSummary, RequestTiming } from "~utils/timing"

export type ContextMenuContext =
  | "selection"
  | "link"
  | "image"
  | "video"
  | "editable"
  | "page"

export type AIRequestPayload = {
  trigger?: string
  context?: ContextMenuContext
  operation?: string
  aiRoute?: "byok" | "hosted"
  imageSource?: "remote-image" | "screenshot-region"
  selectionText?: string
  pageContent?: string
  userMessage?: string
  priorContext?: string
  linkUrl?: string
  srcUrl?: string
  pageUrl?: string
  model?: string
  systemPrompt?: string
  templateId?: string
  timing?: RequestTiming
}

export type AIStreamChunk = {
  text: string
  done: boolean
  kind?: "answer" | "reasoning"
  perfSummary?: PerfSummary
}

export type ProviderConnectivityPayload = {
  provider: ProviderId
  providerConfigId?: string
}

export type HostedGoogleSignInData = {
  status: HostedAccountStatus
  stage: HostedSignInStage
  error?: {
    source: "oauth" | "backend" | "storage" | "unknown"
    code: string
    httpStatusClass?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "unknown"
  }
}

export type ScreenshotRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type MessageRequest =
  | {
      action: "AI_REQUEST"
      payload: AIRequestPayload
      requestId: string
      // tabId intentionally omitted: background resolves from sender.tab.id
    }
  | {
      action: "CANCEL_AI_REQUEST"
      payload: { requestId: string }
    }
  | {
      action: "WARM_RUNTIME_CONFIG"
      payload?: { requestId?: string }
    }
  | {
      action: "SAVE_SETTINGS"
      payload: {
        settings: Partial<import("~types/history").Settings>
        options?: SaveSettingsOptions
      }
    }
  | { action: "SAVE_HISTORY"; payload: import("~types/history").HistoryEntry }
  | { action: "GET_HISTORY" }
  | { action: "SEARCH_HISTORY"; payload: { query: string } }
  | { action: "SEARCH_BROWSER_HISTORY"; payload: { query: string } }
  | { action: "DELETE_HISTORY"; payload: { id: string } }
  | { action: "PIN_HISTORY"; payload: { id: string } }
  | { action: "CLEAR_HISTORY" }
  | { action: "PING" }
  | {
      action: "VALIDATE_PROVIDER_CONNECTIVITY"
      payload: ProviderConnectivityPayload
    }
  | { action: "HOSTED_GOOGLE_SIGN_IN" }
  | {
      action: "START_SCREENSHOT_SELECTION"
      payload: {
        requestId: string
        pageUrl: string
        timing?: RequestTiming
      }
    }
  | {
      action: "CAPTURE_VISIBLE_TAB"
      payload: {
        requestId: string
        timing?: RequestTiming
      }
    }
  | {
      action: "WRITE_CURRENT_CONTEXT_TO_CLIPBOARD"
      payload: { text: string; allowDomFallback: boolean }
    }
  | {
      action: "SHOW_FLOATING_WINDOW"
      payload: {
        requestId?: string
        trigger: string
        operation: string
        aiRoute?: AIRequestPayload["aiRoute"]
        context?: ContextMenuContext
        imageSource?: AIRequestPayload["imageSource"]
        selectionText?: string
        linkUrl?: string
        srcUrl?: string
        pageUrl?: string
        pageContent?: string
        templateId?: string
        userMessage?: string
        timing?: RequestTiming
        deferAiRequest?: boolean
        hostedAi?: {
          route: "hosted"
          state: "sign_in_required"
          hasByokProvider?: boolean
        }
        statusText?: string
        // 从历史恢复：直接回填已有对话，不再调用 AI
        restore?: {
          input: string
          output: string
          messages?: ConversationMessage[]
          createdAt?: number
          pinned?: boolean
        }
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
  | { action: "EXTRACT_EDITABLE_TEXT" }
  | {
      action: "AI_STREAM_CHUNK"
      payload: { chunk: AIStreamChunk; requestId: string }
    }
  | {
      action: "AI_STREAM_ERROR"
      payload: {
        error: string
        requestId: string
        guidance?: AiUnavailableGuidance
      }
    }
  | {
      action: "AI_PERF_SUMMARY"
      payload: { requestId: string; summary: PerfSummary }
    }
  | { action: "PARSE_INTENT"; payload: { input: string } }
  | { action: "SEARCH_BOOKMARKS"; payload: { query: string } }
  | {
      action: "RUN_COMMAND_QUICK_ACTION"
      payload: {
        actionId: CommandQuickActionId
        aiRoute?: AIRequestPayload["aiRoute"]
      }
    }
  | { action: "OPEN_COMMAND_PALETTE" }
  | { action: "REQUEST_OPEN_COMMAND_PALETTE" }
  | {
      action: "REQUEST_COPY_CURRENT_CONTEXT"
      payload: { selectionText?: string; pageUrl: string; title?: string }
    }
  | {
      action: "REQUEST_SUMMARIZE_PAGE"
      payload: { pageUrl: string }
    }
  | {
      action: "REQUEST_CLIPBOARD_TOAST"
      payload: { text: string; type: ClipboardType; pageUrl: string }
    }
  | {
      action: "SHOW_CLIPBOARD_TOAST"
      payload: { text: string; type: ClipboardType; pageUrl: string }
    }
  | {
      action: "REQUEST_COPY_CONTEXT_TOAST"
      payload: {
        status: "success" | "failure"
        message: string
        detail?: string
      }
    }
  | {
      action: "SHOW_COPY_CONTEXT_TOAST"
      payload: {
        status: "success" | "failure"
        message: string
        detail?: string
      }
    }
  | { action: "UPDATE_TEMPLATES" }

export type MessageResponseData = {
  perfSummary?: PerfSummary
}

export type MessageResponse = {
  success: boolean
  data?: MessageResponseData | unknown
  error?: string
  meta?: Record<string, unknown> & {
    aiGuidance?: AiUnavailableGuidance
  }
}
