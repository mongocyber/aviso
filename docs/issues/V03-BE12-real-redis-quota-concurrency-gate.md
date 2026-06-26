# V03-BE12 Real Redis Quota Concurrency Gate

Status: `real Redis verified / sanitized evidence accepted / not live`
Updated: 2026-06-26
Linear: `not synced`

## Linear Draft

Title: `V03-BE12 Real Redis quota concurrency gate`

Project: `Aviso v0.3 Hosted AI` or existing Aviso project

Priority: High

Labels: `v0.3`, `backend`, `quota`, `redis`, `release-gate`, `owner-gated`

## Goal

Turn the quota reserve Lua atomicity claim into executable regression evidence before hosted AI is opened to real or untrusted users.

The current backend unit tests verify TypeScript wiring and Lua script invocation. Existing Upstash staging smoke verifies Redis metadata paths, positive TTLs, idempotency, association sets, and cleanup. This issue specifically covers concurrent `reserveAdmission` behavior against a real Redis-compatible runtime so double-spend protection is tested, not only reviewed.

## Current Backend State

Backend implementation is prepared in `Aviso-backend`:

- harness: `apps/backend/src/persistence/upstash-quota-concurrency-smoke.ts`;
- local fake coverage: `apps/backend/src/persistence/__tests__/upstash-quota-concurrency-smoke.test.ts`;
- command: `corepack pnpm --filter @aviso/backend run smoke:upstash:quota-concurrency`;
- runbook: `docs/planning/upstash-quota-concurrency-smoke-runbook.md`.

Sanitized owner-assisted evidence accepted: request limit accepted/rejected `7/17`, token-window limit `5/19`, daily quota limit `5/19`, monthly quota limit `4/20`; all TTL categories were `positive`; cleanup deleted 16 synthetic `aviso:be12` keys.

No Redis URL/token, env values, full Redis keys, raw request payloads, user data, prompts, responses, screenshots, clipboard content, frontend host permission changes, billing changes, provider route changes, or public release status changes were recorded.

## Owner Repo

Primary: `Aviso-backend`

Reviewer / release gate: `Aviso`

## Execution Mode

Level: `L3 real-service or isolated integration gate`

Allowed after owner approval:

- add a dedicated integration test for concurrent quota reserve attempts,
- use either an isolated real staging Redis database or an approved local testcontainer / Redis-compatible container,
- keep synthetic keys namespaced and clean them after the run,
- record only sanitized pass/fail evidence and aggregate counts,
- update release-gate docs after the evidence exists.

Stop before:

- adding Docker, testcontainer, or new Redis runtime dependencies without owner approval,
- using production Redis, production secrets, or shared non-isolated data,
- printing Redis URL/token, env values, prompts, provider responses, session tokens, raw request payloads, full URLs, screenshots/base64, or user data,
- changing frontend host permissions, public copy, billing, provider routing, OAuth, or production release status.

## Scope

Verify against real Redis-compatible script execution:

1. many concurrent `reserveAdmission` calls contend for the same low request/token/monthly/daily limits,
2. accepted count never exceeds configured limits,
3. rejected calls return the expected quota/rate-limit reason,
4. TTL is present and positive on touched synthetic keys,
5. release / settle semantics do not create negative counters or unbounded keys,
6. synthetic keys are removed after the test run.

## Non-Scope

- No new quota product policy.
- No paid billing, subscription, checkout, webhook, or tier change.
- No production provider validation.
- No frontend UX, manifest, permission, storage, or public copy change.
- No use of real user data.
- No claim that hosted AI is live or release-ready merely because this test passes.

## Acceptance Criteria

- A repeatable integration test or smoke harness exists in `Aviso-backend`.
- The test executes the actual Redis Lua script path, not only a fake `eval` recorder.
- Concurrent reserve attempts prove no double-spend beyond configured request/token/monthly/daily limits.
- Evidence records only sanitized metadata: test name, environment class, synthetic namespace, accepted count, rejected count, TTL presence, cleanup result, and command/check status.
- Backend checks pass after the change.
- `Aviso` release-gate docs are updated from `planned / not verified` only after evidence exists. Completed with sanitized owner-assisted evidence on 2026-06-26.

## Checks

Recommended after implementation:

- `corepack pnpm check`
- targeted Redis concurrency integration command, with the exact command recorded in the backend issue / evidence note
- secret scan or source review confirming no Redis URL/token/env value/raw payload is recorded

## Stop Lines

Stop for owner / CTO approval before adding new dependencies, requiring Docker/testcontainers, using live Upstash credentials, changing staging/production env, changing public release status, or widening frontend/backend product scope.

## Return Format

Return to CTO with:

- implementation files changed,
- exact test environment used: real staging Redis or approved local container,
- concurrent reserve parameters,
- accepted / rejected counts,
- TTL and cleanup result,
- checks run,
- confirmation that no secrets, raw payloads, user data, host permissions, public copy, billing, provider route, or release status changed.
