# Aviso v0.3 Release Gates

Status: `planning / privacy-cws-source-updated / mon-23-owner-approved-to-execute / production-backend-smoke-passed / oauth-challenge-gate-merged / upstash-json-parse-fix-deployed / owner-hosted-ai-smoke-passed / cws-listing-disclosure-source-updated / production-frontend-package-verified / website-build-verified / website-review-passed / website-deployed / cws-description-rejected / cws-description-cleaned / latest-package-uploaded / cws-review-state-pending / release-approval-pending / not release-ready`
Updated: 2026-07-07

This file lists the gates required before v0.3 hosted AI can be described as available, approved by Chrome Web Store, or released.

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
| Production backend HTTP smoke | Frontend production package and CWS package evidence | passed with sanitized owner-assisted evidence: `auth_google`, `me_before_chat`, `chat_provider_stream`, `me_after_chat`, and `logout` all `2xx`; SSE `delta`, `done`, and `usage` seen; positive quota delta and cost guard confirmed |
| Frontend production host permission package | CWS package evidence and final release review | completed and refreshed locally on 2026-07-03. Default hosted base URL is `https://aviso-backend-production.vercel.app/v1`; exact host permission is `https://aviso-backend-production.vercel.app/*`; Google OAuth now uses the backend-issued public `client_id` from `/auth/google/challenge` instead of embedding the earlier staging client. Frontend checks passed `npm test` (`216/216`), `npx tsc --noEmit`, `git diff --check`, `npm run package`, a staging OAuth artifact absence scan, and `npm run verify:release-candidate`. Backend challenge contract is deployed from `Aviso-backend` commit `40c8c37`; backend `b2b0b65` added secret-safe Google auth diagnostics; backend `c60b895` fixed Upstash JSON string/object parsing for challenge and idempotency records. Sanitized production challenge smoke returned `2xx` with required fields present, and owner-loaded hosted-AI smoke passed for login, translation, and send-to-AI. The canonical owner-loaded package directory is `build/canonical-chrome-mv3-prod`; the canonical zip is `build/canonical-chrome-mv3-prod.zip`. Manifest guard confirmed manifest key presence, expected Chrome Web Store extension ID shape, production host permission, and no staging backend host, localhost host, or broad backend host permission. Owner later uploaded and submitted `0.1.1` to Chrome Web Store review; 2026-07-07 review rejected product-description keyword wording. Listing-copy cleanup is applied and latest package upload is owner-reported; CWS backend review state remains pending confirmation. It is not approved and not live. |
| Final loaded-extension production smoke | CWS review result and final release review | hosted-AI main flow owner smoke passed on 2026-07-03 after backend `c60b895`: login, translation, and send-to-AI worked in the loaded production candidate. Current latency is recorded as a next-version optimization item, not a current release blocker. This does not replace Chrome Web Store approval evidence or owner release approval. |
| Host / ordinary permission approval | Any backend URL or OAuth permission in extension manifest | approved and verified for `identity` plus exact production hosted backend host `https://aviso-backend-production.vercel.app/*`; no broad backend host permission, staging backend host permission, or localhost host permission is present in the candidate manifests |
| Privacy policy update | Public hosted AI claim or CWS update | source updated in `MON-22`, release-prep copy refreshed on 2026-07-02, owner website review passed on 2026-07-03, and Vercel production deployment completed from frontend commit `b6d7b65`; future website/CWS copy changes require separate approval |
| CWS data disclosure update | Store review | draft added in [`cws-disclosure-draft.md`](./cws-disclosure-draft.md), CWS listing copy refreshed on 2026-07-02, and owner submitted `0.1.1` to Chrome Web Store review; 2026-07-07 rejection cited product-description provider keyword wording. Listing copy cleanup is applied and latest package upload is owner-reported; review state remains pending confirmation |
| Backend staging deployment | Cross-repo integration test | backend staging health verified; GLM route remediation commit `d5da17b` pushed; provider smoke passed in `MON-18C`; integration smokes remain pending |
| Real provider validation | Staging or production hosted AI | staging provider route verified in `MON-18C`; production authenticated HTTP smoke also passed with SSE done/usage and quota/cost guard confirmation; final loaded-extension production smoke remains separate |
| Auth provider validation | Staging or production sign-in | staging Google OAuth smoke verified in `MON-17`; production authenticated HTTP smoke verified auth/session/logout path with sanitized owner-assisted evidence; final loaded-extension production smoke remains separate |
| Quota and cost controls | Staging hosted AI | Upstash quota/idempotency smoke verified in `MON-16`; provider quota/cost guard confirmed in `MON-18C` with positive quota delta and `admission_path_exercised` |
| Billing provider gate | Paid hosted AI | approved excluded from first v0.3 hosted-AI release / later owner gate |
| Release owner approval | Public release | MON-23 owner decisions approved to execute; production, package, website, and CWS submission evidence exists; Chrome Web Store review result, final owner approval, and live evidence pending |

