# Aviso v0.3 Release Gates

Status: `planning / privacy-cws-source-updated / mon-23-owner-approved-to-execute / not release-ready`
Updated: 2026-06-26

This file lists the gates required before v0.3 hosted AI can be described as available, submitted to Chrome Web Store, or released.

## Gate Summary

| Gate | Required Before | Status |
| --- | --- | --- |
| Product scope approval | Frontend implementation | planned |
| Environment protocol | Staging setup, production deploy, or CWS update | accepted in [`../../decisions/0002-environments-and-release-flow.md`](../../decisions/0002-environments-and-release-flow.md) |
| API contract review | Frontend integration | planned |
| Backend staging readiness guard | Staging development approval | completed in Linear [`MON-8`](https://linear.app/mongocyber/issue/MON-8/v03-be10a-staging-readiness-guard); Vercel runtime deployed and smoke-verified in `MON-14` |
| Backend persistence adapters | Staging deployment preparation | completed in Linear [`MON-9`](https://linear.app/mongocyber/issue/MON-9/v03-be10b-staging-persistence-adapters); Supabase schema verified through `MON-24`; Upstash smoke verified through `MON-16` |
| Supabase schema/migration preparation | Staging persistence validation | completed in Linear [`MON-15`](https://linear.app/mongocyber/issue/MON-15/v03-be11a-supabase-schema-and-migration-staging-gate); apply + smoke verified separately in `MON-24` |
| Supabase migration apply + metadata smoke | Upstash and OAuth staging smokes | completed in Linear [`MON-24`](https://linear.app/mongocyber/issue/MON-24/v03-be11a-2-supabase-migration-apply-and-metadata-smoke-gate); baseline migration applied to Supabase staging and metadata smoke + synthetic cleanup verified |
| Upstash quota/idempotency staging smoke | OAuth and provider staging smokes | completed in Linear [`MON-16`](https://linear.app/mongocyber/issue/MON-16/v03-be11b-upstash-quota-and-idempotency-staging-smoke); sanitized owner-provided evidence shows pass for quota counter, quota float counter, chat idempotency, billing idempotency, association set, positive TTLs, and cleanup of 5 synthetic `aviso:mon16` keys |
| Real Redis Lua quota concurrency regression | Real or untrusted hosted-AI users | real Redis verified / sanitized evidence accepted / not live in [`V03-BE12`](../../issues/V03-BE12-real-redis-quota-concurrency-gate.md); owner-assisted staging Upstash evidence passed concurrent `reserveAdmission` against real Redis-compatible Lua script execution |
| Google OAuth staging smoke | Provider staging smoke | completed in Linear [`MON-17`](https://linear.app/mongocyber/issue/MON-17/v03-be11c-google-oauth-staging-validation); sanitized evidence verifies staging auth/session flow, logout invalidation, and OAuth audience alignment without identity payloads or secrets |
| OpenRouter provider smoke and cost guard | Sensitive log review and frontend staging integration | completed in Linear [`MON-18`](https://linear.app/mongocyber/issue/MON-18/v03-be11d-openrouter-provider-smoke-and-cost-guard) after `MON-18C`; backend `/v1/chat` smoke passed with `free-small`, SSE delta/done/usage seen, positive quota delta, and cost guard confirmed |
| Sensitive log review | Frontend staging integration | completed in Linear `MON-19`; reviewed Vercel 24h runtime overview, credential-like keyword search, warning/error/fatal query, and backend logger/source boundary without exporting raw log bodies |
| Frontend staging config, host permission, and OAuth code | Release build gate | completed and synced Done in Linear `MON-20`. Covers exact staging backend URL, manifest boundary, `identity` permission, background `launchWebAuthFlow` id-token code path, popup-lifecycle remediation, and owner-assisted loaded-extension browser account smoke |
| Release build and manifest verification | Privacy/CWS review and release owner approval | completed and synced Done in Linear `MON-21`. `npm test`, `npx tsc --noEmit`, WXT/Plasmo production build, WXT/Plasmo zip packaging, manifest guard, zip manifest inspection, and forbidden-boundary scan passed |
| Hosted service selection UX smoke | Production approval | completed and synced Done in Linear [`MON-27`](https://linear.app/mongocyber/issue/MON-27/v03-fe06d-hosted-service-selection-ux-smoke-and-closeout). Code/tests/build passed; loaded-extension UI smoke confirmed default model selection, quick task service selection, dropdown styling, and BYOK fallback |
| Hosted AI sign-in UX redesign | Production approval if included in v0.3 package | completed / merged to `main` / Linear Done in [`MON-26`](https://linear.app/mongocyber/issue/MON-26/v03-fe09-hosted-ai-sign-in-ux-redesign). Frontend-only; no production config, permission expansion, backend schema/provider, billing, public copy, or secrets handling |
| AI unavailable guidance cleanup | Production approval if included in v0.3 package | merged to `main` / local validation passed in [`MON-29`](https://linear.app/mongocyber/issue/MON-29/v03-fe10-ai-unavailable-guidance-cleanup). No backend, manifest, host permission, API key storage, public copy, production, billing, telemetry, or new network scope |
| Staging resource register | Env injection, redeploy, and staging verification | updated in [`staging-resource-register.md`](./staging-resource-register.md); resources created, env injection owner-reported, redeploy and health verified, frontend OAuth browser smoke passed, release gates pending |
| Host / ordinary permission approval | Any backend URL or OAuth permission in extension manifest | approved only for `identity` and `https://aviso-backend-staging.vercel.app/*` today; production backend origin is now established as `https://aviso-backend-production.vercel.app`, so the exact future host permission candidate is `https://aviso-backend-production.vercel.app/*`; production package not updated |
| Privacy policy update | Public hosted AI claim or CWS update | source updated in `MON-22` / owner-approved to prepare publication / not deployed / evidence pending |
| CWS data disclosure update | Store submission | draft added in [`cws-disclosure-draft.md`](./cws-disclosure-draft.md) / owner-approved to prepare submission / not submitted / evidence pending |
| Backend staging deployment | Cross-repo integration test | backend staging health verified; GLM route remediation commit `d5da17b` pushed; provider smoke passed in `MON-18C`; integration smokes remain pending |
| Real provider validation | Staging or production hosted AI | staging provider route verified in `MON-18C` with SSE done/usage and quota/cost guard confirmation; production provider validation is owner-approved to execute with sanitized evidence, but not completed |
| Auth provider validation | Staging or production sign-in | staging Google OAuth smoke verified in `MON-17`; production OAuth validation is owner-approved to execute with sanitized evidence, but not completed |
| Quota and cost controls | Staging hosted AI | Upstash quota/idempotency smoke verified in `MON-16`; provider quota/cost guard confirmed in `MON-18C` with positive quota delta and `admission_path_exercised` |
| Billing provider gate | Paid hosted AI | approved excluded from first v0.3 hosted-AI release / later owner gate |
| Release owner approval | Public release | MON-23 owner decisions approved to execute; final production, package, website, CWS, and live evidence pending |

## Privacy And Disclosure Gates

Before hosted AI is public:

- Privacy policy source now distinguishes BYOK and hosted paths in `MON-22`; deployment/publication remains release-gated.
- Source copy now discloses that hosted request content passes through Aviso backend and upstream model provider services.
- Source copy now records that the backend does not persist raw prompt, raw response, page body, screenshot/base64, clipboard content, user BYOK API keys, or full URLs.
- Source copy now records the current metadata retention window as 30 days.
- Chrome Web Store disclosure draft now exists in [`cws-disclosure-draft.md`](./cws-disclosure-draft.md), but it has not been submitted.
- Upstream provider data-retention/logging configuration still needs final owner review before production release or CWS submission.

Owner-confirmed first-slice boundary:

- Hosted requests pass through Aviso backend and OpenRouter / downstream providers.
- Aviso backend must not persist raw prompt, raw response, page body, screenshot/base64, clipboard content, API keys, or full URLs.
- Metadata retention is 30 days.
- These decisions do not publish hosted-AI public copy or Chrome Web Store disclosure changes.
- `MON-22` updates source copy and disclosure drafts only. It does not deploy the website, submit Chrome Web Store disclosure, approve production, or approve release.

## Permission Gates

Before the extension calls hosted backend:

- Decide backend domain. Staging is approved only as `https://aviso-backend-staging.vercel.app/v1`.
- Review exact `host_permissions`. Staging is approved only as `https://aviso-backend-staging.vercel.app/*`.
- Confirm no broad host permission is added.
- Confirm command palette still does not perform web search or remote link-body fetching.
- Confirm screenshot/image hosted path remains out of v0.3 public scope unless separately approved.

Owner confirmed `MON-20` for the exact staging backend origin, minimal host permission, and staging frontend OAuth identity-token handling. Owner later approved `MON-23` execution decisions for production preparation, website/CWS preparation, production OAuth/provider validation, and billing exclusion. Production backend origin is established as `https://aviso-backend-production.vercel.app`; any production package may only use the exact host permission `https://aviso-backend-production.vercel.app/*`, and no broad host permission is approved.

## Backend Gates

Before frontend staging integration:

- Environment target is declared as `local` or `staging` under [`../../decisions/0002-environments-and-release-flow.md`](../../decisions/0002-environments-and-release-flow.md).
- `Aviso-backend` status document says which services are mock, local, staging, or live.
- Backend staging readiness guard is implemented and CTO-accepted in Linear `MON-8`, including `APP_ENV=local|staging|production`, secret-safe readiness reporting, staging/production startup guard, readiness/env tests, and backend docs/status updates. Vercel runtime readiness enforcement is deployed and smoke-verified in Linear `MON-14`.
- Backend persistence adapter seam is implemented and CTO-accepted in Linear `MON-9`, including Supabase / Upstash adapters, container selection, readiness status updates, and focused tests. Supabase real staging schema is verified through `MON-24`, and Upstash quota/idempotency behavior is verified through `MON-16`.
- Supabase schema/migration preparation is completed and CTO-accepted in Linear `MON-15`. The baseline migration was applied and metadata-only smoke was verified in Linear `MON-24`, including six-table presence, RLS enabled state, no client policies, synthetic insert paths, and cleanup of the synthetic `test:mon24-smoke:` record.
- Upstash smoke harness is verified in Linear `MON-16`, with sanitized owner-provided evidence for quota counters, chat/billing idempotency, association sets, positive TTLs, and cleanup. The evidence excludes Redis URL/token, request payloads, and user data.
- Real Redis Lua quota concurrency regression is verified in [`V03-BE12`](../../issues/V03-BE12-real-redis-quota-concurrency-gate.md) with sanitized owner-assisted staging Upstash evidence. The BE12 harness passed four concurrent `reserveAdmission` scenarios: request limit `7/17`, token-window limit `5/19`, daily quota limit `5/19`, monthly quota limit `4/20`, all TTL categories positive, and 16 synthetic `aviso:be12` keys cleaned. This satisfies the Redis concurrency evidence gate, but does not make hosted AI live or production-ready.
- Google OAuth smoke is verified in Linear `MON-17` from sanitized owner-provided evidence: `auth_google`, `me_authenticated`, `logout`, and `me_after_logout` passed; OAuth audience alignment passed; post-logout `/v1/me` returned the expected unauthorized category. Evidence contains no identity payloads, session token/cookie values, env values, full URLs, prompts, responses, page bodies, or user payloads.
- OpenRouter provider smoke in Linear `MON-18` passed after `MON-18C`. Earlier OpenAI route diagnostics returned sanitized `403 forbidden`, so the staging `free-small` route was remediated to GLM 5.2-backed candidates in backend commit `d5da17b`. The normal backend smoke then passed with auth/session, `/v1/chat`, `/v1/me` after, and logout all returning `2xx`; SSE delta/done/usage were seen; quota delta was positive; and provider cost guard was confirmed as `admission_path_exercised`. No raw prompt, provider response, provider key, Google id token, session token, user email/profile, full URL, env value, or request payload was recorded.
- Sensitive log review in Linear `MON-19` is completed from sanitized evidence only. Vercel runtime logs for the latest 24h query window showed the expected staging auth/me/chat/logout/health traffic plus root/favicon 404s; credential-like keyword search returned no logs; warning/error/fatal query returned no logs; and source review confirmed the centralized backend logger redacts forbidden fields recursively and truncates long strings. A broad content-keyword runtime-log query was not used as evidence after tool safety rejection; raw log bodies were not exported.
- Staging resource inventory is recorded in [`staging-resource-register.md`](./staging-resource-register.md) without secrets. Owner-reported env injection, latest backend deployment, `/health`, `/healthz`, Supabase migration application, metadata smoke, Upstash smoke, staging OAuth smoke, provider smoke, sensitive log review, exact staging frontend host permission verification, `identity` permission, frontend OAuth code verification, and owner-assisted loaded-extension account smoke are complete. This does not prove public copy, production configuration, or release readiness.
- API contract and OpenAPI agree.
- Local tests pass.
- `.env.example` and configuration docs are current.
- Secrets are not committed or printed.
- `MON-20` frontend staging config, OAuth code, manifest checks, and loaded-extension account smoke are verified: local/staging base URL allowlist, exact staging host permission, `identity` permission, background Google `launchWebAuthFlow` with `response_type=id_token`, popup-lifecycle remediation after the first browser smoke opened the authorization window but did not persist the session, hosted account signed in, account identifier present, free-tier quota displayed, hosted session saved, no `client_secret`, no `getAuthToken`, no production URL, BYOK default preserved, no public copy, `npm test`, `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, and `npm run check:manifests` all passed.
- `MON-21` release build and manifest verification passed locally. `npm test` (`187/187`), `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests` passed. Current zip artifacts are `build/chrome-mv3-prod.zip` and `.output/aviso-0.1.0-chrome.zip`; both zip manifests were inspected and match the approved permission boundary. No broad host permission, localhost host permission, production host permission, `client_secret`, `getAuthToken`, `X-Install-Id`, telemetry, analytics, Sentry, PostHog, Paddle, LemonSqueezy, or production backend pattern was found in the focused boundary scan.
- Production provider validation and public hosted-AI copy remain separate gates. Current `MON-18`, `MON-19`, and `MON-20` approvals do not approve production provider validation or public release.

Before production:

- Staging deployment exists and health endpoints pass.
- Vercel runtime readiness enforcement is deployed and smoke-verified after the `MON-14` backend fix.
- Supabase baseline migration is applied to the dedicated staging project and metadata-only smoke is verified.
- Staging is isolated from production secrets, production database, production payment configuration, and production user data.
- Staging auth is verified with real Google OAuth configuration.
- Provider route is verified with approved provider settings, including a passing SSE done/usage event and confirmed quota/cost guard.
- Rate limits, quota, and cost circuit breakers are verified against staging services.
- Logs are checked for sensitive-data exclusion.
- Rollback plan exists.

## Frontend Gates

Before production:

- Loaded-extension browser OAuth account smoke has sanitized pass evidence and project records do not save id token, session token, email/profile payload, full URL, prompts, responses, env values, or raw logs.
- Hosted/BYOK mode selection is clear.
- Login prompt is just-in-time and does not block BYOK.
- Quota and error states are understandable.
- 401, 402, 403, 429, 502, and 503 are handled with correct user actions.
- API keys still remain local and never go to Aviso backend.
- No public UI implies hosted AI is live before release approval.

## Release Decision

v0.3 can only be considered release-ready when all of the following are true:

- frontend implementation evidence exists,
- backend staging evidence exists,
- cross-repo integration evidence exists,
- privacy and CWS disclosure changes are approved,
- privacy and CWS source updates are deployed/submitted with matching release evidence,
- production host permission uses only the exact approved production backend origin,
- production provider validation is completed with sanitized evidence,
- owner-approved MON-23 execution evidence is complete for production, package, website, CWS, and rollback.

Passing local tests or mock integration is not enough.
