# V03-FE01 Hosted/BYOK UX Design

Status: `completed / docs-plan / local-only`
Updated: 2026-06-18

## Linear Draft

Title: `V03-FE01 Hosted/BYOK UX design`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `frontend`, `ux`, `docs-plan`, `local-only`

## Goal

Turn the v0.3 hosted/BYOK UX state matrix into a concrete implementation-ready UX plan for the current extension surfaces.

This issue should decide where hosted AI appears in the current product, what UI states/copy are needed, and what must stay out of the first frontend implementation.

## Owner Repo

Primary: `Aviso`

Reviewer: CTO main thread

## Execution Mode

Level: `L1 docs-plan`

Allowed:

- read current frontend files and v0.3 planning docs,
- update v0.3 planning docs or add a small UX/copy implementation note,
- identify exact product surfaces for later implementation.

Stop before:

- product-code implementation,
- Chrome manifest or host-permission changes,
- backend integration code,
- real OAuth/provider/billing/staging/production work,
- public website, privacy policy, or Chrome Web Store copy changes.

## Scope

Answer these questions:

1. Which current extension surfaces should show hosted AI in the first local slice?
2. How does BYOK remain first-class and usable without login?
3. Where does just-in-time hosted sign-in appear?
4. Where should account/quota state appear?
5. What fallback copy/actions should be used when hosted AI is unavailable, quota is exhausted, auth expires, rate limit occurs, or provider/model route fails?
6. Which UI/copy details are required before `V03-FE02` starts?
7. Which states are explicitly deferred until release gates?

## Source Docs

- `docs/planning/v0.3/frontend-ux-states.md`
- `docs/planning/v0.3/acceptance-criteria.md`
- `docs/planning/v0.3/api-contract-review.md`
- `docs/planning/v0.3/requirements-closeout.md`
- `docs/planning/v0.3/issue-plan.md`
- `/Users/jonyliu/Documents/01_Projects/Aviso-backend/docs/contract-workflow.md`

## Acceptance Criteria

- Current extension surfaces for first hosted-AI UX are named.
- BYOK no-login path is explicitly preserved.
- Hosted sign-in entry point is just-in-time, not a global wall.
- Quota/account state placement is defined.
- Error/fallback actions are mapped to visible UX behavior.
- Public copy, paid plan, staging, production, host permission, and real provider claims remain deferred.
- The output clearly says whether `V03-FE02` may start.

## Checks

- Documentation consistency check across v0.3 planning docs.
- No product-code changes.
- No manifest or public copy changes.

## Closeout

Completed in [`docs/planning/v0.3/frontend-ux-states.md`](../planning/v0.3/frontend-ux-states.md).

Result: `V03-FE02 Backend client and contract integration` is unblocked for local-only implementation, with the stop lines in this issue still active for host permissions, backend URL defaults, API key storage, live OAuth/provider/billing, staging/production, and public copy.

## Stop Lines

Stop and report before:

- modifying `package.json` manifest host permissions,
- changing API key storage behavior,
- adding hosted backend URL defaults,
- adding real auth/provider/billing code,
- updating public website or Chrome Web Store copy,
- implementing frontend code.

## Return Format

Return to CTO with:

- UX decision summary,
- files changed,
- checks run,
- whether `V03-FE02` is unblocked,
- blockers or owner decisions if any.
