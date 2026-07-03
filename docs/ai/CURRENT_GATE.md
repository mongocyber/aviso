# Aviso Current Gate

Updated: 2026-07-03

## Current Fact

Aviso has two separate truths:

- Current usable/submitted line: `v0.1` BYOK direct-provider Chrome extension; Chrome Web Store review remains pending, not approved, not publicly listed.
- v0.3 hosted AI: production candidate with production backend HTTP smoke, OAuth challenge hardening, backend-issued OAuth client id, CWS disclosure draft/copy source updates, website build evidence, and regenerated candidate package evidence; not live, not Chrome Web Store uploaded/submitted/approved, not website-deployed, and not release-ready.

## Current Blocker

The only current release gate is final public-release evidence for v0.3 hosted AI: owner final loaded-extension production validation or owner-approved equivalent, website deployment evidence, Chrome Web Store upload/submission/disclosure evidence, and owner release approval. The latest local package evidence is current as of 2026-07-03.

## Allowed

- Keep BYOK as the default available path.
- Describe hosted AI only as `v0.3 production candidate`, `pre-release`, or `not live`.
- Use existing evidence from `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/ai/PROJECT_CONTEXT.md`, `docs/planning/v0.3/status.md`, and `docs/planning/v0.3/release-gates.md`.
- Make docs/status wording fixes that preserve the gate boundaries above.
- Ask the owner to validate the canonical unpacked package directory `build/chrome-mv3-prod`; if Chrome already points at that directory, a browser extension refresh is enough.

## Forbidden

- Do not say hosted AI is live, public, release-ready, or Chrome Web Store approved.
- Do not publish website/CWS copy, deploy, submit, call providers, read secrets, change production config, or expand permissions without owner approval.
- Do not imply anonymous free quota, subscription, payment, telemetry, web search, or remote link-body fetching is live.

## Verify

```bash
git diff --check
rg -n "hosted AI is live|Chrome Web Store approved|免费额度|subscription|public beta|公开测试版" AGENTS.md docs/ai/CURRENT_GATE.md docs/ai/PROJECT_CONTEXT.md
npm run verify:release-candidate
```

## Evidence Landing

- Top truth: `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/ai/PROJECT_CONTEXT.md`
- v0.3 gate truth: `docs/planning/v0.3/status.md`, `docs/planning/v0.3/release-gates.md`
- New evidence should land in the matching status/gate doc before release wording changes.
