import type { AIRequestPayload, ScreenshotRegion } from "~types/messages"
import type { ModelRoute } from "~utils/model-registry"

export type ScreenshotImageSizeBucket =
  | "0-250kb"
  | "250kb-1mb"
  | "1mb-3mb"
  | "3mb+"

export type ScreenshotToolbarPosition = {
  left: number
  top: number
}

const MIN_REGION_SIZE = 12

export function normalizeScreenshotRegion(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  viewportWidth: number,
  viewportHeight: number
): ScreenshotRegion | null {
  const x1 = clamp(Math.min(startX, endX), 0, viewportWidth)
  const y1 = clamp(Math.min(startY, endY), 0, viewportHeight)
  const x2 = clamp(Math.max(startX, endX), 0, viewportWidth)
  const y2 = clamp(Math.max(startY, endY), 0, viewportHeight)
  const width = Math.round(x2 - x1)
  const height = Math.round(y2 - y1)

  if (width < MIN_REGION_SIZE || height < MIN_REGION_SIZE) return null

  return {
    x: Math.round(x1),
    y: Math.round(y1),
    width,
    height
  }
}

export function bucketScreenshotDataUrl(
  dataUrl: string
): ScreenshotImageSizeBucket {
  const bytes = estimateDataUrlBytes(dataUrl)
  if (bytes <= 250 * 1024) return "0-250kb"
  if (bytes <= 1024 * 1024) return "250kb-1mb"
  if (bytes <= 3 * 1024 * 1024) return "1mb-3mb"
  return "3mb+"
}

export function isSupportedScreenshotDataUrl(dataUrl: string): boolean {
  return /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(dataUrl)
}

export function getScreenshotVisionBlockReason(
  route: ModelRoute
): string | null {
  if (!route.provider.supportsVision || !route.model.supportsVision) {
    return "当前模型不支持截图理解，请切换到支持视觉输入的模型。"
  }

  if (route.provider.visionSupport === "model-dependent") {
    return "当前豆包 / 火山方舟接入点尚未验证截图理解，请切换到已确认支持视觉输入的模型。"
  }

  return null
}

export function getImageInputBlockReason(
  payload: Pick<AIRequestPayload, "operation" | "imageSource" | "srcUrl">,
  route: ModelRoute
): string | null {
  const hasImageInput =
    payload.operation === "image_explain" &&
    (Boolean(payload.srcUrl) ||
      payload.imageSource === "remote-image" ||
      payload.imageSource === "screenshot-region")
  if (!hasImageInput) return null

  if (!route.provider.supportsVision || !route.model.supportsVision) {
    return "当前模型不支持图片理解，请切换到支持视觉输入的模型。"
  }

  if (route.provider.visionSupport === "model-dependent") {
    return `当前 ${route.provider.displayName} 模型尚未验证图片理解，请切换到已确认支持视觉输入的模型。`
  }

  return null
}

export function normalizeScreenshotCaptureError(
  error: unknown,
  pageUrl?: string
): string {
  const message = error instanceof Error ? error.message : String(error)
  const isPermissionError =
    /activeTab|<all_urls>|all_urls|permission is required/i.test(message)
  const isLocalFile = (pageUrl ?? "").startsWith("file://")

  if (isPermissionError) {
    return isLocalFile
      ? "当前本地文件页面没有截图权限。请在 Chrome 扩展详情里开启“允许访问文件网址”，然后从扩展按钮或右键菜单重新触发截图。"
      : "当前页面没有截图权限。请从扩展按钮或右键菜单重新触发截图后再复制；不要从页面内快捷入口直接开始截图。"
  }

  return message || "截图失败，请重新尝试。"
}

export function clampScreenshotToolbarPosition(
  region: ScreenshotRegion,
  viewport: { width: number; height: number },
  toolbar: { width: number; height: number },
  margin = 12,
  gap = 10
): ScreenshotToolbarPosition {
  const preferredLeft = region.x + region.width / 2 - toolbar.width / 2
  const belowTop = region.y + region.height + gap
  const insideBottomTop = region.y + region.height - toolbar.height - gap
  const aboveTop = region.y - toolbar.height - gap
  const maxLeft = Math.max(margin, viewport.width - toolbar.width - margin)
  const maxTop = Math.max(margin, viewport.height - toolbar.height - margin)
  const hasRoomBelow =
    region.y + region.height + gap + toolbar.height <= viewport.height - margin
  const hasRoomInsideBottom = region.height >= toolbar.height + gap * 2
  const top = hasRoomBelow
    ? belowTop
    : hasRoomInsideBottom
      ? insideBottomTop
      : aboveTop

  return {
    left: clamp(preferredLeft, margin, maxLeft),
    top: clamp(top, margin, maxTop)
  }
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? ""
  return Math.floor((base64.length * 3) / 4)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
