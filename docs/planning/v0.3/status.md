# Aviso v0.3 Status

Status: `execution-started / cross-repo / staging-deployed / readiness-guard-deployed / health-verified / supabase-migration-applied / supabase-smoke-verified / upstash-smoke-verified / redis-quota-concurrency-verified / oauth-smoke-verified / provider-smoke-verified / glm-backend-smoke-passed / quota-cost-guard-confirmed / sensitive-log-review-completed / mon-20-frontend-oauth-browser-smoke-passed / mon-21-release-build-manifest-verified / mon-22-privacy-cws-source-updated / hosted-service-selection-ux-code-verified / mon-27-ui-smoke-passed / mon-26-complete / mon-29-main-merged / mon-29-local-validation-passed / not release-ready`
Updated: 2026-06-26

## Current Conclusion

v0.3 hosted AI has moved from planning closeout into cross-repo execution. Frontend local-only slices through `V03-FE06` remain completed and CTO-accepted, while backend staging gates `MON-24`, `MON-16`, `MON-17`, `MON-18`, and `MON-19` are completed and CTO-accepted. `V03-BE12` also passed the real staging Upstash Redis quota concurrency gate with sanitized owner-assisted evidence: request limit `7/17`, token-window limit `5/19`, daily quota limit `5/19`, monthly quota limit `4/20`, all TTL categories positive, and 16 synthetic `aviso:be12` keys cleaned. `MON-18` completed the staging provider smoke after `MON-18C`: `free-small` was routed to the GLM 5.2-backed model chain, staging `/health` passed, and the normal backend `/v1/chat` smoke returned `status: pass` with `auth_google`, `me_before_chat`, `chat_provider_stream`, `me_after_chat`, and `logout` all passing; provider SSE `delta`, `done`, and `usage` were seen; quota delta was positive; cost guard was confirmed as `admission_path_exercised`. `MON-19` reviewed the staging runtime log window and backend logging boundary without exporting raw logs: the Vercel 24h overview contained only the expected auth/me/chat/logout/health paths plus root/favicon 404s, credential-like keyword search returned no logs, warning/error/fatal query returned no logs, and source review confirmed the centralized logger redacts raw content, URLs, emails, tokens, API keys, screenshots, clipboard, and related sensitive fields. Evidence was kept sanitized and did not record provider key, Google id token, session token, user email/profile, raw prompt, raw response, full URL, env values, request payload, or raw log body. `MON-20` now has owner approval for the exact staging backend origin, minimal host permission, and frontend OAuth token handling only for staging: frontend config points hosted AI to `https://aviso-backend-staging.vercel.app/v1`, extension manifests allow only `https://aviso-backend-staging.vercel.app/*`, ordinary permissions now include `identity`, the background service worker uses `chrome.identity.launchWebAuthFlow` with Google `response_type=id_token`, exchanges the id token with staging, fetches `/me`, and stores hosted session/account state while the popup only triggers the background flow and rereads local session state. A first loaded-extension smoke confirmed the Google authorization window opens and BYOK remains available, but exposed a popup-lifecycle interruption before this background remediation. After the remediation and extension reload, owner-assisted browser smoke confirmed the hosted account is signed in, an account identifier is present, free-tier quota values are displayed, and the hosted session is saved. `MON-20`, `MON-21`, and staging resource control gate `MON-12` are synced to Linear Done. `MON-21` release build and manifest verification passed locally: `npm test`, `npx tsc --noEmit`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests` passed; Plasmo and WXT zip manifests were inspected and match the approved permission boundary. `MON-22` updated source-level website/privacy/CWS disclosure materials to distinguish BYOK direct-provider from optional hosted AI, disclose hosted transit through Aviso backend and upstream providers, record no persistent raw prompt/response/page body/screenshot/base64/clipboard/BYOK API key/full URL storage, create a Chrome Web Store disclosure draft, pass `git diff --check` and `website` build, and close Linear `MON-22` as Done. After `MON-22`, a P0 frontend UX adjustment made Aviso AI selectable in the default model dropdown and quick task service selector, moved hosted account controls into the service configuration list beside BYOK provider configs, preserved explicit BYOK routing, and kept anonymous free quota out of scope. `MON-27` loaded-extension smoke is passed and synced Done in Linear. `MON-26` hosted AI sign-in UX redesign and runtime routing consistency fix is completed, merged to `main`, and Linear Done. `MON-29 / V03-FE10` AI unavailable guidance cleanup is merged to `main` with local validation passed: command palette, floating window, and selection toolbar now use structured guidance when AI cannot run, while local command-palette search remains usable and floating follow-up send stays disabled in unavailable states. Project records do not save client secret, raw id token, email/profile payload, session token, prompt, response, env value, full URL, API key, screenshot/base64 payload, or raw account identity/profile payload. v0.3 is still not release-ready or public.

## Current State

| Area | State |
| --- | --- |
| Product spec | created in this folder |
| Requirements closeout | reviewed / ready for issue planning in [`requirements-closeout.md`](./requirements-closeout.md) |
| Acceptance criteria | documented in [`acceptance-criteria.md`](./acceptance-criteria.md) |
| Frontend UX states | documented in [`frontend-ux-states.md`](./frontend-ux-states.md) |
| Owner closeout decisions | accepted in [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md) |
| Cross-repo plan | created in this folder |
| Release gates | created in this folder |
| Environment protocol | accepted in [`../../decisions/0002-environments-and-release-flow.md`](../../decisions/0002-environments-and-release-flow.md) |
| Backend repository | cloned locally at `/Users/jonyliu/Documents/01_Projects/Aviso-backend` |
| Backend Phase 1 logic | implemented with mocks / not deployed |
| Backend billing mock path | implemented with mocks / real billing not configured |
| Backend usage, alerting, and abuse seams | implemented with mocks / real ops integrations not configured |
| Backend staging readiness guard | `MON-8` completed / staging development approved / deployed and smoke-verified through `MON-14` |
| Backend persistence adapters | `MON-9` completed / adapter seam implemented / Supabase schema verified through `MON-24` / Upstash smoke verified through `MON-16` |
| Staging resource register | non-secret inventory updated in [`staging-resource-register.md`](./staging-resource-register.md) / resources created / env injection owner-reported / latest backend deployed / health verified / frontend OAuth browser smoke passed / release gates pending |
| First execution environment | local mock / local backend foundation plus owner-approved staging backend config; no production |
| Frontend integration | local client foundation, just-in-time sign-in seam, account/quota display, backend local harness, local hosted chat routing seam, hosted error/fallback handling, owner-approved staging backend config / host permission, staging OAuth frontend code, and hosted service selection UX implemented |
| API contract review | `V03-SH01` and `V03-SH02` completed / CTO accepted; FE05 tracked in Linear as `MON-6` |
| Contract consumption decision | small local typed wrapper aligned with `@aviso/contract`; base URL allowlist limited to local and staging; `Idempotency-Key` included; `X-Install-Id` excluded unless owner-approved |
| Permission boundary | approved and verified only for `identity` and `https://aviso-backend-staging.vercel.app/*` beyond the existing provider/BYOK permissions; no production host permission |
| Backend staging | Vercel staging health verified; readiness enforcement deployed; Supabase migration applied and metadata smoke verified in `MON-24`; Upstash smoke verified in `MON-16`; OAuth smoke verified in `MON-17`; provider smoke verified in `MON-18C`; sensitive log review completed in `MON-19` |
| Real provider validation | `MON-18C` completed: backend `/v1/chat` smoke passed for `free-small` through GLM 5.2-backed route with SSE delta/done/usage seen, positive quota delta, and cost guard confirmed |
| Frontend staging integration | `MON-20` config / host permission / background OAuth remediation / browser runtime OAuth account smoke passed; `MON-21` release build / zip / manifest gate passed and synced Done; hosted service selection UX code/tests/build passed; `MON-27` loaded-extension UI smoke passed and synced Done; `MON-26` merged and Done; `MON-29` merged to main / local validation passed |
| Public privacy / CWS wording | source updated for hosted AI in `MON-22` / not deployed / CWS draft not submitted |

