import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  deriveAiUnavailableGuidance,
  getAiUnavailableDetailKey,
  getAiUnavailableTitleKey
} from "../src/utils/ai-unavailable-guidance.ts"
import { buildSafeErrorLog, normalizeError } from "../src/utils/errors.ts"
import {
  createHostedAiClient,
  createHostedAiSseParser,
  HostedAiClientError,
  normalizeHostedAiError,
  resolveHostedAiBaseUrl
} from "../src/utils/hosted-ai-client.ts"
import {
  buildHostedGoogleOAuthUrl,
  HostedGoogleOAuthError,
  HOSTED_GOOGLE_OAUTH_CLIENT_ID,
  parseHostedGoogleOAuthRedirect,
  requestHostedGoogleIdentityToken,
  requestHostedGoogleIdToken
} from "../src/utils/hosted-oauth.ts"
import {
  buildHostedAccountQuotaDisplay,
  clearHostedSession,
  deriveHostedAccountStatus,
  getHostedMonthlyQuotaWindow,
  HOSTED_AI_DEFAULT_BASE_URL,
  HOSTED_AI_DEFAULT_MODEL,
  HOSTED_AI_LOCAL_BASE_URL,
  HOSTED_AI_PRODUCTION_BASE_URL,
  HOSTED_AI_PRODUCTION_HOST_PERMISSION,
  HOSTED_AI_PROVIDER_CONFIG_ID,
  HOSTED_SESSION_STORAGE_KEY,
  isByokBlockedByHostedSignIn,
  isHostedAiProviderConfigId,
  isHostedSessionUsable,
  readHostedSession,
  requiresHostedSignInForRoute,
  saveHostedSession,
  selectConfiguredHostedRoute,
  type StoredHostedSession
} from "../src/utils/hosted-session.ts"
import {
  createI18n,
  getI18nMessage,
  normalizeUiLanguageSetting,
  resolveUiLanguage
} from "../src/utils/i18n.ts"
import {
  APPROVED_PROVIDER_HOST_PERMISSIONS,
  buildProviderConfigRoute,
  DEEPSEEK_BASE_URL,
  DEFAULT_MODEL_ID,
  DOUBAO_BASE_URL,
  GEMINI_BASE_URL,
  getReasoningControlBlockReason,
  HUNYUAN_BASE_URL,
  LEGACY_PROVIDER_CONFIG_IDS,
  MODEL_REGISTRY,
  MOONSHOT_BASE_URL,
  OPENROUTER_BASE_URL,
  PROVIDER_PRIMARY_MODEL,
  PROVIDER_REGISTRY,
  resolveFastModelRouteForOperation,
  resolveModelRoute
} from "../src/utils/model-registry.ts"
import {
  AI_STREAM_LIMIT_ERROR_MESSAGE,
  AiStreamResourceLimitError,
  limitAsyncIterableStream
} from "../src/utils/stream-limits.ts"
import "./helpers/register-aliases.ts"

test("popup adds local hosted account controls without hiding provider setup", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.equal(popupSource.includes("BYOK"), false)
  assert.equal(popupSource.includes("Aviso AI"), false)
  assert.equal(popupSource.includes("匿名额度"), false)
  assert.equal(popupSource.includes("订阅"), false)
  assert.match(popupSource, /popup\.tabs\.api/)
  assert.match(popupSource, /popup\.hosted\.title/)
  assert.match(popupSource, /signInHosted/)
  assert.match(popupSource, /refreshHostedAccount/)
  assert.match(popupSource, /signOutHostedLocal/)
  assert.match(popupSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.match(popupSource, /HOSTED_AI_DEFAULT_BASE_URL/)
  assert.match(popupSource, /popup\.addAiService/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.match(popupSource, /popup\.templates\.title/)
  assert.equal(getI18nMessage("popup.tabs.api", "zh-CN"), "AI 服务")
  assert.equal(getI18nMessage("popup.addAiService", "en"), "Add AI service")
  assert.equal(getI18nMessage("popup.hosted.signIn", "en"), "Sign in")
  assert.match(popupSource, /"gemini"/)
  assert.match(popupSource, /"hunyuan"/)
  assert.match(popupSource, /popup\.provider\.gemini/)
  assert.match(popupSource, /popup\.provider\.hunyuan/)
  assert.equal(getI18nMessage("popup.provider.gemini", "en"), "Gemini")
  assert.equal(getI18nMessage("popup.provider.hunyuan", "zh-CN"), "腾讯混元")
  assert.equal(getI18nMessage("popup.templates.title", "zh-CN"), "常用指令")
})

test("popup surfaces explicit account chip and zero-state dual entry (MON-26)", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  // Persistent identity affordance: header account chip + account panel
  assert.match(popupSource, /accountPanelOpen/)
  assert.match(popupSource, /styles\.accountChip/)
  assert.match(popupSource, /styles\.accountPanel/)
  assert.match(popupSource, /hostedQuotaPercent/)
  // Zero-state dual entry (sign in for free quota OR add own key), not a wall
  assert.match(popupSource, /showZeroState/)
  // Zero-state opens on the AI services tab by default (smart default)
  assert.match(popupSource, /hasByokAtLoad/)
  assert.match(popupSource, /popup\.zero\.title/)
  assert.match(popupSource, /popup\.zero\.hosted\.cta/)
  assert.match(popupSource, /popup\.zero\.byok\.cta/)
  // Jargon stays in i18n, not hardcoded in source
  assert.equal(popupSource.includes("BYOK"), false)
  // Subscription stays deferred: no upgrade/checkout entry shipped
  assert.equal(popupSource.includes("升级"), false)
  assert.equal(/\bUpgrade\b/.test(popupSource), false)
  // i18n strings exist for the new surfaces
  assert.equal(getI18nMessage("popup.zero.title", "zh-CN"), "开始使用")
  assert.equal(
    getI18nMessage("popup.zero.hosted.cta", "en"),
    "Sign in / sign up"
  )
  assert.equal(
    getI18nMessage("popup.account.manage", "zh-CN"),
    "在 AI 服务中管理"
  )
})

