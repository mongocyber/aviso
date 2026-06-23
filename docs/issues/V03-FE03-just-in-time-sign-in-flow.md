# V03-FE03 Just-In-Time Sign-In Flow

Status: `completed / CTO accepted / local-only`
Updated: 2026-06-18

## Linear Draft

Title: `V03-FE03 Just-in-time sign-in flow`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `frontend`, `auth`, `hosted-ai`, `local-only`

## Goal

Implement the smallest local-only hosted sign-in flow that can be used by later quota/account and hosted routing work without blocking BYOK.

This issue should create local session state and safe UI entry points for hosted AI sign-in. It must not connect real Google OAuth, production backend, staging, live providers, billing, or public copy.

## Owner Repo

Primary: `Aviso`

Reviewer: CTO main thread

## Execution Mode

Level: `L3 isolated-worker`

Allowed:

- read frontend source and v0.3 docs,
- add local hosted session storage under a distinct `chrome.storage.local` key that is not `contextai_api_keys`,
- use the FE02 hosted client for local-only auth/logout/me calls,
- add a development-only sign-in trigger that uses mock/local token input or an injected local callback,
- add popup API/account area controls for hosted sign-in state,
- add a floating-window state/message for "sign in to use hosted AI" when a hosted route is selected but no session exists,
- add or update tests for state, storage key separation, copy boundaries, and BYOK non-blocking behavior.

Stop before:

- real Google OAuth credentials or `chrome.identity` integration,
- production backend URL defaults,
- Chrome manifest or host-permission changes,
- hosted chat routing from existing AI actions,
- quota/account dashboard beyond session/me status needed for sign-in,
- public website, privacy policy, or Chrome Web Store copy changes,
- billing, checkout, webhook, paid-plan, or upgrade copy,
- API key storage migration or any changes to `contextai_api_keys`,
- `X-Install-Id` generation, persistence, or sending.

## Scope

Implement local-only foundations for:

1. Hosted session storage:
   - save, read, and clear hosted session data,
   - use a distinct storage namespace such as `aviso_hosted_session`,
   - never store hosted session in `contextai_api_keys`.
2. Hosted account/sign-in state:
   - signed out,
   - signing in,
   - signed in,
   - expired/unauthorized,
   - local backend unavailable.
3. Popup API/account area:
   - show hosted account controls adjacent to BYOK provider setup,
   - keep BYOK provider cards visible and usable while signed out,
   - provide sign in, sign out, and refresh actions using local-only client seams.
4. Floating result window:
   - support a request-relevant sign-in required state for hosted AI,
   - include a secondary path to configure BYOK or cancel,
   - do not turn the floating window into the full account dashboard.
5. Tests:
   - session storage key separation,
   - sign-in state derivation,
   - no global sign-in wall,
   - no host permission, production URL, or `X-Install-Id`.

## Non-Scope

- No real OAuth browser flow.
- No production backend, staging backend, real provider, secrets, or billing.
- No hosted chat routing as the default route.
- No quota exhaustion or billing UX beyond basic account refresh state.
- No public launch wording.
- No screenshot UX changes.

## Source Docs

- `docs/planning/v0.3/frontend-ux-states.md`
- `docs/planning/v0.3/status.md`
- `docs/planning/v0.3/issue-plan.md`
- `docs/issues/V03-FE02-backend-client-contract-integration.md`
- `src/utils/hosted-ai-client.ts`
- `src/utils/storage.ts`
- `src/popup/index.tsx`
- `src/contents/floating.tsx`
- `src/types/messages.ts`
- `tests/unit.test.ts`

## Acceptance Criteria

- Hosted session helpers exist and use a distinct non-API-key storage key.
- BYOK setup and BYOK-backed actions remain usable without hosted login.
- Popup API/account area can show local hosted sign-in state and sign in/out/refresh controls without hiding BYOK provider configuration.
- Floating window can represent "hosted sign-in required" for a hosted action without making the whole extension require login.
- No real OAuth, provider, staging, production backend, billing, host permission, or public-copy changes are introduced.
- `contextai_api_keys` behavior is unchanged.
- `X-Install-Id` is still not generated, stored, or sent.
- Tests or equivalent local checks cover the core session and UI-state behavior.

## CTO Acceptance

Accepted on 2026-06-18 for local-only v0.3 execution.

Delivered:

- Added `src/utils/hosted-session.ts` with a distinct `aviso_hosted_session` storage key.
- Added local hosted account controls to the popup API/services area while keeping BYOK provider setup visible.
- Added a request-scoped floating-window `hosted sign-in required` state that does not globally block BYOK.
- Added tests for session key separation, BYOK non-blocking behavior, request-scoped sign-in state, local-only backend URL, unchanged host permissions, and no `X-Install-Id`.

Verified by CTO main thread:

- `npm test` passed: 181/181.
- `npm run build` passed after rerunning outside the local sandbox because the first Plasmo build attempt failed with `Operation not permitted`.
- `npm run check:manifests` passed.

Confirmed boundaries:

- No real Google OAuth or `chrome.identity`.
- No production/staging backend URL.
- No new host permission.
- No real provider, billing, checkout, webhook, or public launch copy.
- No migration or behavior change to `contextai_api_keys`.
- No `X-Install-Id` generation, storage, or sending.

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
- confirmation of no host permission / production URL / real OAuth / real provider / API key storage changes,
- whether next should be `V03-FE04`, `V03-FE05`, or a shared integration issue,
- blockers or owner decisions if any.
