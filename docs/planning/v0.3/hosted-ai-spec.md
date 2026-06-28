# Aviso v0.3 Hosted AI Product Spec

Status: `planning / product-source / owner-gated`
Updated: 2026-06-18

This is the product requirements source for Aviso v0.3 hosted AI. It defines the user-facing goal and boundaries. Backend API details live in the sibling `Aviso-backend` repository.

## Summary

Aviso v0.3 adds an optional hosted AI path so users can use core AI actions after signing in, without configuring their own provider API key. BYOK remains available and continues to call providers directly from the browser.

## Goals

- Make first use easier for users who do not have model API keys.
- Preserve BYOK for advanced users, China-region users, and cost-sensitive heavy users.
- Keep hosted AI cost bounded through login, quota, rate limits, model configuration, and service-side circuit breakers.
- Keep privacy claims precise: hosted request content passes through Aviso backend and third-party LLM routing, but raw prompt/response/page body is not persisted by Aviso backend.
- Create a stable API contract so frontend and backend can be developed in separate threads.

## Non-Goals

- Replace BYOK.
- Force login for BYOK users.
- Add hosted image/screenshot AI in v0.3.
- Add autonomous browsing, web search, or remote link-body fetching.
- Add team accounts or organization management.
- Add China hosted AI stack in this version.
- Add usage-based billing or credits in this version.
- Store raw prompts, raw responses, screenshots, clipboard content, page bodies, or full URLs in the backend.

## User Modes

| Mode | User State | Request Path | Cost Owner | Notes |
| --- | --- | --- | --- | --- |
| BYOK | User has provider key | Browser extension -> provider | User | No login required; backend is not involved. |
| Free hosted | User signs in | Browser extension -> Aviso backend -> LLM provider route | Aviso | Quota-limited, small model, no card required. |
| Paid hosted | User subscribes | Browser extension -> Aviso backend -> LLM provider route | Aviso within quota | Later gate; not part of first v0.3 release. |

## Requirements

| ID | Requirement | Current Status |
| --- | --- | --- |
| R1 | Keep existing BYOK direct-provider path working. | Must preserve. |
| R2 | Add just-in-time sign-in for users who try hosted AI without a BYOK key. | Planned. |
| R3 | Support Google sign-in for hosted AI. | Backend Phase 1 implemented with mockable external services; extension integration not started. |
| R4 | Add hosted AI chat endpoint for explain, translate, polish, summarize, and custom text operations. | Backend Phase 1 implemented; extension integration not started. |
| R5 | Show quota and account state in the extension. | Planned frontend work. |
| R6 | Route quota, model, and service errors to clear user actions: retry, sign in, upgrade, or switch to BYOK. | Planned frontend work. |
| R7 | Keep hosted request content transient in Aviso backend and persist only metadata. | Backend design source. |
| R8 | Disclose OpenRouter / downstream model providers as sub-processors before public release. | Release gate. |
| R9 | Keep hosted AI cost bounded through quota, rate limits, and circuit breakers. | Backend Phase 1 implemented with mocks. |
| R10 | Keep deployment, billing, and production release owner-gated. | Release gate. |

## UX Principles

- Do not block BYOK users with login prompts.
- Ask for login only when the user chooses or falls into hosted AI.
- Always offer a BYOK fallback when hosted AI is unavailable or quota-limited.
- Do not expose backend internals such as OpenRouter route details in ordinary UI.
- Use plain language for quota and service errors.
- Keep screenshot/image hosted AI out of public v0.3 scope.

## Owner Closeout Decisions

Accepted on 2026-06-18 in [`../../decisions/0003-v0.3-owner-closeout-decisions.md`](../../decisions/0003-v0.3-owner-closeout-decisions.md):

- First v0.3 scope is BYOK plus free hosted AI only.
- First execution phase is local mock / local backend only.
- BYOK users are not forced to sign in.
- Free hosted quota may use the development placeholder of 1,000,000 monthly tokens and 50,000 daily tokens, but this number must not be used in public copy.
- Frontend uses logical model `free-small`; real upstream model is reviewed before release.
- Paid subscriptions do not launch in the first v0.3 release.
- Hosted requests pass through Aviso backend and OpenRouter / downstream providers, but Aviso backend does not persist raw content; metadata retention is 30 days.

## Privacy Position

Current public/live product privacy must keep BYOK and hosted AI separate. BYOK requests still do not pass through Aviso backend. v0.3 production candidate hosted AI does pass through Aviso backend after the user chooses Aviso AI and signs in, but this is still not public release, Chrome Web Store approval, or hosted AI live.

For v0.3 hosted AI, the approved privacy wording must change before release:

- BYOK requests still do not pass through Aviso backend.
- Hosted requests do pass through Aviso backend and the selected upstream LLM routing provider.
- Aviso backend must not persist raw prompt, raw response, page body, screenshot/base64, clipboard content, API keys, or full URLs.
- Backend may persist metadata required for account, quota, abuse prevention, billing, and operations.

## Release Position

This spec does not approve:

- frontend implementation,
- backend deployment,
- new host permissions,
- Chrome Web Store data-disclosure updates,
- billing launch,
- public website claims,
- production release.

Those are tracked in [`release-gates.md`](./release-gates.md).
