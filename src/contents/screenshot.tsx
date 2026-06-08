import type { PlasmoCSConfig } from "plasmo"

import type {
  MessageRequest,
  MessageResponse,
  ScreenshotRegion
} from "~types/messages"
import {
  aviso,
  getAvisoThemeTokens,
  resolveAvisoTheme,
  type AvisoThemeMode,
  type AvisoThemeTokens
} from "~styles/aviso"
import {
  bucketScreenshotDataUrl,
  clampScreenshotToolbarPosition,
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

type CaptureOptions = {
  restoreOverlay?: boolean
}

type OverlaySession = {
  root: HTMLDivElement
  hint: HTMLDivElement
  rect: HTMLDivElement
  panel: HTMLDivElement
  error: HTMLDivElement
  style: HTMLStyleElement
  copyButton: HTMLButtonElement
  downloadButton: HTMLButtonElement
  retryButton: HTMLButtonElement
  sendButton: HTMLButtonElement
  cancelButton: HTMLButtonElement
}

const MAX_OUTPUT_EDGE = 1600
const TOOLBAR_ESTIMATED_WIDTH = 430
const TOOLBAR_ESTIMATED_HEIGHT = 84
let activeSession: OverlaySession | null = null
let screenshotThemeMode: AvisoThemeMode = "system"
let screenshotSystemPrefersDark = readScreenshotSystemPrefersDark()

type ScreenshotButtonIcon = "copy" | "download" | "retry" | "send" | "cancel"

initScreenshotThemeSync()

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

function readScreenshotSystemPrefersDark(): boolean {
  return typeof window === "undefined" || !window.matchMedia
    ? true
    : window.matchMedia("(prefers-color-scheme: dark)").matches
}

function isAvisoThemeMode(value: unknown): value is AvisoThemeMode {
  return value === "light" || value === "dark" || value === "system"
}

function getScreenshotThemeTokens(): AvisoThemeTokens {
  return getAvisoThemeTokens(
    resolveAvisoTheme(screenshotThemeMode, screenshotSystemPrefersDark)
  )
}

function initScreenshotThemeSync() {
  chrome.storage.sync.get("contextai_settings", (result) => {
    const nextMode = result.contextai_settings?.appearanceTheme
    if (isAvisoThemeMode(nextMode)) {
      screenshotThemeMode = nextMode
      updateActiveScreenshotTheme()
    }
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.contextai_settings) return
    const nextMode = changes.contextai_settings.newValue?.appearanceTheme
    if (isAvisoThemeMode(nextMode)) {
      screenshotThemeMode = nextMode
      updateActiveScreenshotTheme()
    }
  })

  const query = window.matchMedia?.("(prefers-color-scheme: dark)")
  query?.addEventListener?.("change", (event) => {
    screenshotSystemPrefersDark = event.matches
    updateActiveScreenshotTheme()
  })
}

function updateActiveScreenshotTheme() {
  if (!activeSession) return
  applyScreenshotTheme(activeSession, getScreenshotThemeTokens())
}

