import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  createI18n,
  getI18nMessage,
  type I18nKey
} from "../src/utils/i18n-core.ts"
import "./helpers/register-aliases.ts"

const BASE_URL = "https://aviso-backend-production.vercel.app/v1"

const importBilling = () => import("../src/utils/billing-subscription.ts")

test("billing checkout requests only a server-created Creem checkout URL", async () => {
  const { requestBillingCheckout } = await importBilling()
  const storage = installHostedChromeStorageForTest(createHostedSeed())
  const calls: Array<{ input: string; init?: RequestInit }> = []

  try {
    const result = await requestBillingCheckout({
      plan: "pro-monthly",
      fetchImpl: async (input, init) => {
        calls.push({ input: String(input), init })
        return Response.json({
          checkout_url: "https://checkout.creem.io/ch_creem_1"
        })
      }
    })

    assert.equal(result.kind, "success")
    assert.equal(result.destination, "checkout")
    assert.equal(result.url, "https://checkout.creem.io/ch_creem_1")
    assert.equal(calls.length, 1)
    assert.equal(calls[0].input, `${BASE_URL}/billing/checkout`)
    assert.equal(calls[0].init?.method, "POST")
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      plan: "pro-monthly"
    })
    assert.doesNotMatch(String(calls[0].init?.body), /price|amount|entitlement/i)

    const headers = new Headers(calls[0].init?.headers)
    assert.equal(headers.get("Authorization"), "Bearer hosted-token")
    assert.equal(headers.get("Accept"), "application/json")
    assert.equal(headers.get("Content-Type"), "application/json")
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    storage.restore()
  }
})

test("billing checkout failures use safe categories and do not surface backend text", async () => {
  const { requestBillingCheckout } = await importBilling()

  for (const fetchImpl of [
    async () => new Response("raw Creem customer draft", { status: 503 }),
    async () =>
      Response.json({
        checkout_url: "https://evil.example/checkout"
      }),
    async () => {
      throw new TypeError("network raw provider detail")
    }
  ] satisfies Array<typeof fetch>) {
    const storage = installHostedChromeStorageForTest(createHostedSeed())
    try {
      const result = await requestBillingCheckout({ fetchImpl })

      assert.equal(result.kind, "safe_error")
      assert.match(result.messageKey, /^popup\.billing\.status\./)
      assert.doesNotMatch(JSON.stringify(result), /raw Creem|customer draft|provider detail/i)
      assert.deepEqual(storage.localStore.contextai_api_keys, {
        openai: "must-stay"
      })
    } finally {
      storage.restore()
    }
  }
})

test("billing portal requests only the authenticated backend portal endpoint", async () => {
  const { requestBillingPortal } = await importBilling()
  const storage = installHostedChromeStorageForTest(createHostedSeed({ tier: "paid" }))
  const calls: Array<{ input: string; init?: RequestInit }> = []

  try {
    const result = await requestBillingPortal({
      fetchImpl: async (input, init) => {
        calls.push({ input: String(input), init })
        return Response.json({
          portal_url: "https://creem.io/customer-portal/cust_creem_1"
        })
      }
    })

    assert.equal(result.kind, "success")
    assert.equal(result.destination, "portal")
    assert.equal(result.url, "https://creem.io/customer-portal/cust_creem_1")
    assert.equal(calls.length, 1)
    assert.equal(calls[0].input, `${BASE_URL}/billing/portal`)
    assert.equal(calls[0].init?.method, "POST")
    assert.equal(calls[0].init?.body, undefined)

    const headers = new Headers(calls[0].init?.headers)
    assert.equal(headers.get("Authorization"), "Bearer hosted-token")
    assert.equal(headers.get("Accept"), "application/json")
    assert.equal(headers.has("Content-Type"), false)
    assert.doesNotMatch(JSON.stringify(calls[0].init), /customer_id|subscription_id|user_id/i)
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    storage.restore()
  }
})

test("billing portal unavailable states stay safe and keep BYOK usable", async () => {
  const { requestBillingPortal } = await importBilling()
  const storage = installHostedChromeStorageForTest(createHostedSeed())

  try {
    const result = await requestBillingPortal({
      fetchImpl: async () =>
        Response.json(
          { error: { code: "bad_request", message: "raw subscription id" } },
          { status: 400 }
        )
    })

    assert.equal(result.kind, "safe_error")
    assert.equal(result.reason, "portal_unavailable")
    assert.equal(result.messageKey, "popup.billing.status.portalUnavailable")
    assert.doesNotMatch(JSON.stringify(result), /raw subscription id/i)
    assert.deepEqual(storage.localStore.contextai_api_keys, {
      openai: "must-stay"
    })
  } finally {
    storage.restore()
  }
})

