# V03-FE06 Error And Fallback Handling

Status: `completed / CTO accepted / local-only / build sandbox-blocked`
Updated: 2026-06-19

## Linear

Title: `V03-FE06 Error and fallback handling`

Project: `Aviso v0.3 Hosted AI`

Issue: `MON-7`

URL: `https://linear.app/mongocyber/issue/MON-7/v03-fe06-error-and-fallback-handling`

Priority: High

Labels: `v0.3`, `frontend`, `hosted-ai`, `error-handling`, `fallback`, `local-only`

## Goal

Add explicit local-only hosted-AI error and fallback handling for the hosted route introduced by `V03-FE05`.

The fallback path must remain request-scoped: hosted errors should explain the hosted-route state and point users back to retry or BYOK, while BYOK direct-provider remains the default and is not blocked by hosted sign-in, quota, or backend availability.

## Owner Repo

Primary: `Aviso`

Backend contract source: `Aviso-backend`

## Execution Mode

Level: `L2 frontend implementation`

Allowed:

- refine hosted error normalization and safe message mapping,
- cover local hosted statuses for 401, 402, 403, 429, 502, 503, and local unavailable,
- show local hosted fallback state through existing floating/popup surfaces,
- preserve request-scoped just-in-time sign-in for hosted route only,
- add focused unit/source-boundary tests,
- update local issue and v0.3 planning docs.

Stop before:

- Chrome manifest or host-permission changes,
- staging or production backend URLs,
- real provider, OAuth production, billing, checkout, webhook, secrets, telemetry, or analytics,
- `X-Install-Id` install-id support,
- public website, Chrome Web Store, privacy-policy, or launch copy,
- storage key migration.

## Scope Delivered

- Hosted client errors now map 401, 402, 403, 429, 502, 503, bad request, and internal errors to safe hosted-route messages.
- Hosted fallback messages survive the global `normalizeError` pass, so floating/toolbar surfaces do not collapse hosted errors into generic provider errors.
- Popup hosted account state can distinguish expired session, local backend unavailable, quota exhausted, rate limited, hosted route unavailable, and invalid request.
- Popup hosted status copy keeps BYOK service configuration visible and explicitly non-blocked.
- Tests cover status-code mapping, safe fallback messages, popup status derivation, local-only copy, BYOK non-blocking, and source boundaries.

## Non-Scope Confirmed

- No manifest or host-permission change.
- No staging or production backend URL.
- No real OAuth, real provider hookup, billing, checkout, webhook, telemetry, analytics, or secrets.
- No `X-Install-Id`.
- No public hosted-AI marketing/privacy/CWS copy.
- No storage key migration.
- No default-route change: BYOK direct-provider remains the default route unless `aiRoute === "hosted"`.

## CTO Acceptance / Review Notes

CTO review accepts `V03-FE06` as completed for the local-only error and fallback handling slice. Local validation passed with `npm test` (`185/185`) and `npx tsc --noEmit`; however, this is not release-ready because `npm run build` remains blocked by the managed sandbox `Operation not permitted` error, and `npm run check:manifests` cannot run until `build/chrome-mv3-prod/manifest.json` exists.

## Acceptance Criteria

- 401 maps to request-scoped hosted sign-in state; BYOK remains usable.
- 402 maps to local hosted quota unavailable/exhausted state without paid upgrade, checkout, subscription, or public quota promise.
- 403 maps to hosted model/route unavailable fallback.
- 429 maps to retry-later hosted fallback with no automatic retry loop.
- 502 maps to hosted provider unavailable fallback without raw backend/provider payload.
- 503 and fetch/local backend failure map to local hosted unavailable fallback.
- Hosted fallback messages are safe for floating/popup display and do not expose raw prompts, raw responses, URLs, screenshots/base64, API keys, or private page bodies.
- BYOK provider configuration, API key storage, and default routing are unchanged.

## Checks

Passed:

- `npm test` (`185/185`)
- `npx tsc --noEmit`
- stop-line/boundary searches for `X-Install-Id`, `chrome.identity`, real backend URL strings, staging/production URL strings, billing/payment/webhook, telemetry/analytics, host permissions, API key storage, and public paid/upgrade copy

Blocked:

- `npm run build` failed in the managed sandbox with `Operation not permitted`.
- Unsandboxed build approval was rejected by policy, so no equivalent build workaround was run.
- `npm run check:manifests` failed because `build/chrome-mv3-prod/manifest.json` is missing and the manifest checker requires build output first.

## Remaining Gate

If real Chrome runtime access to the local backend requires `localhost` / `127.0.0.1` host permission, stop and request owner approval before changing the manifest.
