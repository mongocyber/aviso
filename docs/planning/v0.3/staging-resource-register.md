# Aviso v0.3 Staging Resource Register

Status: `docs-only / resources-created / env-injection-owner-reported / staging-deployed / readiness-guard-deployed / health-verified / supabase-migration-applied / supabase-smoke-verified / upstash-smoke-verified / upstash-quota-concurrency-verified / oauth-smoke-verified / provider-smoke-verified / glm-backend-smoke-passed / quota-cost-guard-confirmed / sensitive-log-review-completed / mon-20-frontend-oauth-browser-smoke-passed / mon-21-release-build-manifest-verified / mon-22-privacy-cws-source-updated / mon-27-ui-smoke-passed / mon-26-complete / mon-29-main-merged / not live`
Updated: 2026-06-26

This file records non-secret staging resource metadata for v0.3 hosted AI coordination across the extension and backend repositories. It is not a secret store, deployment proof, or release approval.

## Rules

- Do not record API keys, OAuth client secrets, Supabase service-role keys, Upstash tokens, provider tokens, `.env` values, user emails, raw prompts, raw responses, page bodies, screenshots, base64 payloads, or private URLs.
- Record only resource names, public domains, non-secret identifiers when they are needed for coordination, and status labels.
- Keep `created`, `configured`, `deployed`, `verified`, and `live` separate.
- Linear `MON-12` remains the execution log for staging resource setup. This file is the product-side register.

## Status Labels

| Label | Meaning |
| --- | --- |
| `planned` | Resource or setting is required but not created. |
| `created` | Resource exists in the external service. |
| `env pending` | The required backend environment variable has not been injected or redeployed. |
| `deployed` | Backend deployment has been created with the intended configuration. |
| `verified` | Behavior has been checked against staging services. |
| `blocked` | Work cannot continue without an owner action, secret handling step, or separate approval. |
| `not live` | Not public, not production, and not approved for Chrome Web Store or public copy. |

## Resource Inventory

| Area | Resource | Non-secret details | Current status | Next action |
| --- | --- | --- | --- | --- |
| Backend hosting | Vercel project `aviso-backend-staging` | Staging backend domain: `https://aviso-backend-staging.vercel.app`; GLM route remediation commit `d5da17b`; backend diagnostic commit `2117eef` | `created / deployed / health verified / readiness guard deployed / provider smoke verified / sensitive log review completed / MON-20 frontend OAuth browser smoke passed / not live` | Do not promote to production or public copy. Production remains a separate owner gate. |
| Database | Supabase project `aviso-staging` | Project ref: `yvrhzyduxxtdmbppuavi`; region: `us-east-1`; project URL: `https://yvrhzyduxxtdmbppuavi.supabase.co` | `created / env owner-reported / migration applied / metadata smoke verified / synthetic cleanup verified / not live` | Supabase gate complete; provider and log review gates remain. |
| Cache and rate limits | Upstash Redis `aviso-staging` | Provider region: AWS `us-east-1`; free-tier staging database | `created / env owner-reported / smoke verified / quota concurrency verified / synthetic cleanup verified / not live` | Upstash gate complete, including BE12 real Redis quota concurrency; production remains a separate owner gate. |
| Provider routing | OpenRouter staging key `aviso-staging` | Staging key created with constrained spend cap; exact key is not recorded | `created / env owner-reported / key-status pass / GLM 5.2 backend smoke pass / sensitive log review completed / not live` | Provider and log-review gates are complete for staging; production provider validation remains separate. |
| Auth | Google OAuth client `Aviso Staging` | Type: Web application; redirect URI: `https://modgbbapinmnablllapfjeekmichnifg.chromiumapp.org/`; support email selected by owner; public client ID is embedded in the staging frontend OAuth config; no client secret is stored in the frontend repo | `created / env owner-reported / backend smoke verified / frontend OAuth code verified / browser OAuth smoke verified / not live` | Auth/session gate is complete for backend staging and loaded-extension frontend staging; production OAuth remains a separate owner gate. |
| Extension origin | Loaded local Aviso extension | Current staging extension ID: `modgbbapinmnablllapfjeekmichnifg`; expected origin: `chrome-extension://modgbbapinmnablllapfjeekmichnifg`; approved extension host permission: `https://aviso-backend-staging.vercel.app/*`; approved ordinary permission addition: `identity` | `identified / env owner-reported / exact staging host permission verified / identity permission verified / browser OAuth smoke verified / not live` | Keep backend origin allowlist separate from production host permission and public release approval. |
| Session signing | Backend session secret | Secret generated locally and stored only in Vercel env by owner flow; value is not recorded | `created / env owner-reported / OAuth smoke verified / not live` | Keep production session configuration as a separate owner gate. |
| Quota placeholders | Free hosted AI limits | Development placeholders: monthly `1,000,000` tokens and daily `50,000` tokens; not public copy | `configured for staging / quota smoke verified / provider cost guard confirmed / not public` | Keep quota numbers out of public copy until release wording is approved. |