## Next Recommended Gates

1. Keep BYOK as the default available path while hosted AI remains staging-only.
2. Rebase / merge the website provider-logo branch only if it stays within approved source-copy scope and does not deploy public changes.
3. Run the next release gate only after explicit approval: `MON-23` production environment and release approval gate.
4. Do not deploy website changes, submit Chrome Web Store disclosure, create production backend resources, run production provider validation, or publish release copy until owner approval.

## Not Ready Because

- Frontend hosted-AI implementation now has staging backend config, exact staging host permission, background OAuth sign-in remediation, and owner-assisted loaded-extension account smoke evidence, but hosted AI remains staging-only.
- BYOK remains the default path; hosted AI now has source-level privacy/CWS disclosure updates, but deployment/submission, production decisions, and owner release approval are still required before public use.
- Backend staging is deployed and health-verified, Supabase migration + metadata smoke are verified in `MON-24`, and Upstash quota/idempotency smoke is verified in `MON-16`.
- Real staging has passed provider validation in `MON-18C` and sensitive log review in `MON-19`; `MON-20` code/build/manifest checks, popup-lifecycle remediation, and loaded-extension account smoke are complete; `MON-21` release build / zip / manifest verification is complete locally.
- No production backend domain or host permission is approved.
- Google OAuth staging validation is verified in `MON-17`; `MON-18` provider validation is approved only for the staging smoke and does not approve production provider validation.
- No production persistent stores, billing provider, provider billing source, or alert channel are configured; staging Supabase and Upstash are verified only for the v0.3 staging gates.
- Privacy policy and Chrome Web Store data disclosure are updated only in source/draft form for hosted AI; they are not deployed, submitted, or release-approved.
- Owner has not approved v0.3 release.
