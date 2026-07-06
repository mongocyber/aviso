import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  describeCommandActionAccess,
  isCommandAccessBlocked
} from "../src/utils/command-access.ts"
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
} from "../src/utils/i18n-core.ts"
import {
  getModelAvailability,
  isProviderKeyConfigured
} from "../src/utils/model-availability.ts"
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
  buildConnectivityPreflightSummary,
  buildConnectivityTestPayload,
  buildConnectivityValidationSummary,
  categorizeConnectivityError,
  CONNECTIVITY_TEST_PROMPT,
  getConnectivityModelId,
  getConnectivityTimingSummary,
  hasPrivateContextPayload,
  isProviderHostPermissionPresent,
  parseConnectivityLatencyMs,
  resolveConnectivitySpeedGrade
} from "../src/utils/provider-connectivity.ts"
import {
  buildChatCompletionReasoningParams,
  extractReasoningDeltaText,
  shouldUseMaxCompletionTokens
} from "../src/utils/reasoning.ts"
import "./helpers/register-aliases.ts"

test("model registry 覆盖当前批准 provider 与 v0.2 first-batch presets", () => {
  assert.deepEqual(Object.keys(PROVIDER_REGISTRY).sort(), [
    "anthropic",
    "deepseek",
    "doubao",
    "gemini",
    "hunyuan",
    "moonshot",
    "openai",
    "openrouter"
  ])
  assert.deepEqual(Object.keys(MODEL_REGISTRY).sort(), [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "doubao",
    "gpt-4o",
    "gpt-4o-mini"
  ])
  assert.equal(
    PROVIDER_REGISTRY.openai.hostPermission,
    "https://api.openai.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.anthropic.hostPermission,
    "https://api.anthropic.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.doubao.hostPermission,
    "https://ark.cn-beijing.volces.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.deepseek.hostPermission,
    "https://api.deepseek.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.moonshot.hostPermission,
    "https://api.moonshot.cn/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.openrouter.hostPermission,
    "https://openrouter.ai/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.gemini.hostPermission,
    "https://generativelanguage.googleapis.com/*"
  )
  assert.equal(
    PROVIDER_REGISTRY.hunyuan.hostPermission,
    "https://api.hunyuan.cloud.tencent.com/*"
  )
  assert.equal(PROVIDER_REGISTRY.deepseek.baseURL, DEEPSEEK_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.moonshot.baseURL, MOONSHOT_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.openrouter.baseURL, OPENROUTER_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.gemini.baseURL, GEMINI_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.hunyuan.baseURL, HUNYUAN_BASE_URL)
  assert.equal(PROVIDER_REGISTRY.deepseek.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.moonshot.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.openrouter.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.gemini.sdk, "openai-compatible")
  assert.equal(PROVIDER_REGISTRY.hunyuan.sdk, "openai-compatible")
  assert.equal(PROVIDER_PRIMARY_MODEL.deepseek, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.moonshot, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.openrouter, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.gemini, "")
  assert.equal(PROVIDER_PRIMARY_MODEL.hunyuan, "")
  assert.equal(PROVIDER_REGISTRY.openai.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.anthropic.reasoningControl, "unsupported")
  assert.equal(PROVIDER_REGISTRY.doubao.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.deepseek.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.moonshot.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.openrouter.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.gemini.reasoningControl, "model-dependent")
  assert.equal(PROVIDER_REGISTRY.hunyuan.reasoningControl, "model-dependent")
  assert.equal(MODEL_REGISTRY["gpt-4o-mini"].supportsReasoningControl, false)
})

test("resolveModelRoute 默认回到 gpt-4o-mini / OpenAI", () => {
  const route = resolveModelRoute(undefined, {})

  assert.equal(route.selectedModel, DEFAULT_MODEL_ID)
  assert.equal(route.requestModel, DEFAULT_MODEL_ID)
  assert.equal(route.provider.id, "openai")
  assert.equal(route.isFallback, false)
})

test("resolveModelRoute 保持 claude 与未知模型兼容路由", () => {
  const claudeRoute = resolveModelRoute("claude-custom-test", {})
  const openaiRoute = resolveModelRoute("gpt-4.1-mini", {})

  assert.equal(claudeRoute.provider.id, "anthropic")
  assert.equal(claudeRoute.requestModel, "claude-custom-test")
  assert.equal(claudeRoute.isFallback, true)
  assert.equal(openaiRoute.provider.id, "openai")
  assert.equal(openaiRoute.requestModel, "gpt-4.1-mini")
  assert.equal(openaiRoute.isFallback, true)
})

