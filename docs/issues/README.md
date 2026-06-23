# Aviso Issue Contracts

Status: `local-contracts / Linear-preferred`
Updated: 2026-06-18

This folder holds local issue contracts for agent execution when a task needs a stable handoff. Linear is the preferred formal tracker. These files are a fallback and drafting surface when Linear is unavailable or before an issue is synced.

## Rules

- One issue file should map to one execution thread.
- Linear remains the external status tracker once available.
- Local issue contracts should include goal, scope, non-scope, execution mode, acceptance criteria, checks, stop lines, and return format.
- Do not treat a local issue as implementation approval if it contains owner-gated work.

## Active Drafts

| Issue | Status | Linear |
| --- | --- | --- |
| [`V03-SH01-contract-workflow-alignment.md`](./V03-SH01-contract-workflow-alignment.md) | completed by backend / CTO accepted | not synced in this pass |
| [`V03-SH02-cross-repo-local-integration-harness.md`](./V03-SH02-cross-repo-local-integration-harness.md) | completed / CTO accepted / local-only | not synced in this pass |
| [`V03-FE01-hosted-byok-ux-design.md`](./V03-FE01-hosted-byok-ux-design.md) | completed / docs-plan / local-only | not synced in this pass |
| [`V03-FE02-backend-client-contract-integration.md`](./V03-FE02-backend-client-contract-integration.md) | completed / CTO accepted / local-only | not synced in this pass |
| [`V03-FE03-just-in-time-sign-in-flow.md`](./V03-FE03-just-in-time-sign-in-flow.md) | completed / CTO accepted / local-only | not synced in this pass |
| [`V03-FE04-quota-account-display.md`](./V03-FE04-quota-account-display.md) | completed / CTO accepted / local-only | not synced in this pass |
| [`V03-FE05-hosted-chat-routing.md`](./V03-FE05-hosted-chat-routing.md) | completed / CTO accepted / local-only / build sandbox-blocked | [`MON-6`](https://linear.app/mongocyber/issue/MON-6/v03-fe05-hosted-chat-routing) |
| [`V03-FE06-error-and-fallback-handling.md`](./V03-FE06-error-and-fallback-handling.md) | completed / CTO accepted / local-only / build sandbox-blocked | [`MON-7`](https://linear.app/mongocyber/issue/MON-7/v03-fe06-error-and-fallback-handling) |
