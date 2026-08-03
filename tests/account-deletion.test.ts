import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import "./helpers/register-aliases.ts"

const {
  ACCOUNT_DELETION_BACKEND_STATES,
  getAccountDeletionStateLabelKey,
  normalizeAccountDeletionResponse,
  requestAccountDeletion,
  resolveAccountDeletionDialogAction
} = await import("../src/utils/account-deletion.ts")

const {
  HOSTED_SIGN_IN_RESULT_STORAGE_KEY,
  HOSTED_SESSION_STORAGE_KEY
} = await import("../src/utils/hosted-session.ts")

const CONTRACT_STATES = ["accepted", "processing", "completed", "retry"] as const
const BASE_URL = "https://aviso-backend-production.vercel.app/v1"

test("account deletion backend states match the frozen MON-119 contract exactly", () => {
  assert.deepEqual(ACCOUNT_DELETION_BACKEND_STATES, CONTRACT_STATES)

  for (const state of CONTRACT_STATES) {
    assert.equal(normalizeAccountDeletionResponse({ state }), state)
    assert.equal(
      getAccountDeletionStateLabelKey(state),
      `popup.accountDeletion.state.${state}`
    )
  }

  assert.equal(normalizeAccountDeletionResponse({ state: "deleted" }), "retry")
  assert.equal(normalizeAccountDeletionResponse(null), "retry")
})

test("account deletion dialog requires explicit scope review and a second confirmation before submit", () => {
  assert.deepEqual(
    resolveAccountDeletionDialogAction("open", { step: "idle" }),
    { closeDialog: false, nextStep: "scope", submit: false }
  )
  assert.deepEqual(
    resolveAccountDeletionDialogAction("confirm", { step: "scope" }),
    { closeDialog: false, nextStep: "scope", submit: false }
  )
  assert.deepEqual(
    resolveAccountDeletionDialogAction("continue", { step: "scope" }),
    { closeDialog: false, nextStep: "second_confirm", submit: false }
  )
  assert.deepEqual(
    resolveAccountDeletionDialogAction("confirm", { step: "second_confirm" }),
    { closeDialog: false, nextStep: "processing", submit: true }
  )
  assert.deepEqual(
    resolveAccountDeletionDialogAction("cancel", { step: "second_confirm" }),
    { closeDialog: true, nextStep: "idle", submit: false }
  )
})

test("account deletion posts only the authenticated backend endpoint and clears hosted state after accepted states", async () => {
  for (const state of ["accepted", "processing", "completed"] as const) {
    const storage = installHostedChromeStorageForTest(createHostedSeed())
    const calls: Array<{ input: string; init?: RequestInit }> = []

    try {
      const result = await requestAccountDeletion({
        fetchImpl: async (input, init) => {
          calls.push({ input: String(input), init })
          return Response.json({ state })
        }
      })

      assert.equal(result.kind, "backend")
      assert.equal(result.state, state)
      assert.equal(result.clearedHostedState, true)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].input, `${BASE_URL}/account/deletion`)
      assert.equal(calls[0].init?.method, "POST")
      assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
        confirm: true
      })

      const headers = new Headers(calls[0].init?.headers)
      assert.equal(headers.get("Authorization"), "Bearer hosted-token")
      assert.equal(headers.get("Content-Type"), "application/json")
      assert.equal(headers.get("Accept"), "application/json")
      assert.equal(Object.hasOwn(storage.localStore, HOSTED_SESSION_STORAGE_KEY), false)
      assert.equal(
        Object.hasOwn(storage.localStore, HOSTED_SIGN_IN_RESULT_STORAGE_KEY),
        false
      )
      assert.deepEqual(storage.localStore.contextai_api_keys, {
        openai: "must-stay"
      })
    } finally {
      storage.restore()
    }
  }
})

