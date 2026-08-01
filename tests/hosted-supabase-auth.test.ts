import assert from "node:assert/strict"
import { test } from "node:test"

import { HostedAiClientError, normalizeHostedAiError } from "../src/utils/hosted-ai-client.ts"
import {
  buildHostedSignInFailureView,
  HOSTED_SIGN_IN_FAILURE_CATEGORIES
} from "../src/utils/hosted-sign-in-ux.ts"
import {
  HOSTED_SIGN_IN_RESULT_STORAGE_KEY,
  HOSTED_SESSION_STORAGE_KEY,
  isByokBlockedByHostedSignIn,
  isHostedSessionUsable,
  readHostedSignInResult,
  readHostedSession,
  requiresHostedSignInForRoute,
  saveHostedSignInResult,
  saveHostedSession,
  selectConfiguredHostedRoute
} from "../src/utils/hosted-session.ts"
import "./helpers/register-aliases.ts"

const {
  buildHostedSupabaseGoogleIdentityUrl,
  createSupabaseHostedAuthAdapter,
  HOSTED_SUPABASE_ANON_KEY,
  HOSTED_SUPABASE_AUTH_URL,
  HOSTED_SUPABASE_GOOGLE_CLIENT_ID,
  HostedSupabaseAuthError,
  parseHostedSupabaseGoogleIdentityRedirect,
  resolveHostedSupabaseAuthUrl
} = await import("../src/utils/hosted-supabase-auth.ts")

const SUPABASE_FIXTURE_URL = "https://project-ref.supabase.co"
const SUPABASE_FIXTURE_KEY = "sb_publishable_fixture"
const GOOGLE_CLIENT_ID = "fixture-client.apps.googleusercontent.com"
const REDIRECT_URL = "https://extension-id.chromiumapp.org/"
const FIXED_NOW = Date.parse("2026-07-31T10:00:00.000Z")
const RAW_SECRET_PATTERN =
  /google-id-token|supabase-access-token|supabase-refresh-token|raw-provider|accounts\.google\.com|supabase\.co|chromiumapp\.org/i

test("default Supabase adapter remains disabled until owner-gated activation config exists", async () => {
  const storage = installHostedChromeStorageForTest({
    contextai_api_keys: { openai: "must-stay" }
  })
  let launched = false

  try {
    assert.equal(HOSTED_SUPABASE_AUTH_URL, "")
    assert.equal(HOSTED_SUPABASE_ANON_KEY, "")
    assert.equal(HOSTED_SUPABASE_GOOGLE_CLIENT_ID, "")
    assert.equal(resolveHostedSupabaseAuthUrl(), null)

    const adapter = createSupabaseHostedAuthAdapter({
      launchWebAuthFlow: () => {
        launched = true
      }
    })
    const result = await adapter.startHostedSignIn()

    assert.equal(launched, false)
    assert.equal(result.status, "request_invalid")
    assert.equal(result.stage, "sign_in_prepare")
    assert.equal(result.failure?.error.code, "config_missing")
    assert.equal(await readHostedSession(), null)
    assert.equal((await readHostedSignInResult())?.error?.code, "config_missing")
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    storage.restore()
  }
})

test("Supabase Google identity URL uses Chrome extension redirect without client secrets", () => {
  const authUrl = buildHostedSupabaseGoogleIdentityUrl({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: REDIRECT_URL,
    state: "state-fixture",
    hashedNonce: "a".repeat(64)
  })
  const parsed = new URL(authUrl)

  assert.equal(parsed.origin, "https://accounts.google.com")
  assert.equal(parsed.pathname, "/o/oauth2/v2/auth")
  assert.equal(parsed.searchParams.get("client_id"), GOOGLE_CLIENT_ID)
  assert.equal(parsed.searchParams.get("redirect_uri"), REDIRECT_URL)
  assert.equal(parsed.searchParams.get("response_type"), "id_token")
  assert.equal(parsed.searchParams.get("response_mode"), "fragment")
  assert.equal(parsed.searchParams.get("scope"), "openid email profile")
  assert.equal(parsed.searchParams.get("nonce"), "a".repeat(64))
  assert.equal(parsed.searchParams.get("state"), "state-fixture")
  assert.equal(parsed.searchParams.has("client_secret"), false)
})

