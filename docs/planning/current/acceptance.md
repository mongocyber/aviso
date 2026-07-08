# Current Acceptance

Current facts live in [docs/STATE.md](../../STATE.md). This file defines what must be true before the current release-closeout planning area can be closed or archived.

## Acceptance Criteria

| ID | Acceptance | Evidence Required |
| --- | --- | --- |
| CUR-A1 | Chrome Web Store backend review state is known. | Non-secret owner-provided CWS backend state recorded in [docs/STATE.md](../../STATE.md) and release evidence docs. |
| CUR-A2 | If approved, formal store link, final owner release approval, tag, and GitHub Release are recorded before public-release wording changes. | Links/evidence in [docs/STATE.md](../../STATE.md) Gates table. |
| CUR-A3 | If rejected again, the rejection reason is recorded without overclaiming release state, and the remediation plan stays owner-gated for any CWS resubmission. | Updated [CURRENT_GATE](../../ai/CURRENT_GATE.md), [RELEASE_CHECKLIST](../../../RELEASE_CHECKLIST.md), and [docs/STATE.md](../../STATE.md). |
| CUR-A4 | `npm run docs:check` and `git diff --check` pass after documentation updates. | Local command output. |

## Closure Rule

When the release closes, archive this current planning set together with the relevant v0.3 release-closeout records, then update [docs/STATE.md](../../STATE.md) and run `npm run docs:check`.
