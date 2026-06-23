# Planning Inbox

Status: `active / intake`
Updated: 2026-06-18

This file is the first stop for new product, technical, growth, operations, or release ideas that are not yet ready to become a version requirement or execution issue.

The inbox is not a commitment to build. It exists to keep new ideas visible without mixing them into current product truth or active version scope too early.

## Intake Rules

- Add new ideas here first when the target version, owner, risk level, or acceptance standard is not clear.
- Do not start implementation from an inbox item alone.
- Triage decides whether an item moves to the current version, the backlog, the roadmap, a decision record, Linear, or direct execution.
- Keep current product docs unchanged until the idea is implemented, verified, and release-approved.
- Stop before adding backend services, host permissions, production configuration, secrets, billing, provider proxy behavior, or public release wording.

## Triage Status

| Status | Meaning |
| --- | --- |
| `new` | Captured, not reviewed. |
| `needs-shaping` | Valuable direction, but scope or acceptance is unclear. |
| `candidate` | Likely to enter a version plan after owner review. |
| `moved-to-backlog` | Valid but not current. |
| `moved-to-version` | Accepted into a specific version planning file. |
| `moved-to-decision` | Needs an ADR / decision record before execution. |
| `ready-for-issue` | Scope is clear enough to split into Linear or local issues. |
| `rejected` | Explicitly not pursuing for now. |

## Intake Template

Copy this block for each new idea.

```text
### YYYY-MM-DD - <short title>

- Source:
- One-line idea:
- User value:
- Current pain / trigger:
- Likely repo: `Aviso` / `Aviso-backend` / both / unknown
- Version guess: v0.3 / later / unknown
- Risk level: low / medium / high
- Stop lines: permissions / backend / secrets / provider / billing / production / none known
- Triage status: new
- Triage notes:
```

## Open Inbox

No untriaged items yet.
