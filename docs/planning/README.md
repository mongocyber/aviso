# Aviso Version Planning

This folder holds future-version planning and active execution records. It is not the current product truth.

## Active Planning Index

- `inbox.md`: first stop for new ideas that are not ready for a version or issue.
- `backlog.md`: triaged but uncommitted items outside the current active version.
- `current/`: active release-closeout requirements, acceptance, and planning status.
- `roadmap.md`: product roadmap, version order, and cross-repo direction.
- `v0.3/README.md`: hosted AI planning and release-closeout evidence retained until the current release closes.

## Rules

- Keep [docs/STATE.md](../STATE.md) as the current-facts source; planning files are future-facing or release-closeout evidence.
- Keep `docs/prd.md`, `docs/tech-spec.md`, and `docs/privacy-and-security.md` aligned to [docs/STATE.md](../STATE.md) and shipped/submitted product truth.
- Put raw new ideas in `inbox.md` before deciding whether they belong to the active version.
- Put valid but non-current ideas in `backlog.md`; backlog is not a delivery commitment.
- Put future requirements in versioned planning files first.
- Do not describe planned features as implemented.
- Do not update website or store copy from planning docs until implementation evidence exists.
- When a version completes, add a release summary and move or copy the final planning set into `docs/archive/<version>/`.
- Keep completed or retired process records out of this folder. v0.2 and related historical process material lives in `../archive/v0.2/`.

## Version Lifecycle

```text
Inbox -> Backlog / Roadmap / current or version spec -> Requirements closeout -> Issue plan -> Implementation evidence -> Release gate -> STATE update -> Archive
```

## Minimum Planning Set

Each substantial version should have:

- `current/requirements.md`
- `current/acceptance.md`
- `current/status.md`
- issue contracts or versioned evidence docs when work needs stable handoff
- release summary after completion
