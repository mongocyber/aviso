# Aviso Current Gate

Updated: 2026-07-04

## Current Fact

Aviso has one upload/release version truth:

- Current Chrome package version: `0.1.0`.
- Current package scope: BYOK direct-provider remains the default path; optional Aviso AI / hosted AI is included in the same `0.1.0` release candidate package and only runs after the user explicitly chooses it and signs in.
- Historical labels such as `v0.2` and `v0.3` are internal planning / issue-group labels only. They are not separate upload versions, public release versions, or user-facing product versions.
- Hosted AI has production backend HTTP smoke, OAuth challenge hardening, backend-issued OAuth client id, Upstash challenge parsing fix, owner-loaded sign-in / translate / send-to-AI smoke pass, CWS disclosure draft/copy source updates, website build/deployment evidence, and regenerated candidate package evidence; it is still not public live, not Chrome Web Store approved, and not release-ready until owner upload/release approval closes.

## Current Blocker

The current release gates are final public-release evidence for the `0.1.0` package: Chrome Web Store upload/submission/disclosure evidence and owner release approval. Owner website page review and website deployment evidence passed on 2026-07-03 from commit `b6d7b65`; owner-loaded hosted-AI smoke passed on 2026-07-03 after backend commit `c60b895`. The known latency issue is accepted as a next-version optimization and is not treated as the current release blocker. The latest local package evidence is current as of 2026-07-04.

## Allowed

- Keep BYOK as the default available path.
- Describe hosted AI only as an optional `0.1.0 production candidate` path, `pre-release`, or `not live`.
- Use existing evidence from `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/ai/PROJECT_CONTEXT.md`, `docs/planning/v0.3/status.md`, and `docs/planning/v0.3/release-gates.md`; treat `docs/planning/v0.3` as historical/internal planning evidence, not as the upload version.
- Make docs/status wording fixes that preserve the gate boundaries above.
- Ask the owner to validate the canonical unpacked package directory `build/chrome-mv3-prod`; if Chrome already points at that directory, a browser extension refresh is enough.

## Forbidden

- Do not say hosted AI is live, public, release-ready, or Chrome Web Store approved.
- Do not publish further public copy, submit CWS changes, call providers, read secrets, change production config, or expand permissions without owner approval.
- Do not imply anonymous free quota, subscription, payment, telemetry, web search, or remote link-body fetching is live.

## Verify

```bash
git diff --check
rg -n "hosted AI is live|Chrome Web Store approved|免费额度|subscription|public beta|公开测试版" AGENTS.md docs/ai/CURRENT_GATE.md docs/ai/PROJECT_CONTEXT.md
npm run verify:release-candidate
```

## Evidence Landing

- Top truth: `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/ai/PROJECT_CONTEXT.md`
- hosted AI historical/internal gate evidence: `docs/planning/v0.3/status.md`, `docs/planning/v0.3/release-gates.md`
- New evidence should land in the matching status/gate doc before release wording changes.