test("hosted AI base URL is explicit and limited to local or production", () => {
  assert.equal(resolveHostedAiBaseUrl(), null)
  assert.equal(resolveHostedAiBaseUrl(""), null)
  assert.equal(resolveHostedAiBaseUrl("https://api.aviso.app/v1"), null)
  assert.equal(resolveHostedAiBaseUrl("http://example.com/v1"), null)
  assert.equal(
    resolveHostedAiBaseUrl("https://aviso-backend-production.vercel.app"),
    null
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://aviso-backend-production.vercel.app/v1"),
    null
  )
  assert.equal(
    resolveHostedAiBaseUrl("https://aviso-backend-staging.vercel.app/v1/"),
    null
  )
  assert.equal(
    resolveHostedAiBaseUrl("https://aviso-backend-production.vercel.app/v1/"),
    HOSTED_AI_PRODUCTION_BASE_URL
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://127.0.0.1:3000/v1/"),
    "http://127.0.0.1:3000/v1"
  )
  assert.equal(
    resolveHostedAiBaseUrl("http://localhost:3000/v1"),
    "http://localhost:3000/v1"
  )
})

test("hosted Google OAuth builds id-token auth URL without client secret", () => {
  const authUrl = buildHostedGoogleOAuthUrl({
    redirectUri: "https://extension-id.chromiumapp.org/",
    nonce: "nonce-1",
    state: "state-1"
  })
  const parsed = new URL(authUrl)

  assert.equal(parsed.origin, "https://accounts.google.com")
  assert.equal(parsed.pathname, "/o/oauth2/v2/auth")
  assert.equal(parsed.searchParams.get("client_id"), HOSTED_GOOGLE_OAUTH_CLIENT_ID)
  assert.equal(parsed.searchParams.get("redirect_uri"), "https://extension-id.chromiumapp.org/")
  assert.equal(parsed.searchParams.get("response_type"), "id_token")
  assert.equal(parsed.searchParams.get("response_mode"), "fragment")
  assert.equal(parsed.searchParams.get("scope"), "openid email profile")
  assert.equal(parsed.searchParams.get("prompt"), "select_account")
  assert.equal(parsed.searchParams.get("nonce"), "nonce-1")
  assert.equal(parsed.searchParams.get("state"), "state-1")
  assert.equal(parsed.searchParams.has("client_secret"), false)
})

test("hosted Google OAuth parses redirect id token and sanitizes failures", async () => {
  assert.equal(
    parseHostedGoogleOAuthRedirect(
      "https://extension-id.chromiumapp.org/#id_token=header.payload.sig&state=state-1",
      {
        expectedRedirectUri: "https://extension-id.chromiumapp.org/",
        expectedState: "state-1"
      }
    ),
    "header.payload.sig"
  )

  assert.throws(
    () =>
      parseHostedGoogleOAuthRedirect(
        "https://extension-id.chromiumapp.org/#id_token=secret-token&state=wrong",
        {
          expectedRedirectUri: "https://extension-id.chromiumapp.org/",
          expectedState: "state-1"
        }
      ),
    (error) =>
      error instanceof HostedGoogleOAuthError &&
      error.code === "state_mismatch" &&
      !error.message.includes("secret-token")
  )

  let launchedUrl = ""
  const token = await requestHostedGoogleIdToken({
    getRedirectUrl: () => "https://extension-id.chromiumapp.org/",
    nonce: "nonce-1",
    state: "state-1",
    getLastError: () => undefined,
    launchWebAuthFlow: (details, callback) => {
      launchedUrl = details.url
      callback(
        "https://extension-id.chromiumapp.org/#id_token=header.payload.sig&state=state-1"
      )
    }
  })

  assert.equal(token, "header.payload.sig")
  assert.match(launchedUrl, /response_type=id_token/)
  assert.doesNotMatch(launchedUrl, /client_secret/)

  const identity = await requestHostedGoogleIdentityToken({
    getRedirectUrl: () => "https://extension-id.chromiumapp.org/",
    nonce: "nonce-2",
    state: "state-2",
    getLastError: () => undefined,
    launchWebAuthFlow: (_details, callback) => {
      callback(
        "https://extension-id.chromiumapp.org/#id_token=identity.payload.sig&state=state-2"
      )
    }
  })
  assert.deepEqual(identity, {
    idToken: "identity.payload.sig",
    nonce: "nonce-2"
  })
})

test("hosted AI client exposes auth, logout, me, and chat with scoped headers", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  const responseBody = `data: {"delta":"hello"}\n\ndata: {"done":true,"usage":{"tokens_in":1,"tokens_out":2}}\n\n`
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input, init })

    if (String(input).endsWith("/auth/logout")) {
      return new Response(null, { status: 204 })
    }

    if (String(input).endsWith("/chat")) {
      return new Response(responseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    }

    if (String(input).endsWith("/auth/google")) {
      return Response.json({
        session_token: "session-local",
        expires_at: "2026-06-18T00:00:00.000Z",
        user: {
          id: "u1",
          email: "u@example.com",
          tier: "free",
          region: "global"
        }
      })
    }

    return Response.json({
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free",
        region: "global"
      },
      quota: {
        unit: "tokens",
        monthly: {
          limit: 1000000,
          used: 10,
          resets_at: "2026-07-01T00:00:00.000Z"
        }
      },
      rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
      models: { available: ["free-small"], default: "free-small" }
    })
  }

  const client = createHostedAiClient({
    baseUrl: "http://127.0.0.1:3000/v1",
    fetchImpl,
    sessionToken: "session-local",
    createIdempotencyKey: () => "idem-local"
  })

  await client.authGoogle({
    id_token: "mock-id-token",
    nonce: "nonce-1234567890"
  })
  await client.logout()
  await client.me()
  const events = []
  for await (const event of client.chatStream({
    operation: "translate",
    input: "hello",
    context: "selection",
    model: "free-small"
  })) {
    events.push(event)
  }

  assert.deepEqual(events, [
    { type: "delta", delta: "hello" },
    { type: "done", usage: { tokens_in: 1, tokens_out: 2 } }
  ])

  const chatCall = calls.find((call) => String(call.input).endsWith("/chat"))
  assert.ok(chatCall)
  const authCall = calls.find((call) =>
    String(call.input).endsWith("/auth/google")
  )
  assert.ok(authCall)
  assert.deepEqual(JSON.parse(String(authCall.init?.body)), {
    id_token: "mock-id-token",
    nonce: "nonce-1234567890"
  })
  const headers = new Headers(chatCall.init?.headers)
  assert.equal(headers.get("Authorization"), "Bearer session-local")
  assert.equal(headers.get("Idempotency-Key"), "idem-local")
  assert.equal(headers.get("Accept"), "text/event-stream")
  assert.equal(headers.has("X-Install-Id"), false)
})

