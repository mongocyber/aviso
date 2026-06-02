import type { ScreenshotRegion } from "~types/messages"
import type { ModelRoute } from "~utils/model-registry"

export type ScreenshotImageSizeBucket =
  | "0-250kb"
  | "250kb-1mb"
  | "1mb-3mb"
  | "3mb+"

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

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? ""
  return Math.floor((base64.length * 3) / 4)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
