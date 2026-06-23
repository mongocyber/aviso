# V03-FE04 Quota And Account Display

Status: `completed / CTO accepted / local-only`
Updated: 2026-06-18

## Linear Draft

Title: `V03-FE04 Quota and account display`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `frontend`, `quota`, `account`, `hosted-ai`, `local-only`

## Goal

Add the smallest local-only account and quota display that uses the FE02 hosted client `/me` contract and FE03 hosted session seam.

This issue should make signed-in hosted account state useful for local testing and later routing work. It must not introduce billing, paid upgrade, public quota copy, production backend, staging, live provider calls, or host-permission changes.

## Owner Repo

Primary: `Aviso`

Reviewer: CTO main thread

## Execution Mode

Level: `L3 isolated-worker`

Allowed:

- read frontend source and v0.3 docs,
- use `src/utils/hosted-ai-client.ts` and `src/utils/hosted-session.ts`,
- display account and quota data returned by local `/v1/me`,
- refresh and persist `me` metadata in the existing hosted session helper,
- add compact popup API/account area quota rows,
- add request-relevant floating quota/auth/unavailable state seams only if they are clearly isolated and do not route real hosted chat,
- add or update tests for `/me` display, quota formatting, copy boundaries, and stop lines.

Stop before:

- real OAuth, `chrome.identity`, or provider-live validation,
- production or staging backend URL defaults,
- Chrome manifest or host-permission changes,
- paid plan, checkout, webhook, upgrade CTA, pricing, or subscription copy,
- public website, privacy policy, or Chrome Web Store copy changes,
- hosted chat routing from existing AI actions,
- API key storage migration or any changes to `contextai_api_keys`,
- `X-Install-Id` generation, persistence, or sending.

## Scope

Implement local-only foundations for:

1. Account display:
   - signed-in user identifier,
   - tier label as account state only,
   - local backend availability and last refresh state.
2. Quota display:
   - monthly usage and limit when returned by `/v1/me`,
   - optional daily usage and limit when returned,
   - reset timing when returned,
   - unavailable/unknown state when local backend is down or data is missing.
3. Copy boundaries:
   - product UI may say local account usage or hosted quota state,
   - do not publish the placeholder quota as a marketing promise,
   - do not add upgrade, paid, or subscription language.
4. Tests:
   - quota formatting and missing-data handling,
   - BYOK provider setup remains visible,
   - no host permission, production URL, billing copy, or `X-Install-Id`.

## Non-Scope

- No real OAuth browser flow.
- No production backend, staging backend, real provider, secrets, or billing.
- No hosted chat routing as the default route.
- No checkout, paid plan, upgrade, or subscription UX.
- No public website, privacy policy, or CWS copy changes.
- No install-id or abuse-signal implementation.

## Source Docs

- `docs/planning/v0.3/frontend-ux-states.md`
- `docs/planning/v0.3/acceptance-criteria.md`
- `docs/planning/v0.3/status.md`
- `docs/issues/V03-FE02-backend-client-contract-integration.md`
- `docs/issues/V03-FE03-just-in-time-sign-in-flow.md`
- `src/utils/hosted-ai-client.ts`
- `src/utils/hosted-session.ts`
- `src/popup/index.tsx`
- `src/contents/floating.tsx`
- `src/utils/i18n.ts`
- `tests/unit.test.ts`

## Acceptance Criteria

- Popup hosted account area can display `/v1/me` user, tier, monthly quota, optional daily quota, and reset timing in local-only UI.
- Missing or unavailable quota data is shown as unavailable/unknown, not as a hard failure for BYOK.
- BYOK setup remains visible and usable without hosted quota lookup.
- Placeholder quota values are not added to website, Chrome Web Store copy, or marketing-style public text.
- No real OAuth, provider, staging, production backend, billing, host permission, or public-copy changes are introduced.
- `contextai_api_keys` behavior is unchanged.
- `X-Install-Id` is still not generated, stored, or sent.
- Tests or equivalent local checks cover the core account/quota behavior and boundary conditions.

## CTO Acceptance

Accepted on 2026-06-18 for local-only v0.3 execution.

Delivered:

- Added hosted account/quota display formatting in `src/utils/hosted-session.ts`.
- Added popup hosted account rows for tier, monthly quota, daily quota, and reset timing.
- Added local-only hosted quota/account copy in `src/utils/i18n.ts`.
- Added tests for quota formatting, missing/unavailable states, BYOK non-blocking behavior, and public-copy boundaries.

Verified by CTO main thread:

- `npm test` passed: 183/183.
- `npm run build` passed after rerunning outside the local sandbox because the first Plasmo build attempt failed with `Operation not permitted`.
- `npm run check:manifests` passed.

Confirmed boundaries:

- No real Google OAuth or `chrome.identity`.
- No production/staging backend URL.
- No new host permission.
- No real provider, billing, checkout, webhook, subscription, upgrade CTA, or public launch copy.
- No migration or behavior change to `contextai_api_keys`.
- No `X-Install-Id` generation, storage, or sending.
- No hosted chat routing from existing AI actions.

## Checks

Run the most relevant available checks, usually:

- `npm test`
- `npm run check:manifests`
- `npm run build`

If a check is unavailable or blocked, report the exact reason.

## Return Format

Return to CTO with:

- implementation summary,
- files changed,
- checks run and results,
- confirmation of no host permission / production URL / real OAuth / real provider / billing / API key storage changes,
- whether next should be `V03-FE05`, `V03-FE06`, or `V03-SH02`,
- blockers or owner decisions if any.
