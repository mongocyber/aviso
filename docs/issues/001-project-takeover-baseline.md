# Issue 001: Project Takeover Baseline

Status: completed as takeover baseline. Product name is now Aviso.

## Goal

Make Aviso maintainable as a product project, not just a local extension folder. The immediate goal is to align project documents, verification flow, and release gates with the code that already exists.

## Context

The current codebase is a Plasmo Chrome MV3 extension with a substantial v0.1.0 implementation already present. Local checks passed for unit tests, TypeScript, and production build. The main gap is not feature coding; it is project control, browser-level QA, release readiness, and documentation accuracy.

Original takeover facts:

- root directory is not a git repository
- `README.md` was still scaffold-level
- `docs/EXECUTION_PLAN.md` and `docs/ACCEPTANCE_CRITERIA.md` disagreed on completion state
- no `RELEASE_CHECKLIST.md` existed yet
- no recorded real Chrome click-through QA in this takeover
- no provider/API live-call validation in this takeover
- release workflow likely does not match the local npm setup

## Scope

- Update project documentation to reflect the real current state.
- Create or maintain concise issue docs for the next development slices.
- Prepare a release checklist before any store submission or real-user delivery.
- Keep code changes out of this issue unless a documented check proves they are needed.

## Out of Scope

- No new product features.
- No dependency installation.
- No API key handling or external provider calls without explicit user approval.
- No broad permission expansion.
- No publishing, deployment, or store submission.
- No file deletion or git history changes.

## Acceptance Criteria

- `STATUS.md` accurately routes a new agent to the current project state, checks, risks, and next issue.
- `README.md` no longer reads like a generic Plasmo scaffold and explains the actual product and local workflow.
- `docs/EXECUTION_PLAN.md` and `docs/ACCEPTANCE_CRITERIA.md` no longer contradict each other on M1-M5 completion.
- `RELEASE_CHECKLIST.md` exists before any release or store work begins.
- Manual Chrome QA results are recorded after running `tests/manual-test.html` A-G.
- Release workflow package-manager and Node-version assumptions are reconciled.

## Verification

Run the relevant checks after documentation or release workflow changes:

```bash
npm test
npx tsc --noEmit
npm run build
```

For browser validation, load:

```text
build/chrome-mv3-prod
```

Then open:

```text
tests/manual-test.html
```

## Stop and Ask Before

- adding or changing dependencies
- changing extension permissions or host permissions
- touching API keys, secrets, or production publishing credentials
- making live OpenAI / Anthropic / Doubao calls
- changing release automation that uses store credentials
- publishing or submitting to a browser store
