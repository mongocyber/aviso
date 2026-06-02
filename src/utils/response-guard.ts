export const WAITING_MODEL_RESPONSE_TEXT = "等待模型响应…"
export const SLOW_FIRST_CHUNK_MS = 9000
export const SLOW_MODEL_RESPONSE_TEXT = "模型响应较慢，可继续等待或停止。"
export const USER_CANCELLED_ASSISTANT_TEXT = "已停止等待。"

export type SlowResponseHintInput = {
  loading: boolean
  hasFirstChunk: boolean
  elapsedMs: number
  thresholdMs?: number
}

export function shouldShowSlowResponseHint({
  loading,
  hasFirstChunk,
  elapsedMs,
  thresholdMs = SLOW_FIRST_CHUNK_MS
}: SlowResponseHintInput): boolean {
  return loading && !hasFirstChunk && elapsedMs >= thresholdMs
}
