# Aviso v0.3 CWS Disclosure Draft

Status: `draft / source-updated / owner-approved-to-prepare / blocked-on-production-evidence / not submitted`
Updated: 2026-06-26

This draft is the product-side source for Chrome Web Store privacy and data-disclosure updates for v0.3 hosted AI. MON-23 owner decisions approve preparation of the final store submission package, but this file does not submit the Chrome Web Store form, prove public release, prove production validation, or approve paid hosted AI.

## Final Submission Readiness

Current conclusion: `blocked`.

This draft can be used as the source checklist for the final Chrome Web Store submission, but it is not yet a final submission packet. The final packet must wait for production evidence from the MON-23 production/package tracks.

| Field | Current value in this draft | Final submission requirement | Status |
| --- | --- | --- | --- |
| Production backend origin | Not present | Exact production backend origin, if hosted AI ships publicly | `blocked` |
| Hosted backend host permission | Staging origin only: `https://aviso-backend-staging.vercel.app/*` | Exact host permission from the final production package manifest; no broad host permission | `blocked` |
| Production OAuth evidence | Not present | Sanitized production Google OAuth/session smoke evidence and consent-screen confirmation | `blocked` |
| Production provider evidence | Not present | Sanitized production provider smoke evidence with quota/cost guard confirmation | `blocked` |
| Production package evidence | Not present in this worktree | Final zip/package filename, manifest permission list, and package boundary scan | `blocked` |
| Website privacy URL | Source copy exists only | Deployed privacy-policy URL reviewed against the final package | `blocked` |
| Support URL | Source copy exists only | Deployed support/feedback URL safe to cite in CWS | `blocked` |
| Store listing copy | v0.1 BYOK copy exists separately | Final hosted-AI listing copy, or explicit decision to keep BYOK-only listing | `blocked` |
| Billing / paid plan | Excluded from first v0.3 release | Keep financial/payment disclosure as not collected; no paid-plan or checkout copy | `ready if scope unchanged` |

Do not paste the staging backend host permission into a production Chrome Web Store submission unless the exact submitted extension package still contains that staging-only permission and the owner explicitly chooses a staging-only submission. For the intended hosted-AI production release, replace the staging origin with the exact verified production backend origin from the final package evidence.

## Release Boundary

- BYOK direct-provider remains the default available path.
- Hosted AI is optional and requires user sign-in.
- BYOK users are not forced through hosted AI, login, quota, or the backend.
- MON-23 owner approval covers final submission preparation, production backend preparation, production OAuth/provider validation, and billing exclusion for the first hosted-AI release.
- Chrome Web Store submission, production backend validation, production package evidence, website deployment evidence, and live release evidence remain incomplete.

## Request Paths

| Path | User action | Data transit | Account required | Current release meaning |
| --- | --- | --- | --- | --- |
| BYOK direct-provider | User triggers an AI action with a configured provider key | Browser extension -> selected provider | No | Existing/default path |
| Hosted AI | User chooses hosted AI and signs in | Browser extension -> Aviso backend -> upstream provider | Yes | v0.3 optional path; staging verified, production validation pending |

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
https://aviso-backend-staging.vercel.app/*
```

- Provider hosts are used for BYOK direct-provider requests.
- `https://aviso-backend-staging.vercel.app/*` is the staging hosted AI backend origin approved for v0.3 validation.
- Production backend host permission is approved only for the exact production backend origin once established and verified.
- No broad host permission is requested for arbitrary remote webpage-body fetching.

Final submission note: the host-permission list must match the exact manifest in the final uploaded package. If the final package includes production hosted AI, this section must be updated from staging to the verified production backend origin before CWS submission.

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

- Confirm production backend domain and host permission, if any.
- Confirm production OAuth client and consent screen wording.
- Confirm upstream provider account data-retention/logging settings.
- Confirm metadata schema and 30-day retention policy still match implementation.
- Confirm website privacy policy has been reviewed in the deployed copy.
- Confirm no public copy overclaims hosted AI availability, quota, pricing, or production readiness.
- Confirm owner release approval in `MON-23`.