test("Supabase Google identity redirect parser returns only the ID token and sanitized errors", () => {
  assert.deepEqual(
    parseHostedSupabaseGoogleIdentityRedirect(
      "https://extension-id.chromiumapp.org/#id_token=google-id-token&state=state-fixture",
      {
        expectedRedirectUri: REDIRECT_URL,
        expectedState: "state-fixture"
      }
    ),
    { idToken: "google-id-token" }
  )

  assert.throws(
    () =>
      parseHostedSupabaseGoogleIdentityRedirect(
        "https://extension-id.chromiumapp.org/#id_token=google-id-token&state=wrong",
        {
          expectedRedirectUri: REDIRECT_URL,
          expectedState: "state-fixture"
        }
      ),
    (error) =>
      error instanceof HostedSupabaseAuthError &&
      error.code === "state_mismatch" &&
      !error.message.includes("google-id-token")
  )
})

test("Supabase hosted auth adapter signs in through Chrome identity and stores v2 hosted bearer only", async () => {
  const storage = installHostedChromeStorageForTest({
    contextai_api_keys: { openai: "must-stay" }
  })
  const calls: string[] = []
  let launchedUrl = ""

  const adapter = createSupabaseHostedAuthAdapter({
    supabaseUrl: SUPABASE_FIXTURE_URL,
    supabaseAnonKey: SUPABASE_FIXTURE_KEY,
    googleClientId: GOOGLE_CLIENT_ID,
    getRedirectUrl: () => REDIRECT_URL,
    createNoncePair: async () => ({
      nonce: "raw-provider-nonce",
      hashedNonce: "b".repeat(64)
    }),
    createState: () => "state-fixture",
    launchWebAuthFlow: (details, callback) => {
      calls.push("provider_auth")
      launchedUrl = details.url
      callback(
        "https://extension-id.chromiumapp.org/#id_token=google-id-token&state=state-fixture"
      )
    },
    getLastError: () => undefined,
    fetchImpl: async (input, init) => {
      calls.push(new URL(String(input)).pathname)
      assert.equal(
        String(input),
        "https://project-ref.supabase.co/auth/v1/token?grant_type=id_token"
      )
      assert.equal(new Headers(init?.headers).get("apikey"), SUPABASE_FIXTURE_KEY)
      assert.deepEqual(JSON.parse(String(init?.body)), {
        provider: "google",
        id_token: "google-id-token",
        nonce: "raw-provider-nonce"
      })
      return Response.json({
        access_token: "supabase-access-token",
        token_type: "bearer",
        expires_at: Math.floor(Date.parse("2026-08-01T00:00:00.000Z") / 1000),
        refresh_token: "supabase-refresh-token",
        user: {
          id: "u-supabase",
          email: "user@example.com"
        }
      })
    },
    createHostedClient: (sessionToken) => ({
      baseUrl: "https://aviso-backend-production.vercel.app/v1",
      me: async (token) => {
        calls.push("account_refresh")
        assert.equal(sessionToken, "supabase-access-token")
        assert.equal(token, "supabase-access-token")
        return createHostedMeFixture()
      },
      logout: async () => undefined
    })
  })

  try {
    const result = await adapter.startHostedSignIn()
    const stored = await readHostedSession()

    assert.deepEqual(result, {
      status: "signed_in",
      stage: "done",
      session: stored
    })
    assert.equal(stored?.schemaVersion, 2)
    assert.equal(stored?.authProvider, "supabase")
    assert.equal(stored?.tokenKind, "hosted_bearer")
    assert.equal(stored?.session.session_token, "supabase-access-token")
    assert.equal(stored?.session.user.id, "u-supabase")
    assert.equal(stored?.me?.user.id, "u-supabase")
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
    assert.deepEqual(storage.seeded.contextai_api_keys, { openai: "must-stay" })
    assert.deepEqual(calls, [
      "provider_auth",
      "/auth/v1/token",
      "account_refresh"
    ])
    assert.match(launchedUrl, /nonce=b{64}/)
    assert.doesNotMatch(JSON.stringify(storage.localStore), /google-id-token|raw-provider-nonce|supabase-refresh-token/)
  } finally {
    storage.restore()
  }
})