function startScreenshotSelection(payload: StartPayload) {
  cleanupOverlay()

  const session = createOverlay()
  activeSession = session
  document.documentElement.appendChild(session.root)

  let dragStart: { x: number; y: number } | null = null
  let selectedRegion: ScreenshotRegion | null = null

  const updateSelection = (region: ScreenshotRegion | null) => {
    selectedRegion = region
    const hasRegion = Boolean(region)
    session.root.style.background = hasRegion
      ? "transparent"
      : getScreenshotThemeTokens().overlay
    session.copyButton.disabled = !hasRegion
    session.downloadButton.disabled = !hasRegion
    session.retryButton.disabled = !hasRegion
    session.sendButton.disabled = !hasRegion

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
    const panelRect = session.panel.getBoundingClientRect()
    const toolbarPosition = clampScreenshotToolbarPosition(
      region,
      { width: window.innerWidth, height: window.innerHeight },
      {
        width: panelRect.width || TOOLBAR_ESTIMATED_WIDTH,
        height: panelRect.height || TOOLBAR_ESTIMATED_HEIGHT
      }
    )
    session.panel.style.left = `${toolbarPosition.left}px`
    session.panel.style.top = `${toolbarPosition.top}px`
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.target !== session.root) return
    event.preventDefault()
    if (selectedRegion && isPointInRegion(event, selectedRegion)) return
    session.error.textContent = ""
    session.error.style.display = "none"
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

  const onDoubleClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    if (event.composedPath().includes(session.panel)) return

    if (!selectedRegion || !isPointInRegion(event, selectedRegion)) {
      logTiming(
        "screenshot_selection_cancelled",
        payload.requestId,
        payload.timing
      )
      cleanupOverlay()
      return
    }

    void copySelectedScreenshot(payload, selectedRegion, session)
  }

  session.root.addEventListener("pointerdown", onPointerDown)
  session.root.addEventListener("pointermove", onPointerMove)
  session.root.addEventListener("pointerup", onPointerUp)
  session.root.addEventListener("dblclick", onDoubleClick, true)
  document.addEventListener("keydown", onKeyDown)

  session.cancelButton.addEventListener("click", () => {
    logTiming(
      "screenshot_selection_cancelled",
      payload.requestId,
      payload.timing
    )
    cleanupOverlay()
  })

  session.retryButton.addEventListener("click", () => {
    session.error.textContent = ""
    session.error.style.display = "none"
    updateSelection(null)
    showOverlayMessage(session, "请重新拖动选择截图区域。", "success")
  })

  session.copyButton.addEventListener("click", async () => {
    if (!selectedRegion) return
    await copySelectedScreenshot(payload, selectedRegion, session)
  })

  session.downloadButton.addEventListener("click", async () => {
    if (!selectedRegion) return
    const region = selectedRegion
    await runScreenshotAction(session, session.downloadButton, "保存中…", async () => {
      const { croppedDataUrl } = await captureSelectedScreenshot(
        payload,
        region,
        session
      )
      downloadScreenshot(croppedDataUrl)
      showOverlayMessage(session, "截图已交给浏览器下载。", "success")
    })
  })

  session.sendButton.addEventListener("click", async () => {
    if (!selectedRegion) return
    const region = selectedRegion
    await runScreenshotAction(session, session.sendButton, "发送中…", async () => {
      await sendScreenshotToAI(payload, region, session)
    })
  })

  const cleanup = cleanupOverlay
  session.root.addEventListener("aviso-cleanup", () => {
    session.root.removeEventListener("pointerdown", onPointerDown)
    session.root.removeEventListener("pointermove", onPointerMove)
    session.root.removeEventListener("pointerup", onPointerUp)
    session.root.removeEventListener("dblclick", onDoubleClick, true)
    document.removeEventListener("keydown", onKeyDown)
  })

  return cleanup
}

async function copySelectedScreenshot(
  payload: StartPayload,
  region: ScreenshotRegion,
  session: OverlaySession
) {
  await runScreenshotAction(session, session.copyButton, "复制中…", async () => {
    const capturePromise = captureSelectedScreenshot(payload, region, session, {
      restoreOverlay: false
    })
    await copyScreenshotToClipboard(capturePromise)
    cleanupOverlay()
  })
}

async function captureSelectedScreenshot(
  payload: StartPayload,
  region: ScreenshotRegion,
  session: OverlaySession,
  options: CaptureOptions = {}
): Promise<{
  croppedDataUrl: string
  timing: StartPayload["timing"]
}> {
  const captureTiming = markTiming(payload.timing, "screenshotCaptureStartedAt")
  logTiming("screenshot_capture_start", payload.requestId, captureTiming, {
    regionAreaBucket: bucketRegionArea(region)
  })

  const previousVisibility = session.root.style.visibility
  session.root.style.visibility = "hidden"

  try {
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

    return { croppedDataUrl, timing }
  } finally {
    if (options.restoreOverlay !== false) {
      session.root.style.visibility = previousVisibility
    }
  }
}

async function sendScreenshotToAI(
  payload: StartPayload,
  region: ScreenshotRegion,
  session: OverlaySession
) {
  const { croppedDataUrl, timing } = await captureSelectedScreenshot(
    payload,
    region,
    session
  )

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

async function copyScreenshotToClipboard(
  capturePromise: Promise<{ croppedDataUrl: string }>
): Promise<void> {
  if (!navigator.clipboard?.write || !("ClipboardItem" in window)) {
    throw new Error("当前浏览器不支持直接复制图片，请改用下载。")
  }

  let captureError: unknown
  const blobPromise = capturePromise
    .then(({ croppedDataUrl }) => dataUrlToBlob(croppedDataUrl))
    .catch((err) => {
      captureError = err
      throw err
    })

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blobPromise
      })
    ])
  } catch (err) {
    if (captureError) {
      throw captureError
    }
    throw new Error(
      "复制图片失败：Chrome 可能限制了异步截图写入剪贴板，请改用下载图片。"
    )
  }
}

