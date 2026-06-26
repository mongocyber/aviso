# Aviso MON-23 Production Release Approval Gate

Status: `owner-approved-to-execute / not configured / not verified / not production`
Updated: 2026-06-26

This file records the owner decision package for `MON-23`: production environment and release approval. Owner approval was recorded in the CTO control thread on 2026-06-26, which authorizes execution threads for production preparation and release validation. It is not Chrome Web Store submission, website publication, production verification, or live evidence by itself.

## Scope

| Release type | Meaning | Current status | Owner decision needed |
| --- | --- | --- | --- |
| Production | Create and configure production backend resources, production environment variables, production OAuth/provider settings, production cost controls, production observability, and rollback path. | `owner-approved-to-execute / not configured / not verified` | Approved; execution evidence required |
| Store Submission | Submit Chrome Web Store privacy/data disclosure and hosted-AI package updates for review. | `owner-approved-to-prepare / draft exists / not submitted` | Approved; final submission evidence required |
| Website Publication | Deploy public website/privacy-policy copy that describes BYOK and hosted AI accurately. | `owner-approved-to-prepare / source updated / not deployed` | Approved; final deployment evidence required |

## Current Conclusion

v0.3 hosted AI has staging evidence that can support production execution, and the owner has approved the MON-23 decision set. This approval authorizes production resource preparation, production host-permission work, production OAuth/provider validation, website publication preparation, Chrome Web Store submission preparation, release copy finalization, rollback readiness work, and keeping billing excluded from the first hosted-AI release unless separately expanded.

Until production configuration, validation, website deployment, Chrome Web Store submission, and release evidence are complete, BYOK direct-provider remains the default available path, hosted AI remains not live, and public copy must not imply hosted AI is available before the release evidence exists.

## Verified Evidence Available For Review

Use this section as the evidence index for owner review. Do not expand it with secrets, raw logs, raw prompts, provider responses, session tokens, account payloads, or full URLs.

| Evidence area | Current evidence | Source |
| --- | --- | --- |
| Backend staging | Staging backend deployed, readiness guard deployed, `/health` and `/healthz` smoke verified, staging provider route remediated, staging remains `not live`. | [`staging-resource-register.md`](./staging-resource-register.md), [`release-gates.md`](./release-gates.md), [`status.md`](./status.md) |
| Supabase staging | Baseline migration applied to dedicated staging project; metadata smoke verified six-table presence, RLS state, no client policies, synthetic insert paths, and synthetic cleanup. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-24` |
| Upstash staging `MON-16` | Quota counter, float counter, chat/billing idempotency, association set, positive TTLs, and synthetic cleanup verified with sanitized evidence. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-16` |
| Real Redis quota concurrency `BE12` | Concurrent `reserveAdmission` scenarios passed against real Redis-compatible Lua execution, with positive TTL categories and synthetic cleanup. | [`../../issues/V03-BE12-real-redis-quota-concurrency-gate.md`](../../issues/V03-BE12-real-redis-quota-concurrency-gate.md) |
| OAuth staging | Google OAuth staging auth/session flow, logout invalidation, unauthorized-after-logout behavior, and audience alignment verified with sanitized evidence. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-17` |
| Provider smoke | OpenRouter-backed `free-small` staging route passed backend `/v1/chat` smoke after GLM 5.2 remediation; SSE `delta`, `done`, `usage`, positive quota delta, and cost guard were confirmed. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-18C` |
| Sensitive logs | Vercel 24h runtime overview and targeted keyword/error checks reviewed without exporting raw log bodies; backend logger/source boundary redacts sensitive fields. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-19` |
| Frontend OAuth and staging host permission | Exact staging backend origin, staging host permission, `identity` permission, background `launchWebAuthFlow` id-token path, account/quota display, session save, and BYOK availability verified. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-20` |
| Build, zip, and manifest | Tests, typecheck, WXT/Plasmo production builds, package/zip commands, manifest guard, zip manifest inspection, and forbidden-boundary scan passed for the staging-approved boundary. | [`staging-resource-register.md`](./staging-resource-register.md), `MON-21` |
| Privacy and CWS source | Website/privacy/CWS source materials distinguish BYOK direct-provider and optional hosted AI; hosted transit and no-persistent-raw-content boundary are documented. | [`cws-disclosure-draft.md`](./cws-disclosure-draft.md), `MON-22` |
| Hosted service selection UX | Aviso AI selection UX and hosted/BYOK service configuration path passed implementation and loaded-extension UI smoke, with BYOK fallback preserved. | [`status.md`](./status.md), `MON-27` |
| Hosted sign-in UX and local unavailable guidance | Hosted sign-in UX redesign was merged and local unavailable-state guidance validation passed; public release approval remains separate. | [`status.md`](./status.md), `MON-26`, `MON-29` |

## Owner Approval Checklist

Every row below must be explicitly approved, blocked, or deferred by the owner before MON-23 can close.