test("resolveModelRoute 将 doubao 路由到 Ark OpenAI-compatible endpoint", () => {
  const configured = resolveModelRoute("doubao", {
    doubaoModel: " ep-2026-test "
  })
  const missing = resolveModelRoute("doubao", {})

  assert.equal(configured.provider.id, "doubao")
  assert.equal(configured.provider.sdk, "openai-compatible")
  assert.equal(configured.provider.baseURL, DOUBAO_BASE_URL)
  assert.equal(configured.requestModel, "ep-2026-test")
  assert.equal(configured.missingConfig, undefined)
  assert.equal(missing.missingConfig, "doubaoModel")
})

test("provider config route supports multiple configs and default selection", () => {
  const workDoubao = {
    id: "cfg-doubao-work",
    provider: "doubao",
    displayName: "豆包工作 App",
    model: "ep-work",
    createdAt: 100,
    updatedAt: 100
  } as const
  const personalDoubao = {
    id: "cfg-doubao-personal",
    provider: "doubao",
    displayName: "豆包个人 App",
    model: "ep-personal",
    createdAt: 200,
    updatedAt: 200
  } as const

  const route = resolveModelRoute(undefined, {
    defaultProviderConfigId: personalDoubao.id,
    providerConfigs: [workDoubao, personalDoubao],
    defaultModel: "doubao"
  })

  assert.equal(route.providerConfigId, personalDoubao.id)
  assert.equal(route.providerConfigName, "豆包个人 App")
  assert.equal(route.provider.id, "doubao")
  assert.equal(route.requestModel, "ep-personal")
})

test("fast model strategy uses configured fast provider only for short operations", () => {
  const defaultConfig = {
    id: "cfg-openai-default",
    provider: "openai",
    displayName: "OpenAI Default",
    model: "gpt-4o-mini",
    createdAt: 100,
    updatedAt: 100
  } as const
  const fastConfig = {
    id: "cfg-deepseek-fast",
    provider: "deepseek",
    displayName: "DeepSeek Fast",
    model: "deepseek-chat",
    createdAt: 200,
    updatedAt: 200
  } as const
  const settings = {
    defaultModel: "gpt-4o-mini",
    defaultProviderConfigId: defaultConfig.id,
    fastProviderConfigId: fastConfig.id,
    providerConfigs: [defaultConfig, fastConfig],
    doubaoModel: ""
  }

  const defaultRoute = resolveModelRoute(undefined, settings)
  const fastRoute = resolveFastModelRouteForOperation(
    { operation: "translate", context: "selection" },
    settings,
    settings.providerConfigs
  )

  assert.equal(defaultRoute.providerConfigId, defaultConfig.id)
  assert.equal(defaultRoute.provider.id, "openai")
  assert.equal(fastRoute?.providerConfigId, fastConfig.id)
  assert.equal(fastRoute?.provider.id, "deepseek")
  assert.equal(fastRoute?.requestModel, "deepseek-chat")

  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "explain", context: "selection" },
      { ...settings, fastProviderConfigId: "" },
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "translate", context: "page" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "summarize", context: "page", pageContent: "long page" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      {
        operation: "image_explain",
        context: "image",
        imageSource: "remote-image",
        srcUrl: "https://example.com/a.png"
      },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
  assert.equal(
    resolveFastModelRouteForOperation(
      { operation: "custom", context: "selection" },
      settings,
      settings.providerConfigs
    ),
    undefined
  )
})

