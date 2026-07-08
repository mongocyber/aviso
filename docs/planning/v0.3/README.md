# Aviso v0.3 Planning

This folder is the product-side control plane for Aviso v0.3 hosted AI. It coordinates the extension repository and the sibling backend repository without merging the two codebases.

Current product facts live in [`../../STATE.md`](../../STATE.md). v0.3 gate evidence lives in [`status.md`](./status.md) and [`release-gates.md`](./release-gates.md). This README is only the navigation and ownership entrypoint.

## Read First

| File | Role |
| --- | --- |
| [`hosted-ai-spec.md`](./hosted-ai-spec.md) | Product requirements source for v0.3 hosted AI. |
| [`requirements-closeout.md`](./requirements-closeout.md) | Gate between planning and frontend implementation. |
| [`acceptance-criteria.md`](./acceptance-criteria.md) | R1-R10 acceptance criteria for issue planning and later QA. |
| [`api-contract-review.md`](./api-contract-review.md) | Product-side review of backend contract readiness and frontend consumption gaps. |
| [`frontend-ux-states.md`](./frontend-ux-states.md) | Hosted/BYOK account, quota, error, and fallback states before implementation. |
| [`cross-repo-integration-plan.md`](./cross-repo-integration-plan.md) | Frontend/backend work split, sequencing, and synchronization rules. |
| [`release-gates.md`](./release-gates.md) | Privacy, permissions, deployment, provider, billing, and store gates before release. |
| [`cws-disclosure-draft.md`](./cws-disclosure-draft.md) | Chrome Web Store privacy/data-disclosure source for v0.3 hosted AI; submitted with `0.1.1` and pending review. |
| [`staging-resource-register.md`](./staging-resource-register.md) | Non-secret staging resource inventory and env/verification checklist. |
| [`frontend-scope.md`](./frontend-scope.md) | Extension and website scope for hosted AI integration. |
| [`issue-plan.md`](./issue-plan.md) | Product-side issue map and repository ownership. |
| [`status.md`](./status.md) | Current v0.3 readiness state. |
| [`../roadmap.md`](../roadmap.md) | Version order and roadmap context. |
| [`../../decisions/0002-environments-and-release-flow.md`](../../decisions/0002-environments-and-release-flow.md) | Environment and release-flow protocol. |
| [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md) | Owner-confirmed first-slice scope and local-only execution boundary. |

## Repository Roles

| Repository | Role | Must Own | Must Not Own |
| --- | --- | --- | --- |
| `mongocyber/aviso` | Product, extension, website, release wording | User experience, frontend integration, privacy wording, CWS-facing claims, release gates | Backend API implementation, database schema, provider proxy internals |
| `mongocyber/aviso-backend` | Hosted AI service | API contract, OpenAPI, auth/session, quota, metering, provider routing, deployment, ops | Product positioning, frontend UI decisions, public marketing claims |

## Source-Of-Truth Rules

- Product requirements: this folder, especially [`hosted-ai-spec.md`](./hosted-ai-spec.md).
- Owner first-slice decisions: [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md).
- Frontend implementation readiness: [`requirements-closeout.md`](./requirements-closeout.md), [`api-contract-review.md`](./api-contract-review.md), and [`frontend-ux-states.md`](./frontend-ux-states.md).
- Current product truth: [`../../STATE.md`](../../STATE.md).
- v0.3 gate evidence: [`status.md`](./status.md) and [`release-gates.md`](./release-gates.md).
- API contract: backend repository `docs/api-contract.md` and `docs/openapi.yaml`.
- Backend data model: backend repository `docs/data-model.md`.
- Backend deployment and operations: backend repository `docs/deploy.md`, `docs/ops-runbook.md`, and `docs/security.md`.
- Release readiness: this folder's [`release-gates.md`](./release-gates.md) plus root [`../../../RELEASE_CHECKLIST.md`](../../../RELEASE_CHECKLIST.md).

## Planning Rules

- Do not update current product docs as if v0.3 has shipped.
- MON-23 allows production, website, and CWS preparation under sanitized evidence plans; do not submit Chrome Web Store copy or deploy public changes until the matching release evidence is complete.
- Do not add broad backend host permissions; the production candidate host permission is limited to the exact production backend origin already established and verified.
- Do not make real provider, auth, billing, or deployment claims from mock evidence.
- Keep BYOK as a first-class path throughout v0.3.