function downloadScreenshot(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `aviso-screenshot-${formatTimestamp(new Date())}.png`
  anchor.style.display = "none"
  document.documentElement.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ""] = dataUrl.split(",", 2)
  const mediaType = header.match(/^data:([^;]+);base64$/)?.[1] ?? "image/png"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mediaType })
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-")
}

async function runScreenshotAction(
  session: OverlaySession,
  activeButton: HTMLButtonElement,
  busyLabel: string,
  action: () => Promise<void>
) {
  const buttons = [
    session.copyButton,
    session.downloadButton,
    session.retryButton,
    session.sendButton,
    session.cancelButton
  ]
  const previousHtml = new Map<HTMLButtonElement, string>()
  buttons.forEach((button) => {
    previousHtml.set(button, button.innerHTML)
    button.disabled = true
  })
  activeButton.textContent = busyLabel
  session.error.textContent = ""
  session.error.style.display = "none"

  try {
    await action()
  } catch (err) {
    session.root.style.visibility = "visible"
    showOverlayMessage(
      session,
      err instanceof Error ? err.message : String(err),
      "error"
    )
  } finally {
    if (!activeSession) return
    buttons.forEach((button) => {
      button.disabled = false
      button.innerHTML = previousHtml.get(button) ?? button.innerHTML
    })
  }
}

function showOverlayMessage(
  session: OverlaySession,
  message: string,
  tone: "success" | "error"
) {
  const ui = getScreenshotThemeTokens()
  session.error.style.color = tone === "success" ? ui.accent : ui.danger
  session.error.style.display = "block"
  session.error.textContent = message
}

function createOverlay(): OverlaySession {
  const ui = getScreenshotThemeTokens()
  const root = document.createElement("div")
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: ui.overlay,
    fontFamily: aviso.font
  })

  const hint = document.createElement("div")
  hint.textContent = "拖动选择截图区域，按 Esc 取消"
  Object.assign(hint.style, {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 12px",
    borderRadius: `${aviso.radiusSm}px`,
    background: ui.surface,
    border: `1px solid ${ui.line}`,
    color: ui.text,
    fontSize: "13px",
    boxShadow: ui.toolbarShadow,
    pointerEvents: "none"
  })

  const rect = document.createElement("div")
  Object.assign(rect.style, {
    display: "none",
    position: "fixed",
    border: `2px solid ${ui.accent}`,
    background: "transparent",
    boxShadow: `0 0 0 9999px ${ui.overlay}`,
    pointerEvents: "none"
  })

  const panel = document.createElement("div")
  Object.assign(panel.style, {
    display: "none",
    position: "fixed",
    gap: "6px",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    width: "max-content",
    maxWidth: "min(520px, calc(100vw - 24px))",
    padding: "4px 6px",
    borderRadius: `${aviso.radiusMd}px`,
    background: ui.surface,
    border: `1px solid ${ui.line}`,
    boxShadow: ui.toolbarShadow
  })

  const copyButton = createButton("复制图片", "copy", false, ui)
  const downloadButton = createButton("下载图片", "download", false, ui)
  const retryButton = createButton("重选", "retry", false, ui)
  const sendButton = createButton("发送给 AI", "send", false, ui)
  const cancelButton = createButton("取消", "cancel", false, ui)
  const error = document.createElement("div")
  Object.assign(error.style, {
    display: "none",
    flex: "0 1 100%",
    width: "100%",
    maxWidth: "min(520px, calc(100vw - 32px))",
    color: ui.danger,
    fontSize: "13px",
    lineHeight: "1.38",
    textAlign: "left",
    overflowWrap: "anywhere",
    padding: "7px 8px",
    marginTop: "2px",
    borderRadius: `${aviso.radiusSm}px`,
    background: ui.surface2
  })

  panel.append(
    copyButton,
    downloadButton,
    retryButton,
    sendButton,
    cancelButton,
    error
  )
  const style = document.createElement("style")
  style.textContent = getScreenshotStyleText(ui)
  root.append(style, hint, rect, panel)

  return {
    root,
    hint,
    rect,
    panel,
    error,
    style,
    copyButton,
    downloadButton,
    retryButton,
    sendButton,
    cancelButton
  }
}

