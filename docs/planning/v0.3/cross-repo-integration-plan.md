# Aviso v0.3 Cross-Repo Integration Plan

Status: `execution-started / cross-repo`
Updated: 2026-06-19

This plan coordinates `Aviso` and `Aviso-backend` without converting them into a monorepo.

## Repository Boundaries

| Area | Owner Repository | Source |
| --- | --- | --- |
| Product requirements | `Aviso` | [`hosted-ai-spec.md`](./hosted-ai-spec.md) |
| Extension UI and routing | `Aviso` | [`frontend-scope.md`](./frontend-scope.md) |
| Public website and support docs | `Aviso` | website docs and release gates |
| API contract | `Aviso-backend` | `docs/api-contract.md`, `docs/openapi.yaml`, `packages/contract` |
| Auth, quota, metering, provider routing | `Aviso-backend` | backend `docs/` and `apps/backend` |
| Deployment and operations | `Aviso-backend` | `docs/deploy.md`, `docs/ops-runbook.md`, `docs/security.md` |
| Release approval | Product owner | [`release-gates.md`](./release-gates.md), root release checklist |
| Environment and release flow | `Aviso` | [`../../decisions/0002-environments-and-release-flow.md`](../../decisions/0002-environments-and-release-flow.md) |

## Execution Model

Use three conversations or work streams:

| Stream | Working Directory | Role |
| --- | --- | --- |
| CTO / main control | `Aviso` plus read-only backend checks | Plan, split work, review cross-repo readiness, maintain gates. |
| Frontend execution | `Aviso` | Implement extension and website changes from stable contract. |
| Backend execution | `Aviso-backend` | Implement API, services, tests, deployment readiness. |

Each execution stream should handle one clear issue at a time and report:

- files changed,
- checks run,
- contract changes,
- release-gate impact,
- unresolved decisions.

## Recommended Sequence

1. Finish this planning set.
2. Backend: refresh status docs and ensure `docs/api-contract.md`, `docs/openapi.yaml`, and `packages/contract` agree.
3. CTO: review backend Phase 1 against [`hosted-ai-spec.md`](./hosted-ai-spec.md).
4. Frontend: design hosted/BYOK settings and error-state UX without implementation.
5. Frontend: integrate shared contract or generated client only after contract review.
6. Backend: prepare local/staging deployment path under ADR-0002 environment rules. Current state: readiness guard and Supabase / Upstash persistence adapter seam are implemented, but real staging resources, schema/migration validation, secrets, provider validation, deployment target, and owner deploy approval remain gated.
7. Frontend + backend: run local integration with mock or local backend.
8. Release gate: review privacy, host permission, CWS disclosure, provider logging, deployment, and rollback.

## Contract Workflow

- Backend owns the API contract.
- Frontend must not invent undocumented response fields.
- Any API change requires backend `api-contract.md` and `openapi.yaml` update first.
- Frontend integration should reference backend `packages/contract` or generated types when the workflow is ready.
- Contract drift is a stop-line before integration.

## Stop Lines

Stop and ask the owner before:

- adding or changing extension host permissions,
- adding production backend URL,
- changing API key storage,
- deploying backend to staging or production,
- enabling real provider calls,
- enabling Google OAuth with real client secrets,
- enabling payments or billing webhooks,
- updating public privacy policy / CWS data disclosure as live,
- claiming hosted AI is available publicly.

## Status Labels

Use these labels consistently:

| Label | Meaning |
| --- | --- |
| `planned` | Product or engineering plan exists; no implementation evidence. |
| `implemented` | Code exists locally or in repo. |
| `mock-verified` | Verified using mock interfaces only. |
| `staging-verified` | Verified against staging services. |
| `production-live` | Live for real users after owner approval. |
| `blocked` | Cannot progress without owner input or external dependency. |

Do not collapse these into "done."