test("fast model strategy preserves missing-model guard for configured short tasks", () => {
  const missingFastConfig = {
    id: "cfg-openrouter-fast",
    provider: "openrouter",
    displayName: "OpenRouter Fast",
    model: "",
    createdAt: 100,
    updatedAt: 100
  } as const
  const route = resolveFastModelRouteForOperation(
    { operation: "polish", context: "selection" },
    {
      fastProviderConfigId: missingFastConfig.id,
      providerConfigs: [missingFastConfig]
    },
    [missingFastConfig]
  )
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.equal(route?.provider.id, "openrouter")
  assert.equal(route?.requestModel, "")
  assert.equal(route?.missingConfig, "model")
  assert.match(aiClientSource, /resolveFastModelRouteForOperation/)
  assert.match(
    aiClientSource,
    /resolveRuntimeModelRoute\(payload\.model, settings\)/
  )
  assert.match(
    aiClientSource,
    /if \(route\.missingConfig\) \{[\s\S]*?throw new Error\("模型 ID 或接入点未配置/
  )
})

test("OpenAI-compatible provider configs require manual model before provider call", () => {
  const sampleModels = {
    deepseek: "deepseek-chat",
    moonshot: "moonshot-v1-8k",
    openrouter: "openai/gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    hunyuan: "hunyuan-lite"
  } as const

  for (const provider of [
    "deepseek",
    "moonshot",
    "openrouter",
    "gemini",
    "hunyuan"
  ] as const) {
    const baseConfig = {
      id: `cfg-${provider}`,
      provider,
      displayName: PROVIDER_REGISTRY[provider].displayName,
      model: "",
      createdAt: 100,
      updatedAt: 100
    } as const
    const missing = buildProviderConfigRoute(baseConfig)
    const configured = buildProviderConfigRoute({
      ...baseConfig,
      model: sampleModels[provider]
    })

    assert.equal(missing.provider.id, provider)
    assert.equal(missing.provider.sdk, "openai-compatible")
    assert.equal(missing.requestModel, "")
    assert.equal(missing.missingConfig, "model")
    assert.equal(configured.missingConfig, undefined)
    assert.equal(configured.requestModel, sampleModels[provider])
  }
})

test("reasoning controls stay disabled unless provider and model both declare support", () => {
  assert.match(
    getReasoningControlBlockReason(resolveModelRoute("gpt-4o-mini", {})) ?? "",
    /当前模型未声明支持/
  )

  assert.equal(
    getReasoningControlBlockReason(resolveModelRoute("o3-mini", {})),
    null
  )

  const deepseekRoute = buildProviderConfigRoute({
    id: "cfg-deepseek",
    provider: "deepseek",
    displayName: "DeepSeek",
    model: "deepseek-chat",
    createdAt: 100,
    updatedAt: 100
  })

  assert.equal(deepseekRoute.provider.reasoningControl, "model-dependent")
  assert.equal(deepseekRoute.model.supportsReasoningControl, false)
  assert.match(
    getReasoningControlBlockReason(deepseekRoute) ?? "",
    /不会自动发送思考\/推理控制参数/
  )

  const doubaoThinkingRoute = buildProviderConfigRoute({
    id: "cfg-doubao-thinking",
    provider: "doubao",
    displayName: "豆包 Thinking",
    model: "doubao-seed-1-6-thinking",
    createdAt: 100,
    updatedAt: 100
  })

  assert.equal(doubaoThinkingRoute.provider.reasoningControl, "model-dependent")
  assert.equal(doubaoThinkingRoute.model.supportsReasoningControl, true)
  assert.equal(getReasoningControlBlockReason(doubaoThinkingRoute), null)
})

test("reasoning request params are gated by operation, provider, and model", () => {
  const selectionTranslate = {
    operation: "translate",
    context: "selection",
    selectionText: "Hello"
  } as const

  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "o3-mini",
      payload: selectionTranslate
    }),
    { reasoning_effort: "low" }
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openrouter",
      modelOrEndpoint: "moonshotai/kimi-k2",
      payload: selectionTranslate
    }),
    { reasoning: { effort: "minimal", exclude: true } }
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking",
      payload: { ...selectionTranslate, operation: "explain" }
    }),
    { thinking: { type: "enabled" } }
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "gpt-4o-mini",
      payload: selectionTranslate
    }),
    {}
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "openai",
      modelOrEndpoint: "o3-mini",
      payload: {
        operation: "summarize",
        context: "page",
        pageContent: "Long page"
      }
    }),
    {}
  )
  assert.deepEqual(
    buildChatCompletionReasoningParams({
      providerId: "doubao",
      modelOrEndpoint: "ep-20260615-default",
      payload: selectionTranslate
    }),
    {}
  )
  assert.equal(
    shouldUseMaxCompletionTokens({
      providerId: "openai",
      modelOrEndpoint: "o3-mini"
    }),
    true
  )
  assert.equal(
    shouldUseMaxCompletionTokens({
      providerId: "doubao",
      modelOrEndpoint: "doubao-seed-1-6-thinking"
    }),
    false
  )
})