test("hosted AI SSE parser handles chunked delta, done, and error events", () => {
  const parser = createHostedAiSseParser()
  assert.deepEqual(parser.push('data: {"delta":"hel'), [])
  assert.deepEqual(parser.push('lo"}\n\n'), [{ type: "delta", delta: "hello" }])
  assert.deepEqual(parser.push('data: {"done":true}\n\n'), [{ type: "done" }])
  assert.deepEqual(parser.finish(), [])

  const errorParser = createHostedAiSseParser()
  assert.deepEqual(
    errorParser.push(
      'data: {"error":{"code":"quota_exceeded","message":"raw backend detail"},"done":true}\n\n'
    ),
    [
      {
        type: "error",
        error: normalizeHostedAiError("quota_exceeded")
      }
    ]
  )
  assert.throws(
    () => errorParser.push('data: {"done":true}\n\n'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      return true
    }
  )
})

test("hosted AI SSE parser rejects oversized chunks and accumulated output safely", () => {
  const chunkLimitedParser = createHostedAiSseParser({ maxChunkChars: 8 })
  assert.throws(
    () => chunkLimitedParser.push('data: {"delta":"too-large"}\n\n'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      return true
    }
  )

  const outputLimitedParser = createHostedAiSseParser({ maxOutputChars: 4 })
  assert.throws(
    () => outputLimitedParser.push('data: {"delta":"hello"}\n\n'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      assert.doesNotMatch(err.message, /hello|data:|base64|https?:\/\//)
      return true
    }
  )
})

test("hosted AI stream times out and stops reading after done", async () => {
  const hangingClient = createHostedAiClient({
    baseUrl: "http://127.0.0.1:3000/v1",
    streamLimits: { idleTimeoutMs: 5, overallTimeoutMs: 20 },
    fetchImpl: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"delta":"h'))
          }
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
  })

  await assert.rejects(
    async () => {
      for await (const _event of hangingClient.chatStream({
        operation: "translate",
        input: "hello"
      })) {
        // The stream never completes the first event.
      }
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      assert.doesNotMatch(err.message, /hello|data:/)
      return true
    }
  )

  let pullCount = 0
  let cancelCalled = false
  const client = createHostedAiClient({
    baseUrl: "http://127.0.0.1:3000/v1",
    fetchImpl: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            pullCount += 1
            if (pullCount === 1) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"delta":"ok"}\n\ndata: {"done":true}\n\n'
                )
              )
              return
            }
            controller.enqueue(
              new TextEncoder().encode('data: {"delta":"ignored"}\n\n')
            )
          },
          cancel() {
            cancelCalled = true
          }
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
  })

  const events = []
  for await (const event of client.chatStream({
    operation: "translate",
    input: "hello"
  })) {
    events.push(event)
  }

  assert.deepEqual(events, [
    { type: "delta", delta: "ok" },
    { type: "done" }
  ])
  assert.equal(events.some((event) => event.type === "delta" && event.delta === "ignored"), false)
  assert.ok(pullCount <= 2)
  assert.equal(cancelCalled, true)
})

test("BYOK async stream guard rejects oversized events and idle reads safely", async () => {
  async function* oversizedStream() {
    yield { text: "small" }
    yield { text: "raw provider payload".repeat(20) }
  }

  await assert.rejects(
    async () => {
      for await (const _event of limitAsyncIterableStream(oversizedStream(), {
        limits: { maxEventChars: 32 },
        getEventChars: (event) => JSON.stringify(event).length,
        getOutputText: (event) => event.text
      })) {
        // Guarded stream should reject before yielding the oversized event.
      }
    },
    (err) => {
      assert.ok(err instanceof AiStreamResourceLimitError)
      assert.equal(err.message, AI_STREAM_LIMIT_ERROR_MESSAGE)
      assert.doesNotMatch(err.message, /raw provider payload/)
      return true
    }
  )

  async function* idleStream() {
    await new Promise((resolve) => setTimeout(resolve, 20))
    yield { text: "late" }
  }

  await assert.rejects(
    async () => {
      for await (const _event of limitAsyncIterableStream(idleStream(), {
        limits: { idleTimeoutMs: 5, overallTimeoutMs: 20 },
        getEventChars: (event) => JSON.stringify(event).length
      })) {
        // The first read should time out before any event is yielded.
      }
    },
    AiStreamResourceLimitError
  )
})

test("hosted AI errors normalize to safe frontend categories", async () => {
  assert.deepEqual(normalizeHostedAiError("forbidden_model", 403), {
    code: "forbidden_model",
    status: 403,
    upgrade: undefined,
    category: "model_unavailable",
    action: "fallback_to_default_model",
    userMessage: "当前托管模型不可用，请重试默认模型或切换到自己的 API Key。"
  })
  assert.deepEqual(
    [
      [401, "unauthorized"],
      [402, "quota_exceeded"],
      [403, "forbidden_model"],
      [429, "rate_limited"],
      [502, "provider_error"],
      [503, "service_unavailable"]
    ].map(([status, code]) =>
      normalizeHostedAiError(undefined, status as number).code === code
    ),
    [true, true, true, true, true, true]
  )
  assert.equal(normalizeHostedAiError("unauthorized").action, "sign_in_again")
  assert.equal(
    normalizeHostedAiError("quota_exceeded").action,
    "switch_to_byok"
  )
  assert.equal(normalizeHostedAiError("rate_limited").action, "retry_later")
  assert.equal(
    normalizeHostedAiError("service_unavailable").action,
    "retry_or_switch_to_byok"
  )
  assert.equal(
    normalizeHostedAiError("provider_error").category,
    "provider_unavailable"
  )

  const client = createHostedAiClient({
    baseUrl: "http://localhost:3000/v1",
    fetchImpl: async () =>
      Response.json(
        {
          error: {
            code: "provider_error",
            message: "raw provider payload must not surface"
          }
        },
        { status: 502 }
      )
  })

  await assert.rejects(
    () => client.me("session-local"),
    (err) => {
      assert.ok(err instanceof HostedAiClientError)
      assert.equal(err.message.includes("raw provider payload"), false)
      assert.equal(err.normalized.code, "provider_error")
      assert.equal(err.normalized.status, 502)
      return true
    }
  )
})