| Decision | Owner must confirm | Current default |
| --- | --- | --- |
| Production backend resources | Whether to create separate production Vercel/backend runtime, Supabase project, Upstash Redis, provider account/key, OAuth client, session secret, and any required production domains. | `Vercel production origin configured / external resources and secrets pending / not live` |
| Production env and secrets | Who will inject production env values, which environment they target, and how sanitized evidence will confirm readiness without exposing values. | `approved for owner-controlled injection / values must not be recorded / evidence pending` |
| Production host permission | Exact production backend origin and exact extension `host_permissions` entry, if hosted AI is included in the production package. No broad host permission. | `origin established as https://aviso-backend-production.vercel.app / future exact candidate https://aviso-backend-production.vercel.app/* / package not updated` |
| Production OAuth validation | Exact production Google OAuth client, consent screen status, redirect origin, and sanitized production auth/session smoke plan. | `approved to validate / evidence pending` |
| Production provider validation | Approved provider account, model route, spend cap, cost guard, quota path, sanitized smoke scope, and allowed evidence fields. | `approved to validate / cost guard required / evidence pending` |
| Production cost caps | Free quota policy, hard spend cap, abuse controls, quota reset behavior, and emergency disable path. Do not publish quota numbers unless release copy is approved. | `approved as required release gate / evidence pending` |
| Observability and alerts | Which alerts must exist before production, who receives them, what log fields are allowed, and how sensitive-data exclusions are verified. | `approved as required release gate / evidence pending` |
| Rollback | Rollback owner, rollback trigger conditions, package rollback path, backend disable path, provider key disable path, and public communication rules. | `approved as required release gate / evidence pending` |
| Website privacy deployment | Whether to deploy the source-updated privacy/website copy, where it will be hosted, and what URL is safe to cite in CWS. | `approved to prepare / not deployed / evidence pending` |
| Chrome Web Store disclosure submission | Whether to submit the hosted-AI disclosure update, final data-category answers, final permission explanations, and final review package. | `approved to prepare / not submitted / evidence pending` |
| Release copy | Public wording for hosted AI availability, sign-in, quota, BYOK fallback, provider transit, and staging-to-production transition. | `approved to finalize / evidence pending` |
| Billing exclusion | Whether paid hosted AI, checkout, subscription, billing provider, and upgrade copy remain excluded from the first v0.3 production release. | `approved excluded / later owner gate` |

## Stop Lines

Do not cross these lines in MON-23 execution work:

- Do not create or configure production backend, database, cache, provider, OAuth, alerting, or website resources outside the approved execution threads and sanitized evidence plans.
- Do not inject, read, print, copy, or store production secrets or `.env` values in project files or chat.
- Do not submit Chrome Web Store disclosure, privacy updates, package updates, or store listing changes until the production package and disclosure evidence are final.
- Do not deploy website/privacy changes or publish hosted-AI public copy until final copy and publication evidence are ready.
- Do not add broad extension host permissions; production host permission is approved only for the exact production backend origin `https://aviso-backend-production.vercel.app`.
- Do not run production provider, OAuth, database, cache, billing, or alerting validation without a sanitized evidence plan.
- Do not describe hosted AI as live, production, publicly available, or release-approved until production validation, CWS/package, website, and release evidence are complete.
- Do not add billing, subscription, checkout, upgrade, anonymous quota, or paid-plan claims unless the owner explicitly expands scope.

## Evidence Template

Use this template for future MON-23 evidence. Keep entries summary-only and sanitized.

```text
Gate:
Environment: production | store-submission | website-publication
Owner approval reference:
Executor:
Date:
Status: attempted | blocked | pass
Resource category:
Non-secret resource identifier:
Command or action category:
Expected result:
Observed result:
Sanitized evidence:
Residual risk:
Next action:
```

Allowed evidence examples:

- status class such as `2xx`, `4xx`, or `5xx`,
- endpoint category such as `health`, `auth`, `chat`, `logout`, `manifest`, `CWS disclosure`, or `privacy deployment`,
- resource name, public domain, or non-secret project identifier when approved for coordination,
- boolean presence checks such as `session token present: yes/no` without token values,
- quota/cost category such as `positive quota delta` or `cost guard exercised`,
- synthetic cleanup counts,
- commit hash, package filename, or manifest permission list.

Forbidden evidence:

- API keys, provider tokens, OAuth client secrets, Supabase service-role keys, Upstash tokens, session signing secrets, or `.env` values,
- Google id tokens, hosted session tokens, cookies, auth headers, or account/profile payloads,
- raw prompts, raw provider responses, raw page bodies, selected text originals, screenshots/base64, clipboard content, or private user content,
- full URLs with user data, query strings, tokens, or private paths,
- raw log bodies, stack traces containing payloads, private emails, private account identifiers, or provider request payloads.

## MON-23 Close Criteria

MON-23 can close only when the owner has made explicit decisions for all required rows:

- `pass`: production, store submission, and website publication approvals are recorded with sanitized evidence plans and stop lines lifted only for the approved actions.
- `blocked`: at least one required owner decision or prerequisite is missing, and no production/public action has been taken.
- `deferred`: the owner decides to keep hosted AI staging-only and ship no production/store/website hosted-AI change in this cycle.

Passing staging gates, local builds, or CWS draft preparation alone is not enough to close MON-23 as production-approved.
