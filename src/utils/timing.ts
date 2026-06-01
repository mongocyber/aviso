export type RequestTiming = {
  triggerAt?: number
  floatingShownAt?: number
  aiRequestSentAt?: number
  backgroundReceivedAt?: number
  pageContentRequestStartedAt?: number
  pageContentReadyAt?: number
  providerRequestStartedAt?: number
  firstChunkAt?: number
  doneAt?: number
}

export function nowMs(): number {
  return Date.now()
}

export function startTiming(): RequestTiming {
  return { triggerAt: nowMs() }
}

export function markTiming(
  timing: RequestTiming | undefined,
  key: keyof RequestTiming,
  at = nowMs()
): RequestTiming {
  return { ...(timing ?? {}), [key]: at }
}

export function logTiming(
  stage: string,
  requestId: string,
  timing: RequestTiming | undefined,
  details: Record<string, unknown> = {}
): void {
  const triggerAt = timing?.triggerAt
  const elapsedMs =
    typeof triggerAt === "number" ? Math.max(0, nowMs() - triggerAt) : undefined

  console.info("[Aviso timing]", {
    stage,
    requestId,
    elapsedMs,
    marks: timing ?? {},
    ...details
  })
}