## Privacy And Disclosure Gates

Before hosted AI is public:

- Privacy policy source distinguishes BYOK and hosted paths; website publication passed the 2026-07-03 owner review/deployment gate.
- Source copy now discloses that hosted request content passes through Aviso backend and upstream model provider services.
- Source copy now records that the backend does not persist raw prompt, raw response, page body, screenshot/base64, clipboard content, user BYOK API keys, or full URLs.
- Source copy now records the current metadata retention window as 30 days.
- Chrome Web Store disclosure draft exists in [`cws-disclosure-draft.md`](./cws-disclosure-draft.md), and owner submitted `0.1.1` to Chrome Web Store review; 2026-07-07 rejection cited product-description provider keyword wording. Listing copy cleanup is applied and latest package upload is owner-reported; approval remains pending until the backend review state and review result are confirmed.
- Upstream provider data-retention/logging configuration still needs final owner review before production release.

Owner-confirmed first-slice boundary:

- Hosted requests pass through Aviso backend and OpenRouter / downstream providers.
- Aviso backend must not persist raw prompt, raw response, page body, screenshot/base64, clipboard content, API keys, or full URLs.
- Metadata retention is 30 days.
- These decisions do not publish hosted-AI public copy or Chrome Web Store disclosure changes.
- `MON-22` updated source copy and disclosure drafts only. The later 2026-07-03 owner-approved website deployment publishes the website copy; owner later submitted the Chrome Web Store disclosure with `0.1.1`, but this still does not approve release.

## Permission Gates

Before the extension calls hosted backend:

- Decide backend domain. The production candidate backend base URL is `https://aviso-backend-production.vercel.app/v1`.
- Review exact `host_permissions`. The production candidate host permission is `https://aviso-backend-production.vercel.app/*`.
- Confirm no broad host permission is added.
- Confirm command palette still does not perform web search or remote link-body fetching.
- Confirm screenshot/image hosted path remains out of v0.3 public scope unless separately approved.

Owner confirmed `MON-20` for the exact staging backend origin, minimal host permission, and staging frontend OAuth identity-token handling. Owner later approved `MON-23` execution decisions for production preparation, website/CWS preparation, production OAuth/provider validation, and billing exclusion. The 2026-06-27 production candidate package uses only the exact production backend host permission `https://aviso-backend-production.vercel.app/*`, and no broad host permission is approved.

## Release Candidate Verification Entrypoint

Run the reproducible local package gate before treating production candidate package evidence as current:

```bash
npm run verify:release-candidate
```

The command runs `npm test`, `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package`, and `npm run check:manifests`, then performs a focused forbidden-claim scan and basic secret/artifact hygiene scan. `npm run package` is the canonical production package entrypoint: it builds WXT, replaces `build/canonical-chrome-mv3-prod` with `.output/chrome-mv3`, injects the Chrome Web Store public key into `build/canonical-chrome-mv3-prod/manifest.json`, and writes `build/canonical-chrome-mv3-prod.zip`. Plasmo `npm run build` writes `build/chrome-mv3-prod` separately, so running Plasmo after packaging must not alter the canonical directory or zip. The latest refreshed pass is 2026-07-02 and produced the owner-validation package currently intended for manual refresh/loading.

