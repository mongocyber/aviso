export const WAITING_MODEL_RESPONSE_TEXT = "等待模型响应…"
export const SLOW_FIRST_CHUNK_MS = 2000
export const SLOW_MODEL_RESPONSE_TEXT =
  "请求已发出，模型还在响应。可继续等待、停止，或稍后重试。"
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
