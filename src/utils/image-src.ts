export const UNSUPPORTED_IMAGE_SRC_MESSAGE =
  "这张图片的地址格式暂不支持，请换网页中的 JPG/PNG/WebP 图片再试。"

export const MAX_DATA_IMAGE_URL_CHARS = 8 * 1024 * 1024
export const MAX_DATA_IMAGE_DECODED_BYTES = 6 * 1024 * 1024

export type SupportedDataImageMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"

export type SupportedImageSrc =
  | {
      kind: "remote"
      url: string
    }
  | {
      kind: "base64"
      url: string
      mediaType: SupportedDataImageMediaType
      data: string
    }

const SUPPORTED_DATA_IMAGE_RE =
  /^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/i

export function parseSupportedImageSrc(
  srcUrl?: string
): SupportedImageSrc | null {
  const url = srcUrl?.trim()
  if (!url) return null
  if (url.length > MAX_DATA_IMAGE_URL_CHARS && /^data:/i.test(url)) return null

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return { kind: "remote", url }
      }
    } catch {
      return null
    }
  }

  const match = SUPPORTED_DATA_IMAGE_RE.exec(url)
  if (!match) return null

  const mediaType = normalizeDataImageMediaType(match[1])
  const data = match[2].replace(/\s/g, "")
  if (!isBase64ImageWithinPreDecodeLimit(data)) return null
  const imageBytes = decodeBase64(data)
  if (!imageBytes || !hasImageSignature(imageBytes, mediaType)) return null

  return {
    kind: "base64",
    url: `data:${mediaType};base64,${data}`,
    mediaType,
    data
  }
}

export function isSupportedImageSrc(srcUrl?: string): boolean {
  return parseSupportedImageSrc(srcUrl) !== null
}

export function assertSupportedImageSrc(srcUrl?: string): SupportedImageSrc {
  const parsed = parseSupportedImageSrc(srcUrl)
  if (!parsed) throw new Error(UNSUPPORTED_IMAGE_SRC_MESSAGE)
  return parsed
}

function normalizeDataImageMediaType(
  mediaType: string
): SupportedDataImageMediaType {
  const normalized = mediaType.toLowerCase()
  if (normalized === "image/jpg") return "image/jpeg"
  return normalized as SupportedDataImageMediaType
}

function decodeBase64(data: string): string | null {
  if (!data) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null
  if (data.length % 4 === 1) return null

  try {
    return globalThis.atob(data)
  } catch {
    return null
  }
}

function isBase64ImageWithinPreDecodeLimit(data: string): boolean {
  if (!data) return false
  if (data.length > MAX_DATA_IMAGE_URL_CHARS) return false
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0
  const decodedBytes = Math.floor((data.length * 3) / 4) - padding
  return decodedBytes > 0 && decodedBytes <= MAX_DATA_IMAGE_DECODED_BYTES
}

function hasImageSignature(
  data: string,
  mediaType: SupportedDataImageMediaType
): boolean {
  if (mediaType === "image/png") {
    return (
      data.length >= 8 &&
      byteAt(data, 0) === 0x89 &&
      data.slice(1, 4) === "PNG" &&
      byteAt(data, 4) === 0x0d &&
      byteAt(data, 5) === 0x0a &&
      byteAt(data, 6) === 0x1a &&
      byteAt(data, 7) === 0x0a
    )
  }

  if (mediaType === "image/jpeg") {
    return (
      data.length >= 3 &&
      byteAt(data, 0) === 0xff &&
      byteAt(data, 1) === 0xd8 &&
      byteAt(data, 2) === 0xff
    )
  }

  return (
    data.length >= 12 &&
    data.slice(0, 4) === "RIFF" &&
    data.slice(8, 12) === "WEBP"
  )
}

function byteAt(data: string, index: number): number {
  return data.charCodeAt(index)
}