function createButton(
  label: string,
  icon: ScreenshotButtonIcon,
  primary = false,
  ui: AvisoThemeTokens = getScreenshotThemeTokens()
): HTMLButtonElement {
  const button = document.createElement("button")
  button.innerHTML = `${renderButtonIcon(icon)}<span>${label}</span>`
  button.setAttribute("aria-label", label)
  button.className = "aviso-screenshot-button"
  button.dataset.primary = primary ? "true" : "false"
  Object.assign(button.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    minWidth: "64px",
    height: "30px",
    borderRadius: `${aviso.radiusSm}px`,
    border: "none",
    background: primary ? ui.accent : "transparent",
    color: primary ? ui.accentText : ui.text2,
    fontFamily: aviso.font,
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
    padding: "0 9px",
    whiteSpace: "nowrap"
  })
  return button
}

function getScreenshotStyleText(ui: AvisoThemeTokens): string {
  return `
    .aviso-screenshot-button {
      transition: background .15s ${aviso.ease}, color .15s ${aviso.ease}, transform .15s ${aviso.ease};
    }
    .aviso-screenshot-button:hover:not(:disabled) {
      background: ${ui.buttonHover} !important;
    }
    .aviso-screenshot-button:active:not(:disabled) {
      transform: translateY(1px);
    }
    .aviso-screenshot-button:focus-visible {
      outline: 2px solid ${ui.accent};
      outline-offset: 2px;
      box-shadow: ${ui.focusRing};
    }
    .aviso-screenshot-button:disabled {
      cursor: not-allowed !important;
      opacity: .55;
    }
  `
}

function applyScreenshotTheme(session: OverlaySession, ui: AvisoThemeTokens) {
  Object.assign(session.root.style, {
    background:
      session.rect.style.display === "none" ? ui.overlay : "transparent",
    fontFamily: aviso.font
  })
  Object.assign(session.hint.style, {
    background: ui.surface,
    border: `1px solid ${ui.line}`,
    color: ui.text,
    boxShadow: ui.toolbarShadow
  })
  Object.assign(session.rect.style, {
    border: `2px solid ${ui.accent}`,
    background: "transparent",
    boxShadow: `0 0 0 9999px ${ui.overlay}`
  })
  Object.assign(session.panel.style, {
    background: ui.surface,
    border: `1px solid ${ui.line}`,
    boxShadow: ui.toolbarShadow
  })
  Object.assign(session.error.style, {
    background: ui.surface2
  })
  session.style.textContent = getScreenshotStyleText(ui)
  ;[
    session.copyButton,
    session.downloadButton,
    session.retryButton,
    session.sendButton,
    session.cancelButton
  ].forEach((button) => {
    const primary = button.dataset.primary === "true"
    Object.assign(button.style, {
      background: primary ? ui.accent : "transparent",
      color: primary ? ui.accentText : ui.text2
    })
  })
}

function renderButtonIcon(icon: ScreenshotButtonIcon): string {
  const paths: Record<ScreenshotButtonIcon, string> = {
    copy: '<path d="M8 8.5h7.5v8H8z"/><path d="M5 13.5V5h8.5"/>',
    download: '<path d="M10 4.5v8"/><path d="m6.5 9 3.5 3.5L13.5 9"/><path d="M5 16h10"/>',
    retry: '<path d="M5.5 8a6 6 0 0 1 10.2-2.7"/><path d="M15.8 3.8v4h-4"/><path d="M14.5 12a6 6 0 0 1-10.2 2.7"/><path d="M4.2 16.2v-4h4"/>',
    send: '<path d="M4.5 10 16 4.5l-3.5 11L10 11.5 6.5 14z"/><path d="m10 11.5 2.5-3"/>',
    cancel: '<path d="m6 6 8 8"/><path d="m14 6-8 8"/>'
  }

  return `<svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto">${paths[icon]}</svg>`
}

function isPointInRegion(
  point: { clientX: number; clientY: number },
  region: ScreenshotRegion
): boolean {
  return (
    point.clientX >= region.x &&
    point.clientX <= region.x + region.width &&
    point.clientY >= region.y &&
    point.clientY <= region.y + region.height
  )
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