test("billing external navigation is restricted to trusted Creem origins", async () => {
  const {
    normalizeTrustedBillingExternalUrl,
    openTrustedBillingUrl
  } = await importBilling()

  assert.equal(
    normalizeTrustedBillingExternalUrl("https://checkout.creem.io/ch_creem_1"),
    "https://checkout.creem.io/ch_creem_1"
  )
  assert.equal(
    normalizeTrustedBillingExternalUrl(
      "https://creem.io/customer-portal/cust_creem_1"
    ),
    "https://creem.io/customer-portal/cust_creem_1"
  )
  assert.equal(normalizeTrustedBillingExternalUrl("http://checkout.creem.io/x"), null)
  assert.equal(normalizeTrustedBillingExternalUrl("https://evil.example/x"), null)
  assert.equal(normalizeTrustedBillingExternalUrl("javascript:alert(1)"), null)

  const opened: string[] = []
  assert.deepEqual(
    await openTrustedBillingUrl("https://checkout.creem.io/ch_creem_1", {
      createTab: async ({ url }) => {
        opened.push(url)
      }
    }),
    {
      kind: "opened",
      url: "https://checkout.creem.io/ch_creem_1"
    }
  )
  assert.deepEqual(opened, ["https://checkout.creem.io/ch_creem_1"])
  assert.deepEqual(
    await openTrustedBillingUrl("https://evil.example/x", {
      createTab: async ({ url }) => {
        opened.push(url)
      }
    }),
    {
      kind: "blocked",
      reason: "untrusted_url",
      messageKey: "popup.billing.status.untrustedUrl"
    }
  )
  assert.deepEqual(opened, ["https://checkout.creem.io/ch_creem_1"])
})

test("billing return and cancel states refresh subscription status from backend account data only", async () => {
  const { refreshHostedSubscriptionStatus } = await importBilling()
  const freeSession = createHostedSession({ tier: "free" })
  const paidSession = createHostedSession({ tier: "paid" })

  const stillFree = await refreshHostedSubscriptionStatus({
    session: freeSession,
    returnUrl:
      "chrome-extension://extension-id/popup.html?checkout=success&tier=paid",
    refreshHostedAccount: async () => freeSession
  })

  assert.equal(stillFree.kind, "refreshed")
  assert.equal(stillFree.source, "backend_account")
  assert.equal(stillFree.tier, "free")

  const nowPaid = await refreshHostedSubscriptionStatus({
    session: freeSession,
    returnUrl:
      "chrome-extension://extension-id/popup.html?checkout=cancelled&tier=paid",
    refreshHostedAccount: async () => paidSession
  })

  assert.equal(nowPaid.kind, "refreshed")
  assert.equal(nowPaid.source, "backend_account")
  assert.equal(nowPaid.tier, "paid")
})

test("Popup billing UI exposes safe plan, checkout, portal, return, and error copy", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const billingSource = readFileSync(
    new URL("../src/utils/billing-subscription.ts", import.meta.url),
    "utf8"
  )
  const t = createI18n("en")

  assert.match(popupSource, /requestBillingCheckout/)
  assert.match(popupSource, /requestBillingPortal/)
  assert.match(popupSource, /openTrustedBillingUrl/)
  assert.match(popupSource, /refreshHostedSubscriptionStatus/)
  assert.match(popupSource, /popup\.billing\.checkout/)
  assert.match(popupSource, /popup\.billing\.portal/)
  assert.match(popupSource, /popup\.billing\.returnSafe/)
  assert.match(billingSource, /BILLING_TRUSTED_EXTERNAL_ORIGINS/)
  assert.doesNotMatch(popupSource, /\$[0-9]|price_id|customer_id|subscription_id/i)

  assert.equal(t("popup.billing.checkout" as I18nKey), "Upgrade")
  assert.equal(getI18nMessage("popup.billing.portal" as I18nKey, "en"), "Manage billing")
  assert.equal(
    getI18nMessage("popup.billing.returnSafe" as I18nKey, "en"),
    "Checkout completed or cancelled? Refresh plan status here. Aviso updates your plan only from backend account status."
  )
  assert.doesNotMatch(
    [
      getI18nMessage("popup.billing.status.invalid" as I18nKey, "en"),
      getI18nMessage("popup.billing.status.untrustedUrl" as I18nKey, "en"),
      getI18nMessage("popup.billing.status.portalUnavailable" as I18nKey, "en")
    ].join(" "),
    /raw|provider|Creem API|customer_id|subscription_id/i
  )
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
  options: { tier?: "free" | "paid"; expiresAt?: string } = {}
): Record<string, unknown> {
  return {
    aviso_hosted_session: createHostedSession(options),
    aviso_hosted_sign_in_result: {
      schemaVersion: 2,
      authProvider: "supabase",
      status: "signed_in",
      stage: "done",
      updatedAt: 1
    },
    contextai_api_keys: { openai: "must-stay" }
  }
}

function createHostedSession(
  options: { tier?: "free" | "paid"; expiresAt?: string } = {}
) {
  const tier = options.tier ?? "free"
  return {
    schemaVersion: 2,
    authProvider: "supabase",
    tokenKind: "hosted_bearer",
    session: {
      session_token: "hosted-token",
      expires_at: options.expiresAt ?? "2099-01-01T00:00:00.000Z",
      user: { id: "u-supabase", tier, region: "global" }
    },
    me: {
      user: { id: "u-supabase", tier, region: "global" },
      quota: {
        unit: "tokens",
        monthly: {
          limit: tier === "paid" ? 10_000_000 : 1_000_000,
          used: 10,
          resets_at: "2099-01-01T00:00:00.000Z"
        }
      },
      rate_limit: { requests_per_min: 20, tokens_per_min: 40_000 },
      models: { available: ["free-small"], default: "free-small" }
    },
    baseUrl: BASE_URL,
    updatedAt: 1
  }
}
