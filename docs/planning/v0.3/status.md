# Aviso v0.3 Status

Status: `execution-started / cross-repo / staging-deployed / readiness-guard-deployed / health-verified / supabase-migration-applied / supabase-smoke-verified / upstash-smoke-verified / redis-quota-concurrency-verified / oauth-smoke-verified / provider-smoke-verified / glm-backend-smoke-passed / quota-cost-guard-confirmed / sensitive-log-review-completed / mon-20-frontend-oauth-browser-smoke-passed / mon-21-release-build-manifest-verified / mon-22-privacy-cws-source-updated / hosted-service-selection-ux-code-verified / mon-27-ui-smoke-passed / mon-26-complete / mon-29-main-merged / mon-29-local-validation-passed / mon-23-owner-approved-to-execute / production-backend-smoke-passed / production-frontend-package-built / production-loaded-extension-smoke-attempted-blocked / not release-ready`
Updated: 2026-06-28

## Current Conclusion

v0.3 hosted AI has moved from staging evidence into production candidate packaging. Frontend local-only slices through `V03-FE06`, backend staging gates `MON-24`, `MON-16`, `MON-17`, `MON-18`, `MON-19`, and real Redis concurrency gate `V03-BE12` remain completed with sanitized evidence. `MON-20`/`MON-21` completed staging frontend OAuth, exact staging host permission, build, zip, and manifest verification; `MON-22`, `MON-26`, `MON-27`, and `MON-29` completed source-level privacy/CWS updates and UX cleanup without marking hosted AI live. `MON-23` owner decisions approved production execution. Production backend origin is now `https://aviso-backend-production.vercel.app`; authenticated production HTTP smoke passed `auth_google`, `me_before_chat`, `chat_provider_stream`, `me_after_chat`, and `logout`, with SSE `delta` / `done` / `usage`, positive quota delta, and cost guard confirmed. The frontend production candidate package now defaults hosted AI to `https://aviso-backend-production.vercel.app/v1`, uses exact host permission `https://aviso-backend-production.vercel.app/*`, aligns the production Google OAuth client ID, and invalidates older staging hosted sessions through the base-URL allowlist. 2026-06-27 local validation passed: `npm test` (`202/202`), `npx tsc --noEmit`, `git diff --check`, `npm run build:wxt`, `npm run build:plasmo`, `npm run package:plasmo`, `npm run zip:wxt`, and `npm run check:manifests`; candidate artifacts are `build/chrome-mv3-prod.zip` and `.output/aviso-0.1.0-chrome.zip`. Zip manifest inspection confirmed the production host permission and no staging backend host, localhost host, or broad backend host permission. A follow-up local attempt to start an isolated Chrome profile with the candidate unpacked extension was blocked as final release evidence: official Google Chrome ignored command-line unpacked extension loading, and the candidate manifest has no fixed `key`, so a local unpacked extension ID cannot stand in for the Chrome Web Store production extension ID. This is still not Chrome Web Store submission, website deployment, final loaded-extension production smoke, release approval, or live evidence. Project records do not save client secret, raw id token, email/profile payload, session token, prompt, response, env value, full URL, API key, screenshot/base64 payload, or raw account identity/profile payload.

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
| First execution environment | local mock / local backend foundation / staging evidence completed / production candidate package built; not live |
| Frontend integration | local client foundation, just-in-time sign-in seam, account/quota display, backend local harness, hosted chat routing, hosted error/fallback handling, staging OAuth evidence, production backend config / host permission, and hosted service selection UX implemented |
| API contract review | `V03-SH01` and `V03-SH02` completed / CTO accepted; FE05 tracked in Linear as `MON-6` |
| Contract consumption decision | small local typed wrapper aligned with `@aviso/contract`; base URL allowlist limited to local and production; `Idempotency-Key` included; `X-Install-Id` excluded unless owner-approved |
| Permission boundary | approved and verified for `identity` and exact production hosted backend host `https://aviso-backend-production.vercel.app/*` beyond existing provider/BYOK permissions; no staging backend host, localhost host, or broad backend host permission in candidate manifests |
| Backend staging | Vercel staging health verified; readiness enforcement deployed; Supabase migration applied and metadata smoke verified in `MON-24`; Upstash smoke verified in `MON-16`; OAuth smoke verified in `MON-17`; provider smoke verified in `MON-18C`; sensitive log review completed in `MON-19` |
| Real provider validation | `MON-18C` completed: backend `/v1/chat` smoke passed for `free-small` through GLM 5.2-backed route with SSE delta/done/usage seen, positive quota delta, and cost guard confirmed |
| Frontend staging integration | `MON-20` config / host permission / background OAuth remediation / browser runtime OAuth account smoke passed; `MON-21` release build / zip / manifest gate passed and synced Done; hosted service selection UX code/tests/build passed; `MON-27` loaded-extension UI smoke passed and synced Done; `MON-26` merged and Done; `MON-29` merged to main / local validation passed |
| Frontend production package | production hosted base URL / exact host permission / Google OAuth client ID aligned; WXT + Plasmo build and zip passed; manifest guard and zip inspection passed; local loaded-extension smoke attempted but blocked by Chrome CLI loading / CWS extension-ID boundary; not submitted and not live |
| Public privacy / CWS wording | source updated for hosted AI in `MON-22`; 2026-06-28 docs/site copy drift closeout synced README, release checklist, agent context, v0.3 planning, English i18n docs, and hosted AI candidate error copy / not deployed / CWS draft not submitted |
| MON-23 owner decisions | approved to execute / production, website, CWS, and final release evidence pending |

## Next Recommended Gates

1. Execute `MON-23` in separate evidence-gated tracks: production backend/resources, frontend production package/host permission, website/CWS release materials, and final release review.
2. Keep BYOK as the default available path until production hosted-AI validation and public release evidence are complete.
3. Do not expose production secrets, raw provider/user payloads, raw logs, or session/OAuth values in files or chat.
4. Do not mark hosted AI live, deploy public copy, submit Chrome Web Store changes, or ship the production package until the matching evidence gate passes.

## Not Ready Because

- Frontend hosted-AI implementation now has staging account smoke evidence and a production candidate package with exact production host permission, but hosted AI is still not public or live.
- BYOK remains the default path; hosted AI now has source-level privacy/CWS disclosure updates, but deployment/submission, production decisions, and owner release approval are still required before public use.
- Backend staging is deployed and health-verified, Supabase migration + metadata smoke are verified in `MON-24`, and Upstash quota/idempotency smoke is verified in `MON-16`.
- Real staging has passed provider validation in `MON-18C` and sensitive log review in `MON-19`; `MON-20` code/build/manifest checks, popup-lifecycle remediation, and loaded-extension account smoke are complete; `MON-21` release build / zip / manifest verification is complete locally.
- MON-23 owner decisions are approved, and production backend HTTP smoke plus production candidate package evidence now exist; local final loaded-extension production smoke was attempted but blocked by Chrome CLI loading and CWS extension-ID constraints, so website deployment, CWS submission, final loaded-extension production smoke, owner release approval, and live release evidence remain incomplete.
- Google OAuth staging validation is verified in `MON-17`; `MON-18` provider validation is approved only for the staging smoke and does not approve production provider validation.
- No production persistent stores, billing provider, provider billing source, or alert channel are configured; staging Supabase and Upstash are verified only for the v0.3 staging gates.
- Privacy policy and Chrome Web Store data disclosure are updated only in source/draft form for hosted AI; they are not deployed, submitted, or release-evidence complete.
- Owner has approved MON-23 execution decisions, but v0.3 release remains pending final production/package/website/CWS evidence.
