# ADR-0002: Environments And Release Flow

Status: Accepted planning decision
Date: 2026-06-18
Owner: product owner

## Context

Aviso is moving from a single Chrome extension repository toward a two-repository product:

- `Aviso`: extension, website, product truth, public wording, and release gates.
- `Aviso-backend`: hosted AI backend, API contract, data model, deployment, and operations.

v0.3 hosted AI introduces backend services, auth, quota, provider routing, possible billing, secrets, databases, and production deployment. Without an explicit environment protocol, development threads may mix local tests, staging verification, production secrets, production data, or release authority.

This record defines the environment and release flow before frontend/backend integration begins. It does not approve any code change, deployment, host permission, real provider call, or Chrome Web Store submission.

## Decision

Aviso uses three named environments:

| Environment | Purpose | Data / Secrets | Allowed Use | Not Allowed |
| --- | --- | --- | --- | --- |
| `local` | Developer machine and automated local checks. | Mock data by default; development credentials only when explicitly approved. | Unit tests, typechecks, local mock backend, local extension smoke. | Production secrets, production database, real user data, public release claims. |
| `staging` | Internal end-to-end validation before release. | Independent staging domain, database, auth config, provider keys, quota, and payment sandbox. | Owner/internal QA, integration testing, release-gate evidence. | Production data, production secrets, public users, production billing. |
| `production` | Real user service. | Production domain, production database, production secrets, real provider/payment configuration. | Public release after owner approval. | Automatic deploy from tests alone, unapproved schema/permission/provider/payment changes. |

`staging` must be isolated from `production`. It must not reuse production database, production secrets, production payment configuration, or production user data.

## Branch Strategy

- Long-lived branch: `main`.
- Feature work uses short-lived PR branches.
- Branch names should identify the issue or workstream, for example `codex/v03-fe02-contract-client` or `codex/v03-be07-staging-preflight`.
- Do not keep parallel long-lived frontend/backend integration branches unless the owner explicitly approves a release train.
- Merge to `main` means source has been accepted into the repository. It does not mean staging, production, Chrome Web Store approval, or public release.

## Release Flow

The default release flow is:

```text
short-lived PR branch
  -> review and checks
  -> merge to main
  -> staging deploy / staging verification
  -> owner release approval
  -> production deploy or Chrome Web Store submission
```

For extension-only work, "production" may mean Chrome Web Store package submission or public listing update.

For backend work, "production" means a deployed backend service reachable by real users or a production Chrome extension build.

For website/docs work, "production" means public website deployment or public user-facing claims.

## Environment Rules

### Local

- Prefer mock providers, mock auth, in-memory stores, and fake data.
- Real provider calls are not part of local default work.
- Development credentials may be used only after explicit owner approval and must stay out of docs, logs, commits, screenshots, and test artifacts.
- Local verification can support implementation evidence but cannot prove staging or production readiness.

### Staging

- Uses independent staging domain and backend URL.
- Uses independent staging database and storage.
- Uses independent OAuth/auth configuration.
- Uses provider test keys or constrained staging keys where available.
- Uses payment sandbox only.
- Requires clear evidence before promotion to production.
- Staging verification does not automatically approve production.

### Production

- Requires explicit owner approval.
- Requires reviewed secrets and configuration.
- Requires release-gate evidence for privacy, permissions, data handling, provider routing, quota, logging, observability, and rollback.
- Must not use staging or test credentials.
- Must not be changed by an agent automatically after CI passes.

## Secrets And Data Rules

- Do not commit secrets, generated credentials, API keys, private keys, tokens, or `.env` values.
- Do not print or store raw provider responses, raw prompts, screenshots/base64, private page bodies, clipboard content, complete URLs, API keys, or production user data.
- `local`, `staging`, and `production` must have separate configuration and secrets.
- Production data must not be copied into local or staging unless a separate data-sanitization decision is approved.
- BYOK keys remain local to the extension and must never be sent to the Aviso backend.

## Stop Lines

Stop and ask the owner before:

- adding or changing extension host permissions,
- adding a real backend URL to extension configuration,
- deploying backend to staging or production,
- configuring real Google OAuth secrets,
- configuring real provider keys,
- running real provider validation,
- creating or migrating a production database,
- enabling payment or billing webhooks,
- changing privacy/data-retention behavior,
- submitting to Chrome Web Store,
- deploying public website copy that claims hosted AI is live,
- promoting staging to production.

## Consequences

- v0.3 frontend/backend work must identify which environment it targets.
- Mock/local evidence, staging evidence, and production-live evidence must be recorded separately.
- Future execution threads should not treat `main` merge, passing tests, or staging success as production approval.
- Release gates must reference this decision before hosted AI, backend deployment, payments, provider proxy, or public claims are enabled.

## Follow-Up

- Link this decision from v0.3 release gates and cross-repo integration docs.
- Backend deployment docs should distinguish local, staging, and production configuration before any staging work starts.
- Frontend implementation issues should name the target environment and stop before host-permission changes.