test("hosted AI fallback messages stay safe through global error handling", () => {
  for (const status of [401, 402, 403, 429, 502, 503]) {
    const error = new HostedAiClientError(
      normalizeHostedAiError(undefined, status, status === 402)
    )
    const normalized = normalizeError(error)
    assert.equal(normalized, error.normalized.userMessage)
    assert.doesNotMatch(
      normalized,
      /checkout|billing|subscription|upgrade|付费上线|升级|订阅|购买/i
    )
    assert.doesNotMatch(normalized, /raw backend detail|private draft/i)
  }
})

test("hosted unavailable guidance stays specific after sign-in", () => {
  const serviceGuidance = deriveAiUnavailableGuidance(
    "托管服务暂不可用，请稍后重试，或切换到自己的 API Key。"
  )
  const providerGuidance = deriveAiUnavailableGuidance(
    "托管上游服务失败，请稍后重试或切换到自己的 API Key。"
  )

  assert.deepEqual(serviceGuidance, {
    reason: "hosted_service_unavailable"
  })
  assert.deepEqual(providerGuidance, {
    reason: "hosted_provider_unavailable"
  })
  assert.equal(
    getI18nMessage(getAiUnavailableTitleKey(serviceGuidance!), "zh-CN"),
    "Aviso AI 暂不可用"
  )
  assert.equal(
    getI18nMessage(getAiUnavailableDetailKey(providerGuidance!), "zh-CN"),
    "Aviso AI 已收到请求，但上游模型暂时失败。请稍后重试，或切换到自己的服务。"
  )
})

test("hosted chat routing builds local chat payloads only when explicitly selected", async () => {
  const {
    buildHostedChatRequest,
    HOSTED_CHAT_DEFAULT_MODEL,
    shouldUseHostedChatRoute
  } = await import("../src/background/hosted-chat-routing.ts")

  assert.equal(HOSTED_CHAT_DEFAULT_MODEL, "free-small")
  assert.equal(shouldUseHostedChatRoute({ operation: "translate" }), false)
  assert.equal(
    shouldUseHostedChatRoute({
      aiRoute: "byok",
      operation: "translate"
    }),
    false
  )
  assert.equal(
    shouldUseHostedChatRoute({
      aiRoute: "hosted",
      operation: "translate"
    }),
    true
  )

  assert.deepEqual(
    buildHostedChatRequest(
      {
        aiRoute: "hosted",
        operation: "translate",
        context: "selection",
        selectionText: " Hello ",
        systemPrompt: "Translate naturally."
      },
      { targetLanguage: "zh-CN" }
    ),
    {
      operation: "translate",
      input: "Hello",
      context: "selection",
      target_lang: "zh-CN",
      model: "free-small",
      messages: [{ role: "system", content: "Translate naturally." }]
    }
  )

  assert.equal(
    buildHostedChatRequest(
      {
        aiRoute: "hosted",
        operation: "translate",
        context: "selection",
        selectionText: "Today we are introducing new ways to work."
      },
      { targetLanguage: "auto" }
    ).target_lang,
    "zh-CN"
  )
  assert.equal(
    buildHostedChatRequest(
      {
        aiRoute: "hosted",
        operation: "translate",
        context: "selection",
        selectionText: "今天我们发布新的工作方式。"
      },
      { targetLanguage: "auto" }
    ).target_lang,
    "en"
  )

  assert.deepEqual(
    buildHostedChatRequest({
      aiRoute: "hosted",
      trigger: "follow-up",
      operation: "custom",
      userMessage: "What does this mean?",
      priorContext: "Previous safe local context."
    }),
    {
      operation: "custom",
      input: "What does this mean?",
      context: undefined,
      target_lang: undefined,
      model: "free-small",
      messages: [
        { role: "system", content: "Previous safe local context." },
        { role: "user", content: "What does this mean?" }
      ]
    }
  )

  assert.throws(
    () =>
      buildHostedChatRequest({
        aiRoute: "hosted",
        operation: "image_explain",
        imageSource: "screenshot-region",
        selectionText: "describe"
      }),
    HostedAiClientError
  )
})

test("hosted chat refreshes stored quota after a successful stream", async () => {
  const previousFetch = globalThis.fetch
  const storage = installHostedChromeStorageForTest()
  const fetchCalls: string[] = []
  const { runHostedChatRequest } = await import(
    "../src/background/hosted-chat-routing.ts"
  )

  globalThis.fetch = (async (input, init) => {
    fetchCalls.push(String(input))
    const headers = new Headers(init?.headers)
    assert.equal(headers.get("Authorization"), "Bearer session-local")

    if (String(input).endsWith("/chat")) {
      assert.equal(headers.get("Accept"), "text/event-stream")
      return new Response(
        `data: {"delta":"translated"}\n\ndata: {"done":true,"usage":{"tokens_in":2,"tokens_out":3}}\n\n`,
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" }
        }
      )
    }

    if (String(input).endsWith("/me")) {
      return Response.json(createHostedMeFixture(42))
    }

    return Response.json({ error: { code: "internal" } }, { status: 500 })
  }) as typeof fetch

  try {
    await saveHostedSession(createHostedSessionFixture(), {
      baseUrl: HOSTED_AI_LOCAL_BASE_URL,
      me: createHostedMeFixture(0)
    })

    const chunks: Array<{ text: string; done: boolean; kind?: string }> = []
    const perfSummaries: unknown[] = []
    const perfSummary = await runHostedChatRequest(
      {
        aiRoute: "hosted",
        trigger: "inline-translation",
        operation: "translate",
        context: "selection",
        selectionText: "Hello",
        timing: { triggerAt: 1000 }
      },
      (chunk) => chunks.push(chunk),
      {
        requestId: "hosted-success",
        onPerfSummary: (summary) => perfSummaries.push(summary)
      }
    )

    const stored = await readHostedSession()
    assert.deepEqual(chunks, [
      { text: "translated", done: false, kind: "answer" },
      { text: "", done: true, kind: "answer" }
    ])
    assert.deepEqual(perfSummary, perfSummaries[0])
    assert.equal(perfSummary?.provider, "hosted")
    assert.equal(perfSummary?.model_or_endpoint, "free-small")
    assert.equal(perfSummary?.operation, "translate")
    assert.equal(perfSummary?.context_type, "selection")
    assert.equal(perfSummary?.error_category, "none")
    assert.deepEqual(
      fetchCalls.map((url) => new URL(url).pathname),
      ["/v1/chat", "/v1/me"]
    )
    assert.equal(getHostedMonthlyQuotaWindow(stored)?.used, 42)
  } finally {
    globalThis.fetch = previousFetch
    storage.restore()
  }
})