test("reasoning stream deltas parse separately from answer text", () => {
  assert.equal(
    extractReasoningDeltaText({
      choices: [{ delta: { reasoning_content: "先判断语境。" } }]
    }),
    "先判断语境。"
  )
  assert.equal(
    extractReasoningDeltaText({
      delta: { reasoning: { text: "再输出译文。" } }
    }),
    "再输出译文。"
  )
  assert.equal(
    extractReasoningDeltaText({
      choices: [
        {
          delta: {
            reasoning_details: [
              { type: "reasoning.text", text: "分析术语。" },
              { type: "reasoning.summary", summary: "确认译法。" }
            ]
          }
        }
      ]
    }),
    "分析术语。确认译法。"
  )
  assert.equal(
    extractReasoningDeltaText({
      choices: [{ delta: { content: "Final answer" } }]
    }),
    ""
  )
})

test("openai-compatible text requests keep system prompts in system role", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )

  assert.match(
    aiClientSource,
    /buildMessages\(payload, \{ useSystemRole: true \}\)/
  )
  assert.match(aiClientSource, /role: "system", content: systemPrompt/)
  assert.match(aiClientSource, /role: "user", content: userContent/)
})

test("legacy provider keys map to provider configs without changing storage keys", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )

  assert.match(providerConfigSource, /getLegacyProviderConfigs/)
  assert.match(providerConfigSource, /LEGACY_PROVIDER_CONFIG_IDS/)
  assert.match(providerConfigSource, /apiKeys\[provider\]/)
  assert.match(
    providerConfigSource,
    /apiKeys\.providerConfigKeys\[config\.id\]/
  )
  assert.match(storageSource, /providerConfigKeys/)
  assert.match(storageSource, /contextai_api_keys/)
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.openai, "legacy-openai")
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.anthropic, "legacy-anthropic")
  assert.equal(LEGACY_PROVIDER_CONFIG_IDS.doubao, "legacy-doubao")
  assert.equal("deepseek" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("moonshot" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("openrouter" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("gemini" in LEGACY_PROVIDER_CONFIG_IDS, false)
  assert.equal("hunyuan" in LEGACY_PROVIDER_CONFIG_IDS, false)
})

test("popup provider config save allows incomplete drafts and clears stale test state", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const saveBlock =
    popupSource.match(
      /const saveProviderConfigInstance = async \(config: ProviderConfig\) => \{[\s\S]*?\n  \}\n\n  const cancelProviderConfigEdit/
    )?.[0] ?? ""
  const testBlock =
    popupSource.match(
      /const testProviderConfigInstance = async \(config: ProviderConfig\) => \{[\s\S]*?\n  \}\n\n  const clearConnectivityResult/
    )?.[0] ?? ""

  assert.match(saveBlock, /const normalizedKeyInput = keyInput\.trim\(\)/)
  assert.match(
    saveBlock,
    /await saveProviderConfigApiKey\(config\.id, normalizedKeyInput\)/
  )
  assert.doesNotMatch(
    saveBlock,
    /saveProviderConfigApiKey\(config\.id, keyInput\)/
  )
  assert.match(saveBlock, /delete next\[config\.id\]/)
  assert.match(saveBlock, /clearProviderConfigTestResult\(normalizedConfig\)/)
  assert.doesNotMatch(saveBlock, /buildConnectivityPreflightSummary/)
  assert.doesNotMatch(saveBlock, /popup\.provider\.apiKeyMissing/)
  assert.doesNotMatch(saveBlock, /popup\.provider\.endpointMissing/)
  assert.match(testBlock, /buildConnectivityPreflightSummary/)
  assert.match(testBlock, /popup\.provider\.apiKeyMissing/)
  assert.match(testBlock, /popup\.provider\.endpointMissing/)
  assert.match(
    testBlock,
    /await saveProviderConfigApiKey\(config\.id, normalizedKeyInput\)/
  )
  assert.doesNotMatch(
    testBlock,
    /saveProviderConfigApiKey\(config\.id, keyInput\)/
  )
})

