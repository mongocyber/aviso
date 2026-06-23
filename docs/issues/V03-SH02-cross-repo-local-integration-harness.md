# V03-SH02 Cross-Repo Local Integration Harness

Status: `completed / CTO accepted / local-only`
Updated: 2026-06-19

## Linear Draft

Title: `V03-SH02 Cross-repo local integration harness`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `cross-repo`, `local-only`, `harness`, `docs-plan`

## Goal

Confirm that the backend local mock app exposes the hosted-AI shapes needed by the frontend local hosted client before `V03-FE05 Hosted chat routing` starts.

This issue is a cross-repo local integration gate. It does not approve Chrome runtime routing, host permissions, staging, production backend use, live OAuth, live provider calls, billing, public copy, or release readiness.

## Owner Repo

Primary: `Aviso-backend`

Consumer / reviewer: `Aviso`

## Execution Mode

Level: `L1 docs-plan`

Allowed:

- read backend and frontend v0.3 planning docs,
- add or review backend local-only harness documentation and tests,
- record frontend handoff boundaries for `V03-FE05`,
- update Aviso planning docs with the accepted status.

Stop before:

- frontend product-code implementation,
- Chrome manifest or host-permission changes,
- backend production, staging, deployment, schema, or migration changes,
- real OAuth, provider, billing, secrets, or public-copy work,
- new dependencies.

## Scope

Verify the local backend harness covers:

1. mock auth session creation,
2. `GET /v1/me` account, quota, rate-limit, and model response shape,
3. free local owner-decision defaults for quota and default model,
4. `POST /v1/chat` SSE `delta` and `done` events,
5. in-stream `provider_error` shape,
6. logout invalidation,
7. `unauthorized` and `bad_request` error-code alignment,
8. missing `X-Install-Id` does not block local chat.

## Non-Scope

- No real Google OAuth or Chrome `identity` flow.
- No real OpenRouter or downstream provider.
- No billing checkout, webhook, provider billing source, subscription, or payment flow.
- No staging, production, domain, persistent store, or deployment target.
- No Chrome extension runtime routing, manifest change, host permission, or browser network permission.
- No secrets or `.env` real values.
- No frontend source changes.

## Source Docs

Frontend/product repo:

- `docs/planning/v0.3/status.md`
- `docs/planning/v0.3/issue-plan.md`
- `docs/issues/V03-FE02-backend-client-contract-integration.md`
- `docs/issues/V03-FE03-just-in-time-sign-in-flow.md`
- `docs/issues/V03-FE04-quota-account-display.md`

Backend repo:

- `/Users/jonyliu/Documents/01_Projects/Aviso-backend/docs/local-integration-harness.md`
- `/Users/jonyliu/Documents/01_Projects/Aviso-backend/apps/backend/src/__tests__/local-integration-harness.test.ts`

## Acceptance Criteria

- Backend local integration harness exists and is documented.
- Harness verifies mock auth, `/v1/me`, chat SSE `delta`/`done`, provider-error SSE, logout invalidation, and supported error codes.
- Harness confirms `X-Install-Id` is not required for local chat.
- Checks pass in the backend repo.
- No contract drift is found.
- Aviso planning docs mark `V03-SH02` completed and hand off `V03-FE05` as local-only routing seam work.
- Any need for Chrome runtime host permission is recorded as owner-gated before FE05 expands scope.

## CTO Acceptance

Accepted on 2026-06-19 for local-only v0.3 execution.

Delivered by backend execution thread `019edce2-a40c-7bf2-aeb1-d9d5a9467626`:

- Added `/Users/jonyliu/Documents/01_Projects/Aviso-backend/apps/backend/src/__tests__/local-integration-harness.test.ts`.
- Added `/Users/jonyliu/Documents/01_Projects/Aviso-backend/docs/local-integration-harness.md`.
- Verified mock auth, `GET /v1/me` free quota/default model response, `POST /v1/chat` SSE `delta`/`done`, in-stream `provider_error`, logout invalidation, `unauthorized` and `bad_request` alignment, and missing `X-Install-Id` behavior.
- Found no contract drift.

Checks passed in the backend repo:

- Corepack `pnpm test`
- local Vitest harness
- Biome check
- backend TypeScript check

Confirmed boundaries:

- No frontend code changes.
- No real provider, OAuth, billing, staging, production, host permission, secrets, new dependency, port service, public copy, git add, commit, or push.

## FE05 Handoff

`V03-FE05 Hosted chat routing` can proceed only as a local-only routing seam: wire the existing frontend local hosted client to hosted route selection without changing BYOK direct-provider behavior.

If Chrome runtime execution requires `localhost` or backend host permission to reach the local backend, FE05 must stop for owner approval before adding or implying that permission.

## Checks

For this docs sync:

- `rg -n "V03-SH02|local integration harness|FE05" docs/issues docs/planning/v0.3`

## Return Format

Return to CTO with:

- files changed,
- status after sync,
- checks run,
- remaining gate for `V03-FE05`,
- confirmation of no code, release, permission, provider, or backend changes.
