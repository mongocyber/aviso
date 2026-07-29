import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildHostedSignInFailureView,
  buildHostedSignInTraceText,
  getHostedSignInDialogState,
  HOSTED_SIGN_IN_FAILURE_CATEGORIES,
  HOSTED_SIGN_IN_HELP_URL,
  resolveHostedSignInDialogAction,
  runHostedSignInDialogAction
} from "../src/utils/hosted-sign-in-ux.ts"
import {
  isByokBlockedByHostedSignIn,
  selectConfiguredHostedRoute
} from "../src/utils/hosted-session.ts"
import "./helpers/register-aliases.ts"

const FIXED_NOW = Date.parse("2026-07-28T12:34:56.000Z")
const RAW_SECRET_PATTERN =
  /invalid_grant|ya29\.secret|backend-stack|accounts\.google\.com|mock-id-token|backend-state|backend-nonce/i
const RAW_MECHANIC_PATTERN = /oauth|backend|auth_google|challenge/i

test("hosted sign-in failures map raw shapes to fixed safe categories without leaking details", () => {
  const scenarios = [
    {
      input: {
        status: "expired",
        stage: "auth_google",
        error: {
          source: "backend",
          code: "unauthorized",
          httpStatusClass: "4xx",
          raw: "backend-stack invalid_grant"
        }
      },
      category: "invalid"
    },
    {
      input: {
        status: "rate_limited",
        stage: "challenge",
        error: { source: "backend", code: "rate_limited", httpStatusClass: "4xx" }
      },
      category: "rate_limited"
    },
    {
      input: {
        status: "local_backend_unavailable",
        stage: "challenge",
        error: {
          source: "backend",
          code: "service_unavailable",
          httpStatusClass: "unknown"
        }
      },
      category: "network"
    },
    {
      input: {
        status: "hosted_route_unavailable",
        stage: "oauth",
        error: {
          source: "oauth",
          code: "oauth_error",
          message:
            "invalid_grant ya29.secret https://accounts.google.com/o/oauth2"
        }
      },
      category: "unavailable"
    },
    {
      input: {
        status: "signed_out",
        stage: "oauth",
        error: { source: "oauth", code: "user_cancelled" }
      },
      category: "cancelled"
    },
    {
      input: new Error(
        "OAuth invalid_grant ya29.secret backend-stack https://accounts.google.com/callback"
      ),
      category: "network"
    }
  ] as const

  for (const scenario of scenarios) {
    const view = buildHostedSignInFailureView(scenario.input, {
      now: FIXED_NOW,
      traceId: "trace-safe-123"
    })

    assert.equal(view.category, scenario.category)
    assert.ok(HOSTED_SIGN_IN_FAILURE_CATEGORIES.includes(view.category))
    assert.equal(view.messageKey, `popup.hosted.dialog.message.${scenario.category}`)
    assert.equal(view.traceId, "trace-safe-123")
    assert.equal(view.occurredAt, "2026-07-28T12:34:56.000Z")
    assert.doesNotMatch(JSON.stringify(view), RAW_SECRET_PATTERN)
    assert.doesNotMatch(view.messageKey, RAW_MECHANIC_PATTERN)
  }
})

test("hosted sign-in retry action re-attempts sign-in", async () => {
  const calls: string[] = []
  const effect = await runHostedSignInDialogAction("retry", {
    retrySignIn: () => calls.push("retry")
  })

  assert.deepEqual(calls, ["retry"])
  assert.deepEqual(effect, { type: "retry_sign_in", closeDialog: false })
})

test("hosted sign-in BYOK action surfaces BYOK without requiring Aviso login", async () => {
  const calls: string[] = []
  const effect = await runHostedSignInDialogAction("byok", {
    showByok: () => calls.push("byok")
  })

  assert.deepEqual(calls, ["byok"])
  assert.deepEqual(effect, {
    type: "show_byok",
    closeDialog: true,
    requiresLogin: false
  })
})

test("hosted sign-in help action only returns a docs link", async () => {
  const opened: string[] = []
  const effect = await runHostedSignInDialogAction("help", {
    openHelp: (url) => opened.push(url)
  })

  assert.deepEqual(opened, [HOSTED_SIGN_IN_HELP_URL])
  assert.equal(effect.type, "open_help")
  assert.match(effect.url, /^https:\/\/aviso-nine\.vercel\.app\/docs\//)
})

test("hosted sign-in copy-trace action copies sanitized category, timestamp, and trace id only", async () => {
  const failure = buildHostedSignInFailureView(
    {
      status: "expired",
      stage: "auth_google",
      error: {
        source: "backend",
        code: "unauthorized",
        message: "backend-stack mock-id-token backend-state backend-nonce"
      }
    },
    {
      now: FIXED_NOW,
      traceId: "mock-id-token backend-state"
    }
  )
  const copied: string[] = []
  const effect = await runHostedSignInDialogAction(
    "copy_trace",
    {
      copyTrace: (text) => copied.push(text)
    },
    failure
  )
  const traceText = buildHostedSignInTraceText(failure)

  assert.equal(effect.type, "copy_trace")
  assert.deepEqual(copied, [traceText])
  assert.match(traceText, /category=invalid/)
  assert.match(traceText, /time=2026-07-28T12:34:56\.000Z/)
  assert.match(traceText, /trace=local-/)
  assert.doesNotMatch(traceText, RAW_SECRET_PATTERN)
})

test("hosted sign-in dialog stays hidden until Hosted is explicitly chosen", () => {
  const failure = buildHostedSignInFailureView(
    {
      status: "hosted_route_unavailable",
      stage: "oauth",
      error: { source: "oauth", code: "oauth_error" }
    },
    { now: FIXED_NOW }
  )

  assert.deepEqual(
    getHostedSignInDialogState({
      explicitHostedChoice: false,
      busy: false,
      failure,
      hasHostedSession: false
    }),
    { visible: false }
  )
  assert.deepEqual(
    getHostedSignInDialogState({
      explicitHostedChoice: true,
      busy: true,
      failure: null,
      hasHostedSession: false
    }),
    { visible: true, mode: "signing_in" }
  )
  assert.deepEqual(
    getHostedSignInDialogState({
      explicitHostedChoice: true,
      busy: false,
      failure,
      hasHostedSession: false
    }),
    { visible: true, mode: "failed", failure }
  )
})

test("BYOK remains available without Aviso login even after hosted sign-in failure", () => {
  const failure = buildHostedSignInFailureView(
    {
      status: "expired",
      stage: "auth_google",
      error: { source: "backend", code: "unauthorized", httpStatusClass: "4xx" }
    },
    { now: FIXED_NOW }
  )

  assert.equal(isByokBlockedByHostedSignIn(), false)
  assert.equal(
    selectConfiguredHostedRoute({
      requestedRoute: "byok",
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: false,
      hasByokFallback: true
    }),
    false
  )
  assert.equal(
    selectConfiguredHostedRoute({
      hostedExplicit: false,
      hostedIsSavedDefault: true,
      hostedUsable: false,
      hasByokFallback: true
    }),
    false
  )
  assert.deepEqual(
    getHostedSignInDialogState({
      explicitHostedChoice: false,
      busy: false,
      failure,
      hasHostedSession: false
    }),
    { visible: false }
  )
  assert.equal(resolveHostedSignInDialogAction("byok", failure).requiresLogin, false)
})
