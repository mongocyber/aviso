export const AI_STREAM_LIMIT_ERROR_MESSAGE =
  "AI 返回内容过大或响应超时，请缩短输入后重试。"

export const DEFAULT_AI_STREAM_RESOURCE_LIMITS = {
  overallTimeoutMs: 120_000,
  idleTimeoutMs: 30_000,
  maxChunkChars: 65_536,
  maxEventChars: 65_536,
  maxBufferChars: 262_144,
  maxOutputChars: 262_144
} as const

export type AiStreamResourceLimits = Partial<
  typeof DEFAULT_AI_STREAM_RESOURCE_LIMITS
>

export class AiStreamResourceLimitError extends Error {
  constructor() {
    super(AI_STREAM_LIMIT_ERROR_MESSAGE)
    this.name = "AiStreamResourceLimitError"
  }
}

export type AiStreamResourceGuard = ReturnType<typeof createAiStreamResourceGuard>

export function createAiStreamResourceGuard(
  limits: AiStreamResourceLimits = {},
  now: () => number = () => Date.now()
) {
  const resolved = { ...DEFAULT_AI_STREAM_RESOURCE_LIMITS, ...limits }
  const startedAt = now()
  let lastActivityAt = startedAt
  let bufferedChars = 0
  let outputChars = 0
  let terminal = false

  const fail = (): never => {
    throw new AiStreamResourceLimitError()
  }

  const assertActive = () => {
    if (terminal) fail()
  }

  const assertWithinTime = () => {
    const current = now()
    if (current - startedAt > resolved.overallTimeoutMs) fail()
    if (current - lastActivityAt > resolved.idleTimeoutMs) fail()
  }

  return {
    limits: resolved,
    isTerminal(): boolean {
      return terminal
    },
    markTerminal(): void {
      terminal = true
    },
    recordIncomingChunk(chunk: string): void {
      assertActive()
      assertWithinTime()
      if (chunk.length > resolved.maxChunkChars) fail()
      bufferedChars += chunk.length
      if (bufferedChars > resolved.maxBufferChars) fail()
      lastActivityAt = now()
    },
    recordEvent(eventChars: number): void {
      assertActive()
      assertWithinTime()
      if (eventChars > resolved.maxEventChars) fail()
    },
    releaseBuffer(chars: number): void {
      bufferedChars = Math.max(0, bufferedChars - chars)
    },
    recordOutput(text: string): void {
      assertWithinTime()
      outputChars += text.length
      if (outputChars > resolved.maxOutputChars) fail()
      lastActivityAt = now()
    },
    assertCanRead(): void {
      assertActive()
      assertWithinTime()
    }
  }
}

export async function* limitAsyncIterableStream<T>(
  source: AsyncIterable<T>,
  options: {
    limits?: AiStreamResourceLimits
    signal?: AbortSignal
    getEventChars?: (event: T) => number
    getOutputText?: (event: T) => string
  } = {}
): AsyncGenerator<T> {
  const guard = createAiStreamResourceGuard(options.limits)
  const iterator = source[Symbol.asyncIterator]()

  try {
    while (true) {
      guard.assertCanRead()
      const result = await readStreamStepWithTimeout(
        () => iterator.next(),
        guard,
        options.signal
      )
      if (result.done) break
      guard.recordEvent(options.getEventChars?.(result.value) ?? 0)
      const outputText = options.getOutputText?.(result.value) ?? ""
      if (outputText) guard.recordOutput(outputText)
      yield result.value
      if (guard.isTerminal()) break
    }
  } finally {
    await iterator.return?.()
  }
}

export async function readStreamStepWithTimeout<T>(
  read: () => Promise<T>,
  guard: AiStreamResourceGuard,
  signal?: AbortSignal
): Promise<T> {
  guard.assertCanRead()

  if (signal?.aborted) throw new AiStreamResourceLimitError()

  return await new Promise<T>((resolve, reject) => {
    let settled = false
    const timeoutMs = Math.max(
      1,
      Math.min(guard.limits.idleTimeoutMs, guard.limits.overallTimeoutMs)
    )
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new AiStreamResourceLimitError())
    }, timeoutMs)
    const abort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new AiStreamResourceLimitError())
    }

    signal?.addEventListener("abort", abort, { once: true })
    read().then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abort)
        resolve(value)
      },
      (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abort)
        reject(error)
      }
    )
  })
}

export function getJsonEventCharLength(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0
  } catch {
    return 0
  }
}
