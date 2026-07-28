import type { MessageRequest } from "~types/messages"

type MessageAction = MessageRequest["action"]

type SenderSource = "any_internal" | "content_script" | "extension_page"
type FramePolicy = "any" | "top" | "none"

type MessageBoundaryPolicy = {
  source: SenderSource
  frame: FramePolicy
}

const TOP_FRAME_ID = 0

type BoundaryRejectReason =
  | "unknown_action"
  | "background_action_not_allowed"
  | "wrong_extension_id"
  | "missing_extension_id"
  | "missing_sender_tab"
  | "unexpected_sender_tab"
  | "missing_frame_id"
  | "subframe_not_allowed"

export type MessageBoundaryResult =
  | { ok: true; action: MessageAction }
  | {
      ok: false
      error: string
      log: {
        action: MessageAction | "unknown"
        reason: BoundaryRejectReason
        senderKind: "content_script" | "extension_page" | "unknown"
        senderIdMatches: boolean
        tabId?: number
        frameId?: number
        senderUrlPresent: boolean
        tabUrlPresent: boolean
      }
    }

const KNOWN_MESSAGE_ACTIONS = new Set<MessageAction>([
  "AI_REQUEST",
  "CANCEL_AI_REQUEST",
  "WARM_RUNTIME_CONFIG",
  "SAVE_SETTINGS",
  "SAVE_HISTORY",
  "GET_HISTORY",
  "SEARCH_HISTORY",
  "SEARCH_BROWSER_HISTORY",
  "DELETE_HISTORY",
  "PIN_HISTORY",
  "CLEAR_HISTORY",
  "PING",
  "VALIDATE_PROVIDER_CONNECTIVITY",
  "HOSTED_GOOGLE_SIGN_IN",
  "START_SCREENSHOT_SELECTION",
  "CAPTURE_VISIBLE_TAB",
  "WRITE_CURRENT_CONTEXT_TO_CLIPBOARD",
  "SHOW_FLOATING_WINDOW",
  "START_FLOATING_AI_REQUEST",
  "EXTRACT_PAGE_CONTENT",
  "AI_STREAM_CHUNK",
  "AI_STREAM_ERROR",
  "AI_PERF_SUMMARY",
  "PARSE_INTENT",
  "SEARCH_BOOKMARKS",
  "RUN_COMMAND_QUICK_ACTION",
  "OPEN_COMMAND_PALETTE",
  "REQUEST_OPEN_COMMAND_PALETTE",
  "REQUEST_COPY_CURRENT_CONTEXT",
  "REQUEST_SUMMARIZE_PAGE",
  "REQUEST_CLIPBOARD_TOAST",
  "SHOW_CLIPBOARD_TOAST",
  "REQUEST_COPY_CONTEXT_TOAST",
  "SHOW_COPY_CONTEXT_TOAST",
  "UPDATE_TEMPLATES"
])

const BACKGROUND_MESSAGE_POLICIES: Record<
  string,
  MessageBoundaryPolicy | undefined