test("hosted quota refresh failure does not fail completed chat", async () => {
  const previousFetch = globalThis.fetch
  const storage = installHostedChromeStorageForTest()
  const { runHostedChatRequest } = await import(
    "../src/background/hosted-chat-routing.ts"
  )

  globalThis.fetch = (async (input) => {
    if (String(input).endsWith("/chat")) {
      return new Response(`data: {"delta":"ok"}\n\ndata: {"done":true}\n\n`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    }

    if (String(input).endsWith("/me")) {
      return Response.json(
        { error: { code: "service_unavailable" } },
        { status: 503 }
      )
    }

    return Response.json({ error: { code: "internal" } }, { status: 500 })
  }) as typeof fetch

  try {
    await saveHostedSession(createHostedSessionFixture(), {
      baseUrl: HOSTED_AI_LOCAL_BASE_URL,
      me: createHostedMeFixture(0)
    })

    const chunks: Array<{ text: string; done: boolean; kind?: string }> = []
    await runHostedChatRequest(
      {
        aiRoute: "hosted",
        operation: "translate",
        context: "selection",
        selectionText: "Hello"
      },
      (chunk) => chunks.push(chunk)
    )

    const stored = await readHostedSession()
    assert.deepEqual(chunks, [
      { text: "ok", done: false, kind: "answer" },
      { text: "", done: true, kind: "answer" }
    ])
    assert.equal(getHostedMonthlyQuotaWindow(stored)?.used, 0)
  } finally {
    globalThis.fetch = previousFetch
    storage.restore()
  }
})

test("Aviso AI service selection stays separate from BYOK provider configs", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )

  assert.equal(HOSTED_AI_PROVIDER_CONFIG_ID, "aviso-hosted-ai")
  assert.equal(HOSTED_AI_DEFAULT_MODEL, "free-small")
  assert.equal(isHostedAiProviderConfigId(HOSTED_AI_PROVIDER_CONFIG_ID), true)
  assert.equal(isHostedAiProviderConfigId("cfg-openai-personal"), false)
  assert.match(
    providerConfigSource,
    /isHostedAiProviderConfigId\(settings\.defaultProviderConfigId\)/
  )
  assert.match(
    providerConfigSource,
    /return HOSTED_AI_PROVIDER_CONFIG_ID/
  )
})

test("popup exposes Aviso AI in default and fast service selectors", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /setDefaultHostedAiService/)
  assert.match(popupSource, /isHostedDefaultSelected/)
  assert.match(popupSource, /HOSTED_AI_PROVIDER_CONFIG_ID/)
  assert.match(popupSource, /popup\.hosted\.optionHelper/)
  assert.match(popupSource, /resolvePopupCurrentModelProviderConfigId/)
  assert.match(popupSource, /explicitDefaultProviderConfigId/)
  assert.match(popupSource, /fastServiceDropdownOpen/)
  assert.match(popupSource, /fastServiceDropdownOption/)
  assert.match(popupSource, /isHostedFastSelected/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.match(
    aiClientSource,
    /isHostedAiProviderConfigId\(settings\.defaultProviderConfigId\)/
  )
  assert.match(aiClientSource, /fastByokConfigSelected/)
  assert.match(aiClientSource, /payload\.aiRoute !== "byok"/)
})

test("popup hosted current-model fallback does not rewrite the saved BYOK default on load", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const loadBlock =
    popupSource.match(
      /useEffect\(\(\) => \{[\s\S]*?Promise\.all\(\[getSettings\(\), getApiKeys\(\), readHostedSession\(\)\]\)[\s\S]*?\n  \}, \[\]\)/
    )?.[0] ?? ""
  const currentModelBlock =
    popupSource.match(
      /const defaultProviderConfigId = resolvePopupCurrentModelProviderConfigId\(\{[\s\S]*?\n  \}\)/
    )?.[0] ?? ""

  assert.match(loadBlock, /setSettings\(normalizedSettings\)/)
  assert.doesNotMatch(loadBlock, /nextDefaultProviderConfigId/)
  assert.doesNotMatch(
    loadBlock,
    /defaultProviderConfigId:\s*nextDefaultProviderConfigId/
  )
  assert.match(
    currentModelBlock,
    /hostedUsable: isHostedSessionUsable\(hostedSession\)/
  )
  assert.match(
    currentModelBlock,
    /explicitByokDefaultId: explicitDefaultProviderConfigId\.current/
  )
})

test("popup refreshes hosted state in the same open instance after sign-in storage changes", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const storageListenerBlock =
    popupSource.match(
      /const onHostedSessionStorageChange = \([\s\S]*?chrome\.storage\.onChanged\.addListener\(onHostedSessionStorageChange\)[\s\S]*?removeListener\(onHostedSessionStorageChange\)/
    )?.[0] ?? ""
  const signInBlock =
    popupSource.match(
      /const signInHosted = async \(\) => \{[\s\S]*?\n  \}\n\n  useEffect/
    )?.[0] ?? ""
  const currentModelBlock =
    popupSource.match(
      /const defaultProviderConfigId = resolvePopupCurrentModelProviderConfigId\(\{[\s\S]*?\n  \}\)/
    )?.[0] ?? ""

  assert.match(popupSource, /HOSTED_SESSION_STORAGE_KEY/)
  assert.match(storageListenerBlock, /areaName !== "local"/)
  assert.match(storageListenerBlock, /changes\[HOSTED_SESSION_STORAGE_KEY\]/)
  assert.match(storageListenerBlock, /refreshHostedSessionStateFromStorage/)
  assert.match(signInBlock, /HOSTED_GOOGLE_SIGN_IN/)
  assert.match(signInBlock, /refreshHostedSessionStateFromStorage/)
  assert.match(signInBlock, /window\.setTimeout/)
  assert.match(currentModelBlock, /hostedUsable: isHostedSessionUsable\(hostedSession\)/)
})

