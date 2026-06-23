# Aviso v0.3 API Contract Review

Status: `reviewed / local-contract / no-frontend-implementation`
Updated: 2026-06-18

This file records the product-side review of the backend contract for frontend planning. It does not approve frontend implementation or live backend usage.

## Sources Reviewed

Backend repository sources:

- `docs/api-contract.md`
- `docs/openapi.yaml`
- `packages/contract/src/schemas.ts`
- `packages/contract/src/constants.ts`

Product repository sources:

- [`hosted-ai-spec.md`](./hosted-ai-spec.md)
- [`acceptance-criteria.md`](./acceptance-criteria.md)
- [`requirements-closeout.md`](./requirements-closeout.md)
- [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md)

## Review Conclusion

The backend contract is coherent enough for first frontend issue planning.

The next shared issue should align how the extension consumes the contract before product code starts. This includes deciding whether the frontend uses a generated client, a copied contract subset, or the backend `packages/contract` package.

Do not hardcode a production API URL in the extension. Any OpenAPI server URL such as `https://api.aviso.app/v1` is a future deployment placeholder until the owner approves backend domain, host permission, staging, and production flow.

## Frontend-Visible Endpoints

| Endpoint | Frontend Role | First-Slice Position |
| --- | --- | --- |
| `POST /v1/auth/google` | Exchange Google identity token for backend session. | Plan against contract; live OAuth is not approved. |
| `POST /v1/auth/logout` | End hosted AI session. | Allowed in local mock planning. |
| `GET /v1/me` | Read account, tier, model, quota, and usage state. | Required for quota/account UI planning. |
| `POST /v1/chat` | Hosted AI request stream. | Required for local SSE integration planning. |
| `POST /v1/billing/checkout` | Start checkout for paid plan. | Excluded from first v0.3 release. |
| `POST /v1/billing/webhook` | Billing provider webhook. | Backend-only; extension must not call it. |

## Frontend-Visible Data Shapes

The frontend should plan for these categories:

- Session token returned after auth.
- User and account state from `/v1/me`.
- Tier and entitlement state.
- Logical model route, starting with `free-small`.
- Monthly and daily token usage and limits.
- Chat request fields for action, text, optional context, and model route.
- SSE events for `delta`, `done`, and `error`.
- Error body with stable error code and message.

## Required Frontend Handling

| Concern | Required Handling |
| --- | --- |
| Session | Hosted requests use backend session auth. BYOK direct-provider calls do not require backend session. |
| Idempotency | `/v1/chat` may support `Idempotency-Key`; first frontend issue should decide whether to add it in the local slice. |
| Install ID | Backend can accept `X-Install-Id`, but extension-side install-id support is not approved for the first frontend slice unless explicitly added to an issue. |
| Streaming | Frontend must handle incremental SSE deltas, completion, cancellation, and backend error events. |
| Errors | Frontend must map `unauthorized`, `quota_exceeded`, `forbidden_model`, `rate_limited`, `service_unavailable`, `provider_error`, `bad_request`, and `internal` into user actions. |
| Fallback | BYOK fallback must remain available where the user has configured BYOK. |

## Gaps Before Implementation

| Gap | Decision Needed |
| --- | --- |
| Contract consumption workflow | Decide generated client vs shared package vs local typed wrapper. |
| API base URL | Use local config for the first slice; do not add production URL or host permission. |
| Auth path | Keep real Google OAuth credentials and live validation behind owner approval. |
| Provider path | Keep real OpenRouter/provider validation behind owner approval. |
| Billing path | Exclude checkout and paid subscription UX from first v0.3 release. |
| Install ID | Treat as a later abuse-control signal unless explicitly approved for the first local harness. |

## First Shared Issue

Create or approve `V03-SH01 Contract workflow alignment` before frontend implementation. It should produce a small, reviewable decision on:

- source of frontend request/response types,
- local backend base URL handling,
- error-code mapping,
- SSE parsing expectations,
- which contract fields are in scope for the first local mock integration.