test("API key storage normalizes hidden whitespace before saving and reading", () => {
  const storageSource = readFileSync(
    new URL("../src/utils/storage.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(storageSource, /function normalizeApiKeyInput/)
  assert.match(storageSource, /return value\.trim\(\)/)
  assert.match(
    storageSource,
    /normalizeApiKeyInput\(decryptApiKey\(raw\.openai\)\)/
  )
  assert.match(
    storageSource,
    /const normalizedKey = normalizeApiKeyInput\(plainKey\)/
  )
  assert.match(storageSource, /encryptApiKey\(normalizedKey\)/)
  assert.doesNotMatch(storageSource, /encryptApiKey\(plainKey\)/)
  assert.match(popupSource, /const normalizedKeyInput = keyInput\.trim\(\)/)
  assert.match(popupSource, /normalizedKeyInput\.slice\(-4\)/)
  assert.doesNotMatch(popupSource, /keyInput\.slice\(-4\)/)
})

test("provider config stores last connectivity result by provider and model", () => {
  const typeSource = readFileSync(
    new URL("../src/types/history.ts", import.meta.url),
    "utf8"
  )
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const connectivitySource = readFileSync(
    new URL("../src/utils/provider-connectivity.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(typeSource, /testProvider\?: ProviderConfigProvider/)
  assert.match(typeSource, /testModel\?: string/)
  assert.match(typeSource, /testCompletionMs\?: number/)
  assert.match(providerConfigSource, /markProviderConfigTestResult/)
  assert.match(providerConfigSource, /testProvider: config\.provider/)
  assert.match(
    providerConfigSource,
    /testModel: getProviderConfigTestModel\(config\)/
  )
  assert.match(connectivitySource, /buildLastConnectivityTestSummaryMap/)
  assert.match(connectivitySource, /completionMs: config\.testCompletionMs/)
  assert.match(connectivitySource, /上次通过/)
  assert.match(connectivitySource, /上次失败/)
  assert.match(popupSource, /buildLastConnectivityTestSummaryMap\(configs\)/)
  assert.match(popupSource, /resolveConnectivitySpeedGrade\(connectivity\)/)
  assert.match(popupSource, /withPopupConnectivityTiming\(summary, testedAt\)/)
  assert.match(popupSource, /popup\.connectivity\.lastPassed/)
  assert.match(popupSource, /popup\.connectivity\.lastFailed/)
  assert.match(popupSource, /popup\.connectivity\.safetyNote/)
  assert.doesNotMatch(
    popupSource.match(/const rows = \[[\s\S]*?\n  \]/)?.[0] ?? "",
    /raw_prompt_logged|raw_response_logged|private_page_data_logged|latency_note/
  )
  assert.match(
    popupSource,
    /const \[expanded, setExpanded\] = useState\(false\)/
  )
  assert.match(popupSource, /aria-expanded=\{expanded\}/)
  assert.match(popupSource, /expanded &&\s*rows\.map/)
  assert.equal(
    getI18nMessage("popup.connectivity.showDetails", "zh-CN"),
    "展开详情"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.hideDetails", "en"),
    "Hide details"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.lastPassed", "en"),
    "Last connection test passed"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.lastFailed", "zh-CN"),
    "上次连接测试未通过"
  )
  assert.equal(
    getI18nMessage("popup.connectivity.speed.untested", "zh-CN"),
    "未测速"
  )
  assert.equal(getI18nMessage("popup.connectivity.speed.fast", "en"), "Fast")
  assert.equal(getI18nMessage("popup.connectivity.noData", "zh-CN"), "暂无数据")
})

test("provider config connectivity result invalidates on key or model changes", () => {
  const providerConfigSource = readFileSync(
    new URL("../src/utils/provider-configs.ts", import.meta.url),
    "utf8"
  )
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(providerConfigSource, /shouldClearProviderConfigTestResult/)
  assert.match(providerConfigSource, /options\.apiKeyChanged/)
  assert.match(providerConfigSource, /previous\.provider !== next\.provider/)
  assert.match(
    providerConfigSource,
    /getProviderConfigTestModel\(previous\) !== getProviderConfigTestModel\(nextConfig\)/
  )
  assert.match(popupSource, /\{ apiKeyChanged: true \}/)
  assert.match(popupSource, /clearProviderConfigTestResult\(normalizedConfig\)/)
  assert.match(popupSource, /markProviderConfigTestResult\(savedConfig/)
})

test("provider connectivity handler refreshes runtime cache before validation", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const validationBlock =
    backgroundSource.match(
      /case "VALIDATE_PROVIDER_CONNECTIVITY":[\s\S]*?break/
    )?.[0] ?? ""

  assert.match(validationBlock, /clearAIRuntimeCaches\(\)/)
  assert.match(validationBlock, /handleProviderConnectivityTest/)
  assert.ok(
    validationBlock.indexOf("clearAIRuntimeCaches()") <
      validationBlock.indexOf("handleProviderConnectivityTest")
  )
})

test("AI runtime cache keeps BYOK direct-provider boundaries", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const runtimeCacheSource = readFileSync(
    new URL("../src/background/ai-runtime-cache.ts", import.meta.url),
    "utf8"
  )
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )
  const handleAIRequestBlock =
    aiClientSource.match(
      /export async function handleAIRequest[\s\S]*?\nfunction getRouteApiKey/
    )?.[0] ?? ""

  assert.match(runtimeCacheSource, /CONFIG_CACHE_TTL_MS = 30_000/)
  assert.match(runtimeCacheSource, /getRuntimeConfigSnapshot/)
  assert.match(runtimeCacheSource, /getRuntimeOpenAIClient/)
  assert.match(runtimeCacheSource, /getRuntimeAnthropicClient/)
  assert.match(runtimeCacheSource, /clearAIRuntimeCaches/)
  assert.match(backgroundSource, /changes\.contextai_settings/)
  assert.match(backgroundSource, /changes\.contextai_api_keys/)
  assert.match(backgroundSource, /clearAIRuntimeCaches\(\)/)
  assert.doesNotMatch(handleAIRequestBlock, /handleProviderConnectivityTest/)
  assert.doesNotMatch(handleAIRequestBlock, /VALIDATE_PROVIDER_CONNECTIVITY/)
  assert.doesNotMatch(runtimeCacheSource, /chrome\.storage\.(local|sync)\.set/)
  assert.doesNotMatch(runtimeCacheSource, /provider proxy|proxy|backend/i)
})

test("model availability blocks unconfigured provider keys", () => {
  assert.equal(isProviderKeyConfigured(""), false)
  assert.equal(isProviderKeyConfigured("••••••••1234"), true)

  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: {},
    connectivityResults: {}
  })

  assert.deepEqual(availability, {
    disabled: true,
    status: "未配置 Key",
    tone: "danger"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: {},
    connectivityResults: {},
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: true,
    status: "Key missing",
    tone: "danger"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("model availability allows configured but untested models with status", () => {
  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o", {}),
    providerConfigured: { openai: true },
    connectivityResults: {}
  })

  assert.deepEqual(availability, {
    disabled: false,
    status: "未测试",
    tone: "muted"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o", {}),
    providerConfigured: { openai: true },
    connectivityResults: {},
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: false,
    status: "Untested",
    tone: "muted"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("model availability disables known failed connectivity", () => {
  const availability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: { openai: true },
    connectivityResults: {
      openai: buildConnectivityValidationSummary({
        provider: "openai",
        modelOrEndpoint: "gpt-4o-mini",
        hostPermissionPresent: true,
        result: "failure",
        latencyNote: "failed",
        errorCategory: "unauthorized",
        notes: "failed"
      })
    }
  })

  assert.deepEqual(availability, {
    disabled: true,
    status: "Key 无效",
    tone: "danger"
  })

  const englishAvailability = getModelAvailability({
    route: resolveModelRoute("gpt-4o-mini", {}),
    providerConfigured: { openai: true },
    connectivityResults: {
      openai: buildConnectivityValidationSummary({
        provider: "openai",
        modelOrEndpoint: "gpt-4o-mini",
        hostPermissionPresent: true,
        result: "failure",
        latencyNote: "failed",
        errorCategory: "unauthorized",
        notes: "failed"
      })
    },
    uiLanguage: "en"
  })

  assert.deepEqual(englishAvailability, {
    disabled: true,
    status: "Invalid key",
    tone: "danger"
  })
  assert.doesNotMatch(englishAvailability.status, /未配置|未测试|无效/)
})

test("popup passes UI language into legacy model availability status", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )

  assert.match(popupSource, /const resolvedUiLanguage = resolveUiLanguage/)
  assert.match(popupSource, /uiLanguage: resolvedUiLanguage/)
})

test("model availability handles doubao endpoint configuration", () => {
  const missing = getModelAvailability({
    route: resolveModelRoute("doubao", {}),
    providerConfigured: { doubao: true },
    connectivityResults: {}
  })

  assert.equal(missing.disabled, true)
  assert.equal(missing.status, "未配置接入点")

  const staleResult = getModelAvailability({
    route: resolveModelRoute("doubao", { doubaoModel: "ep-new" }),
    providerConfigured: { doubao: true },
    connectivityResults: {
      doubao: buildConnectivityValidationSummary({
        provider: "doubao",
        modelOrEndpoint: "ep-old",
        hostPermissionPresent: true,
        result: "success",
        latencyNote: "ok",
        errorCategory: "none",
        notes: "ok"
      })
    }
  })

  assert.deepEqual(staleResult, {
    disabled: false,
    status: "未测试",
    tone: "muted"
  })
})

test("command access local-only action ignores AI provider blockers", () => {
  const missingKey = describeCommandActionAccess({
    actionKind: "local",
    preview: "api_key_missing",
    route: resolveModelRoute("gpt-4o-mini", {})
  })
  const featureUnavailable = describeCommandActionAccess({
    actionKind: "local",
    preview: "feature_unavailable",
    route: resolveModelRoute("gpt-4o-mini", {})
  })

  assert.equal(missingKey.state, "local_only")
  assert.equal(missingKey.blocked, false)
  assert.equal(missingKey.usesProvider, false)
  assert.equal(featureUnavailable.state, "local_only")
  assert.equal(featureUnavailable.blocked, false)
})

test("command access BYOK active derives from current model route", () => {
  const route = resolveModelRoute("doubao", {
    doubaoModel: "doubao-seed-2-0-lite-260428"
  })
  const access = describeCommandActionAccess({
    actionKind: "ai",
    preview: "available",
    route
  })

  assert.equal(access.state, "BYOK_active")
  assert.equal(access.blocked, false)
  assert.equal(access.usesProvider, true)
  assert.match(access.detail, /豆包 \/ 火山方舟/)
  assert.match(access.detail, /doubao-seed-2-0-lite-260428/)
})

test("command access blockers match BYOK basic states", () => {
  for (const preview of [
    "loading",
    "api_key_missing",
    "model_unavailable",
    "feature_unavailable"
  ] as const) {
    const access = describeCommandActionAccess({
      actionKind: "ai",
      preview,
      route: resolveModelRoute("gpt-4o-mini", {})
    })

    assert.equal(access.blocked, true)
    assert.equal(isCommandAccessBlocked(preview), true)
  }
})

test("command access guides AI setup without quota subscription mock copy", () => {
  const source = readFileSync(
    new URL("../src/utils/command-access.ts", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(
    source,
    /quota|额度|subscription|订阅|hosted|Mock/i
  )
  assert.match(source, /登录 Aviso AI/)
  assert.match(source, /api_key_missing/)
  assert.match(source, /model_unavailable/)
  assert.match(source, /feature_unavailable/)
})

test("package host_permissions 精确匹配批准 provider 边界", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual(
    [...pkg.manifest.host_permissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_PRODUCTION_HOST_PERMISSION
    ].sort()
  )
})

test("WXT host_permissions 与批准 provider 边界保持一致", () => {
  const wxtConfigSource = readFileSync(
    new URL("../wxt.config.ts", import.meta.url),
    "utf8"
  )
  const hostPermissions = Array.from(
    wxtConfigSource.matchAll(/"https:\/\/[^"]+\*"/g),
    (match) => match[0].slice(1, -1)
  )

  assert.deepEqual(
    [...hostPermissions].sort(),
    [
      ...APPROVED_PROVIDER_HOST_PERMISSIONS,
      HOSTED_AI_PRODUCTION_HOST_PERMISSION
    ].sort()
  )
})

test("package 普通权限保持最小边界且包含 identity / clipboardWrite / history", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.deepEqual([...pkg.manifest.permissions].sort(), [
    "activeTab",
    "bookmarks",
    "clipboardWrite",
    "contextMenus",
    "history",
    "identity",
    "storage"
  ])
})

test("manifest-facing localization uses Chrome _locales without permission expansion", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  const zhMessages = JSON.parse(
    readFileSync(
      new URL("../locales/zh_CN/messages.json", import.meta.url),
      "utf8"
    )
  )
  const enMessages = JSON.parse(
    readFileSync(
      new URL("../locales/en/messages.json", import.meta.url),
      "utf8"
    )
  )

  assert.equal(pkg.manifest.default_locale, "zh_CN")
  assert.equal(pkg.manifest.description, "__MSG_app_description__")
  assert.equal(
    pkg.manifest.commands["open-command-palette"].description,
    "__MSG_open_command_palette_description__"
  )
  assert.equal(
    zhMessages.app_description.message,
    "智能浏览器助手，感知操作对象，就地调用 AI，浮窗展示结果。"
  )
  assert.equal(
    enMessages.app_description.message,
    "An AI browser assistant for explaining, translating, polishing, and summarizing content in place."
  )
  assert.equal(
    zhMessages.open_command_palette_description.message,
    "打开命令面板"
  )
  assert.equal(
    enMessages.open_command_palette_description.message,
    "Open command palette"
  )
})

test("connectivity test payload 只包含固定公开短句，不带页面私有上下文", () => {
  const payload = buildConnectivityTestPayload()

  assert.equal(payload.userMessage, CONNECTIVITY_TEST_PROMPT)
  assert.equal(hasPrivateContextPayload(payload), false)
  assert.equal(payload.selectionText, undefined)
  assert.equal(payload.priorContext, undefined)
  assert.equal(payload.pageContent, undefined)
  assert.equal(payload.srcUrl, undefined)
  assert.equal(payload.pageUrl, undefined)
})

test("OpenAI / Anthropic mock-only connectivity gate covers route and sanitized summary", () => {
  for (const provider of ["openai", "anthropic"] as const) {
    const route = resolveModelRoute(getConnectivityModelId(provider), {})
    const summary = buildConnectivityValidationSummary({
      provider,
      modelOrEndpoint: route.requestModel,
      hostPermissionPresent: isProviderHostPermissionPresent(
        PROVIDER_REGISTRY[provider],
        APPROVED_PROVIDER_HOST_PERMISSIONS
      ),
      result: "success",
      latencyNote: "mock-only: provider SDK path returned a simulated stream.",
      errorCategory: "none",
      notes:
        "Mock validation only; no live provider request, raw prompt, raw response, private page data, screenshot, or API Key was recorded."
    })

    assert.equal(route.provider.id, provider)
    assert.equal(route.provider.sdk, provider)
    assert.equal(route.provider.requiresEndpointConfig, false)
    assert.equal(summary.result, "success")
    assert.equal(summary.host_permission_present, true)
    assert.equal(summary.secret_leak_check, "pass")
    assert.equal(summary.raw_prompt_logged, "no")
    assert.equal(summary.raw_response_logged, "no")
    assert.equal(summary.private_page_data_logged, "no")
    assert.match(summary.notes, /Mock validation only/)
    assert.match(summary.notes, /no live provider request/)
  }
})

test("OpenAI-compatible connectivity implementation uses fixed payload and non-streaming request", () => {
  const aiClientSource = readFileSync(
    new URL("../src/background/ai-client.ts", import.meta.url),
    "utf8"
  )
  const connectivityBlock =
    aiClientSource.match(
      /export async function handleProviderConnectivityTest[\s\S]*?\nexport async function handleAIRequest/
    )?.[0] ?? ""

  assert.match(
    connectivityBlock,
    /const testPayload = buildConnectivityTestPayload\(\)/
  )
  assert.match(connectivityBlock, /hasPrivateContextPayload\(testPayload\)/)
  assert.match(connectivityBlock, /route\.provider\.id === "anthropic"/)
  assert.match(connectivityBlock, /await callAnthropic/)
  assert.match(connectivityBlock, /await callOpenAIConnectivity/)
  assert.match(
    connectivityBlock,
    /requestId: `connectivity-\$\{route\.provider\.id\}`/
  )
  assert.match(
    connectivityBlock,
    /raw prompt、raw response、网页正文、截图或 API Key/
  )

  const connectivityRequestBlock =
    aiClientSource.match(
      /async function callOpenAIConnectivity[\s\S]*?\nasync function callAnthropic/
    )?.[0] ?? ""
  const streamingRequestBlock =
    aiClientSource.match(
      /async function callOpenAI\([\s\S]*?\nasync function callOpenAIConnectivity/
    )?.[0] ?? ""

  assert.match(connectivityRequestBlock, /stream: false/)
  assert.match(connectivityRequestBlock, /max_tokens: 64/)
  assert.doesNotMatch(connectivityRequestBlock, /for await/)
  assert.match(streamingRequestBlock, /stream: true/)
})

test("connectivity 私有上下文检查覆盖追问 priorContext", () => {
  assert.equal(
    hasPrivateContextPayload({
      operation: "custom",
      userMessage: CONNECTIVITY_TEST_PROMPT,
      priorContext: "用户：上一轮私有上下文"
    }),
    true
  )
})