test("popup current model prefers signed-in Aviso AI when BYOK default lacks a key", async () => {
  const { buildProviderConfig, resolvePopupCurrentModelProviderConfigId } =
    await import("../src/utils/provider-configs.ts")
  const byokDefault = buildProviderConfig({
    id: "cfg-openai-default",
    provider: "openai",
    model: "gpt-4o-mini",
    isDefault: true,
    now: 1
  })
  const settings = {
    defaultModel: "gpt-4o-mini",
    defaultProviderConfigId: byokDefault.id,
    fastProviderConfigId: "",
    providerConfigs: [byokDefault],
    appearanceTheme: "system" as const,
    uiLanguage: "auto" as const,
    enableClipboardSense: true,
    enableToolbar: true,
    enableCommandPalette: true,
    enableDoubleClickMenu: false,
    enableInlineTranslation: false,
    inlineTranslationTargetLanguage: "auto" as const,
    templates: []
  }
  const apiKeys = {
    openai: "",
    anthropic: "",
    doubao: "",
    deepseek: "",
    moonshot: "",
    openrouter: "",
    gemini: "",
    hunyuan: "",
    providerConfigKeys: {}
  }

  assert.equal(
    resolvePopupCurrentModelProviderConfigId({
      settings,
      providerConfigs: [byokDefault],
      apiKeys,
      hostedUsable: true
    }),
    HOSTED_AI_PROVIDER_CONFIG_ID
  )
  assert.equal(
    resolvePopupCurrentModelProviderConfigId({
      settings,
      providerConfigs: [byokDefault],
      apiKeys,
      hostedUsable: true,
      explicitByokDefaultId: byokDefault.id
    }),
    byokDefault.id
  )
})

test("popup current model keeps configured BYOK defaults ahead of Aviso AI", async () => {
  const { buildProviderConfig, resolvePopupCurrentModelProviderConfigId } =
    await import("../src/utils/provider-configs.ts")
  const byokDefault = buildProviderConfig({
    id: "cfg-openai-ready",
    provider: "openai",
    model: "gpt-4o-mini",
    isDefault: true,
    now: 1
  })
  const settings = {
    defaultModel: "gpt-4o-mini",
    defaultProviderConfigId: byokDefault.id,
    fastProviderConfigId: "",
    providerConfigs: [byokDefault],
    appearanceTheme: "system" as const,
    uiLanguage: "auto" as const,
    enableClipboardSense: true,
    enableToolbar: true,
    enableCommandPalette: true,
    enableDoubleClickMenu: false,
    enableInlineTranslation: false,
    inlineTranslationTargetLanguage: "auto" as const,
    templates: []
  }

  assert.equal(
    resolvePopupCurrentModelProviderConfigId({
      settings,
      providerConfigs: [byokDefault],
      apiKeys: {
        openai: "",
        anthropic: "",
        doubao: "",
        deepseek: "",
        moonshot: "",
        openrouter: "",
        gemini: "",
        hunyuan: "",
        providerConfigKeys: { [byokDefault.id]: "configured" }
      },
      hostedUsable: true
    }),
    byokDefault.id
  )
})

test("hosted session storage uses a separate local key from API keys", async () => {
  const previousChrome = (globalThis as any).chrome
  const localStore: Record<string, unknown> = {}
  const setCalls: Array<Record<string, unknown>> = []

  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: localStore[key] }),
        set: async (value: Record<string, unknown>) => {
          setCalls.push(value)
          Object.assign(localStore, value)
        },
        remove: async (key: string) => {
          delete localStore[key]
        }
      }
    }
  }

  try {
    assert.equal(HOSTED_SESSION_STORAGE_KEY, "aviso_hosted_session")
    assert.notEqual(HOSTED_SESSION_STORAGE_KEY, "contextai_api_keys")

    await saveHostedSession(
      {
        session_token: "session-local",
        expires_at: "2026-06-18T00:00:00.000Z",
        user: {
          id: "u1",
          email: "u@example.com",
          tier: "free",
          region: "global"
        }
      },
      { baseUrl: HOSTED_AI_DEFAULT_BASE_URL }
    )

    assert.deepEqual(Object.keys(setCalls[0]), [HOSTED_SESSION_STORAGE_KEY])
    assert.equal(Object.hasOwn(localStore, "contextai_api_keys"), false)
    assert.equal(
      (await readHostedSession())?.session.session_token,
      "session-local"
    )

    await clearHostedSession()
    assert.equal(Object.hasOwn(localStore, HOSTED_SESSION_STORAGE_KEY), false)
  } finally {
    ;(globalThis as any).chrome = previousChrome
  }
})

function installHostedChromeStorageForTest() {
  const previousChrome = (globalThis as any).chrome
  const localStore: Record<string, unknown> = {}

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

function createHostedSessionFixture() {
  return {
    session_token: "session-local",
    expires_at: "2027-06-18T00:00:00.000Z",
    user: {
      id: "u1",
      tier: "free" as const,
      region: "global" as const
    }
  }
}

function createHostedMeFixture(monthlyUsed: number) {
  return {
    user: {
      id: "u1",
      tier: "free" as const,
      region: "global" as const
    },
    quota: {
      unit: "tokens" as const,
      monthly: {
        limit: 1000000,
        used: monthlyUsed,
        resets_at: "2026-07-01T00:00:00.000Z"
      },
      daily: {
        limit: 50000,
        used: 5,
        resets_at: "2026-06-27T00:00:00.000Z"
      }
    },
    rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
    models: { available: ["free-small"], default: "free-small" }
  }
}

test("hosted account quota display formats me data and missing states", () => {
  const labels = {
    unknown: "Unknown",
    unavailable: "Unavailable",
    tokens: "tokens",
    tierFree: "Free",
    tierPaid: "Paid"
  }
  const session = {
    session: {
      session_token: "session-local",
      expires_at: "2026-06-18T00:00:00.000Z",
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free" as const,
        region: "global" as const
      }
    },
    me: {
      user: {
        id: "u1",
        email: "u@example.com",
        tier: "free" as const,
        region: "global" as const
      },
      quota: {
        unit: "tokens",
        monthly: {
          limit: 1000000,
          used: 2500,
          resets_at: "2026-07-01T00:00:00"
        },
        daily: {
          limit: 50000,
          used: 1200,
          resets_at: "2026-06-19T00:00:00"
        }
      },
      rate_limit: { requests_per_min: 30, tokens_per_min: 30000 },
      models: { available: ["free-small"], default: "free-small" }
    },
    baseUrl: HOSTED_AI_LOCAL_BASE_URL,
    updatedAt: 1
  }

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session,
      status: "signed_in",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "2,500 / 1,000,000 tokens",
      dailyQuotaLabel: "1,200 / 50,000 tokens",
      resetLabel: "2026-07-01 00:00"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session: { ...session, me: undefined },
      status: "signed_in",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "Unknown",
      dailyQuotaLabel: "Unknown",
      resetLabel: "Unknown"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session,
      status: "local_backend_unavailable",
      labels
    }),
    {
      tierLabel: "Free",
      monthlyQuotaLabel: "Unavailable",
      dailyQuotaLabel: "Unavailable",
      resetLabel: "Unavailable"
    }
  )

  assert.deepEqual(
    buildHostedAccountQuotaDisplay({
      session: null,
      status: "local_backend_unavailable",
      labels
    }),
    {
      tierLabel: "Unavailable",
      monthlyQuotaLabel: "Unavailable",
      dailyQuotaLabel: "Unavailable",
      resetLabel: "Unavailable"
    }
  )
})

