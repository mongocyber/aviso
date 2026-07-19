# Aviso v0.3 CWS Disclosure Draft

Status: `source-updated / backend-main-pushed / final-package-verified / submitted-for-review / not approved / not live`
Updated: 2026-07-06

This file is the product-side source for Chrome Web Store privacy and data-disclosure updates for the current production-candidate package. The backend and frontend OAuth challenge contract has been merged to main on both repositories, and owner later submitted `0.1.1` to Chrome Web Store review. This file does not prove Chrome Web Store approval, mark hosted AI live, or approve paid hosted AI.

## Final Submission Readiness

Current conclusion: `submitted to Chrome Web Store review / approval pending`.

This file can be used as the source checklist for the Chrome Web Store submission. The current package has been regenerated, verified locally, and submitted by the owner for review; approval/rejection evidence and final owner release approval remain separate gates.

| Field | Current value in this draft | Final submission requirement | Status |
| --- | --- | --- | --- |
| Production backend origin | `https://aviso-backend-production.vercel.app` | Exact production backend origin, if hosted AI ships publicly | `known / backend main pushed / not live` |
| Hosted backend host permission | Production candidate origin in source package config: `https://aviso-backend-production.vercel.app/*` | Exact host permission from the final production package manifest; no broad host permission | `verified in regenerated package` |
| Production OAuth evidence | Backend OAuth challenge gate merged and pushed; frontend challenge client merged and pushed | Final loaded-extension sign-in smoke using the exact package | `code merged / owner final smoke pending` |
| Production provider evidence | Authenticated production HTTP smoke previously passed with SSE `delta`, `done`, `usage`, positive quota delta, and cost guard exercised | Sanitized production provider smoke evidence with quota/cost guard confirmation on the final package | `partial / final package smoke pending` |
| Production package evidence | `build/canonical-chrome-mv3-prod.zip` regenerated and verified after the 2026-07-02 frontend/backend changes | Final uploaded package filename, manifest permission list, and package boundary scan | `local package verified / submitted for review` |
| Website privacy URL | Source copy exists and owner has reviewed website content | Deployed privacy-policy URL reviewed against the final package | `reviewed / deployed` |
| Support URL | Source copy exists | Deployed support/feedback URL safe to cite in CWS | `reviewed / deployed` |
| Store listing copy | `store-assets/chrome-web-store/STORE_LISTING_COPY.md` updated for BYOK + optional Aviso AI | Final owner-approved store copy pasted into CWS | `source updated / submitted for review` |
| Billing / paid plan | Excluded from first v0.3 release | Keep financial/payment disclosure as not collected; no paid-plan or checkout copy | `ready if scope unchanged` |

Do not paste the staging backend host permission into a production Chrome Web Store submission. For the intended hosted-AI production release, the host-permission list must come from the exact verified production package manifest.

## Release Boundary

- BYOK direct-provider remains the default available path.
- Hosted AI is optional and requires user sign-in.
- BYOK users are not forced through hosted AI, login, quota, or the backend.
- MON-23 owner approval covers final submission preparation, production backend preparation, production OAuth/provider validation, and billing exclusion for the first hosted-AI release.
- Chrome Web Store review result, final owner release approval, and live release evidence remain incomplete.

## Request Paths

| Path | User action | Data transit | Account required | Current release meaning |
| --- | --- | --- | --- | --- |
| BYOK direct-provider | User triggers an AI action with a configured provider key | Browser extension -> selected provider | No | Existing/default path |
| Hosted AI | User chooses hosted AI and signs in | Browser extension -> Aviso backend -> upstream provider | Yes | Optional production-candidate path; backend/frontend challenge contract merged, submitted to Chrome Web Store review, approval/live evidence pending |

## Data Categories