test("account deletion retry and transient failures do not clear a usable hosted session", async () => {
  for (const fetchImpl of [
    async () => Response.json({ state: "retry" }),
    async () => new Response("server unavailable", { status: 503 }),
    async () => {
      throw new TypeError("network down")
    }
  ] satisfies Array<typeof fetch>) {
    const storage = installHostedChromeStorageForTest(createHostedSeed())

    try {
      const result = await requestAccountDeletion({ fetchImpl })

      assert.equal(result.state, "retry")
      assert.equal(result.clearedHostedState, false)
      assert.equal(Object.hasOwn(storage.localStore, HOSTED_SESSION_STORAGE_KEY), true)
      assert.equal(
        Object.hasOwn(storage.localStore, HOSTED_SIGN_IN_RESULT_STORAGE_KEY),
        true
      )
      assert.deepEqual(storage.localStore.contextai_api_keys, {
        openai: "must-stay"
      })
    } finally {
      storage.restore()
    }
  }

  const timeout = installHostedChromeStorageForTest(createHostedSeed())
  try {
    const result = await requestAccountDeletion({
      timeoutMs: 1,
      fetchImpl: async () => new Promise<Response>(() => undefined)
    })

    assert.equal(result.kind, "safe_retry")
    assert.equal(result.state, "retry")
    assert.equal(result.reason, "network")
    assert.equal(result.clearedHostedState, false)
    assert.equal(Object.hasOwn(timeout.localStore, HOSTED_SESSION_STORAGE_KEY), true)
    assert.deepEqual(timeout.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    timeout.restore()
  }
})

test("account deletion clears malformed, expired, and 401 hosted state without touching BYOK", async () => {
  const malformed = installHostedChromeStorageForTest({
    [HOSTED_SESSION_STORAGE_KEY]: {
      session: {
        session_token: "legacy-token",
        expires_at: "2099-01-01T00:00:00.000Z",
        user: { id: "legacy", tier: "free", region: "global" }
      },
      baseUrl: BASE_URL,
      updatedAt: 1
    },
    [HOSTED_SIGN_IN_RESULT_STORAGE_KEY]: {
      status: "expired",
      stage: "custom_session_exchange",
      error: { source: "hosted_backend", code: "unauthorized" },
      updatedAt: 1
    },
    contextai_api_keys: { openai: "must-stay" }
  })

  try {
    let fetched = false
    const result = await requestAccountDeletion({
      fetchImpl: async () => {
        fetched = true
        return Response.json({ state: "accepted" })
      }
    })

    assert.equal(fetched, false)
    assert.equal(result.kind, "local_auth")
    assert.equal(result.reason, "missing_or_expired_session")
    assert.equal(result.clearedHostedState, true)
    assert.equal(Object.hasOwn(malformed.localStore, HOSTED_SESSION_STORAGE_KEY), false)
    assert.equal(
      Object.hasOwn(malformed.localStore, HOSTED_SIGN_IN_RESULT_STORAGE_KEY),
      false
    )
    assert.deepEqual(malformed.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    malformed.restore()
  }

  const expired = installHostedChromeStorageForTest(
    createHostedSeed({ expiresAt: "2026-01-01T00:00:00.000Z" })
  )

  try {
    let fetched = false
    const result = await requestAccountDeletion({
      now: Date.parse("2026-08-03T00:00:00.000Z"),
      fetchImpl: async () => {
        fetched = true
        return Response.json({ state: "accepted" })
      }
    })

    assert.equal(fetched, false)
    assert.equal(result.kind, "local_auth")
    assert.equal(result.reason, "missing_or_expired_session")
    assert.equal(Object.hasOwn(expired.localStore, HOSTED_SESSION_STORAGE_KEY), false)
    assert.deepEqual(expired.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    expired.restore()
  }

  const unauthorized = installHostedChromeStorageForTest(createHostedSeed())

  try {
    const result = await requestAccountDeletion({
      fetchImpl: async () => new Response("unauthorized", { status: 401 })
    })

    assert.equal(result.kind, "local_auth")
    assert.equal(result.reason, "unauthorized")
    assert.equal(result.clearedHostedState, true)
    assert.equal(
      Object.hasOwn(unauthorized.localStore, HOSTED_SESSION_STORAGE_KEY),
      false
    )
    assert.equal(
      Object.hasOwn(unauthorized.localStore, HOSTED_SIGN_IN_RESULT_STORAGE_KEY),
      false
    )
    assert.deepEqual(unauthorized.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    unauthorized.restore()
  }
})

test("account deletion UI wiring exposes scope, second confirmation, and exact backend state labels", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const deletionSource = readFileSync(
    new URL("../src/utils/account-deletion.ts", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /requestAccountDeletion/)
  assert.match(popupSource, /resolveAccountDeletionDialogAction/)
  assert.match(popupSource, /popup\.accountDeletion\.scopeTitle/)
  assert.match(popupSource, /popup\.accountDeletion\.secondConfirmTitle/)
  assert.match(popupSource, /popup\.accountDeletion\.scopeHosted/)
  assert.match(popupSource, /popup\.accountDeletion\.scopeByok/)
  for (const state of CONTRACT_STATES) {
    assert.match(popupSource, new RegExp(`popup\\.accountDeletion\\.state\\.${state}`))
  }

  assert.doesNotMatch(deletionSource, /supabase\.auth\.admin/i)
  assert.doesNotMatch(deletionSource, /service[_-]?role/i)
  assert.doesNotMatch(deletionSource, /\/auth\/v1\/admin/i)
})

function installHostedChromeStorageForTest(seed: Record<string, unknown>) {
  const previousChrome = (globalThis as any).chrome
  const localStore: Record<string, unknown> = { ...seed }

  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: localStore[key] }),
        set: async (value: Record<string, unknown>) => {
          Object.assign(localStore, value)
        },
        remove: async (key: string) => {
          delete localStore[key]
        }
      }
    }
  }

  return {
    localStore,
    restore: () => {
      ;(globalThis as any).chrome = previousChrome
    }
  }
}

function createHostedSeed(
  options: { expiresAt?: string } = {}
): Record<string, unknown> {
  return {
    [HOSTED_SESSION_STORAGE_KEY]: {
      schemaVersion: 2,
      authProvider: "supabase",
      tokenKind: "hosted_bearer",
      session: {
        session_token: "hosted-token",
        expires_at: options.expiresAt ?? "2099-01-01T00:00:00.000Z",
        user: { id: "u-supabase", tier: "free", region: "global" }
      },
      baseUrl: BASE_URL,
      updatedAt: 1
    },
    [HOSTED_SIGN_IN_RESULT_STORAGE_KEY]: {
      schemaVersion: 2,
      authProvider: "supabase",
      status: "expired",
      stage: "session_exchange",
      error: {
        source: "hosted_backend",
        code: "unauthorized",
        httpStatusClass: "4xx"
      },
      updatedAt: 1
    },
    contextai_api_keys: { openai: "must-stay" }
  }
}