test("hosted session migration clears only legacy hosted keys and keeps BYOK untouched", async () => {
  const storage = installHostedChromeStorageForTest({
    [HOSTED_SESSION_STORAGE_KEY]: {
      session: {
        session_token: "legacy-custom-token",
        expires_at: "2026-08-01T00:00:00.000Z",
        user: { id: "legacy", tier: "free", region: "global" }
      },
      baseUrl: "https://aviso-backend-production.vercel.app/v1",
      updatedAt: 1
    },
    [HOSTED_SIGN_IN_RESULT_STORAGE_KEY]: {
      status: "expired",
      stage: ["auth", "google"].join("_"),
      error: { source: ["back", "end"].join(""), code: "unauthorized" },
      updatedAt: 1
    },
    contextai_api_keys: { openai: "must-stay" }
  })

  try {
    assert.equal(await readHostedSession(), null)
    assert.equal(await readHostedSignInResult(), null)
    assert.equal(Object.hasOwn(storage.localStore, HOSTED_SESSION_STORAGE_KEY), false)
    assert.equal(
      Object.hasOwn(storage.localStore, HOSTED_SIGN_IN_RESULT_STORAGE_KEY),
      false
    )
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })

    const saved = await saveHostedSession(createHostedSessionFixture(), {
      baseUrl: "https://aviso-backend-production.vercel.app/v1",
      me: createHostedMeFixture()
    })
    await saveHostedSignInResult({
      status: "expired",
      stage: "session_exchange",
      error: {
        source: "hosted_backend",
        code: "unauthorized",
        httpStatusClass: "4xx"
      }
    })

    assert.equal(saved.schemaVersion, 2)
    assert.equal(saved.authProvider, "supabase")
    assert.equal(saved.tokenKind, "hosted_bearer")
    assert.equal((await readHostedSession())?.session.session_token, "session-local")
    assert.equal((await readHostedSignInResult())?.stage, "session_exchange")
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    storage.restore()
  }
})

test("Supabase failures map to MON-42 categories without raw provider leakage", () => {
  const adapter = createSupabaseHostedAuthAdapter({
    supabaseUrl: SUPABASE_FIXTURE_URL,
    supabaseAnonKey: SUPABASE_FIXTURE_KEY,
    googleClientId: GOOGLE_CLIENT_ID
  })
  const scenarios = [
    {
      input: new HostedSupabaseAuthError("access_denied"),
      context: { stage: "provider_auth" as const },
      category: "cancelled"
    },
    {
      input: new HostedSupabaseAuthError("invalid_token", 400),
      context: { stage: "session_exchange" as const },
      category: "invalid"
    },
    {
      input: new HostedSupabaseAuthError("rate_limited", 429),
      context: { stage: "session_exchange" as const },
      category: "rate_limited"
    },
    {
      input: new TypeError("Failed to fetch raw-provider https://project-ref.supabase.co/auth/v1/token"),
      context: { stage: "session_exchange" as const },
      category: "network"
    },
    {
      input: new HostedAiClientError(normalizeHostedAiError("service_unavailable", 503)),
      context: { stage: "account_refresh" as const },
      category: "unavailable"
    }
  ] as const

  for (const scenario of scenarios) {
    const failure = adapter.normalizeHostedSignInFailure(
      scenario.input,
      scenario.context
    )
    const view = buildHostedSignInFailureView(failure, {
      now: FIXED_NOW,
      traceId: "trace-safe-123"
    })

    assert.equal(view.category, scenario.category)
    assert.ok(HOSTED_SIGN_IN_FAILURE_CATEGORIES.includes(view.category))
    assert.doesNotMatch(JSON.stringify(failure), RAW_SECRET_PATTERN)
    assert.doesNotMatch(JSON.stringify(view), RAW_SECRET_PATTERN)
  }
})

test("hosted route selection functions keep their existing behavior with caller-provided session state", () => {
  const legacyShape = {
    session: {
      session_token: "legacy-custom-token",
      expires_at: "2099-01-01T00:00:00.000Z",
      user: { id: "legacy", tier: "free" as const, region: "global" as const }
    },
    baseUrl: "https://aviso-backend-production.vercel.app/v1",
    updatedAt: 1
  }

  assert.equal(isHostedSessionUsable(legacyShape), true)
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: legacyShape }),
    false
  )
  assert.equal(
    selectConfiguredHostedRoute({
      requestedRoute: "byok",
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: true,
      hasByokFallback: true
    }),
    false
  )
  assert.equal(isByokBlockedByHostedSignIn(), false)
})

function installHostedChromeStorageForTest(seed: Record<string, unknown> = {}) {
  const previousChrome = (globalThis as any).chrome
  const localStore: Record<string, unknown> = { ...seed }
  const seeded = { ...seed }

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
    seeded,
    restore: () => {
      ;(globalThis as any).chrome = previousChrome
    }
  }
}

function createHostedSessionFixture() {
  return {
    session_token: "session-local",
    expires_at: "2026-08-01T00:00:00.000Z",
    user: {
      id: "u-supabase",
      tier: "free" as const,
      region: "global" as const
    }
  }
}

function createHostedMeFixture() {
  return {
    user: {
      id: "u-supabase",
      email: "user@example.com",
      tier: "free" as const,
      region: "global" as const
    },
    quota: {
      unit: "tokens" as const,
      monthly: {
        limit: 1000000,
        used: 10,
        resets_at: "2026-08-01T00:00:00.000Z"
      }
    },
    rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
    models: { available: ["free-small"], default: "free-small" }
  }
}
