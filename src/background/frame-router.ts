import type { MessageRequest } from "~types/messages"
import { buildSafeErrorLog } from "~utils/errors"

export const TOP_FRAME_ID = 0

export function canUseDomClipboardFallbackForSourceFrame(
  frameId: number | undefined
): boolean {
  return frameId === TOP_FRAME_ID
}

type SendOptions = {
  frameId?: number
  frameUrl?: string
  label: string
}

type DisplayFrameOptions = {
  fallbackFrameId?: number
  fallbackFrameUrl?: string
  label: string
}

export type SendResult<TResponse = unknown> =
  | { ok: true; frameId?: number; response: TResponse }
  | { ok: false; frameId?: number; error: string }

export async function sendMessageToFrame<TResponse = unknown>(
  tabId: number,
  message: MessageRequest,
  options: SendOptions
): Promise<SendResult<TResponse>> {
  const { frameId, frameUrl, label } = options

  try {
    const response =
      typeof frameId === "number"
        ? await chrome.tabs.sendMessage(tabId, message, { frameId })
        : await chrome.tabs.sendMessage(tabId, message)

    return { ok: true, frameId, response: response as TResponse }
  } catch (err) {
    const error = getSendMessageError(err)
    console.warn("[Aviso] Failed to send tab message", {
      label,
      action: message.action,
      tabId,
      frameId,
      frameUrlPresent: Boolean(frameUrl),
      error: buildSafeErrorLog(err)
    })
    return { ok: false, frameId, error }
  }
}

function getSendMessageError(errorLike: unknown): string {
  if (errorLike instanceof Error) return errorLike.message
  if (typeof errorLike === "string") return errorLike
  if (typeof errorLike === "object" && errorLike !== null) {
    const message = (errorLike as { message?: unknown }).message
    if (typeof message === "string") return message
  }
  return "Failed to send tab message"
}

export async function sendMessageToDisplayFrame<TResponse = unknown>(
  tabId: number,
  message: MessageRequest,
  options: DisplayFrameOptions
): Promise<SendResult<TResponse>> {
  const topResult = await sendMessageToFrame<TResponse>(tabId, message, {
    frameId: TOP_FRAME_ID,
    label: `${options.label}:top-frame`
  })

  if (topResult.ok) return topResult

  const fallbackFrameId = options.fallbackFrameId
  if (typeof fallbackFrameId === "number" && fallbackFrameId !== TOP_FRAME_ID) {
    const fallbackResult = await sendMessageToFrame<TResponse>(tabId, message, {
      frameId: fallbackFrameId,
      frameUrl: options.fallbackFrameUrl,
      label: `${options.label}:source-frame-fallback`
    })

    if (fallbackResult.ok) return fallbackResult
    return fallbackResult
  }

  return topResult
}
