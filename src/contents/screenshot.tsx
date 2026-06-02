import type { PlasmoCSConfig } from "plasmo"

import type {
  MessageRequest,
  MessageResponse,
  ScreenshotRegion
} from "~types/messages"
import {
  bucketScreenshotDataUrl,
  isSupportedScreenshotDataUrl,
  normalizeScreenshotRegion
} from "~utils/screenshot"
import { logTiming, markTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

type StartPayload = Extract<
  MessageRequest,
  { action: "START_SCREENSHOT_SELECTION" }
>["payload"]

type CaptureResponseData = {
  dataUrl?: string
  timing?: StartPayload["timing"]
}

type OverlaySession = {
  root: HTMLDivElement
  rect: HTMLDivElement
  panel: HTMLDivElement
  error: HTMLDivElement
  confirmButton: HTMLButtonElement
  cancelButton: HTMLButtonElement
}

const MAX_OUTPUT_EDGE = 1600
let activeSession: OverlaySession | null = null

chrome.runtime.onMessage.addListener(
  (
    message: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    if (message.action !== "START_SCREENSHOT_SELECTION") return

    startScreenshotSelection(message.payload)
    sendResponse({ success: true })
  }
)

function startScreenshotSelection(payload: StartPayload) {
  cleanupOverlay()

  const session = createOverlay()
  activeSession = session
  document.documentElement.appendChild(session.root)

  let dragStart: { x: number; y: number } | null = null
  let selectedRegion: ScreenshotRegion | null = null

  const updateSelection = (region: ScreenshotRegion | null) => {
    selectedRegion = region
    session.confirmButton.disabled = !region

    if (!region) {
      session.rect.style.display = "none"
      session.panel.style.display = "none"
      return
    }

    session.rect.style.display = "block"
    session.rect.style.left = `${region.x}px`
    session.rect.style.top = `${region.y}px`
    session.rect.style.width = `${region.width}px`
    session.rect.style.height = `${region.height}px`

    session.panel.style.display = "flex"
    session.panel.style.left = `${Math.max(
      12,
      Math.min(region.x + region.width, window.innerWidth - 224)
    )}px`
    session.panel.style.top = `${Math.max(
      12,
      Math.min(region.y + region.height + 10, window.innerHeight - 56)
    )}px`
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.target !== session.root) return
    event.preventDefault()
    session.error.textContent = ""
    dragStart = { x: event.clientX, y: event.clientY }
    updateSelection(null)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragStart) return
    event.preventDefault()
    updateSelection(
      normalizeScreenshotRegion(
        dragStart.x,
        dragStart.y,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight
      )
    )
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!dragStart) return
    event.preventDefault()
    updateSelection(
      normalizeScreenshotRegion(
        dragStart.x,
        dragStart.y,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight
      )
    )
    dragStart = null
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      logTiming(
        "screenshot_selection_cancelled",
        payload.requestId,
        payload.timing
      )
      cleanupOverlay()
    }
  }

  session.root.addEventListener("pointerdown", onPointerDown)
  session.root.addEventListener("pointermove", onPointerMove)
  session.root.addEventListener("pointerup", onPointerUp)
  document.addEventListener("keydown", onKeyDown)

  session.cancelButton.addEventListener("click", () => {
    logTiming(
      "screenshot_selection_cancelled",
      payload.requestId,
      payload.timing
    )
    cleanupOverlay()
  })

  session.confirmButton.addEventListener("click", async () => {
    if (!selectedRegion) return
    session.confirmButton.disabled = true
    session.confirmButton.textContent = "处理中"
    await confirmScreenshot(payload, selectedRegion, session)
  })

  const cleanup = cleanupOverlay
  session.root.addEventListener("aviso-cleanup", () => {
    session.root.removeEventListener("pointerdown", onPointerDown)
    session.root.removeEventListener("pointermove", onPointerMove)
    session.root.removeEventListener("pointerup", onPointerUp)
    document.removeEventListener("keydown", onKeyDown)
  })

  return cleanup
}

async function confirmScreenshot(
  payload: StartPayload,
  region: ScreenshotRegion,
  session: OverlaySession
) {
  const captureTiming = markTiming(payload.timing, "screenshotCaptureStartedAt")
  logTiming("screenshot_capture_start", payload.requestId, captureTiming, {
    regionAreaBucket: bucketRegionArea(region)
  })

  try {
    session.root.style.display = "none"
    await nextAnimationFrame()

    const captureResponse = await sendRuntimeMessage<CaptureResponseData>({
      action: "CAPTURE_VISIBLE_TAB",
      payload: {
        requestId: payload.requestId,
        timing: captureTiming
      }
    })

    if (!captureResponse.success) {
      throw new Error(captureResponse.error || "截图失败，请重新尝试。")
    }

    const captureData = captureResponse.data
    const fullDataUrl = captureData?.dataUrl
    if (!fullDataUrl || !isSupportedScreenshotDataUrl(fullDataUrl)) {
      throw new Error("截图格式暂不支持，请重新尝试。")
    }

    const croppedDataUrl = await cropScreenshotDataUrl(fullDataUrl, region)
    const timing = markTiming(captureData.timing, "screenshotCropReadyAt")
    logTiming("screenshot_crop_ready", payload.requestId, timing, {
      regionAreaBucket: bucketRegionArea(region),
      imageSizeBucket: bucketScreenshotDataUrl(croppedDataUrl)
    })

    const floatingResponse = await sendRuntimeMessage({
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId: payload.requestId,
        trigger: "screenshot",
        operation: "image_explain",
        context: "page",
        imageSource: "screenshot-region",
        srcUrl: croppedDataUrl,
        userMessage: "请解释这个截图区域。",
        timing,
        statusText: "正在发送截图给模型…"
      }
    })
    if (!floatingResponse.success) {
      throw new Error(floatingResponse.error || "无法打开结果浮窗。")
    }

    cleanupOverlay()
  } catch (err) {
    session.root.style.display = "block"
    session.confirmButton.disabled = false
    session.confirmButton.textContent = "发送"
    session.error.textContent = err instanceof Error ? err.message : String(err)
  }
}