> = {
  AI_REQUEST: { source: "content_script", frame: "any" },
  CANCEL_AI_REQUEST: { source: "content_script", frame: "any" },
  WARM_RUNTIME_CONFIG: { source: "content_script", frame: "any" },
  SAVE_SETTINGS: { source: "extension_page", frame: "none" },
  SAVE_HISTORY: { source: "content_script", frame: "any" },
  GET_HISTORY: { source: "extension_page", frame: "none" },
  SEARCH_HISTORY: { source: "any_internal", frame: "any" },
  SEARCH_BROWSER_HISTORY: { source: "content_script", frame: "top" },
  DELETE_HISTORY: { source: "extension_page", frame: "none" },
  PIN_HISTORY: { source: "extension_page", frame: "none" },
  CLEAR_HISTORY: { source: "extension_page", frame: "none" },
  PING: { source: "any_internal", frame: "any" },
  VALIDATE_PROVIDER_CONNECTIVITY: { source: "extension_page", frame: "none" },
  HOSTED_GOOGLE_SIGN_IN: { source: "extension_page", frame: "none" },
  CAPTURE_VISIBLE_TAB: { source: "content_script", frame: "top" },
  SHOW_FLOATING_WINDOW: { source: "content_script", frame: "any" },
  PARSE_INTENT: { source: "content_script", frame: "any" },
  SEARCH_BOOKMARKS: { source: "content_script", frame: "top" },
  RUN_COMMAND_QUICK_ACTION: { source: "content_script", frame: "any" },
  REQUEST_OPEN_COMMAND_PALETTE: { source: "content_script", frame: "any" },
  REQUEST_COPY_CURRENT_CONTEXT: { source: "any_internal", frame: "any" },
  REQUEST_SUMMARIZE_PAGE: { source: "content_script", frame: "any" },
  REQUEST_CLIPBOARD_TOAST: { source: "content_script", frame: "any" },
  REQUEST_COPY_CONTEXT_TOAST: { source: "content_script", frame: "any" },
  UPDATE_TEMPLATES: { source: "extension_page", frame: "none" }
}

export function validateBackgroundMessageBoundary(
  request: unknown,
  sender: chrome.runtime.MessageSender
): MessageBoundaryResult {
  const action = getSafeMessageActionLabel(request)

  if (action === "unknown") {
    return reject("unknown_action", action, sender)
  }

  const policy = BACKGROUND_MESSAGE_POLICIES[action]
  if (!policy) {
    return reject("background_action_not_allowed", action, sender)
  }

  const extensionId = getCurrentExtensionId()
  if (sender.id) {
    if (extensionId && sender.id !== extensionId) {
      return reject("wrong_extension_id", action, sender)
    }
  } else {
    return reject("missing_extension_id", action, sender)
  }

  const hasSenderTab = typeof sender.tab?.id === "number"
  if (policy.source === "content_script" && !hasSenderTab) {
    return reject("missing_sender_tab", action, sender)
  }
  if (policy.source === "extension_page" && hasSenderTab) {
    return reject("unexpected_sender_tab", action, sender)
  }

  if (hasSenderTab && typeof sender.frameId !== "number") {
    return reject("missing_frame_id", action, sender)
  }
  if (policy.frame === "top" && sender.frameId !== TOP_FRAME_ID) {
    return reject("subframe_not_allowed", action, sender)
  }
  if (policy.frame === "none" && typeof sender.frameId === "number") {
    return reject("unexpected_sender_tab", action, sender)
  }

  return { ok: true, action }
}

export function getSafeMessageActionLabel(
  request: unknown
): MessageAction | "unknown" {
  if (typeof request !== "object" || request === null) return "unknown"
  const action = (request as { action?: unknown }).action
  if (typeof action !== "string") return "unknown"
  return KNOWN_MESSAGE_ACTIONS.has(action as MessageAction)
    ? (action as MessageAction)
    : "unknown"
}

function getCurrentExtensionId(): string | undefined {
  return chrome.runtime?.id
}

function reject(
  reason: BoundaryRejectReason,
  action: MessageAction | "unknown",
  sender: chrome.runtime.MessageSender
): MessageBoundaryResult {
  return {
    ok: false,
    error: "Message rejected by sender/frame policy",
    log: {
      action,
      reason,
      senderKind: sender.tab
        ? "content_script"
        : sender.id
          ? "extension_page"
          : "unknown",
      senderIdMatches: Boolean(
        sender.id && sender.id === getCurrentExtensionId()
      ),
      ...(typeof sender.tab?.id === "number" ? { tabId: sender.tab.id } : {}),
      ...(typeof sender.frameId === "number"
        ? { frameId: sender.frameId }
        : {}),
      senderUrlPresent: Boolean(sender.url),
      tabUrlPresent: Boolean(sender.tab?.url)
    }
  }
}
