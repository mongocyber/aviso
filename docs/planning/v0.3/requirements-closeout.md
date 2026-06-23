# Aviso v0.3 Requirements Closeout

Status: `reviewed / ready-for-issue-planning / before implementation`
Updated: 2026-06-19

This file defines the gate between v0.3 planning and frontend implementation. It should be reviewed before creating concrete frontend execution issues or changing extension behavior.

2026-06-23 update: this closeout record captured the first local-only boundary. Linear `MON-20` later approved the exact staging backend config, host permission, `identity` permission, and staging frontend OAuth identity-token handling; it did not approve production, public copy, CWS disclosure, billing, production OAuth, or release. Current execution state lives in [`status.md`](./status.md) and [`release-gates.md`](./release-gates.md).

## Current Conclusion

v0.3 has enough requirements definition to move into issue planning. It is still not implementation-ready until the first shared/frontend issues are explicitly approved.

The backend has local mocked implementation evidence, and the frontend repository has product, integration, release-gate, acceptance, API-review, and UX-state planning docs. Owner closeout decisions are accepted in [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md). The next work is to create the first shared contract workflow issue, then approve the smallest local frontend integration slice.

## Closeout Checklist

| Area | Required Before Frontend Implementation | Status |
| --- | --- | --- |
| Requirements acceptance | Convert R1-R10 in [`hosted-ai-spec.md`](./hosted-ai-spec.md) into user-facing acceptance criteria. | documented in [`acceptance-criteria.md`](./acceptance-criteria.md) |
| Backend status normalization | Align frontend planning with backend docs: Phase 1, billing mock path, usage/alerting seams, and abuse seams are implemented with mocks; persistence adapter seams are implemented; deployment, real provider validation, real staging resource verification, billing provider, provider billing source, and alert channel are not configured. | updated / owner confirmed |
| API contract review | Review backend `docs/api-contract.md`, `docs/openapi.yaml`, and `packages/contract` before frontend field usage. | reviewed for planning in [`api-contract-review.md`](./api-contract-review.md) |
| Frontend UX flows | Define states for BYOK only, hosted only, both available, no key/no login, quota reached, provider down, auth expired, and BYOK fallback. | documented in [`frontend-ux-states.md`](./frontend-ux-states.md) |
| Environment protocol | Apply ADR-0002 local/staging/production rules before backend URLs, secrets, or deployment work. First execution phase is local mock / local backend only. | owner confirmed for local phase |
| Privacy and CWS impact | Draft required hosted-AI privacy, data disclosure, subprocessor, and Chrome Web Store wording changes, but do not publish them yet. Hosted privacy boundary is confirmed. | boundary confirmed / public copy pending |
| Host permission | Decide backend domain and extension host-permission change only after owner approval. First phase does not approve host permission changes. | not approved / later gate |
| Release gates | Keep staging, production, billing, provider-live validation, and public wording behind release gates. | owner confirmed |

## Owner Decisions

| ID | Decision | Confirmed Position |
| --- | --- | --- |
| S1 | Backend status wording | Local backend logic is implemented with mocks; it is not deployed or live. |
| S2 | First v0.3 scope | BYOK plus free hosted AI only. |
| S3 | Login behavior | BYOK does not require login; hosted AI requires login only when chosen or needed. |
| S4 | First execution environment | Local mock / local backend only; no host permission, staging, production, real provider, or real secrets. |
| T1 | Free hosted quota | Use development placeholder: 1,000,000 monthly tokens + 50,000 daily tokens. Do not publish this number. |
| T2 | Default hosted model route | Frontend uses logical model `free-small`; real upstream model is backend-configured and reviewed before release. |
| T3 | Paid plan price and quota | No paid subscription launch in first v0.3 release. Billing remains mock / later gate. |
| T4 | Backend domain and host permission | Not decided for first phase; no host permission change is approved. |
| S5 | Privacy boundary | Hosted requests pass through Aviso backend and OpenRouter / downstream providers; backend does not persist raw content; metadata retention is 30 days. |

Decision record: [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md).

## Backend Status Notes

Use these labels consistently:

- `implemented with mocks`: local implementation exists, external services are mocked or replaceable.
- `configured`: real service credentials, domains, or deployment settings exist in the target environment.
- `verified`: the behavior was tested against the intended environment.
- `staging`: available in a non-production environment with test secrets and test data.
- `production`: available to real users after owner approval.

Do not treat mocked backend tests as staging or production readiness.

Current normalized backend status across both repositories:

- Phase 1 local backend logic: `implemented with mocks / not deployed`.
- Subscription billing path: `implemented with mocks / real billing owner-gated`.
- Usage, cost, and alerting seams: `implemented with mocks / real ops integrations owner-gated`.
- Device signal and abuse enforcement: `implemented with mocks / frontend install-id signal and staging validation pending`.
- Staging readiness guard: `implemented / CTO accepted in Linear MON-8 / not deployed`.
- Staging persistence adapters: `implemented / CTO accepted in Linear MON-9 / real staging resources not verified`.
- Staging deployment: `blocked / owner-gated` until real Supabase schema/migration validation, Upstash instance validation, secrets, provider validation, deployment target, and owner deploy approval are ready.

## Frontend Flow Coverage

Before implementation starts, define expected behavior for:

- existing BYOK user who should not be forced to sign in,
- new user with no API key who chooses hosted AI,
- signed-in free user within quota,
- signed-in free user over quota,
- hosted backend unavailable,
- auth expired or revoked,
- backend returns provider or model-route error,
- user switches from hosted to BYOK fallback,
- user reads privacy/account/quota copy.

## Gate Order

1. Requirements closeout: done for issue planning.
2. Contract workflow issue: create or approve `V03-SH01` to decide frontend contract consumption.
3. UX design issue: create or approve `V03-FE01` using [`frontend-ux-states.md`](./frontend-ux-states.md).
4. First frontend integration issue: implement only the smallest local mock/local backend path after `V03-SH01`.
5. Local integration harness: extension + local backend, no staging and no live provider unless approved.
6. Staging gate: deploy backend to staging only after secrets/domain/provider decisions.
7. Release gate: privacy, Chrome Web Store disclosure, host permission, billing, and production approval.

## Do Not Start Yet

Do not start frontend hosted-AI implementation until `V03-SH01` and the first frontend issue are explicitly approved.