async function cropScreenshotDataUrl(
  fullDataUrl: string,
  region: ScreenshotRegion
): Promise<string> {
  const image = await loadImage(fullDataUrl)
  const scaleX = image.naturalWidth / Math.max(1, window.innerWidth)
  const scaleY = image.naturalHeight / Math.max(1, window.innerHeight)
  const sourceX = Math.round(region.x * scaleX)
  const sourceY = Math.round(region.y * scaleY)
  const sourceWidth = Math.round(region.width * scaleX)
  const sourceHeight = Math.round(region.height * scaleY)
  const outputScale = Math.min(
    1,
    MAX_OUTPUT_EDGE / Math.max(sourceWidth, sourceHeight)
  )
  const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale))
  const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale))
  const canvas = document.createElement("canvas")
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("当前页面无法处理截图。")

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight
  )

  return canvas.toDataURL("image/png")
}

function createOverlay(): OverlaySession {
  const root = document.createElement("div")
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: "rgba(8, 15, 12, 0.22)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  })

  const hint = document.createElement("div")
  hint.textContent = "拖动选择截图区域，Esc 取消"
  Object.assign(hint.style, {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "rgba(19, 31, 25, 0.94)",
    border: "1px solid rgba(180, 204, 185, 0.32)",
    color: "#dce8df",
    fontSize: "13px",
    boxShadow: "0 12px 28px rgba(0,0,0,.24)",
    pointerEvents: "none"
  })

  const rect = document.createElement("div")
  Object.assign(rect.style, {
    display: "none",
    position: "fixed",
    border: "2px solid #b7d5bf",
    background: "rgba(183, 213, 191, 0.12)",
    boxShadow: "0 0 0 9999px rgba(8, 15, 12, 0.34)",
    pointerEvents: "none"
  })

  const panel = document.createElement("div")
  Object.assign(panel.style, {
    display: "none",
    position: "fixed",
    gap: "8px",
    alignItems: "center",
    padding: "6px",
    borderRadius: "8px",
    background: "rgba(19, 31, 25, 0.96)",
    border: "1px solid rgba(180, 204, 185, 0.32)",
    boxShadow: "0 12px 28px rgba(0,0,0,.24)"
  })

  const confirmButton = createButton("发送", true)
  const cancelButton = createButton("取消", false)
  const error = document.createElement("div")
  Object.assign(error.style, {
    position: "fixed",
    left: "50%",
    bottom: "18px",
    transform: "translateX(-50%)",
    maxWidth: "min(560px, calc(100vw - 32px))",
    color: "#ffd7d7",
    fontSize: "13px",
    lineHeight: "1.45",
    textAlign: "center"
  })

  panel.append(confirmButton, cancelButton)
  root.append(hint, rect, panel, error)

  return { root, rect, panel, error, confirmButton, cancelButton }
}

function createButton(label: string, primary: boolean): HTMLButtonElement {
  const button = document.createElement("button")
  button.textContent = label
  Object.assign(button.style, {
    minWidth: "64px",
    height: "32px",
    borderRadius: "6px",
    border: primary
      ? "1px solid rgba(183, 213, 191, .72)"
      : "1px solid rgba(180, 204, 185, .32)",
    background: primary ? "#b7d5bf" : "transparent",
    color: primary ? "#112018" : "#dce8df",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer"
  })
  return button
}

function cleanupOverlay() {
  if (!activeSession) return
  activeSession.root.dispatchEvent(new Event("aviso-cleanup"))
  activeSession.root.remove()
  activeSession = null
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("截图读取失败，请重新尝试。"))
    image.src = dataUrl
  })
}

function sendRuntimeMessage<TData = unknown>(
  message: MessageRequest
): Promise<MessageResponse & { data?: TData }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response?: MessageResponse) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        resolve({ success: false, error: runtimeError.message })
        return
      }
      const safeResponse =
        response ??
        ({ success: false, error: "扩展消息无响应。" } as MessageResponse)
      resolve({
        ...safeResponse,
        data: safeResponse.data as TData | undefined
      })
    })
  })
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function bucketRegionArea(region: ScreenshotRegion): string {
  const area = region.width * region.height
  if (area <= 120_000) return "small"
  if (area <= 600_000) return "medium"
  return "large"
}