test("runtime hosted route falls back to BYOK unless hosted is explicitly chosen (MON-26)", () => {
  const makeSession = (
    token: string,
    expiresAt: string
  ): StoredHostedSession => ({
    session: {
      session_token: token,
      expires_at: expiresAt,
      user: { id: "u", tier: "free", region: "global" }
    },
    baseUrl: HOSTED_AI_PRODUCTION_BASE_URL,
    updatedAt: 0
  })
  const valid = makeSession("tok", "2099-01-01T00:00:00.000Z")
  const expired = makeSession("tok", "2000-01-01T00:00:00.000Z")

  // "hosted usable" = token present AND not expired — the single judgment shared
  // by popup, context menu and runtime.
  assert.equal(isHostedSessionUsable(null), false)
  assert.equal(isHostedSessionUsable(valid), true)
  assert.equal(isHostedSessionUsable(expired), false)
  assert.equal(
    isHostedSessionUsable(makeSession("", "2099-01-01T00:00:00.000Z")),
    false
  )
  // expiry honoured against an injected clock
  assert.equal(
    isHostedSessionUsable(valid, Date.parse("2099-06-01T00:00:00.000Z")),
    false
  )

  // explicit hosted route still requires sign-in when the session isn't usable
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: null }),
    true
  )
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: expired }),
    true
  )
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: valid }),
    false
  )
  assert.equal(
    requiresHostedSignInForRoute({ route: "byok", session: null }),
    false
  )

  // signed-out hosted *default* must not block BYOK
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: false,
      hasByokFallback: true
    }),
    false
  )
  // explicit hosted request keeps the hosted route (sign-in enforced downstream)
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: true,
      hostedIsSavedDefault: true,
      hostedUsable: false,
      hasByokFallback: true
    }),
    true
  )
  // a usable hosted default uses hosted
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: true,
      hasByokFallback: true
    }),
    true
  )
  // hosted default, not usable, and no BYOK to fall back to → keep hosted (sign-in)
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: false,
      hasByokFallback: false
    }),
    true
  )
  // an explicit byok request never takes the hosted route
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
  // a plain BYOK user (hosted not a default) never takes the hosted route
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: false,
      hostedIsSavedDefault: false,
      hostedUsable: false,
      hasByokFallback: false
    }),
    false
  )
})

test("hosted account state is just-in-time and does not block BYOK", () => {
  assert.equal(
    requiresHostedSignInForRoute({ route: "hosted", session: null }),
    true
  )
  assert.equal(
    requiresHostedSignInForRoute({ route: "byok", session: null }),
    false
  )
  assert.equal(isByokBlockedByHostedSignIn(), false)
  assert.equal(deriveHostedAccountStatus({ session: null }), "signed_out")
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "unauthorized" }),
    "expired"
  )
  assert.equal(
    deriveHostedAccountStatus({
      session: null,
      errorCode: "service_unavailable"
    }),
    "local_backend_unavailable"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "quota_exceeded" }),
    "quota_exhausted"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "rate_limited" }),
    "rate_limited"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "provider_error" }),
    "hosted_route_unavailable"
  )
  assert.equal(
    deriveHostedAccountStatus({ session: null, errorCode: "bad_request" }),
    "request_invalid"
  )
})

test("floating window exposes hosted sign-in required only as a request state", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )

  assert.match(messageSource, /hostedAi\?:/)
  assert.match(messageSource, /state: "sign_in_required"/)
  assert.match(floatingSource, /hostedAi\?\.state === "sign_in_required"/)
  assert.match(floatingSource, /floating\.hostedSignInRequired\.title/)
  assert.match(floatingSource, /getAiUnavailableTitleKey/)
  assert.match(floatingSource, /getAiUnavailableDetailKey/)
  assert.match(floatingSource, /loading: hostedAiNotice \? false : true/)
  assert.match(floatingSource, /if \(!hostedAiNotice && !deferAiRequest\)/)
  assert.doesNotMatch(floatingSource, /chrome\.identity/)
})

test("floating follow-up input stays editable while send is disabled during AI unavailable guidance", () => {
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const followUpTextarea =
    floatingSource.match(
      /<textarea[\s\S]*?className="aviso-follow-up-input"[\s\S]*?\/>/
    )?.[0] ?? ""

  assert.match(floatingSource, /const followUpBlocked = Boolean/)
  assert.match(floatingSource, /message\.action === "AI_STREAM_ERROR"/)
  assert.match(floatingSource, /aiGuidance: guidance/)
  assert.match(
    floatingSource,
    /const canSendFollowUp = !followUpBlocked && followUp\.trim\(\)\.length > 0/
  )
  assert.match(followUpTextarea, /value=\{followUp\}/)
  assert.match(
    followUpTextarea,
    /onChange=\{\(e\) => setFollowUp\(e\.target\.value\)\}/
  )
  assert.doesNotMatch(followUpTextarea, /disabled=/)
  assert.doesNotMatch(followUpTextarea, /readOnly=/)
  assert.match(floatingSource, /disabled=\{!canSendFollowUp\}/)
  assert.match(floatingSource, /canSendFollowUp \? ui\.accent : ui\.disabledBg/)
  assert.match(floatingSource, /\.aviso-send-button:disabled/)
})