| Category | BYOK path | Hosted AI path | Disclosure note |
| --- | --- | --- | --- |
| User-provided or page-derived AI input | Sent directly to selected provider only when the user triggers an action | Sent to Aviso backend and upstream provider only when the user triggers hosted AI | Used only to provide the requested AI result |
| AI output | Returned from selected provider to extension | Returned from upstream provider through Aviso backend to extension | Displayed in-page; saved locally only if user saves history |
| API keys | User BYOK key stays in Chrome local extension storage with local encryption/obfuscation-level protection | User BYOK key is not sent to Aviso backend; hosted AI does not require user provider keys | Do not disclose as uploaded to Aviso |
| Account identity | Not required | Google sign-in is used to establish hosted session and account/quota state | Do not record raw id token, profile payload, session token, or email/profile text in project evidence |
| Usage/quota metadata | Not applicable to BYOK path | Stored for account, quota, abuse-prevention, request-status, and operational review | Current metadata retention: 30 days |
| Browser history/bookmarks | Local command-palette search only | Local command-palette search only | Not sent to Aviso backend or provider as search results |
| Website feedback | Separate website email channel only when the user submits feedback | Same | Not extension telemetry |

## Not Persisted By Aviso Backend

The hosted backend must not persist:

- raw prompt,
- raw provider response,
- page body,
- selected text original as logs,
- screenshot or image base64,
- clipboard content,
- user BYOK API key,
- full URL,
- Google id token,
- hosted session token,
- client secret.

## Chrome Permissions To Explain

| Permission | Public explanation |
| --- | --- |
| `contextMenus` | Show Aviso actions in the right-click menu. |
| `activeTab` | Read or interact with the current tab after the user triggers an action. |
| `storage` | Save settings, BYOK keys, templates, hosted session/account state, and local history. |
| `history` | Search Chrome browsing history locally in the command palette. |
| `bookmarks` | Search Chrome bookmarks locally in the command palette. |
| `identity` | Open the Google authorization window for user-initiated hosted AI sign-in. BYOK does not require this. |
| `clipboardWrite` | Copy results or current context when the user chooses that action. |

## Host Permissions To Explain

```text
https://api.openai.com/*
https://api.anthropic.com/*
https://ark.cn-beijing.volces.com/*
https://api.deepseek.com/*
https://api.moonshot.cn/*
https://openrouter.ai/*
https://generativelanguage.googleapis.com/*
https://api.hunyuan.cloud.tencent.com/*
https://aviso-backend-production.vercel.app/*
```

- Provider hosts are used for BYOK direct-provider requests.
- `https://aviso-backend-production.vercel.app/*` is the exact production hosted AI backend origin for the v0.3 production candidate package.
- No broad host permission is requested for arbitrary remote webpage-body fetching.

Final submission note: the host-permission list must match the exact manifest in the final uploaded package. This draft still does not submit Chrome Web Store changes or mark hosted AI live.

## OAuth / Hosted Sign-In Disclosure Note

The current package requests `identity` only for the user-initiated Aviso AI / hosted AI sign-in flow. BYOK direct-provider use does not require login. The sign-in flow now uses a backend-issued OAuth challenge: the frontend requests a short-lived `state` / `nonce`, passes those values through Google OAuth, and exchanges the resulting id token with the backend. The backend consumes the challenge before issuing a hosted session. Raw id tokens, hosted session tokens, raw profile payloads, raw prompts, raw provider responses, screenshots/base64, clipboard content, API keys, and full URLs must not be included in public evidence or logs.

## CWS Form Guidance

Recommended disclosure posture for the v0.3 package:

- User content: handled when the user triggers AI actions; BYOK sends to selected provider, hosted sends through Aviso backend and upstream provider.
- Authentication information: hosted AI uses Google sign-in to create a hosted session; raw id tokens and session tokens must not be persisted in project records.
- Web history: used locally for command-palette search; not uploaded to Aviso backend or model providers as search results.
- Personal communications: user prompts may contain user-provided text; treat as user content and disclose transit for AI functionality.
- Location: do not claim collection unless a future feature explicitly adds it.
- Financial/payment information: paid hosted AI is not in the first v0.3 release.
- Health, credit, or lending decisions: not used.
- Advertising or sale of user data: not used.

## Owner Approval Needed Before Submission

Before Chrome Web Store disclosure submission:

- Confirm the final uploaded package manifest still matches the production backend domain and host permission recorded here.
- Confirm production OAuth client and consent screen wording.
- Confirm the final loaded extension can complete user-initiated hosted sign-in after the OAuth challenge update.
- Confirm upstream provider account data-retention/logging settings.
- Confirm metadata schema and 30-day retention policy still match implementation.
- Confirm website privacy policy has been reviewed in the deployed copy.
- Confirm no public copy overclaims hosted AI availability, quota, pricing, or production readiness.
- Confirm owner release approval in `MON-23`.
