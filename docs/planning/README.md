# Aviso Version Planning

This folder holds future-version planning and active execution records. It is not the current product truth.

## Current Active Plan

- `v0.2-fast-open-provider-spec.md`: v0.2 requirements and scope.
- `v0.2-issue-plan.md`: v0.2 issue map and execution order.
- `v0.2-status.md`: v0.2 progress, evidence, and open decisions.
- `v0.2-manual-acceptance.html`: interactive v0.2 manual acceptance checklist for owner validation.
- `v0.2-next-development-queue.md`: post-v0.2 development queue after manual validation is deferred.
- `v0.2-wxt-migration-plan.md`: WXT migration issue track and dependency impact.
- `v0.2-provider-architecture-preflight.md`: V02-001 provider matrix, adapter contract, permission review, and stop lines.
- `v0.2-provider-deferred-decision-pack.md`: owner decision pack for deferred Qwen / DashScope and Zhipu GLM provider work.
- `v0.2-wxt-migration-preflight.md`: V02-WXT-001 migration map, manifest parity checklist, and loaded-extension QA plan.
- `v0.2-provider-config-contract.md`: V02-003 provider config schema, UI state, routing, storage, and connectivity-test contract.
- `v0.2-wxt-migration-closeout.md`: V02-WXT-003 runtime build evidence and V02-WXT-004 automated package / manifest parity record.

## Rules

- Keep `docs/02_PRD.md`, `docs/03_TECH_SPEC.md`, and `docs/07_PRIVACY_AND_SECURITY.md` aligned to shipped or submitted product truth.
- Put future requirements in versioned planning files first.
- Do not describe planned features as implemented.
- Do not update website or store copy from planning docs until implementation evidence exists.
- When a version completes, add a release summary and move or copy the final planning set into `docs/archive/<version>/`.

## Version Lifecycle

```text
Draft spec -> Owner review -> Issue plan -> Implementation evidence -> Release gate -> Current docs update -> Archive
```

## Minimum Planning Set

Each substantial version should have:

- `vX.Y-*-spec.md`
- `vX.Y-issue-plan.md`
- `vX.Y-status.md`
- release summary after completion
