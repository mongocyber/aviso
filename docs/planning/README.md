# Aviso Version Planning

This folder holds future-version planning and active execution records. It is not the current product truth.

## Active Planning Index

- `inbox.md`: first stop for new ideas that are not ready for a version or issue.
- `backlog.md`: triaged but uncommitted items outside the current active version.
- `roadmap.md`: product roadmap, version order, and cross-repo direction.
- `v0.3/README.md`: v0.3 hosted AI planning entry.

## Rules

- Keep `docs/prd.md`, `docs/tech-spec.md`, and `docs/privacy-and-security.md` aligned to shipped or submitted product truth.
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
