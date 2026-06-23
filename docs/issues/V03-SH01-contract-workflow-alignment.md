# V03-SH01 Contract Workflow Alignment

Status: `completed by backend / CTO accepted / Linear sync pending`
Updated: 2026-06-18

## Linear Draft

Title: `V03-SH01 Contract workflow alignment`

Team: TBD after Linear connector is available

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `cross-repo`, `backend`, `contract`, `docs-plan`

## Goal

Decide and document how the frontend extension will consume the backend hosted-AI contract before frontend implementation starts.

## CTO Acceptance

Accepted on 2026-06-18.

Backend execution recorded the first-slice decision in `/Users/jonyliu/Documents/01_Projects/Aviso-backend/docs/contract-workflow.md`:

- Frontend first slice uses a small local typed wrapper.
- Types, schemas, and constants are consumed from `@aviso/contract`.
- Base URL is local-only and injectable; no production fallback.
- `Idempotency-Key` is included for `POST /v1/chat`.
- `X-Install-Id` is excluded from the first frontend slice unless separately owner-approved.
- No backend runtime contract drift was found.

This issue should align:

- backend `docs/api-contract.md`,
- backend `docs/openapi.yaml`,
- backend `packages/contract`,
- frontend planning docs in `Aviso/docs/planning/v0.3`.

## Owner Repo

Primary: `Aviso-backend`

Consumer / reviewer: `Aviso`

## Execution Mode

Level: `L1 docs-plan`

Allowed:

- read backend and frontend planning docs,
- update backend API/contract documentation if inconsistencies are found,
- produce a clear contract-consumption recommendation,
- update local planning notes if required.

Stop before:

- frontend product-code implementation,
- backend runtime behavior changes,
- schema or migration changes,
- new dependencies,
- host permission changes,
- staging or production deployment,
- real OAuth/provider/billing/secrets work.

## Scope

Answer these questions:

1. Should the frontend use generated OpenAPI types, backend `packages/contract`, or a small local typed wrapper for the first local slice?
2. What is the local backend base URL strategy for the extension during the first slice?
3. Which request/response fields are in scope for `POST /v1/auth/google`, `POST /v1/auth/logout`, `GET /v1/me`, and `POST /v1/chat`?
4. What SSE event shapes must the frontend support for `delta`, `done`, and `error`?
5. Which backend error codes map to frontend actions?
6. Is `Idempotency-Key` included in the first frontend slice?
7. Is `X-Install-Id` excluded from the first frontend slice unless separately approved?

## Non-Scope

- No hosted-AI frontend implementation.
- No Chrome manifest or host-permission change.
- No production API URL hardcoding.
- No real Google OAuth credentials.
- No real OpenRouter/provider validation.
- No billing checkout or paid subscription UX.
- No persistent database, migration, staging, or production setup.
- No public privacy policy, website, or Chrome Web Store copy update.

## Source Docs

Frontend/product repo:

- `docs/planning/v0.3/api-contract-review.md`
- `docs/planning/v0.3/acceptance-criteria.md`
- `docs/planning/v0.3/frontend-ux-states.md`
- `docs/planning/v0.3/requirements-closeout.md`
- `docs/planning/v0.3/issue-plan.md`
- `docs/decisions/0003-v0.3-owner-closeout-decisions.md`

Backend repo:

- `docs/api-contract.md`
- `docs/openapi.yaml`
- `packages/contract/src/schemas.ts`
- `packages/contract/src/constants.ts`

## Acceptance Criteria

- Contract consumption workflow is explicitly chosen for the first local frontend slice.
- First-slice endpoint list is confirmed.
- First-slice request and response fields are confirmed.
- SSE event handling expectations are confirmed.
- Frontend error-code mapping is documented.
- Local base URL strategy is documented without adding production URL or host permission.
- `Idempotency-Key` inclusion or exclusion is decided.
- `X-Install-Id` is either explicitly excluded from the first slice or separately escalated for owner approval.
- Any backend contract drift is either fixed in backend docs/contracts or recorded as a blocker.

## Checks

Recommended checks depend on the backend repository. At minimum:

- backend contract/type checks if available,
- documentation consistency check across `api-contract.md`, `openapi.yaml`, and `packages/contract`,
- no product-code changes unless separately approved.

## Stop Lines

Stop and report before:

- adding host permissions,
- changing API key storage,
- adding production backend URL,
- enabling real provider calls,
- using real secrets,
- enabling real Google OAuth,
- enabling billing or webhooks,
- changing database schema,
- deploying staging or production,
- changing public website, privacy policy, or Chrome Web Store wording.

## Return Format

Return to CTO with:

- final contract-consumption decision,
- files changed,
- checks run,
- contract drift found or not found,
- remaining blockers,
- recommended next issue: `V03-FE01` or `V03-FE02`.
