# Aviso v0.3 Frontend Scope

Status: `planning / extension-scope`
Updated: 2026-06-18

This file defines frontend work needed for v0.3 hosted AI. It does not approve implementation.

## In Scope

| Area | Frontend Work |
| --- | --- |
| Mode model | Represent BYOK and hosted AI as separate request paths. |
| Sign-in | Add just-in-time Google sign-in entry for hosted AI only. |
| Settings | Show account state, hosted quota, default mode, and BYOK fallback. |
| Request routing | Route hosted actions to backend only when user chooses or falls into hosted path. |
| Errors | Handle backend error codes with clear user actions. |
| Quota | Display token quota in user-friendly language. |
| Contract | Use backend contract types or generated client when ready. |
| Privacy copy | Update only after release gates approve hosted wording. |

## Out Of Scope For First Integration

- Hosted image/screenshot AI.
- Team accounts.
- China hosted stack.
- Payment UI beyond a controlled upgrade link once Phase 2 is ready.
- Web search or remote link-body fetching.
- Storing BYOK keys outside current local storage.
- Sending BYOK keys to backend.

## UI States To Design

| State | User Meaning | Required Action |
| --- | --- | --- |
| No BYOK, signed out | Hosted AI available after sign-in. | Offer sign-in, keep settings visible. |
| Signed in, quota available | Hosted AI ready. | Show quota and selected hosted model tier. |
| Quota exhausted | Free hosted budget used. | Offer upgrade when available, or switch to BYOK. |
| Service unavailable | Hosted service temporarily unavailable. | Offer retry later or switch to BYOK. |
| BYOK configured | Direct provider path ready. | Do not force login. |
| Both hosted and BYOK available | User can choose default path. | Make default and fallback clear. |

## Backend Error Handling

| Code | Frontend Response |
| --- | --- |
| `unauthorized` | Ask user to sign in or switch to BYOK. |
| `quota_exceeded` | Explain quota is used; offer upgrade or BYOK. |
| `forbidden_model` | Explain model is not available on current tier. |
| `rate_limited` | Ask user to retry shortly. |
| `service_unavailable` | Explain hosted service is busy; offer BYOK fallback. |
| `provider_error` | Offer retry or fallback. |
| `bad_request` / `internal` | Show generic failure and keep sensitive details out of UI/logs. |

## Files Likely To Be Touched Later

This is a planning estimate, not an implementation whitelist:

- Popup settings and AI service UI.
- Background AI request routing.
- Provider config and model registry utilities.
- Runtime storage types for non-secret hosted settings.
- i18n copy.
- Website docs and privacy policy after release-gate approval.

Implementation must re-read actual source before editing.
