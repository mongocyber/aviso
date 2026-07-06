# Aviso Version Planning

This folder holds future-version planning and active execution records. It is not the current product truth.

## Current Active Plan

- `inbox.md`: first stop for new ideas that are not ready for a version or issue.
- `backlog.md`: triaged but uncommitted items outside the current active version.
- `roadmap.md`: product roadmap, version order, and cross-repo direction.
- `v0.3/README.md`: v0.3 hosted AI planning entry.
- `v0.3/hosted-ai-spec.md`: product requirements source for v0.3 hosted AI.
- `v0.3/requirements-closeout.md`: requirements closeout gate before frontend implementation.
- `v0.3/cross-repo-integration-plan.md`: frontend/backend coordination plan.
- `v0.3/release-gates.md`: privacy, permission, deployment, provider, billing, and release gates.
- `v0.3/frontend-scope.md`: extension and website integration scope.
- `v0.3/issue-plan.md`: v0.3 issue ownership and execution order.
- `v0.3/status.md`: current v0.3 planning and readiness status.

## Rules

- Keep `docs/02_PRD.md`, `docs/03_TECH_SPEC.md`, and `docs/07_PRIVACY_AND_SECURITY.md` aligned to shipped or submitted product truth.
- Put raw new ideas in `inbox.md` before deciding whether they belong to the active version.
- Put valid but non-current ideas in `backlog.md`; backlog is not a delivery commitment.
- Put future requirements in versioned planning files first.
- Do not describe planned features as implemented.
- Do not update website or store copy from planning docs until implementation evidence exists.
- When a version completes, add a release summary and move or copy the final planning set into `docs/archive/<version>/`.
- Keep completed or retired process records out of this folder. v0.2 and related historical process material lives in `../archive/v0.2/`.

## Version Lifecycle

```text
Inbox -> Backlog / Roadmap / Version spec -> Requirements closeout -> Issue plan -> Implementation evidence -> Release gate -> Current docs update -> Archive
```

## Minimum Planning Set

Each substantial version should have:

- `vX.Y-*-spec.md`
- requirements closeout before implementation
- `vX.Y-issue-plan.md`
- `vX.Y-status.md`
- release summary after completion