## Required Env Injection Checklist

The exact values belong only in the Vercel project environment, not in this repository.

| Env group | Status | Notes |
| --- | --- | --- |
| `APP_ENV=staging` | `owner-reported configured` | Must be explicit for staging readiness; value is not repeated here. |
| `ALLOWED_ORIGINS` | `owner-reported configured` | Should include the current staging extension origin. Add website origins only when needed. |
| `GOOGLE_OAUTH_CLIENT_ID` | `owner-reported configured` | Client ID is non-secret but remains in Vercel env rather than committed. |
| `SESSION_SIGNING_SECRET` | `owner-reported configured` | Secret; never record here. |
| Supabase URL and service credentials | `owner-reported configured` | Secrets must stay in Vercel env. |
| Upstash REST URL/token | `owner-reported configured` | Secrets must stay in Vercel env. |
| OpenRouter API key | `owner-reported configured` | Secret; constrained staging key only. |
| Quota and cost caps | `owner-reported configured` | Use staging placeholders until production policy is approved. |

## Verification Gates

Do not mark staging as verified until all applicable checks pass and evidence is recorded without secrets.

| Gate | Current status | Evidence to record |
| --- | --- | --- |
| Backend redeploy with staging env | `deployed / health verified` | 2026-06-20 deployment `dpl_4dARFbTvyBNAH53oapHSQZgmCN5U` for backend commit `aab8d74` reached `READY`; `/health` and `/healthz` returned HTTP 200 with `api: v1` and `contract: 0.3.0`. |
| Readiness guard in Vercel runtime | `deployed / smoke verified` | Linear [`MON-14`](https://linear.app/mongocyber/issue/MON-14/v03-be10f-verify-vercel-runtime-readiness-guard) added shared readiness bootstrap for local Node and Vercel runtime. Latest staging deployment includes that fix, and runtime logs for the smoke window showed only two HTTP 200 health requests with no readiness-blocked error. |
| Supabase schema/migration | `migration applied / metadata smoke verified / synthetic cleanup verified` | Linear [`MON-15`](https://linear.app/mongocyber/issue/MON-15/v03-be11a-supabase-schema-and-migration-staging-gate) prepared baseline migration `20260620_001_aviso_staging_schema.sql` and runbook. Linear [`MON-24`](https://linear.app/mongocyber/issue/MON-24/v03-be11a-2-supabase-migration-apply-and-metadata-smoke-gate) applied the migration through Supabase Dashboard SQL Editor against staging project `aviso-staging` / `yvrhzyduxxtdmbppuavi`; migration returned `Success`; metadata smoke verified six-table presence, RLS enabled state, no client policies, prefix IDs, and synthetic insert paths; cleanup verification targeted 1 synthetic `test:mon24-smoke:` user and left 0 residual synthetic user/session/usage/subscription/abuse records. |
| Upstash adapter | `smoke verified / quota concurrency verified / synthetic cleanup verified` | Linear [`MON-16`](https://linear.app/mongocyber/issue/MON-16/v03-be11b-upstash-quota-and-idempotency-staging-smoke) has sanitized owner-provided pass evidence for quota counter, quota float counter, chat idempotency, billing idempotency, association set, positive TTLs, and cleanup of 5 synthetic `aviso:mon16` keys. [`V03-BE12`](../../issues/V03-BE12-real-redis-quota-concurrency-gate.md) has sanitized owner-assisted staging Upstash evidence for concurrent `reserveAdmission`: request limit `7/17`, token-window limit `5/19`, daily quota limit `5/19`, monthly quota limit `4/20`, all TTL categories positive, and cleanup of 16 synthetic `aviso:be12` keys. Evidence excludes Redis URL/token, request payloads, full keys, and user data. |
| Google OAuth sign-in | `smoke verified / synthetic evidence accepted` | Linear [`MON-17`](https://linear.app/mongocyber/issue/MON-17/v03-be11c-google-oauth-staging-validation) is completed and CTO-accepted from sanitized owner-provided evidence. The staging smoke verified `auth_google`, `me_authenticated`, `logout`, expected unauthorized behavior after logout, and OAuth audience alignment. Evidence includes endpoint category, pass/fail, HTTP status class, session-token presence category, sanitized error class, and audience alignment only; no id tokens, profile payloads, user emails, session tokens, cookies, full URLs, or env values. |
| OpenRouter provider smoke | `verified / GLM 5.2 backend smoke pass / SSE done usage present / quota cost guard confirmed` | Linear [`MON-18`](https://linear.app/mongocyber/issue/MON-18/v03-be11d-openrouter-provider-smoke-and-cost-guard) passed after `MON-18C`. Backend `/v1/chat` smoke returned pass for `auth_google`, `me_before_chat`, `chat_provider_stream`, `me_after_chat`, and `logout`; SSE delta/done/usage were seen; quota delta was positive; and cost guard was confirmed as `admission_path_exercised`. Evidence excludes provider key, Google id token, session token, user email/profile, raw prompt, raw response, full URL, env values, and request payload. |
| Sensitive logging review | `completed / sanitized evidence only` | Linear `MON-19` reviewed the latest Vercel 24h runtime overview, credential-like keyword query, warning/error/fatal query, and backend logger/source boundary. The overview showed expected staging auth/me/chat/logout/health paths plus root/favicon 404s; credential-like keyword and warning/error/fatal queries returned no logs. Source review confirmed recursive redaction of raw content, URLs, emails, tokens, API keys, screenshots, clipboard, and related fields. Raw log bodies were not exported, and a broad content-keyword runtime-log query was not used as evidence after tool safety rejection. |
| Frontend staging config and host permission | `config / build / manifest verified` | Linear `MON-20` owner-approved the exact staging backend origin and minimal host permission. The extension config allows local or `https://aviso-backend-staging.vercel.app/v1`, manifests allow only `https://aviso-backend-staging.vercel.app/*`, BYOK remains the default path, and `npm test`, `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, and `npm run check:manifests` passed. |
| Frontend Google OAuth flow | `background remediation / build / manifest verified / browser smoke verified` | Owner approved staging frontend `chrome.identity` / identity-token handling. The first loaded-extension smoke opened the Google authorization window and preserved BYOK availability, but showed popup lifecycle interruption before session persistence. The remediated flow runs OAuth in the background service worker: popup sends `HOSTED_GOOGLE_SIGN_IN`, background uses `launchWebAuthFlow` with Google `response_type=id_token`, posts the id token once to `/v1/auth/google`, clears the temporary token variable, calls `/v1/me`, and stores hosted session/account state in `chrome.storage.local`. Tests verify no `client_secret`, no `getAuthToken`, no production URL, no `X-Install-Id`, no public copy, and manifest `identity` permission. `npm test` (`187/187`), `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, and `npm run check:manifests` passed. After extension reload, owner-assisted browser smoke confirmed hosted account signed in, account identifier present, free-tier quota displayed, and hosted session saved. Project records do not include id token, session token, email/profile payload, full URL, prompts, responses, or env values. |
| Frontend hosted service selection UX | `implemented / tests and builds passed / browser smoke passed / not live` | Aviso AI is selectable in the default model dropdown and quick task service selector, and hosted account controls are placed as a service configuration beside BYOK provider configs. BYOK remains available without login; explicit BYOK route selection is preserved; anonymous free quota is not implemented. `npm test` (`189/189`), `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, and `npm run check:manifests` passed. Owner-assisted loaded-extension UI smoke passed in `MON-27` and was synced Done. |
| Release build artifacts | `release build / zip / manifest verified locally` | `MON-21` local gate passed on 2026-06-23. `npm test` (`187/187`), `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests` passed. Current artifacts: `build/chrome-mv3-prod.zip` and `.output/aviso-0.1.0-chrome.zip`. Zip manifest inspection confirmed the approved ordinary permissions, approved host permissions, MV3 background service worker, `zh_CN` locale, and `popup.html`; no broad host, localhost host permission, or production host permission is present. |
| Privacy and CWS disclosure source | `source updated / draft created / checks passed / not submitted / not live` | `MON-22` updated website privacy/data/core/limitations docs, homepage privacy copy, internal privacy/security record, release-gate/status docs, and [`cws-disclosure-draft.md`](./cws-disclosure-draft.md). The source now distinguishes BYOK direct-provider from optional hosted AI and records the hosted no-persistent-raw-content boundary. `git diff --check` on touched files and `website` build passed. This does not deploy website changes, submit Chrome Web Store disclosure, approve production, or approve release. |

## Cross-Repo Sync

| Destination | Status | Notes |
| --- | --- | --- |
| Linear `MON-12` | `in progress` | Execution log for resource creation and blockers. |
| Linear `MON-16` | `completed / CTO accepted` | Tracks the Upstash smoke gate. Sanitized pass evidence is recorded in Linear, and the issue is closed as Done. |
| Linear `MON-17` | `completed / CTO accepted` | Tracks Google OAuth staging validation. Sanitized evidence verifies the staging auth/session flow without exposing identity payloads, session values, env values, full URLs, prompts, responses, page bodies, or user payloads. |
| Linear `MON-18` | `completed / provider smoke verified / cost guard confirmed` | Tracks OpenRouter provider smoke and cost guard. `MON-18C` passed after GLM 5.2 route remediation. |
| Linear `MON-19` | `completed / sensitive log review accepted` | Tracks staging sensitive log review. Evidence stayed category-level: Vercel 24h runtime overview, credential-like no-hit query, warning/error/fatal no-hit query, and backend logger/source boundary review. |
| Linear `MON-20` | `frontend OAuth code/build/manifest verified / browser smoke passed / Linear Done / not live` | Tracks exact staging backend config, host permission, and staging frontend OAuth code. This does not mark hosted AI live; public copy, production, and release approval remain separate gates. |
| Linear `MON-21` | `release build / zip / manifest verified locally / Linear Done / not live` | Tracks release build and manifest verification. This does not approve public copy, CWS submission, production, or release. |
| Linear `MON-22` | `completed / CTO accepted / not live` | Tracks hosted AI privacy website and CWS disclosure update. Linear acceptance comment `fa9e2123-3743-4d54-af8f-74ec39d5adda` was created, and the issue was marked Done. This does not approve website deployment, Chrome Web Store submission, production, paid hosted AI, or release. |
| Linear `MON-25` | `completed / diagnostic failed with 403 forbidden / not provider verification` | Tracks a narrow direct OpenRouter model-access diagnostic for the MON-18 upstream `403 forbidden` blocker. Owner-approved execution returned sanitized `403 forbidden` for `openai/gpt-4o-mini`; it was diagnostic evidence only and did not by itself mark MON-18 Done or approve frontend integration. |
| `Aviso-backend` docs | `synced through backend docs commit 717bdc6 / not live` | Backend repo keeps the operational source of truth for env names, deployment runbook, migrations, and readiness evidence. Backend main now has the BE12 docs sync; product-side docs keep production and release approval as separate gates. |
| `Aviso` v0.3 docs | `this file` | Product-side coordination record for frontend/backend gates and owner decisions. |

## Stop Lines

Stop for owner approval before:

- adding or changing extension `host_permissions`,
- injecting production secrets or using production data,
- running database migrations against staging,
- running real provider or OAuth validation beyond the explicitly approved staging smokes and frontend OAuth browser smoke,
- enabling billing or paid hosted AI,
- deploying public website changes or submitting Chrome Web Store disclosure,
- promoting staging to production.
