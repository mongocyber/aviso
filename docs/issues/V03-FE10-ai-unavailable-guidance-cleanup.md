# V03-FE10 AI Unavailable Guidance Cleanup

Status: `implemented / local-validation-passed`
Updated: 2026-06-25
Linear: [`MON-29`](https://linear.app/mongocyber/issue/MON-29/v03-fe10-ai-unavailable-guidance-cleanup)

## Goal

When AI is unavailable because the user has no BYOK API key, no selected model, no usable Aviso AI session, or the active AI route is unavailable, every entry should show a clear next step instead of a raw technical error.

Local search, open URL, bookmarks, and history in the command palette remain usable without AI.

## Scope

- Command palette recognizes a usable Aviso AI session as AI available.
- Command palette AI actions can route through Aviso AI when the signed-in hosted route is the active service.
- Command palette disconnected state uses product copy: "log in to Aviso AI" or "configure your own API key"; no "Popup" technical wording.
- Floating window and selection toolbar receive a structured AI-unavailable guidance object from the background AI request path.
- Missing BYOK key, missing model, hosted sign-in required, and generic AI-service unavailable states map to safe user-facing guidance.
- Floating window and inline toolbar keep the guidance in-place; no configuration jump is shipped in this slice.

## Non-Scope

- No backend change.
- No manifest or host-permission change.
- No API key storage change.
- No provider configuration data migration.
- No public website, privacy-policy, or Chrome Web Store copy.
- No billing, subscription, paid quota, analytics, telemetry, or new external network calls.

## Implementation Notes

- `AiUnavailableGuidance` carries only non-sensitive reason and action metadata.
- Background AI request failures attach structured guidance to `AI_STREAM_ERROR` and failed response metadata.
- UI surfaces still keep the original error internally as fallback text, but prefer guidance copy when available.
- BYOK remains usable without Aviso AI sign-in; hosted sign-in stays request-scoped.

## Acceptance Criteria

- Command palette local actions work without AI.
- AI actions do not show "Popup" as an instruction.
- Signed-in Aviso AI is treated as an available AI route.
- Hosted sign-in required explains that the user can sign in to Aviso AI or use their own service.
- BYOK missing key or model missing explains what needs to be configured.
- Command palette disconnected guidance shows clear setup copy without a configuration button.
- Page-action intent parsing handles "这个页面" / trailing punctuation, avoiding mixed-language leftover targets in English UI.
- Floating follow-up send stays disabled when AI is unavailable or the follow-up input is empty.
- Floating and selection toolbar errors do not expose raw prompts, raw provider responses, private page bodies, full URLs, tokens, API keys, screenshots/base64, or sensitive logs.

## Verification

- `git diff --check`: pass.
- `npx tsc --noEmit`: pass.
- `npm test`: 192/192 pass.
- `npm run build:wxt`: pass.
- `npm run build:plasmo`: pass after rerunning outside the managed sandbox; the sandboxed run failed with `Operation not permitted`.
- `npm run check:manifests`: pass (Plasmo + WXT outputs consistent).

## Stop Lines

Stop for owner / CTO approval before any production config, backend change, manifest / host-permission change, public / CWS copy, secret or token handling, real provider validation, storage migration, or payment / billing / subscription work.