test("popup hosted quota display stays internal and keeps public copy clean", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const websiteSources = [
    "../website/src/pages/index.tsx",
    "../website/docs/core-features.md",
    "../website/docs/known-limitations.md",
    "../website/i18n/en/docusaurus-plugin-content-docs/current/core-features.md",
    "../website/i18n/en/docusaurus-plugin-content-docs/current/known-limitations.md"
  ]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n")

  assert.match(popupSource, /popup\.hosted\.monthlyQuota/)
  assert.match(popupSource, /popup\.hosted\.dailyQuota/)
  assert.match(popupSource, /popup\.hosted\.resetTiming/)
  assert.match(popupSource, /buildHostedAccountQuotaDisplay/)
  assert.match(popupSource, /refreshHostedAccount/)
  assert.match(popupSource, /popup\.addAiService/)
  assert.match(popupSource, /providerConfigs\.map/)
  assert.equal(getI18nMessage("popup.hosted.quota.unknown", "en"), "Unknown")
  assert.equal(
    getI18nMessage("popup.hosted.quota.unavailable", "zh-CN"),
    "不可用"
  )
  assert.match(
    getI18nMessage("popup.hosted.status.quota_exhausted", "zh-CN"),
    /自己的 AI 服务配置/
  )
  assert.match(
    getI18nMessage("popup.hosted.status.rate_limited", "en"),
    /own AI service configuration/
  )
  assert.doesNotMatch(websiteSources, /1,000,000|1000000|50,000|50000/)
  assert.doesNotMatch(
    websiteSources,
    /hosted quota|Aviso AI quota|托管额度|本地托管账户/i
  )
})

test("hosted sign-in slice keeps production backend and permission boundaries", () => {
  const hostedSessionSource = readFileSync(
    new URL("../src/utils/hosted-session.ts", import.meta.url),
    "utf8"
  )
  const hostedClientSource = readFileSync(
    new URL("../src/utils/hosted-ai-client.ts", import.meta.url),
    "utf8"
  )
  const hostedChatRoutingSource = readFileSync(
    new URL("../src/background/hosted-chat-routing.ts", import.meta.url),
    "utf8"
  )
  const hostedOAuthSource = readFileSync(
    new URL("../src/utils/hosted-oauth.ts", import.meta.url),
    "utf8"
  )
  const hostedAuthSource = readFileSync(
    new URL("../src/background/hosted-auth.ts", import.meta.url),
    "utf8"
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const messageSource = readFileSync(
    new URL("../src/types/messages.ts", import.meta.url),
    "utf8"
  )
  const floatingSource = readFileSync(
    new URL("../src/contents/floating.tsx", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const wxtConfigSource = readFileSync(
    new URL("../wxt.config.ts", import.meta.url),
    "utf8"
  )
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.match(
    hostedSessionSource,
    /HOSTED_SESSION_STORAGE_KEY = "aviso_hosted_session"/
  )
  for (const source of [hostedSessionSource, hostedClientSource]) {
    assert.match(
      source,
      /HOSTED_AI_LOCAL_BASE_URL = "http:\/\/127\.0\.0\.1:3000\/v1"/
    )
    assert.match(
      source,
      /HOSTED_AI_PRODUCTION_BASE_URL =\s*"https:\/\/aviso-backend-production\.vercel\.app\/v1"/
    )
  }
  assert.match(
    hostedSessionSource,
    /HOSTED_AI_DEFAULT_BASE_URL = HOSTED_AI_PRODUCTION_BASE_URL/
  )
  assert.match(messageSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.match(popupSource, /HOSTED_GOOGLE_SIGN_IN/)
  assert.doesNotMatch(popupSource, /requestHostedGoogleIdToken/)
  assert.match(hostedAuthSource, /requestHostedGoogleIdentityToken/)
  assert.match(hostedAuthSource, /HOSTED_AI_DEFAULT_BASE_URL/)
  assert.match(
    hostedAuthSource,
    /createHostedAiClient\(\{\s*baseUrl: HOSTED_AI_DEFAULT_BASE_URL\s*\}\)/
  )
  assert.match(hostedAuthSource, /googleIdToken = null/)
  assert.equal(
    getI18nMessage("popup.hosted.status.authClientUnavailable", "zh-CN"),
    "托管后端配置不可用，请重新加载 Aviso 后重试。"
  )
  assert.match(hostedOAuthSource, /launchWebAuthFlow/)
  assert.match(hostedOAuthSource, /response_type: "id_token"/)
  assert.doesNotMatch(hostedOAuthSource, /getAuthToken/)
  assert.doesNotMatch(hostedOAuthSource, /client_secret/)
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${hostedOAuthSource}\n${hostedAuthSource}\n${popupSource}`,
    /api\.aviso|aviso-backend-staging/i
  )
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${hostedOAuthSource}\n${hostedAuthSource}\n${popupSource}`,
    /X-Install-Id/
  )
  assert.doesNotMatch(
    `${hostedClientSource}\n${hostedSessionSource}\n${hostedChatRoutingSource}\n${popupSource}`,
    /chrome\.identity/
  )
  assert.match(messageSource, /aiRoute\?: "byok" \| "hosted"/)
  assert.match(floatingSource, /aiRoute,/)
  assert.match(aiClientSource, /shouldUseHostedChatRoute\(payload\)/)
  assert.match(aiClientSource, /payload\.aiRoute !== "byok"/)
  assert.match(aiClientSource, /runHostedChatRequest\(/)
  assert.match(aiClientSource, /aiRoute: "hosted"/)
  assert.match(aiClientSource, /session: hostedSession/)
  assert.match(aiClientSource, /firstRequestReason: options\.hostedFirstRequestReason/)
  assert.deepEqual(
    [...packageJson.manifest.host_permissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_PRODUCTION_HOST_PERMISSION
    ].sort()
  )
  assert.doesNotMatch(wxtConfigSource, /127\.0\.0\.1|localhost/)
})
