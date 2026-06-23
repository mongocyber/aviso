# V03-FE02 Backend Client And Contract Integration

Status: `completed / CTO accepted / local-only`
Updated: 2026-06-18

## Linear Draft

Title: `V03-FE02 Backend client and contract integration`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `frontend`, `contract`, `local-only`, `implementation`

## Goal

Implement the smallest local-only frontend hosted-AI client foundation using the `V03-SH01` contract decision and the `V03-FE01` UX surface decisions.

This issue should create a typed local hosted-AI client layer that can later be wired into sign-in, quota/account UI, hosted routing, and error/fallback flows.

## Owner Repo

Primary: `Aviso`

Reviewer: CTO main thread

## Execution Mode

Level: `L3 isolated-worker`

Allowed:

- read frontend source and v0.3 docs,
- add a small hosted-AI client/module and local-only tests,
- consume or mirror backend contract types with minimal drift risk,
- add local-only configuration seams needed for tests,
- update v0.3 docs if implementation discoveries change the plan.

Stop before:

- Chrome manifest or host-permission changes,
- production backend URL defaults,
- public website, privacy policy, or Chrome Web Store copy changes,
- real Google OAuth credentials,
- real OpenRouter/provider calls,
- billing, checkout, or webhook code,
- database/schema/deployment work,
- API key storage migration,
- `X-Install-Id` generation, persistence, or sending.

## Scope

Implement the local-only foundation for:

1. Hosted backend base URL resolution with no production fallback.
2. Typed request/response handling for:
   - `POST /v1/auth/google`
   - `POST /v1/auth/logout`
   - `GET /v1/me`
   - `POST /v1/chat`
3. SSE parsing for `delta`, `done`, and `error`.
4. Error-code normalization for hosted AI:
   - `bad_request`
   - `unauthorized`
   - `quota_exceeded`
   - `forbidden_model`
   - `rate_limited`
   - `service_unavailable`
   - `provider_error`
   - `internal`
5. `Idempotency-Key` support for `POST /v1/chat`.
6. Explicit exclusion of `X-Install-Id`.

## Non-Scope

- No UI routing or visible product surfaces unless the existing architecture requires a tiny type seam.
- No just-in-time sign-in UI implementation.
- No quota/account UI implementation.
- No hosted chat routing from existing AI actions yet.
- No host permission change.
- No real backend, staging, production, provider, OAuth, billing, or secrets.
- No public copy changes.

## Source Docs

- `docs/planning/v0.3/frontend-ux-states.md`
- `docs/planning/v0.3/api-contract-review.md`
- `docs/planning/v0.3/status.md`
- `docs/planning/v0.3/issue-plan.md`
- `/Users/jonyliu/Documents/01_Projects/Aviso-backend/docs/contract-workflow.md`

## Acceptance Criteria

- A local hosted-AI client or module exists with typed methods for auth, logout, account/quota, and chat stream.
- The client uses local-only base URL injection and has no production URL fallback.
- `Idempotency-Key` is generated or accepted for chat requests.
- `X-Install-Id` is not generated, stored, or sent.
- SSE parsing handles `delta`, `done`, and `error`.
- Hosted error codes normalize into safe frontend action categories without raw provider/backend payload leakage.
- BYOK direct-provider path remains unchanged.
- No manifest host permissions are added.
- Tests or equivalent local checks cover client behavior and error normalization.

## CTO Acceptance

Accepted: 2026-06-18

Result:

- Added `src/utils/hosted-ai-client.ts` as the smallest local-only hosted-AI client foundation.
- Added typed methods for `POST /v1/auth/google`, `POST /v1/auth/logout`, `GET /v1/me`, and `POST /v1/chat` streaming.
- Base URL resolution is explicit and local-only; no production backend fallback exists.
- Chat requests support `Idempotency-Key`.
- `X-Install-Id` is not generated, stored, or sent.
- SSE parsing covers `delta`, `done`, and `error`.
- Hosted error codes normalize into safe frontend categories/actions without exposing raw backend or provider payloads.
- BYOK direct-provider path, API key storage, package dependencies, and manifest host permissions were not changed.

Implementation note:

- The frontend repo does not yet depend on `@aviso/contract`; FE02 uses a minimal local type boundary aligned with the backend contract. A later shared-contract issue can replace this with direct contract imports once the dependency path is owner-approved.

Checks:

- `npm test` passed: 177/177.
- `npm run check:manifests` passed.
- `npm run build` passed when rerun outside the restricted sandbox after the initial sandbox run hit `Operation not permitted`.

Recommended next issue: `V03-FE03 Just-in-time sign-in flow`.

## Checks

Run the most relevant available checks, usually:

- `npm test`
- TypeScript/build check if available and feasible
- manifest check if any file could affect permissions

If a check is unavailable or blocked, report the exact reason.

## Return Format

Return to CTO with:

- implementation summary,
- files changed,
- checks run and results,
- confirmation of no host permission / production URL / real provider / API key storage changes,
- whether `V03-FE03`, `V03-FE04`, or `V03-FE05` should be next,
- blockers or owner decisions if any.