The only owner-loaded release candidate directory is `build/canonical-chrome-mv3-prod`; the only canonical zip is `build/canonical-chrome-mv3-prod.zip`. `.output/chrome-mv3` is an intermediate WXT build output, and `build/chrome-mv3-prod` is the Plasmo default output; neither is the directory a smoke tester should load. The gate fails if the canonical manifest has `background.service_worker` set to `static/background/index.js`, lacks `key`, derives an unexpected Chrome Web Store extension ID, or otherwise looks like stale/direct Plasmo output.

Smoke testers should confirm they are loading the regenerated canonical directory, without printing public key contents:

```bash
npm run package
node -e 'const m=require("./build/canonical-chrome-mv3-prod/manifest.json"); console.log({loadDir:"build/canonical-chrome-mv3-prod", keyPresent:Boolean(m.key), background:m.background?.service_worker})'
npm run check:manifests
```

Expected shape: `loadDir` is `build/canonical-chrome-mv3-prod`, `keyPresent` is `true`, `background` is `background.js`, and `npm run check:manifests` passes. Do not load `.output/chrome-mv3` for release smoke.

This entrypoint does not deploy the website, submit Chrome Web Store changes, call real providers, read `.env` values, inspect production secrets, print the public key, or turn hosted AI into a live/public claim. If it fails on `Operation not permitted`, dependency registry/DNS errors, or missing build artifacts, classify that as an environment or artifact-preparation blocker until rerun in an allowed local environment.

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
- `MON-21` release build and manifest verification passed locally for the staging-approved boundary. `npm test` (`187/187`), `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests` passed. The historical artifacts at that time were `build/chrome-mv3-prod.zip` and `.output/aviso-0.1.0-chrome.zip`; the current canonical zip path is `build/canonical-chrome-mv3-prod.zip`.
- 2026-06-27 production candidate package verification passed locally. `npm test` (`202/202`), `npx tsc --noEmit`, `git diff --check`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests` passed. Historical zip artifacts at that time were `build/chrome-mv3-prod.zip` and `.output/aviso-0.1.0-chrome.zip`; the current canonical zip path is `build/canonical-chrome-mv3-prod.zip`. Both zip manifests were inspected and contain `https://aviso-backend-production.vercel.app/*` with no staging backend host permission, no localhost host permission, and no broad backend host permission. Focused boundary scan found no staging backend pattern, `api.aviso`, `client_secret`, `getAuthToken`, `X-Install-Id`, telemetry, analytics, Sentry, PostHog, Paddle, or LemonSqueezy pattern in source/config/build outputs.
- 2026-07-02 production candidate package verification refreshed locally through `npm run verify:release-candidate`. `npm test` (`214/214`), `npx tsc --noEmit`, WXT/Plasmo builds, canonical packaging, manifest guard, forbidden-claim scan, and secret/artifact hygiene scan passed. The canonical owner-loaded directory is `build/canonical-chrome-mv3-prod`; the canonical zip is `build/canonical-chrome-mv3-prod.zip`.
- 2026-06-27 final loaded-extension production smoke was attempted locally and is blocked as release evidence. The isolated Google Chrome launch did not register the unpacked candidate extension from command-line loading, and a local unpacked extension ID would not prove the Chrome Web Store production extension ID's OAuth redirect path. The next validation should use the canonical `build/canonical-chrome-mv3-prod` directory already produced by the 2026-07-02 release-candidate gate.
- Public website deployment and final loaded-extension production smoke are complete. Chrome Web Store submission/disclosure and release owner approval remain separate gates. Current production package evidence does not make hosted AI live through Chrome Web Store.

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

- Staging loaded-extension browser OAuth account smoke has sanitized pass evidence and project records do not save id token, session token, email/profile payload, full URL, prompts, responses, env values, or raw logs.
- Production loaded-extension hosted-AI main-flow smoke passed for login, translation, and send-to-AI on 2026-07-03. Broader website/CWS/release approval evidence remains pending.
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
- production provider validation has sanitized HTTP-smoke evidence and owner-loaded hosted-AI smoke evidence is complete for login, translation, and send-to-AI,
- owner-approved MON-23 execution evidence is complete for production, package, website, CWS, and rollback.

Passing local tests or mock integration is not enough.
