# Aviso v0.3 Acceptance Criteria

Status: `draft / closeout / before implementation`
Updated: 2026-06-18

This file turns the v0.3 hosted AI requirements into acceptance criteria that can be used for issue planning and later QA. It does not approve frontend implementation, host-permission changes, staging, production, billing, or live provider work.

2026-06-23 update: the original local-only execution boundary below has been superseded only for Linear `MON-20`, where the owner approved the exact staging backend origin `https://aviso-backend-staging.vercel.app/v1`, exact host permission `https://aviso-backend-staging.vercel.app/*`, `identity` permission, and staging frontend OAuth identity-token handling. Production, public copy, billing, Chrome Web Store disclosure, production OAuth, and release remain owner-gated. Current state lives in [`status.md`](./status.md) and [`release-gates.md`](./release-gates.md).

## Scope Boundary

The first v0.3 slice is:

- BYOK plus free hosted AI.
- BYOK remains available without login.
- Hosted AI requires login only when the user chooses or needs hosted AI.
- First execution is local mock / local backend only.
- Free quota values are development placeholders: 1,000,000 monthly tokens and 50,000 daily tokens.
- Hosted model is the logical route `free-small`.
- No paid subscription launch in the first v0.3 release.
- Hosted requests pass through Aviso backend and OpenRouter / downstream providers, but raw content is not persisted; metadata retention is 30 days.

## Criteria

| ID | Acceptance Criteria | Evidence Required | Owner Repo | Stop Lines |
| --- | --- | --- | --- | --- |
| R1 | Existing BYOK direct-provider behavior still works without login. API keys remain local, and BYOK users are not forced into hosted AI. | BYOK smoke test, settings state review, no regression in direct-provider path. | `Aviso` | No storage key migration or BYOK behavior change without separate approval. |
| R2 | A user without BYOK can discover hosted AI and is asked to sign in only when choosing hosted AI. | UX state spec, local mock sign-in path, no global sign-in wall. | `Aviso` | Do not block the extension behind account creation. |
| R3 | Google sign-in is represented in local/mock flow and can exchange an identity token for a backend session token when live auth is later approved. | Local mock auth evidence and contract alignment. | `Aviso-backend` primary, `Aviso` consumer | Real OAuth credentials and Chrome identity behavior remain owner-gated. |
| R4 | Hosted chat supports translate, explain, polish, summarize, and custom prompt routes through local backend SSE. | Local backend SSE contract review and frontend integration evidence when implemented. | both | No real provider call, staging backend, or production URL in the first slice. |
| R5 | Account and quota UI can display `/v1/me` data: user, tier, logical model, monthly and daily token usage, and quota reset timing. | UX state spec and later local mock UI evidence. | both | Placeholder quota numbers must not become public marketing or CWS copy. |
| R6 | Frontend handles backend error states with clear next actions: unauthenticated, quota exhausted, model forbidden, rate limited, provider unavailable, provider error, bad request, and internal error. | Error-state table and later local mock coverage. | `Aviso` | Do not expose raw backend/provider errors or sensitive logs. |
| R7 | Hosted request and response content stays transient according to the privacy boundary. Frontend does not add new raw-content persistence for hosted AI beyond approved local UI/history behavior. | Code review when implemented, privacy wording draft before release. | both | Do not log raw prompts, raw responses, page bodies, screenshots, base64, full URLs, or API keys. |
| R8 | Privacy, subprocessor, and Chrome Web Store disclosure updates are drafted before release but not published during local implementation. | Draft copy plus release-gate review. | `Aviso` | Do not update public website or CWS wording as if hosted AI has shipped. |
| R9 | Cost and abuse controls are visible through quota, rate-limit, fallback, and account states in local mock flow. | Local mock responses and issue-level QA notes. | both | Real alert channels, provider billing sources, and abuse enforcement are later gates. |
| R10 | Release remains owner-gated. Host permission, backend domain, staging, production, billing, real provider, and public claims require separate approval. | Release gate checklist and owner decision record. | both | No host permission, deployment, secrets, billing, or provider-live work without explicit approval. |

## Closeout Result

These criteria are sufficient for issue planning once they are linked with:

- [`api-contract-review.md`](./api-contract-review.md)
- [`frontend-ux-states.md`](./frontend-ux-states.md)
- [`issue-plan.md`](./issue-plan.md)

They are not sufficient for release readiness.
