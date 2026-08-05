# Aviso V013 Reviewer Notes

Updated: 2026-08-04

These notes retarget the website and Chrome Web Store review materials to the V013 Supabase Auth plus Creem candidate. They are reviewer guidance only. No deployment or Chrome Web Store submission is authorized by MON-46.

## Exact Candidate Preconditions

Automated local preconditions are checked by:

```bash
node scripts/check-v013-candidate-preconditions.mjs --backend-repo /path/to/aviso-backend --backend-ref origin/integration/aviso-v013
node scripts/check-cws-assets.mjs
```

Expected local facts:

| Fact | Expected value |
| --- | --- |
| Frontend minimum commit | `450351ba171db753b508089c485c0db2283a859e` |
| Backend minimum commit | `f30f6cccb1f7805d8ef95975a425c0c97c26379c` |
| `package.json` SHA-256 | `f64943fcbc69534ab5eeb237e1674f9ea49c846a279322377c480e7e7ad38277` |
| `package-lock.json` SHA-256 | `fe7417804e2cbea8edfcb72dcae0cea060d2d6975041eaf74d74627d5ecebfad` |

## BYOK Review Notes

BYOK remains the default usable path. Reviewer-supplied provider keys stay in `chrome.storage.local/contextai_api_keys`; they are not sent to the Aviso backend, do not require Aviso AI sign-in, and do not require subscription or billing. Sign-out, invalid hosted state, account deletion, and billing failures must not clear BYOK provider configuration.

## Supabase Review Notes

Supabase Auth is present as a provider-neutral frontend foundation and remains default-disabled. The current candidate keeps `HOSTED_SUPABASE_AUTH_URL`, `HOSTED_SUPABASE_ANON_KEY`, and `HOSTED_SUPABASE_GOOGLE_CLIENT_ID` empty, adds no Supabase host permission, and fails closed before live Supabase sign-in. Exact Supabase origin, anon key, redirect allowlist, live sign-in validation, and manifest activation remain owner-gated follow-up work.

## Creem Review Notes

Creem billing is test-mode/local-fixture-gated for this candidate. The frontend only requests backend-created checkout or customer-portal URLs after a usable hosted session, validates returned external URLs against trusted Creem HTTPS origins, and refreshes entitlement from `/v1/me`. The client does not create prices, customer IDs, subscription IDs, local entitlements, or portal URLs. No live Creem credentials, live charges, production billing launch, deployment, or customer billing readiness is claimed.

## Feedback And Evidence Notes

The website feedback form is a separate website email channel, not extension telemetry. The V013 hardening uses structured email-only ingestion by default: maintainer emails are built from issue type, trigger method, runtime facts, provider path, optional provider/model name, optional contact email, locale, and redaction/omission signals. Optional free-text details and attachment content are omitted from maintainer emails by default; risky-looking optional content returns a redaction signal instead of silently rejecting valid structured submissions. PNG/JPEG metadata stripping and sensitive-content detection remain as safety signals, not as the sole boundary for forwarding raw text. Evidence in this repository must stay summary-only and must not include credentials, private content, original model input/output, private page bodies, screenshot/base64 payloads, full URLs, or clipboard content.

## Asset Notes

Current usable image assets are the icon and two promo tiles listed in `GENERATION_REPORT.md`. Local asset metadata validation checks dimensions and executable permissions and rejects any screenshot file that is not completed in the generation report with real-runtime provenance. No fabricated screenshot is accepted by this candidate.

## Out Of Scope

- No deployment or production website publish.
- No Chrome Web Store submission or listing update.
- No real Supabase or Creem credentials.
- No live provider, billing, or auth calls.
- No merge or auto-merge.
