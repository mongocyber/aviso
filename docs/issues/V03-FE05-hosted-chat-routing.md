# V03-FE05 Hosted Chat Routing

Status: `completed / CTO accepted / local-only / build sandbox-blocked`
Updated: 2026-06-19

## Linear

Title: `V03-FE05 Hosted chat routing`

Project: `Aviso v0.3 Hosted AI`

Issue: `MON-6`

URL: `https://linear.app/mongocyber/issue/MON-6/v03-fe05-hosted-chat-routing`

Priority: High

Labels: `v0.3`, `frontend`, `hosted-ai`, `routing`, `local-only`

## Goal

Wire the existing local hosted-AI client and hosted session seam into the chat request route so an explicitly selected hosted request can stream through the local mock/backend contract verified by `V03-SH02`.

BYOK direct-provider remains the default path and is not blocked by hosted sign-in.

## Owner Repo

Primary: `Aviso`

Backend contract source: `Aviso-backend`

## Execution Mode

Level: `L2 frontend implementation`

Allowed:

- add a local-only hosted chat routing seam,
- use existing `src/utils/hosted-ai-client.ts` and `src/utils/hosted-session.ts`,
- route only requests that explicitly set `aiRoute: "hosted"`,
- preserve existing BYOK provider routing when `aiRoute` is missing or `"byok"`,
- add focused unit/source-boundary tests,
- update local issue and v0.3 planning docs.

Stop before:

- Chrome manifest host-permission changes,
- staging or production backend URLs,
- real provider, OAuth production, billing, webhook, secrets, telemetry, or analytics,
- `X-Install-Id` install-id support,
- public copy, Chrome Web Store copy, website privacy copy, or storage key migration.

## Scope Delivered

- Added `src/background/hosted-chat-routing.ts`.
- Added explicit `AIRequestPayload.aiRoute?: "byok" | "hosted"`.
- `handleAIRequest` now calls hosted chat only when `aiRoute === "hosted"`.
- Hosted chat uses the stored local hosted session, local base URL, SSE chat stream, default logical model `free-small`, and safe hosted error normalization.
- Missing/expired hosted session returns the hosted `unauthorized` category and clears expired local session on hosted unauthorized errors.
- Floating window preserves `aiRoute` from `SHOW_FLOATING_WINDOW` into the background AI request.
- BYOK direct-provider routing, provider config storage, and API key storage were not changed.

## Non-Scope Confirmed

- No manifest or host-permission change.
- No staging or production backend URL.
- No real OAuth, real provider hookup, billing, checkout, webhook, telemetry, analytics, or secrets.
- No `X-Install-Id`.
- No public quota or public hosted-AI marketing/privacy copy.
- No storage key migration.
- No screenshot/image hosted chat route.

## Acceptance Criteria

- Hosted chat route is request-scoped and only active for explicit hosted selection.
- Hosted chat sends local backend chat stream requests using the existing local hosted client/session seam.
- Hosted stream converts backend `delta` / `done` SSE events into the existing floating stream chunk shape.
- Hosted error SSE and missing session errors normalize to existing safe frontend messages.
- BYOK direct-provider path remains the default and does not require hosted sign-in.
- Unit/source tests cover hosted route selection, `free-small`, follow-up messages, image/screenshot rejection, BYOK non-blocking, no `X-Install-Id`, and unchanged host permissions.

## Checks

Passed:

- `npm test` (`184/184`)
- `npx tsc --noEmit`
- `npm run check:manifests`
- boundary searches for `X-Install-Id`, install-id, `chrome.identity`, staging/production URL strings, billing/payment/webhook, telemetry/analytics, host permissions, and localhost/real URL changes

Blocked:

- `npm run build` failed in the managed sandbox with `Operation not permitted`.
- Unsandboxed build approval was rejected by policy, so no equivalent build workaround was run.

## Remaining Gate

If real Chrome runtime access to the local backend requires `localhost` / `127.0.0.1` host permission, stop and request owner approval before changing the manifest.

`V03-FE05` is completed and CTO accepted for the local-only routing seam. It is not release-ready because `npm run build` remains sandbox-blocked and any real Chrome runtime access that requires `localhost` / `127.0.0.1` host permission still needs owner approval.
